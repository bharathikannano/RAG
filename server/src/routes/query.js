/**
 * POST /api/query
 * SSE endpoint for streaming answers.
 *
 * Body JSON:
 * {
 *   question: string,
 *   queryEmbedding: number[],          // computed by browser
 *   provider: 'auto' | 'groq' | ...,
 *   topK: number,
 *   history: [{role, content}],        // last 2 turns
 *   // For extractive mode:
 *   sentences?: string[],
 *   sentenceEmbeddings?: number[][],
 *   sentenceChunkIds?: number[],
 * }
 */
import express from 'express';
import { searchChunks } from '../pipeline/search/searcher.js';
import { runFallbackChain } from '../pipeline/generate/fallbackChain.js';
import { hasChunks } from '../pipeline/store.js';

const router = express.Router();

// Track API usage per provider per day (local counter, no persistence)
const usageToday = new Map();
function bumpUsage(provider) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${day}:${provider}`;
  usageToday.set(key, (usageToday.get(key) || 0) + 1);
}
export function getUsageToday() {
  const day = new Date().toISOString().slice(0, 10);
  const result = {};
  for (const [k, v] of usageToday) {
    if (k.startsWith(day + ':')) {
      const provider = k.slice(day.length + 1);
      result[provider] = v;
    }
  }
  return result;
}

router.post('/', async (req, res) => {
  if (!hasChunks()) {
    return res.status(400).json({ error: 'No documents indexed. Please upload a document first.' });
  }

  const {
    question,
    queryEmbedding,
    provider: preferredProvider = 'auto',
    topK = 4,
    history = [],
    // Extractive payload
    sentences,
    sentenceEmbeddings,
    sentenceChunkIds,
  } = req.body;

  if (!question || !queryEmbedding) {
    return res.status(400).json({ error: 'question and queryEmbedding are required' });
  }

  // --- Semantic Search ---
  const chunks = searchChunks(queryEmbedding, topK);

  // --- Build prompt (only last 2 turns) ---
  const contextText = chunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
  const maxHistory = 2;
  const trimmedHistory = history.slice(-maxHistory * 2);

  const systemMessage = {
    role: 'system',
    content: `You are a helpful assistant. Answer questions using ONLY the provided context. 
Cite sources inline as [1], [2], etc. matching the context numbers.
Be concise. Max ~4 sentences. If the answer is not in the context, say so.

Context:
${contextText}`,
  };

  const messages = [
    systemMessage,
    ...trimmedHistory,
    { role: 'user', content: question },
  ];

  // Trim to ~3000 tokens (rough: 4 chars ≈ 1 token)
  const totalChars = messages.reduce((s, m) => s + m.content.length, 0);
  if (totalChars > 12000) {
    systemMessage.content = systemMessage.content.slice(0, 12000 - trimmedHistory.reduce((s, m) => s + m.content.length, 0));
  }

  // --- SSE Setup ---
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  // Emit search results first
  sendEvent({ stage: 'search_results', payload: { chunks } });

  // --- Run Fallback Chain ---
  const ac = new AbortController();
  req.on('close', () => ac.abort());

  const extractivePayload = {
    chunks,
    queryEmbedding,
    question,
    sentences: sentences || [],
    sentenceEmbeddings: sentenceEmbeddings || [],
    sentenceChunkIds: sentenceChunkIds || [],
  };

  try {
    for await (const event of runFallbackChain({
      preferredProvider,
      llmPayload: { messages, extractivePayload },
      signal: ac.signal,
    })) {
      sendEvent(event);

      // Track usage when a provider succeeds
      if (event.stage === 'provider_done') {
        bumpUsage(event.payload.provider);
      }
    }
  } catch (err) {
    sendEvent({ stage: 'error', payload: { message: err.message } });
  }

  sendEvent({ stage: 'done', payload: {} });
  res.end();
});

export { router as queryRouter };
