/**
 * UMAP Web Worker
 * ===============
 * Runs 2D UMAP dimensionality reduction in a background thread.
 * Subsamples to 3000 points max to keep RAM/CPU reasonable.
 *
 * Input:  { type: 'run', embeddings: number[][], labels: string[] }
 * Output: { type: 'result', points: [{x,y,label,originalIndex}] }
 *         { type: 'error', message }
 */

import { UMAP } from 'umap-js';

const MAX_POINTS = 3000;

self.onmessage = async (e) => {
  if (e.data.type !== 'run') return;

  let { embeddings, labels = [] } = e.data;

  if (!embeddings || embeddings.length === 0) {
    self.postMessage({ type: 'result', points: [] });
    return;
  }

  if (embeddings.length === 1) {
    self.postMessage({
      type: 'result',
      points: [{ x: 0.5, y: 0.5, label: labels[0] || '', originalIndex: 0 }],
    });
    return;
  }

  if (embeddings.length === 2) {
    self.postMessage({
      type: 'result',
      points: [
        { x: 0.3, y: 0.5, label: labels[0] || '', originalIndex: 0 },
        { x: 0.7, y: 0.5, label: labels[1] || '', originalIndex: 1 },
      ],
    });
    return;
  }

  // Subsample if too many
  let indices = embeddings.map((_, i) => i);
  if (embeddings.length > MAX_POINTS) {
    for (let i = MAX_POINTS; i < embeddings.length; i++) {
      const j = Math.floor(Math.random() * (i + 1));
      if (j < MAX_POINTS) {
        const tmp = indices[j];
        indices[j] = indices[i];
        indices[i] = tmp;
      }
    }
    indices = indices.slice(0, MAX_POINTS);
    embeddings = indices.map(i => embeddings[i]);
    labels = indices.map(i => labels[i]);
  }

  try {
    const n = Math.min(15, Math.max(2, Math.min(embeddings.length - 1, Math.floor(embeddings.length ** 0.5))));
    const umap = new UMAP({ nComponents: 2, nNeighbors: n, minDist: 0.1 });
    const result = umap.fit(embeddings);

    const points = result.map((coords, i) => ({
      x: coords[0],
      y: coords[1],
      label: labels[i] || '',
      originalIndex: indices[i],
    }));

    self.postMessage({ type: 'result', points });
  } catch (err) {
    console.error('[umapWorker] error:', err);
    // Graceful fallback to first two dimensions
    const points = embeddings.map((emb, i) => ({
      x: emb[0] || 0,
      y: emb[1] || 0,
      label: labels[i] || '',
      originalIndex: indices[i],
    }));
    self.postMessage({ type: 'result', points });
  }
};
