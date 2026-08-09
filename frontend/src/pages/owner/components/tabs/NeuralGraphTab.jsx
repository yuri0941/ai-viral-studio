import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Network, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function NeuralGraphTab() {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    fetch('https://aiviral-backend.onrender.com/api/omega-supreme/mesh/nodes?limit=50', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(d => setNodes(d.nodes || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nodes.length) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth;
    const h = canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0a1f'; ctx.fillRect(0, 0, w, h);

    nodes.forEach((node, i) => {
      const x = (node.x || Math.random()) * w;
      const y = (node.y || Math.random()) * h;
      const r = node.type === 'skill' ? 8 : 5;
      ctx.beginPath();
      ctx.arc(x, y, r * zoom, 0, Math.PI * 2);
      ctx.fillStyle = node.type === 'skill' ? '#8B5CF6' : node.type === 'error' ? '#EF4444' : '#06B6D4';
      ctx.fill();
      ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (zoom > 0.8) {
        ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif';
        const label = (node.content || node.label || node.type || '').slice(0, 20);
        ctx.fillText(label, x + 10, y + 3);
      }
    });
  }, [nodes, zoom]);

  return (
    <div className="space-y-4 p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Network className="w-6 h-6 text-cyan-400" /> {t('neuralGraph.title')}</h2>
      <div className="flex gap-2">
        <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-2 rounded-lg bg-[var(--bg-secondary)]"><ZoomIn className="w-4 h-4" /></button>
        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} className="p-2 rounded-lg bg-[var(--bg-secondary)]"><ZoomOut className="w-4 h-4" /></button>
        <button onClick={() => setZoom(1)} className="p-2 rounded-lg bg-[var(--bg-secondary)]"><RotateCcw className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 glass-luxury rounded-xl overflow-hidden relative">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <div className="flex gap-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> {t('neuralGraph.skills')}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> {t('neuralGraph.memory')}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {t('neuralGraph.errors')}</span>
      </div>
    </div>
  );
}
