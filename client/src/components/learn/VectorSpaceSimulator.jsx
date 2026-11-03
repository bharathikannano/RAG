import { useState, useRef, useEffect } from 'react';

const CHUNKS = [
  { id: 1, label: 'Chunk 1: Senior ML Engineer 2022', text: 'Bharathikannan joined as Senior ML Engineer in 2022', angle: 42, radius: 180, color: '#38bdf8' },
  { id: 2, label: 'Chunk 2: NLP Team & Transformers', text: 'Led NLP team building transformer pipelines and BERT models', angle: 56, radius: 195, color: '#38bdf8' },
  { id: 3, label: 'Chunk 3: PyTorch & Distributed Training', text: 'Deep learning expertise in PyTorch and GPU cluster scaling', angle: 28, radius: 175, color: '#38bdf8' },
  { id: 4, label: 'Chunk 4: Acme Corp Tenure & Projects', text: 'Spent 3 years at Acme Corp delivering recommendation systems', angle: 78, radius: 165, color: '#818cf8' },
  { id: 5, label: 'Chunk 5: NeurIPS Paper Publications', text: 'Published 3 research papers on efficient attention at NeurIPS', angle: 15, radius: 190, color: '#818cf8' },
  { id: 6, label: 'Chunk 6: Photography & Hiking Hobby', text: 'Weekend landscape photography enthusiast and avid mountain hiker', angle: 145, radius: 185, color: '#f43f5e' },
  { id: 7, label: 'Chunk 7: University Soccer Captain', text: 'Captain of university varsity soccer team in 2018', angle: 215, radius: 170, color: '#f43f5e' },
];

const PRESET_QUERIES = [
  { name: '🤖 ML & NLP Skills', angle: 45, query: 'What is his machine learning and transformer experience?' },
  { name: '🏢 Company History', angle: 75, query: 'How long did he work at Acme Corp?' },
  { name: '📚 Research Papers', angle: 18, query: 'Has he published any papers at NeurIPS?' },
  { name: '📷 Personal Hobbies', angle: 150, query: 'What does he do in his free time outside work?' },
];

export default function VectorSpaceSimulator() {
  const [queryAngle, setQueryAngle] = useState(45);
  const [activePreset, setActivePreset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);

  const cx = 250;
  const cy = 250;
  const maxRadius = 210;

  // Convert polar coordinates (angle in degrees, radius) to Cartesian (x, y)
  const polarToCartesian = (deg, r) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    setQueryAngle(Math.round(deg));
    setActivePreset(-1);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging]);

  // Compute cosine similarity for each chunk
  // cos(theta) where theta is difference between angles
  const scoredChunks = CHUNKS.map((c) => {
    const angleDiff = Math.abs(queryAngle - c.angle);
    const normalizedDiff = angleDiff > 180 ? 360 - angleDiff : angleDiff;
    const rad = (normalizedDiff * Math.PI) / 180;
    const score = Math.max(-1, Math.min(1, Math.cos(rad)));
    return {
      ...c,
      angleDiff: Math.round(normalizedDiff),
      score: parseFloat(score.toFixed(3)),
      isMatch: score >= 0.70,
    };
  }).sort((a, b) => b.score - a.score);

  const queryPoint = polarToCartesian(queryAngle, maxRadius);
  const top4 = scoredChunks.slice(0, 4);

  return (
    <div className="vsim-container">
      <div className="vsim-header">
        <div>
          <span className="vsim-tag">GEOMETRIC VECTOR SIMULATOR</span>
          <h3 className="vsim-title">Interactive 2D Semantic Vector Space</h3>
          <p className="vsim-desc">
            Drag the <strong>Query Vector (Purple Arrow)</strong> around the unit circle to see how <strong>Cosine Angle θ</strong> directly computes semantic similarity in real time!
          </p>
        </div>
        <div className="vsim-presets">
          <span className="preset-label">Test Question Presets:</span>
          <div className="preset-buttons">
            {PRESET_QUERIES.map((p, i) => (
              <button
                key={p.name}
                className={`preset-btn ${activePreset === i ? 'active' : ''}`}
                onClick={() => {
                  setQueryAngle(p.angle);
                  setActivePreset(i);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="vsim-grid">
        {/* Left: Interactive Vector Radar Canvas */}
        <div className="vsim-canvas-box">
          <div className="canvas-instruction">
            <span>🎯 Click anywhere on the radar or drag the <strong>purple ring</strong></span>
            <span className="angle-readout">θ = {queryAngle}°</span>
          </div>

          <svg
            ref={svgRef}
            className="vsim-svg"
            viewBox="0 0 500 500"
            onPointerDown={handlePointerDown}
          >
            <defs>
              <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0.08)" />
                <stop offset="100%" stopColor="rgba(15, 23, 42, 0.4)" />
              </radialGradient>
              <linearGradient id="queryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Background radar grid */}
            <circle cx={cx} cy={cy} r={maxRadius} fill="url(#radarGlow)" stroke="#1e293b" strokeWidth="2" />
            <circle cx={cx} cy={cy} r={maxRadius * 0.66} fill="none" stroke="#1e293b" strokeDasharray="4 4" strokeWidth="1.5" />
            <circle cx={cx} cy={cy} r={maxRadius * 0.33} fill="none" stroke="#1e293b" strokeDasharray="4 4" strokeWidth="1.5" />

            {/* Coordinate Axis Lines */}
            <line x1={cx} y1={cy - maxRadius} x2={cx} y2={cy + maxRadius} stroke="#334155" strokeWidth="1.5" />
            <line x1={cx - maxRadius} y1={cy} x2={cx + maxRadius} y2={cy} stroke="#334155" strokeWidth="1.5" />

            {/* Axis labels */}
            <text x={cx + 6} y={cy - maxRadius + 16} fill="#64748b" fontSize="11" fontWeight="600">+ Dimension 1</text>
            <text x={cx + maxRadius - 80} y={cy - 8} fill="#64748b" fontSize="11" fontWeight="600">+ Dimension 2</text>

            {/* Semantic Clusters Labels */}
            <text x={350} y={120} fill="#38bdf8" fontSize="12" fontWeight="700">Engineering & ML Cluster</text>
            <text x={60} y={150} fill="#f43f5e" fontSize="12" fontWeight="700">Hobbies & Personal</text>

            {/* Top-K similarity threshold cone (approx 45 deg each side) */}
            <path
              d={`M ${cx} ${cy} L ${polarToCartesian(queryAngle - 45, maxRadius).x} ${polarToCartesian(queryAngle - 45, maxRadius).y} A ${maxRadius} ${maxRadius} 0 0 1 ${polarToCartesian(queryAngle + 45, maxRadius).x} ${polarToCartesian(queryAngle + 45, maxRadius).y} Z`}
              fill="rgba(192, 132, 252, 0.12)"
              stroke="rgba(192, 132, 252, 0.4)"
              strokeDasharray="3 3"
            />

            {/* Origin marker */}
            <circle cx={cx} cy={cy} r="4" fill="#94a3b8" />

            {/* Chunk Vectors & Points */}
            {CHUNKS.map((c) => {
              const pt = polarToCartesian(c.angle, c.radius);
              const scored = scoredChunks.find(s => s.id === c.id);
              const isMatch = scored?.isMatch;

              return (
                <g key={c.id}>
                  {/* Line from origin to chunk vector */}
                  <line
                    x1={cx}
                    y1={cy}
                    x2={pt.x}
                    y2={pt.y}
                    stroke={isMatch ? '#38bdf8' : '#475569'}
                    strokeWidth={isMatch ? 2.5 : 1.2}
                    opacity={isMatch ? 0.9 : 0.4}
                  />

                  {/* Halo pulse if matched */}
                  {isMatch && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      opacity="0.6"
                      className="radar-pulse"
                    />
                  )}

                  {/* Chunk dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isMatch ? 9 : 7}
                    fill={isMatch ? '#38bdf8' : c.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                  />

                  {/* Chunk label badge */}
                  <text
                    x={pt.x + (pt.x > cx ? 12 : -12)}
                    y={pt.y + (pt.y > cy ? 14 : -6)}
                    textAnchor={pt.x > cx ? 'start' : 'end'}
                    fill={isMatch ? '#ffffff' : '#94a3b8'}
                    fontSize="11"
                    fontWeight={isMatch ? '800' : '500'}
                  >
                    C{c.id} ({((scored?.score || 0) * 100).toFixed(0)}%)
                  </text>
                </g>
              );
            })}

            {/* Query Vector Arrow */}
            <line
              x1={cx}
              y1={cy}
              x2={queryPoint.x}
              y2={queryPoint.y}
              stroke="url(#queryGrad)"
              strokeWidth="4"
              filter="url(#glow)"
            />

            {/* Query Handle Dot */}
            <circle
              cx={queryPoint.x}
              cy={queryPoint.y}
              r="14"
              fill="#c084fc"
              stroke="#ffffff"
              strokeWidth="3"
              style={{ cursor: 'grab' }}
            />
            <text
              x={queryPoint.x + (queryPoint.x > cx ? 16 : -16)}
              y={queryPoint.y - 10}
              textAnchor={queryPoint.x > cx ? 'start' : 'end'}
              fill="#c084fc"
              fontSize="13"
              fontWeight="800"
            >
              🎯 Query Vector q
            </text>
          </svg>
        </div>

        {/* Right: Live Mathematical Breakdown & Ranked Results */}
        <div className="vsim-results-box">
          <div className="math-explainer-card">
            <span className="card-badge">LIVE MATHEMATICAL CALCULATION</span>
            <div className="formula-display">
              <span className="formula-name">Cosine Similarity Formula:</span>
              <div className="formula-code">
                cos(θ) = (q · d) / (||q|| · ||d||) = q · d
              </div>
              <p className="formula-note">
                Because all MiniLM embeddings are <strong>L2-normalized</strong> onto the unit sphere (length = 1.0), the denominator is 1. Cosine similarity is simply the <strong>dot product</strong>!
              </p>
            </div>
          </div>

          <div className="ranked-chunks-card">
            <div className="ranked-header">
              <span className="ranked-title">Ranked Chunks for Current Angle ({queryAngle}°):</span>
              <span className="topk-badge">Top-4 Selected for Prompt</span>
            </div>

            <div className="ranked-list">
              {scoredChunks.map((c, index) => {
                const isTop4 = index < 4;
                const scorePct = Math.round(c.score * 100);

                return (
                  <div
                    key={c.id}
                    className={`ranked-item ${isTop4 ? 'retrieved' : 'filtered'}`}
                  >
                    <div className="ranked-item-header">
                      <div className="ranked-item-left">
                        <span className={`ranked-rank ${isTop4 ? 'active' : ''}`}>#{index + 1}</span>
                        <span className="ranked-name">{c.label}</span>
                      </div>
                      <span className={`ranked-status ${isTop4 ? 'match' : 'reject'}`}>
                        {isTop4 ? '✅ Retrieved' : '❌ Filtered Out'}
                      </span>
                    </div>

                    <p className="ranked-snippet">"{c.text}"</p>

                    <div className="ranked-bar-row">
                      <span className="ranked-math-text">
                        θ = {c.angleDiff}° &rarr; cos(θ) = <strong>{c.score > 0 ? `+${c.score}` : c.score}</strong>
                      </span>
                      <div className="ranked-meter">
                        <div
                          className="ranked-meter-fill"
                          style={{
                            width: `${Math.max(0, scorePct)}%`,
                            background: isTop4 ? 'var(--accent)' : '#475569',
                          }}
                        />
                      </div>
                      <span className="ranked-score-val" style={{ color: isTop4 ? 'var(--accent)' : '#94a3b8' }}>
                        {scorePct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
