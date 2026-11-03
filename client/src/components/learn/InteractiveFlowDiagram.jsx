import { useState, useEffect } from 'react';

const NODES = [
  {
    id: 'doc',
    lane: 'ingestion',
    title: '1. Raw Document',
    icon: '📄',
    role: 'User upload (PDF, DOCX, TXT)',
    input: 'Binary file buffer (.pdf, .docx)',
    output: 'Plain UTF-8 string (e.g. 15,000 chars)',
    tensor: 'String[Length: L]',
    time: '~15ms',
    code: 'const text = await extractText(file);',
    color: '#f59e0b',
    x: 40,
    y: 80,
  },
  {
    id: 'chunker',
    lane: 'ingestion',
    title: '2. Sliding Chunker',
    icon: '✂️',
    role: 'Slices text with 100-char overlap',
    input: '15,000 char document string',
    output: 'Array of 30 semantic text chunks',
    tensor: 'List<{ text, start, end }>[30]',
    time: '< 2ms',
    code: 'const chunks = chunkText(text, 600, 100);',
    color: '#f59e0b',
    x: 230,
    y: 80,
  },
  {
    id: 'encoder',
    lane: 'ingestion',
    title: '3. Transformer Encoder',
    icon: '🧠',
    role: 'all-MiniLM-L6-v2 in WebWorker',
    input: 'Batches of text chunks (8 per batch)',
    output: '384-dimensional dense float vectors',
    tensor: 'Float32Array[30, 384] (L2-normalized)',
    time: '~25ms / chunk',
    code: 'const output = await embedder(chunkText, { normalize: true });',
    color: '#38bdf8',
    x: 430,
    y: 80,
  },
  {
    id: 'vstore',
    lane: 'ingestion',
    title: '4. Vector Database',
    icon: '💾',
    role: 'In-memory flat index with text pairs',
    input: '30 chunk objects + 384D vectors',
    output: 'Indexed in-memory RAM structure',
    tensor: 'Store: Array<{ id, text, embedding[384] }>',
    time: '< 1ms',
    code: 'chunkStore.push({ chunkId, text, embedding });',
    color: '#10b981',
    x: 640,
    y: 80,
  },
  {
    id: 'query',
    lane: 'retrieval',
    title: '5. User Question',
    icon: '❓',
    role: 'User enters natural language prompt',
    input: '"What is his machine learning experience?"',
    output: 'Raw query string in browser',
    tensor: 'String[Length: 42]',
    time: 'Instant',
    code: 'const [queryEmbedding] = await embed([question], 1);',
    color: '#c084fc',
    x: 40,
    y: 280,
  },
  {
    id: 'q_embed',
    lane: 'retrieval',
    title: '6. Query Embedder',
    icon: '🧭',
    role: 'Maps query to exact same 384D space',
    input: 'Question string',
    output: 'Normalized 384-dimensional vector q',
    tensor: 'Float32Array[384]',
    time: '~18ms',
    code: 'output.data = Float32Array(384);',
    color: '#c084fc',
    x: 230,
    y: 280,
  },
  {
    id: 'cosine',
    lane: 'retrieval',
    title: '7. Cosine Search',
    icon: '🔍',
    role: 'Computes dot products against all chunks',
    input: 'Query vector q[384] & Store matrix S[30, 384]',
    output: 'Top-4 highest similarity score chunks',
    tensor: 'List<{ ...chunk, score: float }>[Top-4]',
    time: '< 1ms',
    code: 'dot = a.reduce((sum, v, i) => sum + v * b[i], 0);',
    color: '#38bdf8',
    x: 430,
    y: 280,
  },
  {
    id: 'augment',
    lane: 'generation',
    title: '8. Prompt Assembler',
    icon: '📎',
    role: 'Injects Top-4 chunks with citation tags',
    input: 'User question + Top-4 context passages',
    output: 'Augmented system prompt message array',
    tensor: 'PromptTokens: ~1,200 tokens (Context budget)',
    time: '< 1ms',
    code: 'messages: [{ role: "system", content: contextText }, { role: "user", content: question }]',
    color: '#f59e0b',
    x: 640,
    y: 280,
  },
  {
    id: 'llm',
    lane: 'generation',
    title: '9. LLM Generator',
    icon: '🤖',
    role: 'Groq / Gemini / Fallback orchestrator',
    input: 'Augmented messages array',
    output: 'Token stream with inline citations [1], [2]',
    tensor: 'Tokens: ~250 tokens streamed via SSE',
    time: '~30ms per token (Groq Llama 3.1 8B)',
    code: 'for await (const chunk of stream) yield { type: "token", text };',
    color: '#c084fc',
    x: 840,
    y: 280,
  },
  {
    id: 'cited',
    lane: 'generation',
    title: '10. Cited Answer UI',
    icon: '💬',
    role: 'Verified, grounded response with proof',
    input: 'SSE token stream',
    output: 'Interactive Markdown with clickable footnotes',
    tensor: 'Rendered DOM with citation preview cards',
    time: 'Live',
    code: 'renderWithCitations(answer, chunks);',
    color: '#10b981',
    x: 840,
    y: 80,
  },
];

export default function InteractiveFlowDiagram() {
  const [selectedNode, setSelectedNode] = useState(NODES[0]);
  const [animating, setAnimating] = useState(true);
  const [simActive, setSimActive] = useState(false);
  const [simStep, setSimStep] = useState(0);

  const runSimulation = () => {
    setSimActive(true);
    setSimStep(0);
    const order = ['doc', 'chunker', 'encoder', 'vstore', 'query', 'q_embed', 'cosine', 'augment', 'llm', 'cited'];
    
    order.forEach((nodeId, idx) => {
      setTimeout(() => {
        const found = NODES.find(n => n.id === nodeId);
        if (found) setSelectedNode(found);
        setSimStep(idx);
        if (idx === order.length - 1) {
          setTimeout(() => setSimActive(false), 2000);
        }
      }, idx * 1200);
    });
  };

  return (
    <div className="flow-viz-container">
      <div className="flow-viz-header">
        <div>
          <span className="vsim-tag">INTERACTIVE ARCHITECTURE MAP</span>
          <h3 className="vsim-title">End-to-End RAG System Flow & Tensor Paths</h3>
          <p className="vsim-desc">
            Click on any component in the visual diagram below to inspect its <strong>Tensor dimensions</strong>, <strong>Input/Output formats</strong>, and <strong>live code execution</strong>.
          </p>
        </div>
        <div className="flow-controls">
          <button
            className={`btn ${simActive ? 'btn-active' : 'btn-secondary'} flow-sim-btn`}
            onClick={runSimulation}
            disabled={simActive}
          >
            {simActive ? `⚡ Simulating Data Flow (${simStep + 1}/10)...` : '▶ Simulate Live Query Flow'}
          </button>
        </div>
      </div>

      <div className="flow-canvas-wrapper">
        <svg className="flow-svg" viewBox="0 0 1020 420">
          <defs>
            <linearGradient id="ingestWire" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="queryWire" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="genWire" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="nodeGlow">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.5)" />
            </filter>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
            </marker>
          </defs>

          {/* Lane Labels */}
          <rect x="20" y="25" width="980" height="150" rx="14" fill="rgba(245, 158, 11, 0.03)" stroke="rgba(245, 158, 11, 0.15)" strokeDasharray="6 6" />
          <text x="35" y="48" fill="#f59e0b" fontSize="12" fontWeight="800" letterSpacing="0.06em">
            LANE 1: OFFLINE DOCUMENT INGESTION (ONE-TIME SETUP)
          </text>

          <rect x="20" y="215" width="980" height="175" rx="14" fill="rgba(192, 132, 252, 0.03)" stroke="rgba(192, 132, 252, 0.15)" strokeDasharray="6 6" />
          <text x="35" y="238" fill="#c084fc" fontSize="12" fontWeight="800" letterSpacing="0.06em">
            LANE 2: REAL-TIME RETRIEVAL & GENERATION (PER USER QUESTION)
          </text>

          {/* Wires connecting nodes */}
          {/* Lane 1 Wires: 1 -> 2 -> 3 -> 4 */}
          <path d="M 180 120 L 230 120" stroke="url(#ingestWire)" strokeWidth="3" markerEnd="url(#arrow)" />
          <path d="M 370 120 L 430 120" stroke="url(#ingestWire)" strokeWidth="3" markerEnd="url(#arrow)" />
          <path d="M 570 120 L 640 120" stroke="url(#ingestWire)" strokeWidth="3" markerEnd="url(#arrow)" />

          {/* Lane 2 Wires: 5 -> 6 -> 7 */}
          <path d="M 180 320 L 230 320" stroke="url(#queryWire)" strokeWidth="3" markerEnd="url(#arrow)" />
          <path d="M 370 320 L 430 320" stroke="url(#queryWire)" strokeWidth="3" markerEnd="url(#arrow)" />

          {/* Cross-lane wire: Store (4) -> Search (7) */}
          <path d="M 710 160 C 710 240, 500 240, 500 280" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 4" />
          <text x="590" y="225" fill="#10b981" fontSize="10" fontWeight="700">All 384D Chunks</text>

          {/* Wires 7 -> 8 -> 9 -> 10 */}
          <path d="M 570 320 L 640 320" stroke="#38bdf8" strokeWidth="3" markerEnd="url(#arrow)" />
          <text x="585" y="310" fill="#38bdf8" fontSize="10" fontWeight="700">Top-4 Chunks</text>

          <path d="M 780 320 L 840 320" stroke="#c084fc" strokeWidth="3" markerEnd="url(#arrow)" />
          
          {/* Upward wire: LLM (9) -> Answer UI (10) */}
          <path d="M 910 280 L 910 160" stroke="url(#genWire)" strokeWidth="3" markerEnd="url(#arrow)" />
          <text x="920" y="220" fill="#c084fc" fontSize="10" fontWeight="700">SSE Stream</text>

          {/* Active Data Packet Animation */}
          {animating && (
            <circle cx="100" cy="120" r="5" fill="#f59e0b" className="packet-pulse">
              <animateMotion
                path="M 0 0 L 190 0 L 390 0 L 600 0"
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>
          )}

          {/* Render Node Boxes */}
          {NODES.map((node) => {
            const isSelected = selectedNode.id === node.id;

            return (
              <g
                key={node.id}
                className="flow-node-g"
                onClick={() => setSelectedNode(node)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node Box */}
                <rect
                  x={node.x}
                  y={node.y}
                  width="140"
                  height="80"
                  rx="12"
                  fill={isSelected ? 'color-mix(in oklch, ' + node.color + ' 20%, #0f172a)' : '#111827'}
                  stroke={isSelected ? node.color : '#243048'}
                  strokeWidth={isSelected ? 3 : 1.5}
                  filter="url(#nodeGlow)"
                />

                {/* Node Header */}
                <text x={node.x + 12} y={node.y + 26} fontSize="18">
                  {node.icon}
                </text>
                <text
                  x={node.x + 36}
                  y={node.y + 24}
                  fill={isSelected ? '#ffffff' : '#f1f5f9'}
                  fontSize="11"
                  fontWeight="800"
                >
                  {node.title}
                </text>

                {/* Node Role / Subtext */}
                <text
                  x={node.x + 12}
                  y={node.y + 48}
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontWeight="500"
                >
                  {node.role.slice(0, 20)}...
                </text>

                {/* Node Time Badge */}
                <rect
                  x={node.x + 12}
                  y={node.y + 56}
                  width="65"
                  height="16"
                  rx="4"
                  fill="rgba(255,255,255,0.06)"
                />
                <text
                  x={node.x + 16}
                  y={node.y + 68}
                  fill={node.color}
                  fontSize="9"
                  fontWeight="700"
                >
                  ⏱ {node.time}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Deep Dive Inspector */}
      {selectedNode && (
        <div className="flow-inspector-card" style={{ '--node-color': selectedNode.color }}>
          <div className="inspector-header">
            <span className="inspector-badge" style={{ borderColor: selectedNode.color, color: selectedNode.color }}>
              STAGE COMPONENT INSPECTOR
            </span>
            <h4 className="inspector-title">
              {selectedNode.icon} {selectedNode.title} — {selectedNode.role}
            </h4>
          </div>

          <div className="inspector-grid">
            <div className="inspector-item">
              <span className="inspector-label">📥 INPUT DATA</span>
              <p className="inspector-val">{selectedNode.input}</p>
            </div>

            <div className="inspector-item">
              <span className="inspector-label">📤 OUTPUT DATA</span>
              <p className="inspector-val">{selectedNode.output}</p>
            </div>

            <div className="inspector-item">
              <span className="inspector-label">📐 TENSOR SHAPE & TYPE</span>
              <p className="inspector-val font-mono">{selectedNode.tensor}</p>
            </div>

            <div className="inspector-item">
              <span className="inspector-label">⚡ EXECUTION TIME</span>
              <p className="inspector-val" style={{ color: selectedNode.color, fontWeight: '700' }}>
                {selectedNode.time}
              </p>
            </div>
          </div>

          <div className="inspector-code-box">
            <span className="inspector-label">💻 ACTIVE CODE IN PROFILERAG</span>
            <pre className="inspector-code"><code>{selectedNode.code}</code></pre>
          </div>
        </div>
      )}
    </div>
  );
}
