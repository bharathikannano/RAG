import { useState } from 'react';
import './ChunkCitations.css';

export default function ChunkCitations({ chunks }) {
  const [expanded, setExpanded] = useState(null);

  if (!chunks || chunks.length === 0) return null;

  return (
    <div className="citations-panel">
      <h4 className="citations-title text-xs text-muted">📌 Source Chunks ({chunks.length})</h4>
      <div className="citations-list">
        {chunks.map((chunk, i) => (
          <div
            key={chunk.id || i}
            className={`citation-item ${expanded === i ? 'expanded' : ''}`}
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="citation-header">
              <span className="citation-chip">{i + 1}</span>
              <span className="citation-score badge badge-cyan">
                {(chunk.score * 100).toFixed(0)}%
              </span>
              <span className="citation-filename text-xs text-muted">{chunk.filename}</span>
              <span className="citation-toggle">{expanded === i ? '▲' : '▼'}</span>
            </div>
            {expanded === i && (
              <p className="citation-text text-sm animate-fade">{chunk.text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
