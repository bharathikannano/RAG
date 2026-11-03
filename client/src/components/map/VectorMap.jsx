import { useEffect, useRef, useState, useMemo } from 'react';
import './VectorMap.css';

export default function VectorMap({ points: initialPoints = [], embeddings = [], chunks = [], resultChunks = [] }) {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const [localPoints, setLocalPoints] = useState([]);
  const [umapStatus, setUmapStatus] = useState('idle'); // idle | running | done | error
  const [tooltip, setTooltip] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Use props points if available, otherwise localPoints
  const activePoints = useMemo(() => {
    if (initialPoints && initialPoints.length > 0) return initialPoints;
    if (localPoints && localPoints.length > 0) return localPoints;
    return [];
  }, [initialPoints, localPoints]);

  // Compute points if not provided by pipeline
  useEffect(() => {
    if (initialPoints && initialPoints.length > 0) {
      setUmapStatus('done');
      return;
    }

    if (!embeddings || embeddings.length < 2) {
      setUmapStatus('idle');
      return;
    }

    setUmapStatus('running');

    const worker = new Worker(new URL('../../workers/umapWorker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.type === 'result') {
        setLocalPoints(e.data.points);
        setUmapStatus('done');
      } else if (e.data.type === 'error') {
        console.warn('UMAP worker message:', e.data.message);
        setUmapStatus('error');
      }
    };

    worker.onerror = (err) => {
      console.warn('UMAP worker error:', err);
      // Fallback projection
      const fallback = embeddings.map((emb, i) => ({
        x: emb[0] || 0,
        y: emb[1] || 0,
        label: chunks[i]?.text?.slice(0, 80) || '',
        originalIndex: i,
      }));
      setLocalPoints(fallback);
      setUmapStatus('done');
    };

    worker.postMessage({
      type: 'run',
      embeddings,
      labels: chunks.map(c => c.text?.slice(0, 80) || ''),
    });

    return () => worker.terminate();
  }, [embeddings, initialPoints, chunks]);

  // Draw on canvas
  useEffect(() => {
    if (!canvasRef.current || activePoints.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Normalize points coordinates
    const xs = activePoints.map(p => p.x);
    const ys = activePoints.map(p => p.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const pad = 44;

    function toCanvas(x, y) {
      const spanX = xMax - xMin || 1;
      const spanY = yMax - yMin || 1;
      return [
        pad + ((x - xMin) / spanX) * (width - 2 * pad),
        pad + ((y - yMin) / spanY) * (height - 2 * pad),
      ];
    }

    ctx.clearRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = 'hsla(220, 20%, 30%, 0.25)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 6; i++) {
      const x = pad + (i / 6) * (width - 2 * pad);
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, height - pad);
      ctx.stroke();

      const y = pad + (i / 6) * (height - 2 * pad);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(width - pad, y);
      ctx.stroke();
    }

    // Draw all points
    activePoints.forEach((pt, i) => {
      const [cx, cy] = toCanvas(pt.x, pt.y);
      const originalChunk = chunks[pt.originalIndex];
      const isResult = resultChunks.some(c => c.id === originalChunk?.id || c.chunkId === originalChunk?.chunkId);
      const isHovered = hoveredIdx === i;
      const r = isResult ? 7 : isHovered ? 6 : 4;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);

      if (isResult) {
        ctx.fillStyle = 'hsla(268, 95%, 68%, 0.95)';
        ctx.shadowColor = 'hsl(268, 95%, 68%)';
        ctx.shadowBlur = 14;
      } else {
        ctx.fillStyle = isHovered ? 'hsla(191, 100%, 65%, 0.95)' : 'hsla(191, 85%, 55%, 0.6)';
        ctx.shadowBlur = isHovered ? 8 : 0;
        ctx.shadowColor = 'hsl(191, 85%, 55%)';
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [activePoints, hoveredIdx, resultChunks, chunks]);

  // Mouse move handler for tooltips
  const handleMouseMove = (e) => {
    if (!canvasRef.current || activePoints.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const my = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);

    const xs = activePoints.map(p => p.x);
    const ys = activePoints.map(p => p.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const pad = 44;
    const W = canvasRef.current.width, H = canvasRef.current.height;

    let closest = null, minDist = Infinity;
    activePoints.forEach((pt, i) => {
      const cx = pad + ((pt.x - xMin) / (xMax - xMin || 1)) * (W - 2 * pad);
      const cy = pad + ((pt.y - yMin) / (yMax - yMin || 1)) * (H - 2 * pad);
      const d = Math.hypot(mx - cx, my - cy);
      if (d < minDist) { minDist = d; closest = i; }
    });

    if (minDist < 25 && closest !== null) {
      setHoveredIdx(closest);
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        text: activePoints[closest].label || `Chunk #${activePoints[closest].originalIndex + 1}`,
      });
    } else {
      setHoveredIdx(null);
      setTooltip(null);
    }
  };

  const hasData = activePoints.length > 0 || embeddings.length > 0;

  return (
    <div className="glass vector-map-wrapper">
      <div className="map-header">
        <h3 className="map-title">🗺️ Vector Space Map</h3>
        <div className="map-legend">
          <span className="legend-dot legend-result" />
          <span className="text-xs text-muted">Retrieved ({resultChunks.length})</span>
          <span className="legend-dot legend-all" />
          <span className="text-xs text-muted">All chunks ({activePoints.length || chunks.length})</span>
        </div>
        {umapStatus === 'running' && (
          <span className="flex items-center gap-2 text-xs text-muted">
            <div className="spinner-sm" /> Computing projection…
          </span>
        )}
      </div>

      {!hasData && (
        <div className="map-empty">
          <p>📂 Upload a document to project chunks in 2D vector space.</p>
        </div>
      )}

      {hasData && (
        <div className="canvas-wrapper" style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={420}
            className="umap-canvas"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setHoveredIdx(null); setTooltip(null); }}
          />
          {tooltip && (
            <div
              className="map-tooltip"
              style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
            >
              {tooltip.text}
            </div>
          )}
          {umapStatus === 'running' && activePoints.length === 0 && (
            <div className="map-overlay">
              <div className="spinner" />
              <span className="text-sm text-muted">Projecting vectors…</span>
            </div>
          )}
        </div>
      )}

      {activePoints.length > 0 && (
        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
          {activePoints.length} chunk points in 2D space · {resultChunks.length} active citations highlighted
        </p>
      )}
    </div>
  );
}
