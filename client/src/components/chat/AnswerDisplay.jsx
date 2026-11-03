import './AnswerDisplay.css';

function renderAnswer(text, resultChunks) {
  if (!text) return null;
  // Replace [n] with citation chips
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const n = parseInt(match[1]);
      return (
        <span key={i} className="citation-chip" title={resultChunks[n - 1]?.text?.slice(0, 120) || ''}>
          {n}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function AnswerDisplay({
  answer, mode, activeProvider, extractiveSentences, timing, isStreaming, resultChunks,
}) {
  const isExtractive = mode === 'extractive';

  return (
    <div className="answer-display">
      {/* Mode badge */}
      <div className="answer-meta">
        {isExtractive ? (
          <span className="badge badge-cyan">🔍 Extractive</span>
        ) : activeProvider ? (
          <span className="badge badge-purple">✨ {activeProvider.name} · {activeProvider.model}</span>
        ) : null}

        {timing && !isStreaming && (
          <span className="answer-timing text-xs text-muted">
            {timing.firstToken != null ? `TTFT ${timing.firstToken}ms · ` : ''}
            Total {(timing.totalTime / 1000).toFixed(2)}s
          </span>
        )}

        {isStreaming && <div className="spinner" style={{ width: 14, height: 14 }} />}
      </div>

      {/* Extractive mode: sentence-by-sentence reveal */}
      {isExtractive && extractiveSentences.length > 0 && (
        <div className="extractive-banner text-xs text-muted">
          Built directly from your documents (no AI writer)
        </div>
      )}

      {/* Answer text */}
      <div className={`answer-text ${isStreaming ? 'streaming' : ''}`}>
        {answer
          ? renderAnswer(answer, resultChunks)
          : isStreaming
          ? <span className="text-muted">Thinking…</span>
          : null
        }
        {isStreaming && <span className="cursor-blink">▋</span>}
      </div>
    </div>
  );
}
