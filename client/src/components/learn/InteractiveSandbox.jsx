import { useState } from 'react';

const DEFAULT_SAMPLE_TEXT = `Bharathikannan is a Senior Machine Learning Engineer with 6+ years of production experience in NLP and LLM systems. At Acme Corp (2022-2025), he led the search relevance team, deploying Transformer cross-encoders that improved search click-through rate by 34%. He scaled distributed PyTorch training across 64 GPUs on AWS. Previously, he published 3 peer-reviewed papers at NeurIPS on parameter-efficient fine-tuning (PEFT and LoRA). In his spare time, he enjoys landscape photography and trail running.`;

export default function InteractiveSandbox() {
  const [docText, setDocText] = useState(DEFAULT_SAMPLE_TEXT);
  const [chunkSize, setChunkSize] = useState(220);
  const [overlap, setOverlap] = useState(50);
  const [userQuery, setUserQuery] = useState('What NLP and search models did he build?');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedTokens, setStreamedTokens] = useState('');

  // Chunker algorithm
  const chunks = [];
  let start = 0;
  while (start < docText.length) {
    const end = Math.min(docText.length, start + chunkSize);
    chunks.push({
      id: chunks.length + 1,
      text: docText.slice(start, end),
      start,
      end,
    });
    if (end >= docText.length) break;
    start += Math.max(10, chunkSize - overlap);
  }

  // Calculate simulated semantic similarity based on common tokens + semantic weighting
  const queryWords = userQuery.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);

  const scoredChunks = chunks.map((c) => {
    const chunkLower = c.text.toLowerCase();
    let matchPoints = 0;

    queryWords.forEach((word) => {
      if (chunkLower.includes(word)) {
        matchPoints += 1.5;
      }
    });

    // Baseline semantic noise for realism
    const baseSimilarity = 0.35 + (matchPoints * 0.18);
    const score = Math.min(0.96, Math.max(0.12, baseSimilarity));

    return {
      ...c,
      score: parseFloat(score.toFixed(2)),
      isMatch: score >= 0.65,
    };
  }).sort((a, b) => b.score - a.score);

  const topChunks = scoredChunks.slice(0, 3);

  // Simulate token streaming
  const handleSimulateGeneration = () => {
    setIsGenerating(true);
    setStreamedTokens('');

    const targetAnswer = `Based on the provided documents, Bharathikannan has extensive NLP experience leading search relevance at Acme Corp [1]. He deployed Transformer cross-encoders that boosted search CTR by 34% [1], scaled distributed PyTorch training across 64 GPUs [2], and published 3 papers at NeurIPS on PEFT and LoRA [2].`;

    const tokens = targetAnswer.split(' ');
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx >= tokens.length) {
        clearInterval(interval);
        setIsGenerating(false);
      } else {
        setStreamedTokens(prev => (prev ? prev + ' ' + tokens[currentIdx] : tokens[currentIdx]));
        currentIdx++;
      }
    }, 60);
  };

  return (
    <div className="sandbox-container">
      <div className="sandbox-header">
        <div>
          <span className="vsim-tag">INTERACTIVE RAG WORKBENCH</span>
          <h3 className="vsim-title">Live Visual Playground: Test Your Own Text</h3>
          <p className="vsim-desc">
            Change the <strong>Chunk Size & Overlap sliders</strong>, type any custom text or question, and see how chunking, scoring, and prompt assembly happen live!
          </p>
        </div>
      </div>

      {/* STEP 1: CHUNKER SLIDERS & LIVE DOCUMENT */}
      <div className="sandbox-card">
        <div className="sandbox-card-header">
          <span className="step-pill">STEP 1</span>
          <h4 className="card-heading">Document Input & Sliding Window Sliders</h4>
          <span className="stat-pill">{chunks.length} Chunks Generated</span>
        </div>

        <div className="slider-controls">
          <div className="control-group">
            <label className="control-label">
              <span>Chunk Size: <strong>{chunkSize} characters</strong></span>
              <span className="control-hint">(~{Math.round(chunkSize / 4)} tokens)</span>
            </label>
            <input
              type="range"
              min="100"
              max="450"
              step="20"
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value))}
              className="range-input"
            />
          </div>

          <div className="control-group">
            <label className="control-label">
              <span>Overlap Window: <strong>{overlap} characters</strong></span>
              <span className="control-hint">({Math.round((overlap / chunkSize) * 100)}% overlap)</span>
            </label>
            <input
              type="range"
              min="0"
              max={Math.min(150, chunkSize - 20)}
              step="10"
              value={overlap}
              onChange={(e) => setOverlap(parseInt(e.target.value))}
              className="range-input"
            />
          </div>
        </div>

        <div className="textarea-wrapper">
          <textarea
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            rows={4}
            className="sandbox-textarea"
            placeholder="Type or paste document text here..."
          />
        </div>

        {/* Live Visual Chunks */}
        <div className="chunks-visual-grid">
          {chunks.map((c, i) => (
            <div key={c.id} className="live-chunk-box">
              <div className="chunk-badge-row">
                <span className="live-chunk-id">Chunk #{c.id}</span>
                <span className="live-chunk-span">{c.start}..{c.end} ({c.text.length} chars)</span>
              </div>
              <p className="live-chunk-body">{c.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 2: USER QUERY & SIMILARITY SEARCH */}
      <div className="sandbox-card">
        <div className="sandbox-card-header">
          <span className="step-pill" style={{ background: '#38bdf8' }}>STEP 2</span>
          <h4 className="card-heading">Natural Language Query & Cosine Ranking</h4>
        </div>

        <div className="query-input-row">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            className="sandbox-query-input"
            placeholder="Ask a question about the document..."
          />
          <div className="query-suggestions">
            <span className="sugg-label">Try:</span>
            <button className="sugg-btn" onClick={() => setUserQuery('What NLP models did he build?')}>NLP models</button>
            <button className="sugg-btn" onClick={() => setUserQuery('Where did he work in 2022?')}>Acme tenure</button>
            <button className="sugg-btn" onClick={() => setUserQuery('What are his outdoor hobbies?')}>Hobbies</button>
          </div>
        </div>

        {/* Ranked Chunks Preview */}
        <div className="ranked-preview-list">
          {scoredChunks.map((c, idx) => {
            const isTop3 = idx < 3;
            return (
              <div key={c.id} className={`ranked-row ${isTop3 ? 'top' : 'low'}`}>
                <div className="row-rank-badge">#{idx + 1}</div>
                <div className="row-content">
                  <div className="row-head">
                    <span className="row-chunk-name">Chunk #{c.id}</span>
                    <span className={`row-status ${isTop3 ? 'picked' : 'ignored'}`}>
                      {isTop3 ? '✅ Top-3 Retrieved' : '❌ Low Cosine Score'}
                    </span>
                  </div>
                  <p className="row-text">"{c.text.slice(0, 140)}..."</p>
                </div>
                <div className="row-score">
                  <span className="score-num">{(c.score * 100).toFixed(0)}%</span>
                  <span className="score-label">similarity</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 3: ASSEMBLED CONTEXT & STREAMING GENERATION */}
      <div className="sandbox-card">
        <div className="sandbox-card-header">
          <span className="step-pill" style={{ background: '#c084fc' }}>STEP 3</span>
          <h4 className="card-heading">Assembled Prompt Context & LLM Generation</h4>
          <button
            className={`btn ${isGenerating ? 'btn-active' : 'btn-primary'} generate-stream-btn`}
            onClick={handleSimulateGeneration}
            disabled={isGenerating}
          >
            {isGenerating ? '⚡ Streaming Tokens...' : '▶ Stream Grounded LLM Response'}
          </button>
        </div>

        <div className="sandbox-prompt-preview">
          <span className="prompt-label">Injected System Prompt Sent to LLM:</span>
          <pre className="prompt-pre">
{`You are an assistant. Answer ONLY from the provided context passages. Cite sources inline as [1], [2].

Context:
${topChunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n')}

User Question: ${userQuery}`}
          </pre>
        </div>

        {streamedTokens && (
          <div className="stream-result-card">
            <span className="stream-result-title">Grounded Streamed Response:</span>
            <div className="stream-content">
              {streamedTokens.split(/(\[\d+\])/g).map((part, i) => {
                const isCitation = part.match(/^\[\d+\]$/);
                return isCitation ? (
                  <span key={i} className="citation-chip-sandbox">{part}</span>
                ) : (
                  <span key={i}>{part}</span>
                );
              })}
              {isGenerating && <span className="cursor-blink">▋</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
