import { useState } from 'react';

const TOKENS = ['[CLS]', 'Senior', 'ML', 'Engineer', 'at', 'Acme', 'Corp', '[SEP]'];

// Attention weight matrix between tokens (typical trained weights for MiniLM)
const ATTENTION_MATRIX = [
  // [CLS], Senior, ML,   Engineer, at,   Acme,  Corp,  [SEP]
  [0.25,  0.15,   0.20, 0.18,     0.04, 0.08,  0.06,  0.04], // [CLS]
  [0.08,  0.42,   0.24, 0.20,     0.02, 0.02,  0.01,  0.01], // Senior
  [0.05,  0.22,   0.45, 0.22,     0.02, 0.02,  0.01,  0.01], // ML
  [0.04,  0.18,   0.32, 0.38,     0.03, 0.03,  0.01,  0.01], // Engineer
  [0.02,  0.04,   0.05, 0.06,     0.40, 0.25,  0.16,  0.02], // at
  [0.03,  0.02,   0.03, 0.04,     0.18, 0.44,  0.24,  0.02], // Acme
  [0.03,  0.01,   0.02, 0.03,     0.12, 0.35,  0.42,  0.02], // Corp
  [0.20,  0.08,   0.12, 0.14,     0.05, 0.18,  0.15,  0.08], // [SEP]
];

export default function DeepLearningTransformerViz() {
  const [hoveredTokenIdx, setHoveredTokenIdx] = useState(2); // default to 'ML'
  const [activeTab, setActiveTab] = useState('attention'); // 'attention' | 'pooling' | 'layers'

  const activeToken = TOKENS[hoveredTokenIdx];
  const attentionRow = ATTENTION_MATRIX[hoveredTokenIdx] || [];

  return (
    <div className="dl-viz-container">
      <div className="dl-viz-header">
        <div>
          <span className="vsim-tag">DEEP LEARNING NEURAL ARCHITECTURE</span>
          <h3 className="vsim-title">Inside the Transformer: all-MiniLM-L6-v2</h3>
          <p className="vsim-desc">
            See how the 22.7M parameter neural network computes <strong>Self-Attention weights</strong>, produces hidden states, and performs <strong>Mean Pooling</strong> to create a 384D semantic vector.
          </p>
        </div>

        <div className="dl-tab-buttons">
          <button
            className={`preset-btn ${activeTab === 'attention' ? 'active' : ''}`}
            onClick={() => setActiveTab('attention')}
          >
            🔥 1. Multi-Head Self-Attention
          </button>
          <button
            className={`preset-btn ${activeTab === 'pooling' ? 'active' : ''}`}
            onClick={() => setActiveTab('pooling')}
          >
            ∑ 2. Mean Pooling & Normalization
          </button>
          <button
            className={`preset-btn ${activeTab === 'layers' ? 'active' : ''}`}
            onClick={() => setActiveTab('layers')}
          >
            🧱 3. 6-Layer MiniLM Stack
          </button>
        </div>
      </div>

      {/* TAB 1: SELF-ATTENTION MATRIX */}
      {activeTab === 'attention' && (
        <div className="dl-attention-view">
          <div className="attention-callout">
            <span className="callout-icon">💡</span>
            <div>
              <strong>Self-Attention Intuition:</strong> Hover over any word below. Notice how <strong>"ML"</strong> pays high attention to <strong>"Engineer" (22%)</strong> and <strong>"Senior" (22%)</strong>, but almost zero to <strong>"at" (2%)</strong>. This is how neural networks understand words in their true context!
            </div>
          </div>

          <div className="token-strip">
            <span className="strip-label">Hover word to inspect attention:</span>
            <div className="token-chips">
              {TOKENS.map((token, idx) => (
                <button
                  key={token + idx}
                  className={`token-chip ${idx === hoveredTokenIdx ? 'active' : ''}`}
                  onMouseEnter={() => setHoveredTokenIdx(idx)}
                >
                  <span className="token-idx">t{idx}</span>
                  <span className="token-text">{token}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="attention-grid-box">
            <div className="attention-visual-bars">
              <span className="visual-bars-title">
                Attention weights radiating from <strong>"{activeToken}"</strong> to other tokens:
              </span>

              <div className="attention-bars-list">
                {TOKENS.map((targetToken, targetIdx) => {
                  const weight = attentionRow[targetIdx] || 0;
                  const pct = Math.round(weight * 100);
                  const isSelf = targetIdx === hoveredTokenIdx;

                  return (
                    <div key={targetToken + targetIdx} className={`att-bar-row ${isSelf ? 'self' : ''}`}>
                      <div className="att-label-group">
                        <span className="att-target-name">{targetToken}</span>
                        {isSelf && <span className="att-self-tag">(Self)</span>}
                      </div>

                      <div className="att-meter">
                        <div
                          className="att-meter-fill"
                          style={{
                            width: `${pct * 2.2}%`,
                            background: isSelf
                              ? '#818cf8'
                              : pct > 15
                              ? '#38bdf8'
                              : pct > 8
                              ? '#34d399'
                              : '#475569',
                          }}
                        />
                      </div>

                      <span className="att-pct" style={{ color: pct > 15 ? '#38bdf8' : '#94a3b8' }}>
                        {(weight).toFixed(2)} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="attention-formula-card">
              <span className="card-badge">THE SCALED DOT-PRODUCT FORMULA</span>
              <div className="att-formula-box">
                Attention(Q, K, V) = softmax(Q · Kᵀ / √dₖ) · V
              </div>
              <ul className="att-formula-bullets">
                <li><strong>Query (Q):</strong> What is word "{activeToken}" looking for?</li>
                <li><strong>Key (K):</strong> What information does each neighboring word advertise?</li>
                <li><strong>Value (V):</strong> The actual semantic content passed forward.</li>
                <li><strong>√dₖ scaling:</strong> Prevents gradients from exploding when dimension is 64.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEAN POOLING & NORMALIZATION */}
      {activeTab === 'pooling' && (
        <div className="dl-pooling-view">
          <div className="attention-callout">
            <span className="callout-icon">🎯</span>
            <div>
              <strong>Why Mean Pooling is Crucial:</strong> The transformer outputs 8 separate hidden vectors (one per token $h_i \in \mathbb{R}^{384}$). Mean pooling averages all 8 vectors into <strong>a single 384D sentence embedding vector</strong>!
            </div>
          </div>

          <div className="pooling-diagram">
            <div className="pooling-stage">
              <span className="stage-title">Step 1: Token Hidden States</span>
              <div className="hidden-states-stack">
                {TOKENS.map((tok, i) => (
                  <div key={tok + i} className="state-row">
                    <span className="state-name">h_{tok}:</span>
                    <span className="state-vector">[+0.24, -0.15, +0.68, ... ×384]</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pooling-operator">
              <div className="operator-badge">∑ MEAN POOLING</div>
              <span className="operator-math">e = (1 / T) Σᵢ hᵢ</span>
              <span className="operator-arrow">&darr;</span>
            </div>

            <div className="pooling-stage">
              <span className="stage-title">Step 2: Raw Sentence Vector</span>
              <div className="vector-result-box">
                <span className="res-title">e ∈ ℝ³⁸⁴ (Average Vector)</span>
                <p className="res-values">[+0.12, -0.07, +0.34, +0.88, ... ×384]</p>
                <span className="norm-check">Vector Length ||e|| = 2.41 (Not unit length yet!)</span>
              </div>
            </div>

            <div className="pooling-operator">
              <div className="operator-badge">⚪ L2 NORMALIZATION</div>
              <span className="operator-math">ê = e / ||e||</span>
              <span className="operator-arrow">&darr;</span>
            </div>

            <div className="pooling-stage">
              <span className="stage-title">Step 3: Final Unit-Sphere Embedding</span>
              <div className="vector-result-box final-unit">
                <span className="res-title">ê ∈ ℝ³⁸⁴ (Unit Hypersphere)</span>
                <p className="res-values">[+0.05, -0.03, +0.14, +0.36, ... ×384]</p>
                <span className="norm-check success">✅ Exact Length ||ê|| = 1.000000000</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 6-LAYER MINILM STACK */}
      {activeTab === 'layers' && (
        <div className="dl-layers-view">
          <div className="layers-grid">
            <div className="layer-spec-card">
              <span className="card-badge">all-MiniLM-L6-v2 SPECS</span>
              <table className="spec-table">
                <tbody>
                  <tr><td>Layers (Encoder Blocks)</td><td><strong>6 Transformer Layers</strong></td></tr>
                  <tr><td>Hidden Dimension (d_model)</td><td><strong>384 dimensions</strong></td></tr>
                  <tr><td>Attention Heads</td><td><strong>12 Heads (32 dims each)</strong></td></tr>
                  <tr><td>Feed-Forward Dim</td><td><strong>1536 dimensions</strong></td></tr>
                  <tr><td>Total Parameters</td><td><strong>22.7 Million</strong></td></tr>
                  <tr><td>Quantized Model Size</td><td><strong>22 MB (INT8 ONNX)</strong></td></tr>
                  <tr><td>Execution Engine</td><td><strong>WASM / WebWorker in Browser</strong></td></tr>
                </tbody>
              </table>
            </div>

            <div className="layer-flow-card">
              <span className="card-badge">INSIDE EACH TRANSFORMER BLOCK</span>
              <div className="block-pipeline">
                <div className="sub-block input">Input Embeddings (Token + Position)</div>
                <div className="sub-arrow">&darr;</div>
                <div className="sub-block attention">12-Head Multi-Head Self-Attention + Residual Add & LayerNorm</div>
                <div className="sub-arrow">&darr;</div>
                <div className="sub-block ffn">Feed-Forward Dense Network (384 &rarr; 1536 &rarr; 384) + LayerNorm</div>
                <div className="sub-arrow">&darr;</div>
                <div className="sub-block output">Output to Next Layer (Repeats 6 Times)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
