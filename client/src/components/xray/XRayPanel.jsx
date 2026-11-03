import './XRayPanel.css';

const PROVIDER_COLORS = {
  groq: 'var(--accent)',
  gemini: 'var(--accent-2)',
  openrouter: 'var(--accent-3)',
  cerebras: 'hsl(300,80%,65%)',
  extractive: 'var(--accent-ok)',
};

function ProviderNode({ name, model, status }) {
  const color = PROVIDER_COLORS[name] || 'var(--text-muted)';
  const cls = status === 'active' ? 'active'
    : status === 'done' ? 'done'
    : status === 'failed' || status === 'error' ? 'failed'
    : 'idle';

  return (
    <div className={`provider-node provider-${cls}`} style={{ '--pcolor': color }}>
      <span className="provider-dot" />
      <div className="provider-info">
        <span className="provider-name">{name}</span>
        {model && <span className="provider-model text-xs text-muted">{model}</span>}
      </div>
      <span className="provider-status-icon">
        {cls === 'active' ? <div className="spinner-sm" /> : cls === 'done' ? '✓' : cls === 'failed' ? '✗' : '○'}
      </span>
    </div>
  );
}

function TokenBounce({ from, to, reason }) {
  return (
    <div className="token-bounce animate-fade">
      <span className="bounce-from">{from}</span>
      <div className="bounce-arrow">
        <div className="bounce-token" title={reason}>⚡</div>
        <span className="bounce-line" />
      </div>
      <span className="bounce-to">{to}</span>
    </div>
  );
}

export default function XRayPanel({
  stageState, providerPath, mode, activeProvider,
  extractiveSentences, resultChunks, usage, timing, pipelineProgress,
}) {
  const fallbacks = providerPath.filter((p, i) => i > 0 || p.status === 'failed');

  return (
    <div className="glass xray-panel">
      <h2 className="xray-title">🔬 X-Ray — Pipeline Inspector</h2>

      {/* Stage 8: Answer Generation */}
      <section className="xray-section">
        <h3 className="xray-section-title">Stage 8 · Answer Generation</h3>

        {providerPath.length === 0 && (
          <p className="text-muted text-sm">Ask a question to see the provider chain.</p>
        )}

        {/* Provider chain */}
        {providerPath.length > 0 && (
          <div className="provider-chain">
            {providerPath.map((p, i) => (
              <div key={`${p.name}-${i}`}>
                {i > 0 && fallbacks.some(f => f.name === providerPath[i - 1].name) && (
                  <TokenBounce
                    from={providerPath[i - 1].name}
                    to={p.name}
                    reason={providerPath[i - 1].reason || 'rate_limit'}
                  />
                )}
                <ProviderNode name={p.name} model={p.model} status={p.status} />
              </div>
            ))}
          </div>
        )}

        {/* Mode badge + stats */}
        {mode && (
          <div className="xray-stats">
            <div className="stat-row">
              <span className="stat-label">Mode</span>
              <span className={`badge ${mode === 'extractive' ? 'badge-cyan' : 'badge-purple'}`}>
                {mode === 'extractive' ? '🔍 Extractive' : `✨ Generative · ${activeProvider?.name}`}
              </span>
            </div>
            {usage && (
              <>
                <div className="stat-row">
                  <span className="stat-label">Prompt tokens</span>
                  <span className="stat-val font-mono">{usage.prompt_tokens}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Output tokens</span>
                  <span className="stat-val font-mono">{usage.completion_tokens}</span>
                </div>
              </>
            )}
            {timing && (
              <>
                {timing.firstToken != null && (
                  <div className="stat-row">
                    <span className="stat-label">Time to first token</span>
                    <span className="stat-val font-mono">{timing.firstToken}ms</span>
                  </div>
                )}
                <div className="stat-row">
                  <span className="stat-label">Total time</span>
                  <span className="stat-val font-mono">{(timing.totalTime / 1000).toFixed(2)}s</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Extractive sentences visualization */}
        {mode === 'extractive' && extractiveSentences.length > 0 && (
          <div className="extractive-sentences">
            <h4 className="text-xs text-muted mb-2">Sentence Scores (cosine similarity to query)</h4>
            {extractiveSentences.map((s, i) => (
              <div key={i} className="ex-sentence animate-slide">
                <div className="ex-sentence-header">
                  <span className="citation-chip">{s.citationIndex}</span>
                  <span className="ex-score font-mono text-xs" style={{ color: 'var(--accent-2)' }}>
                    {(s.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="score-bar mt-1">
                  <div className="score-bar-fill" style={{ width: `${s.score * 100}%` }} />
                </div>
                <p className="ex-text text-sm text-secondary mt-2">"{s.text}"</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Retrieval stats */}
      {resultChunks.length > 0 && (
        <section className="xray-section">
          <h3 className="xray-section-title">Retrieval · Top-{resultChunks.length} Chunks</h3>
          {resultChunks.map((c, i) => (
            <div key={i} className="xray-chunk">
              <div className="xray-chunk-header">
                <span className="citation-chip">{i + 1}</span>
                <span className="stat-val font-mono text-xs">{(c.score * 100).toFixed(1)}%</span>
                <span className="text-xs text-muted">{c.filename}</span>
              </div>
              <div className="score-bar mt-1">
                <div className="score-bar-fill" style={{ width: `${c.score * 100}%` }} />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Pipeline ingestion stats */}
      <section className="xray-section">
        <h3 className="xray-section-title">Ingestion</h3>
        <div className="stat-row">
          <span className="stat-label">Embedding model</span>
          <span className="stat-val font-mono text-xs">Xenova/all-MiniLM-L6-v2 (q8)</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Running on</span>
          <span className="stat-val">CPU · WebAssembly</span>
        </div>
        {pipelineProgress?.label && (
          <div className="stat-row">
            <span className="stat-label">Progress</span>
            <span className="stat-val">{pipelineProgress.label}</span>
          </div>
        )}
      </section>
    </div>
  );
}
