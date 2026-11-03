/**
 * In-memory document store.
 * Holds all ingested chunks + their embeddings (Float32Array).
 * Key: docId (uuid), Value: { id, filename, chunks: [{id, text, embedding, meta}] }
 */

const store = new Map();

export function addDocument(doc) {
  store.set(doc.id, doc);
}

export function getDocument(id) {
  return store.get(id);
}

export function getAllChunks() {
  const chunks = [];
  for (const doc of store.values()) {
    for (const chunk of doc.chunks) {
      chunks.push({ ...chunk, docId: doc.id, filename: doc.filename });
    }
  }
  return chunks;
}

export function getDocumentList() {
  return [...store.values()].map(d => ({
    id: d.id,
    filename: d.filename,
    chunkCount: d.chunks.length,
    uploadedAt: d.uploadedAt,
  }));
}

export function hasChunks() {
  for (const doc of store.values()) {
    if (doc.chunks.length > 0) return true;
  }
  return false;
}

export function removeDocument(id) {
  store.delete(id);
}

export function clearAll() {
  store.clear();
}
