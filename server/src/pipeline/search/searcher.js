/**
 * Cosine similarity search over in-memory chunk store.
 * Embeddings are Float32 arrays already stored server-side
 * (sent from the browser after local Transformers.js inference).
 */

import { getAllChunks } from '../store.js';

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Returns top-k chunks by cosine similarity to queryEmbedding.
 * @param {number[]} queryEmbedding  - already-computed query embedding
 * @param {number}   topK            - number of results (default 4)
 */
export function searchChunks(queryEmbedding, topK = 4) {
  const chunks = getAllChunks();
  if (chunks.length === 0) return [];

  const scored = chunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ embedding: _e, ...rest }) => rest);
}

/**
 * Sentence-level scoring for extractive mode.
 * @param {string[]} sentences        - sentences extracted from retrieved chunks
 * @param {number[]} queryEmbedding   - query embedding
 * @param {number[][]} sentenceEmbeddings - one per sentence
 * @param {number} topN               - how many to pick (3-5)
 */
export function scoreAndPickSentences(sentences, queryEmbedding, sentenceEmbeddings, topN = 4) {
  const scored = sentences.map((text, i) => ({
    text,
    score: cosineSimilarity(queryEmbedding, sentenceEmbeddings[i]),
    originalIndex: i,
  }));
  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, topN);
  // Restore document order
  picked.sort((a, b) => a.originalIndex - b.originalIndex);
  return picked;
}
