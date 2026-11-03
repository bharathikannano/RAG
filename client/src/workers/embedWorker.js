/**
 * Embedding Web Worker
 * ====================
 * Runs Transformers.js (Xenova/all-MiniLM-L6-v2, quantized) in a
 * dedicated worker thread so the UI stays responsive.
 *
 * Messages received:
 *   { type: 'init' }
 *   { type: 'embed', id, texts: string[], batchSize: number }
 *   { type: 'embed_sentences', id, sentences: string[], batchSize: number }
 *   { type: 'load_reranker', enable: boolean }
 *
 * Messages sent:
 *   { type: 'ready' }
 *   { type: 'progress', message }
 *   { type: 'embed_result', id, embeddings: number[][] }
 *   { type: 'embed_sentences_result', id, embeddings: number[][] }
 *   { type: 'error', id, message }
 */

import { pipeline, env } from '@xenova/transformers';

// Configure ONNX WASM for reliable single-threaded CPU execution without SharedArrayBuffer requirements
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
env.backends.onnx.wasm.wasmPaths = '/'; // Serve WASM directly from client/public/
env.allowLocalModels = false;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

let embedder = null;
let reranker = null;
let loadingPromise = null;

async function getEmbedder() {
  if (embedder) return embedder;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      self.postMessage({ type: 'progress', message: 'Downloading embedding model (≈23 MB)…' });

      embedder = await pipeline('feature-extraction', MODEL_ID, {
        quantized: true,
        progress_callback: (info) => {
          if (info.status === 'downloading' || info.status === 'progress') {
            const pct = info.total > 0
              ? Math.round((info.loaded / info.total) * 100)
              : (info.progress ? Math.round(info.progress) : 0);
            self.postMessage({ type: 'progress', message: `Model download: ${pct}%` });
          } else if (info.status === 'init' || info.status === 'loading') {
            self.postMessage({ type: 'progress', message: 'Initializing model…' });
          }
        },
      });

      self.postMessage({ type: 'ready' });
      return embedder;
    } catch (err) {
      console.error('[embedWorker] Failed to load embedding model:', err);
      loadingPromise = null;
      self.postMessage({ type: 'error', message: err?.message || String(err) });
      throw err;
    }
  })();

  return loadingPromise;
}

async function getReranker() {
  if (reranker) return reranker;
  self.postMessage({ type: 'progress', message: 'Loading reranker model (lazy)…' });
  reranker = await pipeline('text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2', {
    quantized: true,
  });
  return reranker;
}

async function embedTexts(texts, batchSize = 8) {
  const emb = await getEmbedder();
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const out = await emb(batch, { pooling: 'mean', normalize: true });

    if (batch.length === 1) {
      allEmbeddings.push(Array.from(out.data));
    } else {
      const hiddenSize = out.data.length / batch.length;
      for (let b = 0; b < batch.length; b++) {
        const vec = Array.from(out.data.slice(b * hiddenSize, (b + 1) * hiddenSize));
        allEmbeddings.push(vec);
      }
    }

    // Let the event loop breathe
    await new Promise(r => setTimeout(r, 0));
  }

  return allEmbeddings;
}

self.onmessage = async (e) => {
  const { type, id, texts, batchSize = 8, sentences, enable } = e.data;

  try {
    if (type === 'init') {
      await getEmbedder();
      return;
    }

    if (type === 'embed') {
      const embeddings = await embedTexts(texts, batchSize);
      self.postMessage({ type: 'embed_result', id, embeddings });
      return;
    }

    if (type === 'embed_sentences') {
      const embeddings = await embedTexts(sentences, batchSize);
      self.postMessage({ type: 'embed_sentences_result', id, embeddings });
      return;
    }

    if (type === 'load_reranker') {
      if (enable) {
        await getReranker();
        self.postMessage({ type: 'reranker_ready' });
      }
      return;
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, message: err?.message || String(err) });
  }
};
