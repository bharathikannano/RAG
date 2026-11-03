/**
 * useEmbedWorker — React hook for the embedding Web Worker.
 * Manages worker lifecycle and provides a Promise-based API.
 */
import { useRef, useEffect, useCallback, useState } from 'react';

export function useEmbedWorker() {
  const workerRef = useRef(null);
  const pendingRef = useRef(new Map()); // id -> { resolve, reject }
  const idCounter = useRef(0);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [progress, setProgress] = useState('Initializing model…');

  const initWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    const worker = new Worker(new URL('../workers/embedWorker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setStatus('loading');
    setProgress('Loading embedding model…');

    worker.onmessage = (e) => {
      const { type, id, embeddings, message } = e.data;

      if (type === 'progress') {
        setStatus('loading');
        setProgress(message);
        return;
      }
      if (type === 'ready') {
        setStatus('ready');
        setProgress('');
        return;
      }
      if (type === 'reranker_ready') {
        return;
      }
      if (type === 'error') {
        console.error('[EmbedWorker Error]:', message);
        setStatus('error');
        setProgress(message || 'Model load failed');
        const pending = pendingRef.current.get(id);
        if (pending) {
          pending.reject(new Error(message));
          pendingRef.current.delete(id);
        }
        return;
      }
      if (type === 'embed_result' || type === 'embed_sentences_result') {
        const pending = pendingRef.current.get(id);
        if (pending) {
          pending.resolve(embeddings);
          pendingRef.current.delete(id);
        }
      }
    };

    worker.onerror = (err) => {
      console.error('[EmbedWorker Error Event]:', err);
      setStatus('error');
      setProgress(err?.message || 'Worker initialization error');
    };

    // Warm up the model
    worker.postMessage({ type: 'init' });
  }, []);

  useEffect(() => {
    initWorker();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [initWorker]);

  const embed = useCallback((texts, batchSize = 8) => {
    return new Promise((resolve, reject) => {
      const id = String(idCounter.current++);
      pendingRef.current.set(id, { resolve, reject });
      workerRef.current?.postMessage({ type: 'embed', id, texts, batchSize });
    });
  }, []);

  const embedSentences = useCallback((sentences, batchSize = 8) => {
    return new Promise((resolve, reject) => {
      const id = String(idCounter.current++);
      pendingRef.current.set(id, { resolve, reject });
      workerRef.current?.postMessage({ type: 'embed_sentences', id, sentences, batchSize });
    });
  }, []);

  const enableReranker = useCallback((enable) => {
    workerRef.current?.postMessage({ type: 'load_reranker', enable });
  }, []);

  const retry = useCallback(() => {
    initWorker();
  }, [initWorker]);

  return { status, progress, embed, embedSentences, enableReranker, retry };
}
