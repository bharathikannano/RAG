/**
 * GET /api/status
 * Returns provider config (no keys!), usage stats, document list.
 */
import express from 'express';
import { getDocumentList } from '../pipeline/store.js';
import { getUsageToday } from './query.js';

const router = express.Router();

router.get('/', (_req, res) => {
  const fallbackOrder = (process.env.LLM_FALLBACK_ORDER || 'groq,gemini,openrouter,cerebras,extractive')
    .split(',').map(s => s.trim());

  const providers = fallbackOrder.map(name => {
    if (name === 'extractive') {
      return { name, available: true, model: 'local-extractive', hasKey: true };
    }
    const hasKey = Boolean(process.env[`${name.toUpperCase()}_API_KEY`]);
    const model = process.env[`${name.toUpperCase()}_MODEL`] || null;
    return { name, available: hasKey, model, hasKey };
  });

  res.json({
    providers,
    usageToday: getUsageToday(),
    documents: getDocumentList(),
    settings: {
      fallbackOrder,
      topK: 4,
      chunkSize: 600,
      chunkOverlap: 100,
      maxContextTokens: 3000,
      maxOutputTokens: 500,
      temperature: 0.2,
    },
  });
});

export { router as statusRouter };
