import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { uploadRouter } from './routes/upload.js';
import { queryRouter } from './routes/query.js';
import { statusRouter } from './routes/status.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/query', queryRouter);
app.use('/api/status', statusRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.listen(PORT, () => {
  console.log(`\n🔧 profileRAG server → http://localhost:${PORT}`);
  console.log(`   LLM fallback order: ${process.env.LLM_FALLBACK_ORDER || 'extractive'}`);
  console.log(`   Keys found: ${buildKeyStatus()}\n`);
});

function buildKeyStatus() {
  const providers = ['GROQ', 'GEMINI', 'OPENROUTER', 'CEREBRAS'];
  const found = providers.filter(p => process.env[`${p}_API_KEY`]);
  return found.length ? found.join(', ') : 'none (extractive mode only)';
}
