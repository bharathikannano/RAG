import './Header.css';

export default function Header({ workerStatus, workerProgress, onSettingsClick, showSettings }) {
  const statusColor = workerStatus === 'ready' ? 'var(--accent-ok)'
    : workerStatus === 'loading' ? 'var(--accent-warn)'
    : workerStatus === 'error' ? 'var(--accent-err)'
    : 'var(--text-muted)';

  return (
    <header className="header glass-dark">
      <div className="header-left">
        <div className="header-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">profile<span className="logo-rag">RAG</span></span>
        </div>
        <span className="header-tagline">Local-first · Transparent · Free</span>
      </div>

      <div className="header-center">
        <div className="model-badge">
          <span className="model-dot" style={{ background: statusColor }} />
          <span className="model-label">
            {workerStatus === 'ready'
              ? 'Xenova/all-MiniLM-L6-v2 (q8 · CPU)'
              : workerStatus === 'loading'
              ? workerProgress || 'Loading model…'
              : workerStatus === 'error'
              ? 'Model error'
              : 'Initializing…'}
          </span>
        </div>
      </div>

      <div className="header-right">
        <button
          id="settings-btn"
          className={`btn btn-ghost ${showSettings ? 'active' : ''}`}
          onClick={onSettingsClick}
          aria-label="Settings"
        >
          ⚙️ Settings
        </button>
      </div>
    </header>
  );
}
