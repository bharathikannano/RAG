import { useRef, useState } from 'react';
import './UploadZone.css';

/**
 * UploadZone — multi-file drop zone + uploaded docs list.
 *
 * Props:
 *   onFiles(fileArray)    — called with an array of File objects
 *   onRemoveDoc(docId)    — called when the user removes a doc
 *   docList               — [{docId, filename, charCount, chunkCount}]
 *   currentDocMeta        — {filename} of the file currently being ingested (or null)
 *   disabled              — true while model is loading
 *   workerStatus          — 'loading'|'ready'|'error'
 *   workerProgress        — string
 *   onRetry               — retry model load
 */
export default function UploadZone({
  onFiles, onRemoveDoc, docList = [], currentDocMeta,
  disabled, workerStatus, workerProgress, onRetry,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragCount, setDragCount] = useState(0); // # files in current drag

  const isError   = workerStatus === 'error';
  const isLoading = workerStatus === 'loading' || (disabled && !isError);

  const handleFiles = (fileList) => {
    const files = [...fileList].filter(Boolean);
    if (files.length > 0) onFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    setDragCount(0);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
    setDragCount(e.dataTransfer?.items?.length || 0);
  };

  const handleDragLeave = () => { setDragging(false); setDragCount(0); };

  const handleChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleClick = () => {
    if (isError && onRetry) { onRetry(); return; }
    if (!disabled) inputRef.current?.click();
  };

  const formatSize = (charCount) => {
    if (!charCount) return '';
    return charCount >= 1000 ? `${(charCount / 1000).toFixed(1)}K chars` : `${charCount} chars`;
  };

  return (
    <div className="glass upload-zone-wrapper">
      <h3 className="upload-title">📤 Documents</h3>

      {/* Uploaded docs list */}
      {docList.length > 0 && (
        <div className="doc-list">
          {docList.map((doc) => (
            <div key={doc.docId} className="doc-item">
              <span className="doc-item-icon">📄</span>
              <div className="doc-item-details">
                <span className="doc-item-name" title={doc.filename}>{doc.filename}</span>
                <span className="doc-item-meta text-xs text-muted">
                  {doc.chunkCount} chunks · {formatSize(doc.charCount)}
                </span>
              </div>
              <button
                className="doc-remove-btn"
                title="Remove this document"
                onClick={() => onRemoveDoc?.(doc.docId)}
                aria-label={`Remove ${doc.filename}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Currently ingesting indicator */}
      {currentDocMeta && (
        <div className="doc-ingesting">
          <span className="spinner-sm" />
          <span className="text-xs text-muted">Processing {currentDocMeta.filename}…</span>
        </div>
      )}

      {/* Drop zone */}
      <div
        id="upload-drop-zone"
        className={`upload-drop ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${isError ? 'cursor-pointer' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="upload-icon">
          {isLoading ? <div className="spinner" /> : isError ? '⚠️' : docList.length > 0 ? '➕' : '📂'}
        </div>
        <p className="upload-hint">
          {isError
            ? 'Model failed to load. Click to retry 🔄'
            : isLoading
            ? (workerProgress || 'Model loading…')
            : dragging
            ? `Drop ${dragCount > 1 ? `${dragCount} files` : 'file'} here`
            : docList.length > 0
            ? 'Drop more files to add to the index'
            : 'Drop PDF, DOCX, TXT, or MD'}
        </p>
        <p className="upload-sub text-xs text-muted">
          {isError
            ? 'Check connection or click to re-initialize'
            : 'Multiple files supported · max 50 MB each · click to browse'}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
        id="file-input"
      />
    </div>
  );
}
