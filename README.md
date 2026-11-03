# ⚡ profileRAG

A local-first, transparent RAG (Retrieval-Augmented Generation) application.  
**Works with ZERO API keys** using extractive mode. Add a free key for AI-written answers.

---

## ✨ What makes this different?

| Feature | Details |
|---|---|
| 🧠 **Local embeddings** | Transformers.js · `all-MiniLM-L6-v2` · q8 quantized · CPU-only |
| 🗺️ **Vector map** | Live UMAP visualization in a Web Worker |
| 🔬 **X-Ray panel** | See every pipeline stage, token counts, TTFT, provider fallback |
| 💸 **Zero-cost default** | Extractive mode needs no API key |
| 🔒 **Privacy switch** | "Never send to cloud" forces local-only mode |
| 📉 **Low RAM** | ~4 GB target · no GPU needed |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** (check: `node --version`)
- No GPU, no Docker, no local LLM required

### 1. Install

```bash
git clone https://github.com/you/profileRAG.git
cd profileRAG
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and optionally add **one free API key** from any of:

| Provider | Free tier | Where to get key |
|---|---|---|
| **Groq** | ✅ Generous | https://console.groq.com/ |
| **Google Gemini** | ✅ Yes | https://aistudio.google.com/app/apikey |
| **OpenRouter** | ✅ `:free` models | https://openrouter.ai/ |
| **Cerebras** | ✅ Yes | https://cloud.cerebras.ai/ |

> **The app works with ZERO keys** — you'll get extractive answers from your documents.

### 3. Run

```bash
npm run dev
```

- Client: http://localhost:5173  
- Server: http://localhost:3001

---

## 🔄 How it works

### Ingestion (7 stages)
1. **Upload & Parse** — PDF, DOCX, TXT, MD
2. **Chunking** — 600 char chunks, 100 char overlap (configurable)
3. **Token Count** — Local estimate (~charCount / 4)
4. **Embedding** — Transformers.js in a Web Worker, batches of 8-16
5. **Index Commit** — Embeddings sent to server for cosine search
6. **UMAP Map** — 2D visualization in a separate Web Worker
7. **Ready** — Start asking questions

### Answering (Stage 8)
- Query is embedded locally
- Top-K chunks retrieved by cosine similarity
- **Fallback chain**: groq → gemini → openrouter → cerebras → extractive
- Providers with no key are skipped automatically
- On rate limit (429) or server error (5xx), switches to next provider with a visible animation

### Extractive Mode (no LLM)
- Sentences from retrieved chunks are scored by cosine similarity to the query
- Top 3-5 sentences selected, kept in document order
- Citations `[n]` attached — no AI hallucination possible
- Labeled clearly: "Built directly from your documents (no AI writer)"

---

## ⚙️ Settings

| Setting | Default | Notes |
|---|---|---|
| LLM provider | `auto` | Follows fallback order |
| Top-K | 4 | Chunks retrieved per query |
| Chunk size | 600 chars | ~150 tokens |
| Chunk overlap | 100 chars | |
| Embed batch size | 8 | Reduce if RAM is tight |
| Reranker | Off | Lazy-loaded when enabled |
| Never send to cloud | Off | Forces extractive mode |

---

## ✅ Acceptance Checklist

- [ ] **No keys**: Upload doc → watch pipeline → ask question → get extractive cited answer
- [ ] **One free key**: LLM streams answer with citations
- [ ] **Rate limited**: App visibly falls back to next provider, still answers
- [ ] **Peak RAM**: Reasonable on low-spec machine, no GPU needed

---

## 🏗️ Project Structure

```
profileRAG/
├── server/                  # Express.js API
│   └── src/
│       ├── pipeline/
│       │   ├── ingest/      # extractor, chunker
│       │   ├── search/      # cosine similarity
│       │   ├── generate/    # provider interface, fallback chain
│       │   └── store.js     # in-memory chunk store
│       └── routes/          # upload, query (SSE), status
├── client/                  # React + Vite
│   └── src/
│       ├── workers/         # embedWorker.js, umapWorker.js
│       ├── hooks/           # useEmbedWorker, usePipeline, useQuery, useStatus
│       └── components/      # pipeline, chat, xray, map, settings
└── .env.example
```

---

## 🔐 Privacy

API keys live **only in `.env` on the server** — never sent to the browser.

When a hosted provider is active, a notice reminds you that your question and retrieved chunks are sent externally. Toggle **"Never send data to cloud"** to force local-only extractive mode.
