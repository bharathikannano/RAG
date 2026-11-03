/**
 * Extractive mode provider — no LLM, no key, always available.
 *
 * Algorithm:
 * 1. Split retrieved chunks into sentences
 * 2. Score each sentence by cosine similarity (if precomputed) or chunk vector similarity + term match
 * 3. Pick top 3-4, keep in document order, attach citation chips [n]
 */

import { cosineSimilarity } from '../search/searcher.js';

export const extractiveProvider = {
  name: 'extractive',
  available: true,
  model: 'local-extractive',

  /**
   * @param {object} opts
   * @param {Array}  opts.chunks          - retrieved chunks [{text, chunkId, filename, score}]
   * @param {number[]} opts.queryEmbedding - query embedding vector
   * @param {string} [opts.question]       - user question string
   * @param {number[][]} [opts.sentenceEmbeddings] - per-sentence embeddings for all chunks
   * @param {string[]} [opts.sentences]    - sentences extracted from chunks
   * @param {number[]} [opts.sentenceChunkIds] - which chunk index each sentence came from
   */
  async *streamAnswer({ chunks = [], queryEmbedding, question = '', sentences = [], sentenceEmbeddings = [], sentenceChunkIds = [] }) {
    let scored = [];

    if (sentences && sentences.length > 0 && sentenceEmbeddings && sentenceEmbeddings.length > 0) {
      scored = sentences.map((text, i) => ({
        text,
        score: cosineSimilarity(queryEmbedding, sentenceEmbeddings[i]),
        chunkIndex: sentenceChunkIds[i] ?? 0,
        originalIndex: i,
      }));
    } else if (chunks && chunks.length > 0) {
      // Dynamically extract sentences from retrieved chunks
      const queryTerms = (question || '').toLowerCase().match(/\b\w{3,}\b/g) || [];

      chunks.forEach((chunk, cIdx) => {
        // Split chunk into natural sentences
        const rawSentences = chunk.text
          .split(/(?<=[.?!])\s+|\n{2,}/)
          .map(s => s.trim().replace(/\s+/g, ' '))
          .filter(s => s.length >= 25);

        rawSentences.forEach((text) => {
          const sentLower = text.toLowerCase();
          const matchCount = queryTerms.filter(term => sentLower.includes(term)).length;
          const lexicalBoost = queryTerms.length > 0 ? (matchCount / queryTerms.length) : 0;
          const score = (chunk.score || 0.6) * 0.75 + lexicalBoost * 0.25;

          scored.push({
            text,
            score,
            chunkIndex: cIdx,
            originalIndex: scored.length,
          });
        });
      });
    }

    if (scored.length === 0 && chunks && chunks.length > 0) {
      chunks.forEach((c, idx) => {
        scored.push({
          text: c.text.slice(0, 200).trim(),
          score: c.score || 0.5,
          chunkIndex: idx,
          originalIndex: idx,
        });
      });
    }

    // Sort by score, pick top 4, restore document order
    const topN = Math.min(4, Math.max(2, Math.ceil(scored.length * 0.25)));
    const picked = scored
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .sort((a, b) => a.originalIndex - b.originalIndex);

    // Emit each sentence with its score so the UI can animate them
    for (const s of picked) {
      yield {
        type: 'extractive_sentence',
        text: s.text,
        score: s.score,
        chunkIndex: s.chunkIndex,
        citationIndex: s.chunkIndex + 1,
      };
      // Small delay for animation
      await new Promise(r => setTimeout(r, 80));
    }

    // Final assembled answer
    const answer = picked
      .map(s => `${s.text} [${s.chunkIndex + 1}]`)
      .join(' ');

    yield {
      type: 'extractive_done',
      answer: answer || 'No direct sentences matched the query in the retrieved context.',
      sentences: picked.map(s => ({
        text: s.text,
        score: s.score,
        chunkIndex: s.chunkIndex,
      })),
    };

    yield { type: 'usage', prompt_tokens: 0, completion_tokens: 0 };
  },
};
