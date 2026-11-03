import { STAGES } from '../../hooks/usePipeline.js';
import './PipelinePanel.css';

const STATE_ICON = {
  pending: '○',
  active: '⟳',
  done: '✓',
  error: '✗',
};

export default function PipelinePanel({ stageState, progress, error, onCancel, docMeta }) {
  const anyActive = Object.values(stageState).some(s => s === 'active');

  return (
    <div className="glass pipeline-panel">
      <div className="pipeline-header">
        <h3>🔄 Ingestion Pipeline</h3>
        {anyActive && (
          <button className="btn btn-danger btn-sm" onClick={onCancel}>Cancel</button>
        )}
      </div>

      <div className="stage-list">
        {STAGES.map(stage => {
          const state = stageState[stage.id] || 'pending';
          return (
            <div key={stage.id} className={`stage-row stage-${state}`}>
              <span className="stage-num">{state === 'active' ? <div className="spinner-sm" /> : STATE_ICON[state]}</span>
              <span className="stage-icon">{stage.icon}</span>
              <span className="stage-label">{stage.label}</span>
              {state === 'active' && progress.label && (
                <span className="stage-progress text-xs text-muted">{progress.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar for embedding stage */}
      {progress.total > 0 && progress.current < progress.total && (
        <div className="embed-progress">
          <div className="score-bar">
            <div
              className="score-bar-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted">{progress.label}</span>
        </div>
      )}

      {error && (
        <div className="error-card mt-3" role="alert">
          <span>⚠️</span>
          <div>
            <strong>Error</strong>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {stageState[7] === 'done' && docMeta && (
        <div className="pipeline-done animate-fade">
          <span className="text-accent">✓ Index ready</span>
          <span className="text-xs text-muted">{docMeta.filename}</span>
        </div>
      )}
    </div>
  );
}
