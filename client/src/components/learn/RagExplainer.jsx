import { useState, useRef, useEffect } from 'react';
import './RagExplainer.css';
import './VisualLearning.css';
import VectorSpaceSimulator from './VectorSpaceSimulator.jsx';
import InteractiveFlowDiagram from './InteractiveFlowDiagram.jsx';
import DeepLearningTransformerViz from './DeepLearningTransformerViz.jsx';
import InteractiveSandbox from './InteractiveSandbox.jsx';
import RagStoryPlayer from './RagStoryPlayer.jsx';
import RagKnowledgeQuiz from './RagKnowledgeQuiz.jsx';
import RagComparisonMatrix from './RagComparisonMatrix.jsx';
import { useVoiceover } from './useVoiceover.js';

const RAG_STEPS = [
  {
    id: 'doc', emoji: '📄', short: 'Raw Document', color: 'hsl(30,90%,62%)', phase: 'INGESTION',
    title: 'Raw Document Input',
    analogy: 'Think of it like a textbook or resume you want to teach an AI about.',
    what: 'A PDF, DOCX, TXT, or Markdown file is uploaded as the private knowledge source.',
    why: 'LLMs have a fixed knowledge cutoff and a limited context window (~4K–128K tokens). You cannot inject arbitrary private files into model weights — you must provide them at query time via RAG.',
    how: `// Raw text extracted from your uploaded document:
const text = await extractText(file);

// Example extracted content:
// "Bharathikannan joined as a Senior ML Engineer in 2022.
//  He led the NLP team at Acme Corp for 3 years, building
//  semantic search engines and transformer pipelines..."`,
    math: null,
    bullet: [
      'Supports PDF, DOCX, TXT, and Markdown files',
      'Extracted cleanly using pdf-parse and mammoth on the server',
      'Preserves original whitespace, formatting, and paragraphs'
    ],
  },
  {
    id: 'chunk', emoji: '✂️', short: 'Chunking', color: 'hsl(45,90%,58%)', phase: 'INGESTION',
    title: 'Text Chunking — Sliding Window',
    analogy: 'Like cutting a long 10-page report into neatly sized index cards with overlapping edges.',
    what: 'The entire document text is split into overlapping segments called "chunks" (default: 600 characters with a 100-character overlap window).',
    why: 'Embedding models have a strict input limit (512 tokens). Smaller chunks provide pinpoint retrieval accuracy, while sliding overlap guarantees critical sentences across boundaries are never cut in half.',
    how: `// server/src/pipeline/ingest/chunker.js
function chunkText(text, size = 600, overlap = 100) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push({
      text: text.slice(start, start + size),
      charStart: start,
    });
    start += size - overlap; // slide forward with overlap
  }
  return chunks;
}`,
    math: `Number of chunks ≈ ceil((L - overlap) / (size - overlap))
Where L = document length in characters (e.g. 10,000 chars → ~20 chunks)`,
    bullet: [
      'Each chunk is a self-contained semantic unit of knowledge',
      '100-character overlap prevents losing context at chunk boundaries',
      '600 characters ≈ 120–150 tokens, ideal for MiniLM embeddings'
    ],
  },
  {
    id: 'embed', emoji: '🧠', short: 'Embedding', color: 'var(--accent)', phase: 'INGESTION',
    title: 'Embedding — Text → 384D Vector',
    analogy: 'Converting every chunk into precise GPS coordinates in a 384-dimensional universe of meaning.',
    what: 'Each text chunk is passed through a neural transformer model (all-MiniLM-L6-v2, 22 MB) producing a 384-dimensional floating-point vector.',
    why: 'Computers cannot calculate the semantic similarity of raw words. Vectors translate semantic concepts into geometry: similar meanings point in the exact same direction in 384D space.',
    how: `// client/src/workers/embedWorker.js (in browser Web Worker)
const embedder = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2',
  { quantized: true }   // INT8 quantization: 4x smaller, 95% quality
);

const output = await embedder(chunkText, {
  pooling: 'mean',       // average all token vectors into 1 vector
  normalize: true,       // L2 normalize onto a unit-length hypersphere
});

// Result: Float32Array([0.12, -0.07, 0.34, ... 384 dimensions])`,
    math: `Embedding e ∈ ℝ³⁸⁴
Mean pooling: e = (1/T) Σᵢ hᵢ  where hᵢ = hidden state of token i
L2 normalization: ê = e / ||e||  so that length ||ê|| = 1.0`,
    bullet: [
      'Model: Xenova/all-MiniLM-L6-v2 (384 dimensions, 22 MB quantized)',
      'Runs 100% locally in your browser via WebAssembly ONNX Runtime',
      'INT8 quantized: 4× smaller RAM footprint with <5% quality loss'
    ],
  },
  {
    id: 'store', emoji: '💾', short: 'Vector Store', color: 'hsl(160,70%,55%)', phase: 'INGESTION',
    title: 'Vector Store — In-Memory Index',
    analogy: 'Like a smart filing cabinet where each folder is filed by its exact semantic coordinates.',
    what: 'All chunk vectors together with their original raw text are stored in a fast in-memory array on the server.',
    why: 'When a user asks a question, we need to compare the query against every chunk instantly. The vector index stores both the numbers for similarity search and the text for LLM context.',
    how: `// server/src/pipeline/store.js
const chunkStore = []; // In-memory database of chunks

export function commitChunks(chunks) {
  chunkStore.length = 0; // Replace previous document
  for (const c of chunks) {
    chunkStore.push({
      chunkId: c.chunkId,
      text: c.text,
      embedding: c.embedding, // Float32Array(384)
      filename: c.filename,
    });
  }
}`,
    math: `Store S = { (eᵢ, tᵢ) | i = 1…N }
where eᵢ ∈ ℝ³⁸⁴ = embedding vector
      tᵢ = raw chunk text
      N = number of chunks in document`,
    bullet: [
      'Pure in-memory RAM: ultra-fast, zero external database setup',
      'Production equivalents: Pinecone, Chroma, Qdrant, pgvector, FAISS',
      'Automatically updated whenever you upload a new document'
    ],
  },
  {
    id: 'query', emoji: '❓', short: 'Query Embed', color: 'var(--accent-2)', phase: 'RETRIEVAL',
    title: 'Query → Embedding (Shared Space)',
    analogy: 'Translating your question into the exact same GPS coordinate language as the document.',
    what: "The user's question is embedded using the EXACT SAME model as the chunks, mapping both into the shared 384D semantic space.",
    why: 'If question and chunks were embedded by different models, their dimensions would not align. Sharing the same model ensures cosine distance accurately reflects true meaning.',
    how: `// client/src/hooks/useQuery.js (runs locally in browser)
const [queryEmbedding] = await embed([question], 1);
// queryEmbedding: Float32Array(384)
// Runs 100% locally — your private question never leaves your device

// Send vector to server for similarity matching:
fetch('/api/query', {
  method: 'POST',
  body: JSON.stringify({
    question,
    queryEmbedding: Array.from(queryEmbedding),
    topK: 4,
  })
});`,
    math: `q = Embed_φ(question) ∈ ℝ³⁸⁴
φ = exact same model used for chunk embeddings
Both q and chunk eᵢ inhabit the exact same hypersphere`,
    bullet: [
      'Processed locally in browser — question is never transmitted raw',
      'Takes ~10–30ms on CPU using the quantized ONNX model',
      'Same mathematical coordinates allow direct geometric comparison'
    ],
  },
  {
    id: 'search', emoji: '🔍', short: 'Vector Search', color: 'hsl(210,85%,65%)', phase: 'RETRIEVAL',
    title: 'Cosine Similarity Search — Top-K',
    analogy: 'Scanning the universe of chunks to find the 4 nearest stars to your question location.',
    what: 'The server computes the dot product (cosine similarity) between your query vector and every stored chunk vector, returning the Top-K highest-scoring chunks.',
    why: 'Cosine similarity measures the angle between two vectors: 1.0 = identical meaning, 0.0 = completely unrelated. It is the gold standard for semantic relevance ranking.',
    how: `// server/src/pipeline/search/searcher.js
export function cosineSimilarity(a, b) {
  // Both vectors are L2-normalized → dot product = cosine similarity
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot; // range: [-1, 1], typically [0, 1] for semantic text
}

export function searchChunks(queryEmbedding, topK = 4) {
  return chunkStore
    .map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK); // Select top-4 most relevant chunks
}`,
    math: `cos(q, eᵢ) = (q · eᵢ) / (||q|| ||eᵢ||)
Since vectors are normalized (||q|| = ||eᵢ|| = 1.0):
cos(q, eᵢ) = q · eᵢ = Σⱼ qⱼ · eᵢⱼ

Top-K = argmaxₖ { cos(q, eᵢ) | i = 1…N }`,
    bullet: [
      'Linear scan: O(N × 384), lightning fast (<2ms) for documents under 10K chunks',
      'Scores range from 0.0 to 1.0; matches above 0.75 are strong factual hits',
      'Completely filters out irrelevant sections of your document'
    ],
  },
  {
    id: 'context', emoji: '📎', short: 'Context Build', color: 'hsl(270,70%,65%)', phase: 'GENERATION',
    title: 'Context Assembly → Prompt Injection',
    analogy: 'Handing the LLM the 4 relevant index cards and saying: "Only use these facts to answer."',
    what: 'The Top-K retrieved chunks are assembled into an augmented system prompt with bracketed citations [1], [2], etc.',
    why: 'This is the "A" in RAG — Augmented. Without this step, an LLM hallucinates or replies with outdated training data. Grounding in retrieved text guarantees factual accuracy.',
    how: `// server/src/routes/query.js
const contextText = chunks
  .map((c, i) => \`[\${i + 1}] \${c.text}\`)
  .join('\\n\\n');

const messages = [
  {
    role: 'system',
    content: \`You are an accurate, grounded assistant.
Answer ONLY from the provided context passages below.
Cite sources inline as [1], [2] when stating facts.
If the context does not answer the question, say so.

Context:
\${contextText}\`
  },
  ...conversationHistory,
  { role: 'user', content: question }
];`,
    math: `Context Token Budget:
Total Tokens ≤ Context Window Limit (e.g. 4096 tokens)
= |System Prompt| + Σ|Chunkᵢ| + |History| + |Generated Answer|

Configured allocation: 3,000 context tokens, 500 answer tokens`,
    bullet: [
      'The retrieved chunks are the ONLY facts the model is allowed to use',
      'Citation tags [1], [2] ensure every assertion is auditable',
      'Prevents hallucination by strictly restricting open-ended generation'
    ],
  },
  {
    id: 'llm', emoji: '✨', short: 'LLM Generation', color: 'hsl(300,80%,65%)', phase: 'GENERATION',
    title: 'Streaming Generation — Fallback Chain',
    analogy: 'The AI reads the retrieved cards and streams a crisp, cited summary token-by-token.',
    what: 'Messages are dispatched to an LLM provider (Groq, Gemini, OpenRouter, Cerebras) via OpenAI-compatible API. Tokens stream back live via Server-Sent Events (SSE).',
    why: 'Streaming SSE gives near-instant visual feedback. The automatic fallback chain guarantees the app stays functional even if one provider hits rate limits or server errors.',
    how: `// server/src/pipeline/generate/openaiProvider.js
async *streamAnswer({ messages, signal }) {
  const stream = await openai.chat.completions.create({
    model: this.model,
    messages,
    stream: true,
    max_tokens: 500,
    temperature: 0.2, // Low temp = deterministic, factual responses
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield { type: 'token', text };
  }
}`,
    math: `Transformer Attention Mechanism:
Attention(Q, K, V) = softmax(Q · Kᵀ / √dₖ) · V

Sampling Distribution:
P(yₜ | y₁..ₜ₋₁, context) = softmax(logits / τ)
Temperature τ = 0.2 concentrates probability on factual tokens`,
    bullet: [
      'SSE (Server-Sent Events): unidirectional real-time token stream',
      'Automatic Fallback: Groq → Gemini → OpenRouter → Cerebras → Extractive',
      'Extractive Mode: 100% local, runs with zero API keys or external services'
    ],
  },
  {
    id: 'answer', emoji: '💬', short: 'Cited Answer', color: 'hsl(140,70%,55%)', phase: 'GENERATION',
    title: 'Grounded Answer with Source Citations',
    analogy: 'A research thesis with footnotes — you can click any citation to see the exact proof passage.',
    what: 'The UI renders the completed answer with clickable citation chips [1], [2] linking directly to the exact source passages in your document.',
    why: 'Transparency is the defining superpower of RAG. Users do not need to blindly trust the AI: every claim is provable and linked to original text.',
    how: `// client/src/components/chat/AnswerDisplay.jsx
function renderWithCitations(answer, chunks) {
  return answer.split(/(\\[\\d+\\])/g).map((part, i) => {
    const match = part.match(/^\\[(\\d+)\\]$/);
    if (match) {
      const idx = parseInt(match[1]) - 1;
      return (
        <span key={i} className="citation-chip" title={chunks[idx]?.text}>
          [{match[1]}]
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}`,
    math: `RAG Quality Metric Q:
Q = Retrieval_Precision × LLM_Faithfulness

Hallucination Probability ∝ 1 / Grounded_Evidence
Higher cosine match → higher factual certainty`,
    bullet: [
      'Click any citation chip [1] to open the matching source chunk',
      'Includes exact similarity percentage and char-offset proof',
      'Eliminates AI confabulation through verifiable evidence'
    ],
  },
];

const PHASES = {
  INGESTION: { color: '#f59e0b', label: '📥 Phase 1: Ingestion (one-time setup)' },
  RETRIEVAL: { color: '#38bdf8', label: '🔍 Phase 2: Retrieval (per user query)' },
  GENERATION: { color: '#c084fc', label: '✨ Phase 3: Generation (streaming answer)' },
};

function LineTokens({ text }) {
  if (!text) return <span>&nbsp;</span>;
  const regex = /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|async|await|return|import|export|from|for|while|if|else|new|yield|class)\b)|(\b\d+(?:\.\d+)?\b)|(\b(?:push|slice|map|sort|filter|split|match|join|length|toFixed|parseInt|Float32Array|Array|console|log)\b)/g;

  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
    }
    const [full, comment, string, keyword, number, method] = match;
    if (comment) {
      elements.push(<span key={match.index} className="tok-comment">{comment}</span>);
    } else if (string) {
      elements.push(<span key={match.index} className="tok-string">{string}</span>);
    } else if (keyword) {
      elements.push(<span key={match.index} className="tok-keyword">{keyword}</span>);
    } else if (number) {
      elements.push(<span key={match.index} className="tok-number">{number}</span>);
    } else if (method) {
      elements.push(<span key={match.index} className="tok-method">{method}</span>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    elements.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }

  return <>{elements}</>;
}

function CodeBlock({ code }) {
  const lines = code.split('\n');
  return (
    <pre className="code-block">
      <code>
        {lines.map((line, i) => (
          <div key={i} className="code-line">
            <LineTokens text={line} />
          </div>
        ))}
      </code>
    </pre>
  );
}

function SimilarityBar({ label, score, color, isMatch }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="sim-bar-row">
      <div className="sim-bar-info">
        <span className="sim-bar-label">{label}</span>
        <span className={`sim-bar-badge ${isMatch ? 'match' : 'filtered'}`}>
          {isMatch ? '✅ Top-K Retrieved' : '❌ Filtered Out'}
        </span>
      </div>
      <div className="sim-bar-track">
        <div 
          className="sim-bar-fill" 
          style={{ 
            width: mounted ? `${score * 100}%` : '0%', 
            background: color,
            boxShadow: mounted ? `0 0 12px ${color}88` : 'none'
          }} 
        />
      </div>
      <span className="sim-bar-val" style={{ color }}>{(score * 100).toFixed(0)}%</span>
    </div>
  );
}

function EmbeddingViz() {
  const vals = [
    0.12, -0.07, 0.34, 0.88, -0.45, 0.23, 0.67, -0.31,
    0.15, 0.72, -0.09, 0.51, 0.28, -0.63, 0.41, 0.19,
    -0.55, 0.36, 0.82, -0.24, 0.61, 0.08, -0.47, 0.39
  ];
  return (
    <div className="embed-viz">
      <div className="embed-viz-header">
        <span className="embed-viz-title">384 Dimensions — First 24 feature values shown:</span>
        <span className="embed-norm-pill">L2 Unit Vector (Length = 1.0)</span>
      </div>
      <div className="embed-grid">
        {vals.map((v, i) => {
          const isPos = v > 0;
          return (
            <div 
              key={i} 
              className="embed-cell" 
              style={{
                background: isPos ? 'rgba(99, 102, 241, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                borderColor: isPos ? 'rgba(129, 140, 248, 0.45)' : 'rgba(248, 113, 113, 0.45)',
                color: isPos ? '#c7d2fe' : '#fca5a5'
              }}
            >
              <span className="dim-idx">d{i}</span>
              <span className="dim-val">{v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)}</span>
            </div>
          );
        })}
        <div className="embed-cell embed-more">
          <span className="dim-idx">...</span>
          <span className="dim-val">+360 more</span>
        </div>
      </div>
      <div className="embed-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#818cf8' }} />
          <span><strong>Positive (+) values:</strong> Semantic attributes present (e.g., "technical", "engineering")</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#f87171' }} />
          <span><strong>Negative (-) values:</strong> Opposing or absent semantic concepts</span>
        </div>
      </div>
    </div>
  );
}

export default function RagExplainer() {
  const [learnMode, setLearnMode] = useState('story'); // 'story' | 'flow' | 'vector' | 'transformer' | 'sandbox' | 'steps'
  const [theoryLevel, setTheoryLevel] = useState('eli5'); // 'eli5' | 'tech'
  const [activeStep, setActiveStep] = useState(0);
  const [fading, setFading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const timerRef = useRef(null);
  const step = RAG_STEPS[activeStep];

  const {
    isSupported: isVoiceSupported,
    isSpeaking,
    speak,
    stop: stopVoice,
  } = useVoiceover();

  useEffect(() => {
    if (autoPlay) {
      timerRef.current = setInterval(() => {
        goTo((prev) => (prev >= RAG_STEPS.length - 1 ? 0 : prev + 1));
      }, 5500); // comfortable 5.5s reading pacing
    }
    return () => clearInterval(timerRef.current);
  }, [autoPlay, activeStep]);

  const goTo = (target) => {
    stopVoice();
    const nextIdx = typeof target === 'function' ? target(activeStep) : target;
    if (nextIdx === activeStep) return;
    setFading(true);
    setTimeout(() => {
      setActiveStep(nextIdx);
      setTimeout(() => setFading(false), 30);
    }, 120);
  };

  const phase = PHASES[step.phase];

  return (
    <div className="rag-explainer">
      {/* Hero Header */}
      <div className="rag-hero">
        <div>
          <h2 className="rag-main-title">
            <span style={{ color: 'var(--accent)' }}>RAG</span> Interactive Visual Learning Suite
          </h2>
          <p className="rag-subtitle">
            Explore animated visual stories, neural transformer architectures, 2D vector geometry, and live execution sandboxes.
          </p>
        </div>
        {learnMode === 'steps' && (
          <button
            className={`btn ${autoPlay ? 'btn-active' : 'btn-ghost'} autoplay-btn`}
            onClick={() => setAutoPlay(p => !p)}
            id="rag-autoplay-btn"
          >
            {autoPlay ? '⏸ Pause Auto-play' : '▶ Auto-play Walkthrough'}
          </button>
        )}
      </div>

      {/* Visual Learning Suite Mode Selector */}
      <div className="learn-mode-bar" role="tablist" aria-label="Visual Learning Mode">
        <button
          className={`learn-mode-btn ${learnMode === 'story' ? 'active' : ''}`}
          onClick={() => setLearnMode('story')}
          id="mode-story-btn"
        >
          🎬 Animated Story (Level Zero)
        </button>
        <button
          className={`learn-mode-btn ${learnMode === 'flow' ? 'active' : ''}`}
          onClick={() => setLearnMode('flow')}
          id="mode-flow-btn"
        >
          🗺️ End-to-End System Flow
        </button>
        <button
          className={`learn-mode-btn ${learnMode === 'vector' ? 'active' : ''}`}
          onClick={() => setLearnMode('vector')}
          id="mode-vector-btn"
        >
          📐 2D Vector Space Simulator
        </button>
        <button
          className={`learn-mode-btn ${learnMode === 'transformer' ? 'active' : ''}`}
          onClick={() => setLearnMode('transformer')}
          id="mode-transformer-btn"
        >
          🧠 Inside the Transformer
        </button>
        <button
          className={`learn-mode-btn ${learnMode === 'sandbox' ? 'active' : ''}`}
          onClick={() => setLearnMode('sandbox')}
          id="mode-sandbox-btn"
        >
          🧪 Live RAG Sandbox
        </button>
        <button
          className={`learn-mode-btn ${learnMode === 'steps' ? 'active' : ''}`}
          onClick={() => setLearnMode('steps')}
          id="mode-steps-btn"
        >
          📖 Step-by-Step Code (1–9)
        </button>
        <button
          className={`learn-mode-btn ${learnMode === 'quiz' ? 'active' : ''}`}
          onClick={() => setLearnMode('quiz')}
          id="mode-quiz-btn"
        >
          🏆 Knowledge Quiz &amp; Mastery
        </button>
        <button
          className={`learn-mode-btn ${learnMode === 'matrix' ? 'active' : ''}`}
          onClick={() => setLearnMode('matrix')}
          id="mode-matrix-btn"
        >
          📊 Architecture Tradeoff Matrix
        </button>
      </div>

      {/* Active Visual Mode */}
      {learnMode === 'story' && <RagStoryPlayer />}
      {learnMode === 'flow' && <InteractiveFlowDiagram />}
      {learnMode === 'vector' && <VectorSpaceSimulator />}
      {learnMode === 'transformer' && <DeepLearningTransformerViz />}
      {learnMode === 'sandbox' && <InteractiveSandbox />}
      {learnMode === 'quiz' && <RagKnowledgeQuiz />}
      {learnMode === 'matrix' && <RagComparisonMatrix />}

      {learnMode === 'steps' && (
        <>
          {/* Theory Level Switcher */}
          <div className="theory-level-bar">
            <span className="theory-level-label">Theory Complexity:</span>
            <button
              className={`theory-level-btn ${theoryLevel === 'eli5' ? 'active' : ''}`}
              onClick={() => setTheoryLevel('eli5')}
            >
              👶 ELI5: Simple English & Metaphors
            </button>
            <button
              className={`theory-level-btn ${theoryLevel === 'tech' ? 'active' : ''}`}
              onClick={() => setTheoryLevel('tech')}
            >
              🔬 Deep Technical & Math
            </button>
          </div>

          {/* Phase Legend */}
          <div className="phase-legend">
            {Object.entries(PHASES).map(([k, p]) => (
              <div key={k} className="phase-pill" style={{ '--phase-color': p.color }}>
                {p.label}
              </div>
            ))}
          </div>

      {/* Interactive Pipeline Navigation Bar */}
      <div className="pipeline-flow" role="tablist" aria-label="RAG pipeline steps">
        {RAG_STEPS.map((s, i) => (
          <div key={s.id} className="flow-item">
            <button
              id={`rag-step-${s.id}`}
              role="tab"
              aria-selected={i === activeStep}
              className={`flow-node ${i === activeStep ? 'active' : ''} ${i < activeStep ? 'done' : ''}`}
              style={{ '--nc': s.color }}
              onClick={() => goTo(i)}
              title={`Step ${i + 1}: ${s.short}`}
            >
              <span className="fn-emoji">{s.emoji}</span>
              <span className="fn-label">{s.short}</span>
              <span className="fn-phase" style={{ color: PHASES[s.phase].color }}>
                {s.phase}
              </span>
              {i < activeStep && <span className="fn-done">✓</span>}
            </button>
            {i < RAG_STEPS.length - 1 && (
              <div className={`flow-connector ${i < activeStep ? 'lit' : ''}`}>
                <div className="connector-line" />
                <div className="connector-arrow">▶</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step Progress Bar */}
      <div className="rag-progress">
        <div 
          className="rag-progress-fill" 
          style={{
            width: `${((activeStep + 1) / RAG_STEPS.length) * 100}%`,
            background: step.color,
          }} 
        />
      </div>

      {/* Main Detail Panel */}
      <div className={`detail-panel ${fading ? 'fading' : ''}`}>
        {/* Panel Header */}
        <div className="detail-header">
          <span className="detail-big-emoji">{step.emoji}</span>
          <div className="detail-header-text">
            <div className="detail-phase-tag" style={{ color: phase.color, borderColor: phase.color }}>
              STAGE {activeStep + 1} OF {RAG_STEPS.length} &bull; {step.phase}
            </div>
            <h3 className="detail-title">{step.title}</h3>
          </div>
          <div className="detail-header-actions">
            {isVoiceSupported && (
              <button
                className={`step-listen-btn ${isSpeaking ? 'speaking' : ''}`}
                onClick={() => {
                  if (isSpeaking) {
                    stopVoice();
                  } else {
                    const narration = `Stage ${activeStep + 1}: ${step.title}. ${step.analogy}. In this stage: ${step.what}. Why this matters: ${step.why}.`;
                    speak(narration);
                  }
                }}
                title={isSpeaking ? 'Stop narration' : 'Listen to this stage voiceover'}
              >
                {isSpeaking ? (
                  <>
                    <span>⏹ Stop Voice</span>
                  </>
                ) : (
                  <>
                    <span>🎙️ Listen to Stage</span>
                  </>
                )}
              </button>
            )}
            <div className="step-counter">
              {activeStep + 1} / {RAG_STEPS.length}
            </div>
          </div>
        </div>

        {/* Intuitive Analogy Box */}
        <div className="analogy-box" style={{ '--step-color': step.color }}>
          <span className="analogy-icon">💡</span>
          <div className="analogy-content">
            <span className="analogy-title">Simple Mental Model:</span>
            <p className="analogy-text">{step.analogy}</p>
          </div>
        </div>

        {/* Two-Column Deep-Dive Content */}
        <div className="detail-columns">
          {/* Left Column: Explanations & Theory */}
          <div className="detail-col">
            <div className="detail-section">
              <div className="section-label">📌 WHAT HAPPENS HERE</div>
              <p className="prose">{step.what}</p>
            </div>

            <div className="detail-section">
              <div className="section-label">🎯 WHY THIS MATTERS</div>
              <p className="prose">{step.why}</p>
            </div>

            <div className="detail-section">
              <div className="section-label">📋 KEY TAKEAWAYS</div>
              <ul className="fact-list">
                {step.bullet.map((b, i) => (
                  <li key={i}>
                    <span className="fact-bullet" style={{ color: step.color }}>◆</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {theoryLevel === 'eli5' && (
              <div className="detail-section">
                <div className="section-label">💡 LEVEL ZERO INTUITION</div>
                <div className="eli5-hero-card" style={{ borderColor: step.color }}>
                  <div className="eli5-hero-title" style={{ color: step.color }}>
                    <span>Mental Model: {step.short}</span>
                  </div>
                  <p className="eli5-hero-text">
                    <strong>Simple rule:</strong> {step.analogy}
                  </p>
                </div>
              </div>
            )}

            {theoryLevel === 'tech' && step.math && (
              <div className="detail-section">
                <div className="section-label">∑ THE MATHEMATICAL FORMULA</div>
                <pre className="math-block">{step.math}</pre>
              </div>
            )}
          </div>

          {/* Right Column: Code & Interactive Demonstrations */}
          <div className="detail-col">
            <div className="detail-section">
              <div className="section-label">💻 ACTUAL CODE (IN THIS APP)</div>
              <CodeBlock code={step.how} />
            </div>

            {/* Step 3: Embedding Visualizer */}
            {step.id === 'embed' && (
              <div className="detail-section">
                <div className="section-label">🔢 LIVE EMBEDDING VECTOR PREVIEW</div>
                <EmbeddingViz />
              </div>
            )}

            {/* Step 6: Similarity Scores Demo */}
            {step.id === 'search' && (
              <div className="detail-section">
                <div className="section-label">📊 REAL-WORLD COSINE SIMILARITY SCORES</div>
                <div className="sim-bar-container">
                  <SimilarityBar 
                    label="Chunk 1 — Senior ML Engineer (2022)" 
                    score={0.91} 
                    color="var(--accent)" 
                    isMatch={true} 
                  />
                  <SimilarityBar 
                    label="Chunk 2 — Led NLP team at Acme Corp" 
                    score={0.84} 
                    color="var(--accent)" 
                    isMatch={true} 
                  />
                  <SimilarityBar 
                    label="Chunk 4 — PyTorch, Transformers skills" 
                    score={0.72} 
                    color="#38bdf8" 
                    isMatch={true} 
                  />
                  <SimilarityBar 
                    label="Chunk 3 — Weekend photography hobby" 
                    score={0.28} 
                    color="#f43f5e" 
                    isMatch={false} 
                  />
                </div>
                <div className="sim-explanation">
                  <strong>Query:</strong> "What is his machine learning background?"<br />
                  <strong>Result:</strong> Chunks 1, 2 & 4 score high (&gt;0.70) and are passed to the LLM. Chunk 3 is discarded as irrelevant.
                </div>
              </div>
            )}

            {/* Step 2: Sliding Window Chunking Demo */}
            {step.id === 'chunk' && (
              <div className="detail-section">
                <div className="section-label">🔬 SLIDING WINDOW CHUNKING IN ACTION</div>
                <div className="chunk-demo">
                  <div className="chunk-card">
                    <div className="chunk-card-header">
                      <span className="chunk-num">Chunk 1 &bull; Characters 0–600</span>
                      <span className="chunk-badge">Initial Window</span>
                    </div>
                    <p className="chunk-text">
                      Bharathikannan joined as a Senior ML Engineer in 2022. He led the NLP team at Acme Corp for 3 years. His expertise includes <mark className="chunk-highlight">transformer models, PyTorch, and distributed training</mark>…
                    </p>
                  </div>

                  <div className="chunk-card overlap">
                    <div className="chunk-card-header">
                      <span className="chunk-num">Chunk 2 &bull; Characters 500–1100</span>
                      <span className="overlap-badge">🔁 100-character overlap</span>
                    </div>
                    <p className="chunk-text">
                      …<mark className="chunk-highlight">transformer models, PyTorch, and distributed training</mark>. He mentored 5 junior engineers and published 3 papers at NeurIPS…
                    </p>
                  </div>

                  <div className="chunk-card overlap">
                    <div className="chunk-card-header">
                      <span className="chunk-num">Chunk 3 &bull; Characters 1000–1600</span>
                      <span className="overlap-badge">🔁 100-character overlap</span>
                    </div>
                    <p className="chunk-text">
                      …<mark className="chunk-highlight">He mentored 5 junior engineers and published 3 papers</mark> at NeurIPS. Before that he worked at startups building recommendation systems…
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Multi-Provider Fallback Chain */}
            {step.id === 'llm' && (
              <div className="detail-section">
                <div className="section-label">🔁 ZERO-DOWNTIME FALLBACK ORCHESTRATION</div>
                <div className="chain-demo">
                  {[
                    { name: '1. Groq Cloud', note: 'Primary provider · Llama 3.1 8B (ultra-fast inference)', status: 'Primary', color: 'var(--accent)' },
                    { name: '2. Google Gemini', note: 'Secondary fallback · Free Flash tier if Groq 429s', status: 'Fallback 1', color: 'var(--accent-2)' },
                    { name: '3. OpenRouter', note: 'Tertiary fallback · Free community models', status: 'Fallback 2', color: 'hsl(30,90%,62%)' },
                    { name: '4. Cerebras', note: 'Fast wafer-scale inference engine', status: 'Fallback 3', color: 'hsl(300,80%,65%)' },
                    { name: '5. Extractive RAG', note: 'Offline fallback · Zero API keys, pure sentence cosine search', status: '100% Offline', color: 'hsl(140,70%,55%)' },
                  ].map((p, i) => (
                    <div key={p.name} className="chain-node" style={{ '--cc': p.color }}>
                      <div className="chain-indicator" style={{ background: p.color }} />
                      <div className="chain-info">
                        <span className="chain-name" style={{ color: p.color }}>{p.name}</span>
                        <span className="chain-note">{p.note}</span>
                      </div>
                      <span className="chain-badge" style={{ borderColor: p.color, color: p.color }}>{p.status}</span>
                      {i < 4 && <div className="chain-arrow">↓ fallback if unavailable</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="detail-nav">
          <button 
            className="btn nav-btn nav-prev-btn" 
            onClick={() => goTo(activeStep - 1)} 
            disabled={activeStep === 0} 
            id="rag-prev-btn"
          >
            ← Previous Stage
          </button>

          <div className="step-dots">
            {RAG_STEPS.map((_, i) => (
              <button
                key={i}
                className={`dot ${i === activeStep ? 'active' : ''}`}
                style={i === activeStep ? { background: step.color } : {}}
                onClick={() => goTo(i)}
                aria-label={`Go to Stage ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="btn nav-btn nav-next-btn"
            style={{ background: step.color }}
            onClick={() => goTo(activeStep + 1)}
            disabled={activeStep === RAG_STEPS.length - 1}
            id="rag-next-btn"
          >
            Next Stage →
          </button>
        </div>
      </div>
      </>
      )}

      {/* Global Architecture Summary Card */}
      <div className="arch-summary glass">
        <div className="arch-summary-header">
          <span className="arch-badge">SYSTEM BLUEPRINT</span>
          <h4 className="arch-main-title">Full RAG Architecture at a Glance</h4>
        </div>
        <div className="arch-grid">
          {[
            { 
              layer: '🌐 Browser (Client-Side)', 
              color: '#38bdf8', 
              items: [
                'Transformers.js (ONNX Runtime / WASM)', 
                'Embeds chunks & queries locally on device', 
                'UMAP 2D dimensional projection in Worker', 
                'React UI with live Server-Sent Events (SSE)'
              ] 
            },
            { 
              layer: '⚙️ Express Engine (Server)', 
              color: '#f59e0b', 
              items: [
                'Document parsing (pdf-parse / mammoth)', 
                'Sliding window chunking with overlap', 
                'In-memory vector store & dot product search', 
                'Multi-provider LLM fallback orchestrator'
              ] 
            },
            { 
              layer: '🤖 LLM Provider Matrix', 
              color: '#c084fc', 
              items: [
                'Groq Cloud (Llama 3.1 8B instant inference)', 
                'Google Gemini Flash (free tier)', 
                'OpenRouter (:free tier open-source models)', 
                'Extractive RAG (offline, zero-cost mode)'
              ] 
            },
            { 
              layer: '🔄 End-to-End Data Pipeline', 
              color: '#10b981', 
              items: [
                'Document → Chunks → 384D Embeddings → Store', 
                'Query → Local Embed → Cosine Search → Top-K', 
                'Context Chunks + Question → LLM → SSE Stream', 
                'Rendered Answer with interactive citations'
              ] 
            },
          ].map(({ layer, color, items }) => (
            <div key={layer} className="arch-card" style={{ '--ac': color }}>
              <div className="arch-layer" style={{ color }}>{layer}</div>
              <ul>
                {items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
