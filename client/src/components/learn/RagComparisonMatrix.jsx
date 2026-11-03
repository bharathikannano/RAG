import { useState } from 'react';
import './RagComparisonMatrix.css';

const ARCHITECTURES = [
  {
    id: 'rag',
    name: 'profileRAG (Local RAG)',
    tag: 'RECOMMENDED FOR PRIVATE DOCS',
    badgeCol: '#10b981',
    cost: '$0 (100% Free & Open Source)',
    hardware: 'CPU only · 4GB RAM · Zero GPU required',
    speed: '~15ms chunking + ~18ms local ONNX embed',
    privacy: '100% Private (Document never leaves your browser/device)',
    updates: 'Instant (Upload new PDF in 1 second)',
    hallucination: 'Near Zero (Strictly grounded in retrieved context)',
    citations: 'Clickable [1], [2] tags with exact sentence proof',
    synonyms: 'Flawless (Dense semantic 384D vector space)',
    score: 98,
  },
  {
    id: 'finetune',
    name: 'LLM Fine-Tuning',
    tag: 'EXPENSIVE & RIGID',
    badgeCol: '#ef4444',
    cost: '$500–$5,000+ in cloud GPU cluster time',
    hardware: 'Requires multi-GPU cluster (NVIDIA A100/H100)',
    speed: 'Fast inference, but hours/days to re-train',
    privacy: 'Risky (Private data uploaded to cloud training clusters)',
    updates: 'Painful (Must rerun expensive training epochs on every edit)',
    hallucination: 'High (Weights blur dates, metrics, and numbers)',
    citations: 'Impossible (Weights cannot cite source page or line numbers)',
    synonyms: 'High semantic comprehension',
    score: 45,
  },
  {
    id: 'longcontext',
    name: 'Massive Context Window (1M Tokens)',
    tag: 'EXPENSIVE & CLOUD DEPENDENT',
    badgeCol: '#f59e0b',
    cost: 'High API bill ($0.05–$0.30 per question)',
    hardware: 'Requires high-speed internet & cloud provider connection',
    speed: 'High latency (3–8 seconds time-to-first-token)',
    privacy: 'Zero privacy (Dumps entire 50-page private doc to external servers)',
    updates: 'Instant (Just re-upload)',
    hallucination: 'Moderate ("Lost in the Middle" attention degradation)',
    citations: 'Vague or approximate',
    synonyms: 'High semantic comprehension',
    score: 62,
  },
  {
    id: 'keyword',
    name: 'Traditional Keyword Search (BM25 / Ctrl+F)',
    tag: 'BLIND TO SYNONYMS',
    badgeCol: '#64748b',
    cost: '$0',
    hardware: 'Minimal CPU',
    speed: 'Sub-millisecond regex / inverted index',
    privacy: '100% Private',
    updates: 'Instant',
    hallucination: 'N/A (No generative answer, just raw text dumps)',
    citations: 'Exact character matches',
    synonyms: 'Zero (Fails completely: "coder" misses "software engineer")',
    score: 50,
  },
];

export default function RagComparisonMatrix() {
  const [selectedArch, setSelectedArch] = useState('rag');

  const active = ARCHITECTURES.find(a => a.id === selectedArch) || ARCHITECTURES[0];

  return (
    <div className="comparison-container glass">
      {/* Header */}
      <div className="comparison-header">
        <div className="comp-badge-row">
          <span className="comp-badge">📊 ARCHITECTURE TRADEOFFS</span>
          <span className="comp-tagline">Why RAG Wins for Document QA</span>
        </div>
        <h3 className="comp-main-title">RAG vs Fine-Tuning vs Long Context vs Keyword Search</h3>
        <p className="comp-subtitle">
          See why profileRAG’s local-first architecture provides the optimal balance of privacy, cost, speed, and accuracy.
        </p>
      </div>

      {/* Architecture Selector Tabs */}
      <div className="arch-selector-bar">
        {ARCHITECTURES.map((arch) => (
          <button
            key={arch.id}
            className={`arch-select-btn ${selectedArch === arch.id ? 'active' : ''}`}
            onClick={() => setSelectedArch(arch.id)}
            style={{ '--btn-accent': arch.badgeCol }}
          >
            <span className="arch-btn-name">{arch.name}</span>
            <span className="arch-btn-tag" style={{ color: arch.badgeCol }}>
              {arch.tag}
            </span>
          </button>
        ))}
      </div>

      {/* Comparison Detail Card */}
      <div className="comparison-card glass" style={{ '--card-accent': active.badgeCol }}>
        <div className="card-top-bar">
          <div className="card-title-group">
            <h4 className="active-arch-title">{active.name}</h4>
            <span className="active-arch-badge" style={{ backgroundColor: `${active.badgeCol}20`, borderColor: active.badgeCol, color: active.badgeCol }}>
              {active.tag}
            </span>
          </div>

          <div className="score-meter-wrap">
            <span className="meter-label">Overall Architecture Fit:</span>
            <div className="meter-bar-track">
              <div
                className="meter-bar-fill"
                style={{ width: `${active.score}%`, backgroundColor: active.badgeCol }}
              />
            </div>
            <span className="meter-value" style={{ color: active.badgeCol }}>{active.score}%</span>
          </div>
        </div>

        {/* Feature Comparison Matrix */}
        <div className="features-matrix-grid">
          <div className="matrix-item">
            <span className="m-label">💰 Cloud &amp; Compute Cost</span>
            <span className="m-val">{active.cost}</span>
          </div>

          <div className="matrix-item">
            <span className="m-label">🖥️ Hardware Requirement</span>
            <span className="m-val">{active.hardware}</span>
          </div>

          <div className="matrix-item">
            <span className="m-label">⚡ Latency &amp; Speed</span>
            <span className="m-val">{active.speed}</span>
          </div>

          <div className="matrix-item">
            <span className="m-label">🔒 Data Privacy &amp; Offline</span>
            <span className="m-val">{active.privacy}</span>
          </div>

          <div className="matrix-item">
            <span className="m-label">🔄 Knowledge Updating</span>
            <span className="m-val">{active.updates}</span>
          </div>

          <div className="matrix-item">
            <span className="m-label">🛡️ Hallucination Risk</span>
            <span className="m-val">{active.hallucination}</span>
          </div>

          <div className="matrix-item">
            <span className="m-label">🔍 Clickable Auditable Citations</span>
            <span className="m-val">{active.citations}</span>
          </div>

          <div className="matrix-item">
            <span className="m-label">💡 Synonym &amp; Concept Matching</span>
            <span className="m-val">{active.synonyms}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
