import './SettingsPanel.css';

const PROVIDERS = ['auto', 'groq', 'gemini', 'openrouter', 'cerebras', 'extractive'];

export default function SettingsPanel({ settings, onChange, onClose, status, onRerankerToggle }) {
  const set = (key, val) => onChange(s => ({ ...s, [key]: val }));

  const providerStatus = (name) => {
    if (!status) return null;
    const p = status.providers?.find(p => p.name === name);
    return p;
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel glass" onClick={e => e.stopPropagation()} role="dialog" aria-label="Settings">
        <div className="settings-header">
          <h2 className="settings-title">⚙️ Settings</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} id="settings-close-btn">✕</button>
        </div>

        {/* LLM Provider */}
        <section className="settings-section">
          <h3 className="settings-section-title">LLM Provider</h3>
          <div className="provider-grid">
            {PROVIDERS.map(name => {
              const info = name !== 'auto' ? providerStatus(name) : null;
              const available = name === 'auto' || name === 'extractive' || info?.hasKey;
              return (
                <button
                  key={name}
                  id={`provider-${name}`}
                  className={`provider-btn ${settings.provider === name ? 'selected' : ''} ${!available && name !== 'auto' ? 'unavailable' : ''}`}
                  onClick={() => set('provider', name)}
                >
                  <span className="provider-btn-name">{name}</span>
                  {name !== 'auto' && name !== 'extractive' && (
                    <span className={`provider-btn-status ${available ? 'ok' : 'missing'}`}>
                      {available ? '✓ key' : 'no key'}
                    </span>
                  )}
                  {name === 'extractive' && (
                    <span className="provider-btn-status ok">always on</span>
                  )}
                </button>
              );
            })}
          </div>
          {!status?.providers?.some(p => p.hasKey && p.name !== 'extractive') && (
            <div className="error-card mt-3">
              <span>ℹ️</span>
              <div>
                <strong>No API key found</strong>
                <p className="text-sm">Using extractive mode (add a free key to .env for written answers).</p>
              </div>
            </div>
          )}
        </section>

        {/* Retrieval */}
        <section className="settings-section">
          <h3 className="settings-section-title">Retrieval</h3>
          <div className="settings-row">
            <label htmlFor="topk-input">Top-K chunks</label>
            <input id="topk-input" className="input settings-input" type="number" min={1} max={10}
              value={settings.topK} onChange={e => set('topK', +e.target.value)} />
          </div>
        </section>

        {/* Chunking */}
        <section className="settings-section">
          <h3 className="settings-section-title">Chunking (applies on next upload)</h3>
          <div className="settings-row">
            <label htmlFor="chunksize-input">Chunk size (chars)</label>
            <input id="chunksize-input" className="input settings-input" type="number" min={100} max={2000} step={50}
              value={settings.chunkSize} onChange={e => set('chunkSize', +e.target.value)} />
          </div>
          <div className="settings-row">
            <label htmlFor="overlap-input">Overlap (chars)</label>
            <input id="overlap-input" className="input settings-input" type="number" min={0} max={400} step={10}
              value={settings.chunkOverlap} onChange={e => set('chunkOverlap', +e.target.value)} />
          </div>
          <div className="settings-row">
            <label htmlFor="batchsize-input">Embed batch size</label>
            <input id="batchsize-input" className="input settings-input" type="number" min={1} max={32}
              value={settings.batchSize} onChange={e => set('batchSize', +e.target.value)} />
          </div>
        </section>

        {/* Reranker */}
        <section className="settings-section">
          <h3 className="settings-section-title">Reranker (experimental)</h3>
          <div className="settings-row">
            <label htmlFor="reranker-toggle">Enable cross-encoder reranker</label>
            <label className="toggle">
              <input id="reranker-toggle" type="checkbox" checked={settings.rerankerEnabled}
                onChange={e => onRerankerToggle(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <p className="text-xs text-muted">Loads a second model lazily. Disabled by default to save RAM.</p>
        </section>

        {/* Privacy */}
        <section className="settings-section">
          <h3 className="settings-section-title">Privacy</h3>
          <div className="settings-row">
            <label htmlFor="cloud-toggle">Never send data to cloud</label>
            <label className="toggle">
              <input id="cloud-toggle" type="checkbox" checked={settings.neverSendToCloud}
                onChange={e => set('neverSendToCloud', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <p className="text-xs text-muted">Forces extractive mode. No text leaves your machine.</p>
        </section>
      </div>
    </div>
  );
}
