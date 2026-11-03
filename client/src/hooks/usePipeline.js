/**
 * usePipeline — orchestrates the full RAG ingestion pipeline.
 *
 * Stages:
 *   1. Upload & Parse   (server)
 *   2. Chunking         (server)
 *   3. Tokenize count   (local estimate)
 *   4. Embed chunks     (local — Transformers.js, batches of 8-16)
 *   5. Commit to store  (server)
 *   6. UMAP Map         (local — Web Worker, over ALL accumulated chunks)
 *   7. Ready
 *
 * Multi-doc: accumulated embeddings/chunks persist across calls so the
 * vector map and search always reflect the union of all uploaded files.
 */
import { useState, useCallback, useRef } from 'react';

const STAGES = [
  { id: 1, label: 'Upload & Parse', icon: '📄' },
  { id: 2, label: 'Chunking', icon: '✂️' },
  { id: 3, label: 'Token Count', icon: '🔢' },
  { id: 4, label: 'Embedding', icon: '🧠' },
  { id: 5, label: 'Index Commit', icon: '💾' },
  { id: 6, label: 'UMAP Map', icon: '🗺️' },
  { id: 7, label: 'Ready', icon: '✅' },
];

export { STAGES };

function runUmapWorker(embeddings, labels) {
  return new Promise((resolve) => {
    if (!embeddings || embeddings.length === 0) {
      resolve([]);
      return;
    }
    const worker = new Worker(new URL('../workers/umapWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.type === 'result') {
        resolve(e.data.points);
      } else {
        resolve(fallbackPoints(embeddings, labels));
      }
    };
    worker.onerror = () => {
      worker.terminate();
      resolve(fallbackPoints(embeddings, labels));
    };
    worker.postMessage({ type: 'run', embeddings, labels });
  });
}

function fallbackPoints(embeddings, labels) {
  return embeddings.map((emb, i) => ({
    x: emb[0] || 0,
    y: emb[1] || 0,
    label: labels[i] || '',
    originalIndex: i,
  }));
}

export function usePipeline({ embed }) {
  // Per-run state (reset on each runIngestion)
  const [stageState, setStageState] = useState({});
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });

  // Accumulated across ALL uploads — never cleared unless user removes a doc
  const [docList, setDocList] = useState([]); // [{docId, filename, charCount, chunkCount}]
  const [chunks, setChunks] = useState([]);   // all chunks from all docs
  const [embeddings, setEmbeddings] = useState([]); // all embeddings
  const [umapPoints, setUmapPoints] = useState([]);
  const [docMeta, setDocMeta] = useState(null); // last uploaded doc (for sidebar)

  // Refs for accumulation (survive re-renders without stale closure issues)
  const accChunksRef = useRef([]);    // { ...chunk, embedding, docId, filename }
  const accEmbedsRef = useRef([]);    // number[][] — same order as accChunksRef

  const abortRef = useRef(null);

  const setStage = (id, state) => setStageState(prev => ({ ...prev, [id]: state }));

  const runIngestion = useCallback(async (file, settings = {}) => {
    const { chunkSize = 600, chunkOverlap = 100, batchSize = 8 } = settings;

    // Reset per-run state only
    setError(null);
    setStageState({});
    setProgress({ current: 0, total: 0, label: '' });

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // --- Stage 1: Upload & Parse ---
      setStage(1, 'active');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chunkSize', chunkSize);
      formData.append('chunkOverlap', chunkOverlap);

      const parseRes = await fetch('/api/upload/parse', { method: 'POST', body: formData, signal: ac.signal });
      if (!parseRes.ok) throw new Error(await parseRes.text());
      const parsed = await parseRes.json();
      setStage(1, 'done');

      // --- Stage 2: Chunking ---
      setStage(2, 'active');
      const newDocMeta = { docId: parsed.docId, filename: parsed.filename, charCount: parsed.charCount };
      setDocMeta(newDocMeta);
      setStage(2, 'done');

      // --- Stage 3: Token count estimate ---
      setStage(3, 'active');
      const totalTokens = Math.round(parsed.charCount / 4);
      setProgress({ current: totalTokens, total: totalTokens, label: `~${totalTokens.toLocaleString()} tokens` });
      setStage(3, 'done');

      // --- Stage 4: Embed ---
      setStage(4, 'active');
      const texts = parsed.chunks.map(c => c.text);
      setProgress({ current: 0, total: texts.length, label: `Embedding chunk 0/${texts.length}` });

      const allEmbeddings = [];
      for (let i = 0; i < texts.length; i += batchSize) {
        if (ac.signal.aborted) throw new Error('Cancelled');
        const batch = texts.slice(i, Math.min(i + batchSize, texts.length));
        const batchEmbs = await embed(batch, batchSize);
        allEmbeddings.push(...batchEmbs);
        setProgress({ current: allEmbeddings.length, total: texts.length, label: `Embedded ${allEmbeddings.length}/${texts.length}` });
      }

      // Attach embedding + doc provenance to each chunk
      const chunksWithEmbeddings = parsed.chunks.map((c, i) => ({
        ...c,
        embedding: allEmbeddings[i],
        docId: parsed.docId,
        filename: parsed.filename,
      }));
      setStage(4, 'done');

      // --- Stage 5: Commit ---
      setStage(5, 'active');
      const commitRes = await fetch('/api/upload/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: parsed.docId, filename: parsed.filename, chunks: chunksWithEmbeddings }),
        signal: ac.signal,
      });
      if (!commitRes.ok) throw new Error(await commitRes.text());
      setStage(5, 'done');

      // Accumulate — append this doc's chunks/embeddings to the running total
      accChunksRef.current = [...accChunksRef.current, ...chunksWithEmbeddings];
      accEmbedsRef.current = [...accEmbedsRef.current, ...allEmbeddings];
      setChunks([...accChunksRef.current]);
      setEmbeddings([...accEmbedsRef.current]);
      setDocList(prev => [
        ...prev,
        { docId: parsed.docId, filename: parsed.filename, charCount: parsed.charCount, chunkCount: parsed.chunks.length },
      ]);

      // --- Stage 6: UMAP Map (over ALL accumulated embeddings) ---
      setStage(6, 'active');
      setProgress({ current: 0, total: 100, label: 'Computing 2D UMAP projection…' });
      const labels = accChunksRef.current.map(c => c.text?.slice(0, 80) || '');
      const points = await runUmapWorker(accEmbedsRef.current, labels);
      setUmapPoints(points);
      setStage(6, 'done');

      // --- Stage 7: Ready ---
      setStage(7, 'done');
      setProgress({ current: 100, total: 100, label: 'Index Ready' });

      return { docId: parsed.docId, chunks: chunksWithEmbeddings, embeddings: allEmbeddings, umapPoints: points };
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setStageState(prev => {
        const next = { ...prev };
        for (const s of STAGES) {
          if (next[s.id] === 'active') next[s.id] = 'error';
        }
        return next;
      });
    }
  }, [embed]);

  /** Remove a single document from all client-side state and the server store. */
  const removeDoc = useCallback(async (docId) => {
    try {
      await fetch(`/api/upload/${docId}`, { method: 'DELETE' });
    } catch (_) {
      // Best-effort — remove from client state regardless
    }

    setDocList(prev => prev.filter(d => d.docId !== docId));
    accChunksRef.current = accChunksRef.current.filter(c => c.docId !== docId);
    accEmbedsRef.current = accChunksRef.current.map(c => c.embedding);
    setChunks([...accChunksRef.current]);
    setEmbeddings([...accEmbedsRef.current]);

    // Re-run UMAP with remaining embeddings
    if (accEmbedsRef.current.length > 0) {
      const labels = accChunksRef.current.map(c => c.text?.slice(0, 80) || '');
      const points = await runUmapWorker(accEmbedsRef.current, labels);
      setUmapPoints(points);
    } else {
      setUmapPoints([]);
      setDocMeta(null);
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { stageState, chunks, embeddings, umapPoints, docMeta, docList, error, progress, runIngestion, removeDoc, cancel };
}
