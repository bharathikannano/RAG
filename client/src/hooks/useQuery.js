/**
 * useQuery — handles the question→answer SSE stream.
 * Manages the full Stage 8 (Answer Generation) state.
 */
import { useState, useCallback, useRef } from 'react';

export function useQuery({ embed, embedSentences, settings }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [answer, setAnswer] = useState('');
  const [chunks, setChunks] = useState([]);
  const [providerPath, setProviderPath] = useState([]); // [{name, model, status}]
  const [activeProvider, setActiveProvider] = useState(null);
  const [usage, setUsage] = useState(null);
  const [mode, setMode] = useState(null); // 'generative' | 'extractive'
  const [extractiveSentences, setExtractiveSentences] = useState([]);
  const [timing, setTiming] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]); // last 2 turns
  const abortRef = useRef(null);

  const ask = useCallback(async (question) => {
    if (!question.trim()) return;
    setIsStreaming(true);
    setAnswer('');
    setError(null);
    setChunks([]);
    setProviderPath([]);
    setActiveProvider(null);
    setUsage(null);
    setMode(null);
    setExtractiveSentences([]);
    setTiming(null);

    const t0 = Date.now();

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // 1. Embed the question locally
      const [queryEmbedding] = await embed([question], 1);

      // 2. Build extractive payload (sentence embeddings from retrieved chunks later)
      // We'll send basic info and let server handle it
      const body = {
        question,
        queryEmbedding,
        provider: settings?.provider || 'auto',
        topK: settings?.topK || 4,
        history: history.slice(-4), // last 2 pairs
      };

      // 3. Fire SSE request
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstToken = null;
      let fullAnswer = '';
      let extractiveDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (ac.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let evt;
          try { evt = JSON.parse(raw); } catch { continue; }

          const { stage, payload } = evt;

          if (stage === 'search_results') {
            setChunks(payload.chunks);

            // If extractive mode is likely (provider=extractive or no keys),
            // pre-embed sentences now
            // We'll embed sentences from the retrieved chunks for extractive mode
          }

          if (stage === 'provider_start') {
            const isExtractive = payload.isExtractive;
            setMode(isExtractive ? 'extractive' : 'generative');
            setActiveProvider({ name: payload.provider, model: payload.model });
            setProviderPath(prev => [...prev, { name: payload.provider, model: payload.model, status: 'active' }]);
          }

          if (stage === 'provider_fallback') {
            setProviderPath(prev =>
              prev.map(p => p.name === payload.from ? { ...p, status: 'failed', reason: payload.reason } : p)
            );
          }

          if (stage === 'provider_error') {
            setProviderPath(prev =>
              prev.map(p => p.name === payload.provider ? { ...p, status: 'error', statusCode: payload.statusCode } : p)
            );
          }

          if (stage === 'provider_done') {
            setProviderPath(prev =>
              prev.map(p => p.name === payload.provider ? { ...p, status: 'done' } : p)
            );
          }

          if (stage === 'llm') {
            const e = payload;
            if (e.type === 'token') {
              if (firstToken === null) firstToken = Date.now() - t0;
              fullAnswer += e.text;
              setAnswer(fullAnswer);
            }
            if (e.type === 'usage') {
              setUsage({ prompt_tokens: e.prompt_tokens, completion_tokens: e.completion_tokens });
            }
            if (e.type === 'extractive_sentence') {
              setExtractiveSentences(prev => [...prev, {
                text: e.text,
                score: e.score,
                chunkIndex: e.chunkIndex,
                citationIndex: e.citationIndex,
              }]);
            }
            if (e.type === 'extractive_done') {
              fullAnswer = e.answer;
              setAnswer(e.answer);
              extractiveDone = true;
            }
          }

          if (stage === 'error') {
            setError(payload.message);
          }

          if (stage === 'done') {
            const totalTime = Date.now() - t0;
            setTiming({ firstToken, totalTime });
          }
        }
      }

      // Update chat history
      if (fullAnswer) {
        setHistory(prev => [
          ...prev,
          { role: 'user', content: question },
          { role: 'assistant', content: fullAnswer },
        ].slice(-8)); // keep last 4 turns
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setIsStreaming(false);
    }
  }, [embed, settings, history]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const clearHistory = useCallback(() => setHistory([]), []);

  return {
    isStreaming, answer, chunks, providerPath, activeProvider,
    usage, mode, extractiveSentences, timing, error,
    history, ask, stop, clearHistory,
  };
}
