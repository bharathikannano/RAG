/**
 * POST /api/upload/parse   — upload & chunk a single file
 * POST /api/upload/commit  — commit pre-embedded chunks
 * DELETE /api/upload/:docId — remove a document from the store
 */
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extractText } from '../pipeline/ingest/extractor.js';
import { chunkText } from '../pipeline/ingest/chunker.js';
import { addDocument, removeDocument } from '../pipeline/store.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/**
 * Stage 1 — parse & chunk (no embeddings yet, browser will embed)
 * POST /api/upload/parse
 */
router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    const chunkSize = parseInt(req.body.chunkSize) || 600;
    const chunkOverlap = parseInt(req.body.chunkOverlap) || 100;
    const rawChunks = chunkText(text, { chunkSize, chunkOverlap });

    const docId = uuidv4();
    const chunks = rawChunks.map((c, i) => ({ id: `${docId}_${i}`, ...c }));

    res.json({
      docId,
      filename: req.file.originalname,
      charCount: text.length,
      chunks, // text + meta, no embeddings yet
    });
  } catch (err) {
    console.error('[upload/parse]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Stage 4 — commit (after browser has computed embeddings)
 * POST /api/upload/commit
 * Body JSON: { docId, filename, chunks: [{id, text, meta, embedding: number[]}] }
 */
router.post('/commit', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { docId, filename, chunks } = req.body;
    if (!docId || !chunks) return res.status(400).json({ error: 'Missing docId or chunks' });

    addDocument({
      id: docId,
      filename,
      chunks,
      uploadedAt: new Date().toISOString(),
    });

    res.json({ ok: true, docId, chunkCount: chunks.length });
  } catch (err) {
    console.error('[upload/commit]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/upload/:docId — remove a document from the in-memory store
 */
router.delete('/:docId', express.json(), (req, res) => {
  try {
    const { docId } = req.params;
    if (!docId) return res.status(400).json({ error: 'Missing docId' });
    removeDocument(docId);
    res.json({ ok: true, docId });
  } catch (err) {
    console.error('[upload/delete]', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as uploadRouter };
