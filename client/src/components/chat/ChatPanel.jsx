import { useState, useRef, useEffect } from 'react';
import AnswerDisplay from './AnswerDisplay.jsx';
import ChunkCitations from './ChunkCitations.jsx';
import './ChatPanel.css';

/**
 * ChatPanel — full conversation-history chat UI.
 *
 * Shows all past Q&A turns as chat bubbles, then the live streaming
 * answer at the bottom. Tracks `pendingQuestion` locally so it can
 * render the user's latest question even before the server responds.
 */
export default function ChatPanel({
  isIndexed, isStreaming, answer, mode, activeProvider,
  extractiveSentences, timing, error, resultChunks, history,
  neverSendToCloud, onAsk, onStop, onClearHistory, status,
}) {
  const [question, setQuestion] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState('');
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  // Active hosted provider — for privacy notice
  const hostedProvider = activeProvider && activeProvider.name !== 'extractive' ? activeProvider.name : null;

  // Auto-scroll whenever new content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [answer, isStreaming, history.length]);

  // Clear the pending question bubble once history has absorbed it
  useEffect(() => {
    if (!isStreaming && pendingQuestion && history.length >= 2) {
      const lastUser = history[history.length - 2]?.content;
      if (lastUser === pendingQuestion) setPendingQuestion('');
    }
  }, [isStreaming, history, pendingQuestion]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || isStreaming || !isIndexed) return;
    setPendingQuestion(question);
    onAsk(question);
    setQuestion('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Group flat history array into [{user, assistant}] pairs for rendering
  const turns = [];
  for (let i = 0; i + 1 < history.length; i += 2) {
    turns.push({ user: history[i], assistant: history[i + 1] });
  }

  const hasContent = turns.length > 0 || pendingQuestion || answer || isStreaming || error;

  return (
    <div className="glass chat-panel">

      {/* Privacy Notice */}
      {hostedProvider && !neverSendToCloud && (
        <div className="privacy-notice" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>
            Your question and retrieved chunks are sent to <strong>{hostedProvider}</strong>.
            Don't use sensitive documents with hosted providers.
          </span>
        </div>
      )}

      {/* Empty state */}
      {!hasContent && !isIndexed && (
        <div className="no-index-hint">
          <p>📂 Upload a document to start asking questions.</p>
        </div>
      )}
      {!hasContent && isIndexed && (
        <div className="no-index-hint">
          <p>💬 Documents ready — ask your first question below.</p>
        </div>
      )}

      {/* History control bar */}
      {history.length > 0 && (
        <div className="history-bar">
          <span className="text-xs text-muted">{Math.floor(history.length / 2)} turn(s) in context</span>
          <button className="btn btn-ghost btn-sm" onClick={onClearHistory} id="clear-history-btn">Clear</button>
        </div>
      )}

      {/* ── Conversation thread ── */}
      {hasContent && (
        <div className="conversation-thread">

          {/* Completed turns */}
          {turns.map((turn, i) => (
            <div key={i} className="turn">
              {/* User bubble */}
              <div className="msg-row msg-row--user">
                <div className="msg-bubble msg-bubble--user">
                  {turn.user.content}
                </div>
                <span className="msg-avatar msg-avatar--user" aria-hidden>👤</span>
              </div>
              {/* Assistant bubble */}
              <div className="msg-row msg-row--assistant">
                <span className="msg-avatar msg-avatar--assistant" aria-hidden>🤖</span>
                <div className="msg-bubble msg-bubble--assistant">
                  <div className="msg-content">{turn.assistant.content}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Live turn — pending question + streaming answer */}
          {(pendingQuestion || isStreaming || answer || error) && (
            <div className="turn turn--live">
              {/* User's pending question */}
              {pendingQuestion && (
                <div className="msg-row msg-row--user">
                  <div className="msg-bubble msg-bubble--user">{pendingQuestion}</div>
                  <span className="msg-avatar msg-avatar--user" aria-hidden>👤</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="msg-row msg-row--assistant">
                  <span className="msg-avatar msg-avatar--assistant" aria-hidden>🤖</span>
                  <div className="msg-bubble msg-bubble--assistant msg-bubble--error" role="alert">
                    <span>⚠️</span>
                    <div>
                      <strong>Error</strong>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming / done answer */}
              {(answer || isStreaming) && (
                <div className="msg-row msg-row--assistant">
                  <span className="msg-avatar msg-avatar--assistant" aria-hidden>🤖</span>
                  <div className="msg-bubble msg-bubble--assistant">
                    <AnswerDisplay
                      answer={answer}
                      mode={mode}
                      activeProvider={activeProvider}
                      extractiveSentences={extractiveSentences}
                      timing={timing}
                      isStreaming={isStreaming}
                      resultChunks={resultChunks}
                    />
                    {resultChunks.length > 0 && !isStreaming && (
                      <ChunkCitations chunks={resultChunks} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input form — always at the bottom */}
      <form className="chat-form" onSubmit={handleSubmit}>
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="input chat-textarea"
            placeholder={isIndexed ? 'Ask a question about your documents…' : 'Upload a document first…'}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isIndexed || isStreaming}
            rows={2}
          />
          {isStreaming
            ? <button type="button" id="stop-btn" className="btn btn-danger" onClick={onStop}>⏹ Stop</button>
            : <button type="submit" id="ask-btn" className="btn btn-primary" disabled={!isIndexed || !question.trim()}>Ask ↵</button>
          }
        </div>
        <p className="chat-hint text-xs text-muted">Enter to send · Shift+Enter for newline</p>
      </form>
    </div>
  );
}
