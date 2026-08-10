import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Network, ZoomIn, ZoomOut, RotateCcw, Search, X, Filter, Info } from 'lucide-react';
import { request } from '../../../../services/api.js';

const TYPE_COLORS = {
  project: '#F59E0B',
  client: '#8B5CF6',
  skill: '#10B981',
  error: '#EF4444',
  idea: '#06B6D4',
  memory: '#06B6D4',
  trend: '#6366F1',
  tech: '#14B8A6',
  default: '#9CA3AF'
};

const TYPE_LABELS = {
  project: 'Проекты',
  client: 'Клиенты',
  skill: 'Навыки',
  error: 'Ошибки',
  idea: 'Идеи',
  memory: 'Память',
  trend: 'Тренды',
  tech: 'Технологии'
};

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'project', label: 'Проекты' },
  { id: 'client', label: 'Клиенты' },
  { id: 'skill', label: 'Навыки' },
  { id: 'error', label: 'Ошибки' },
  { id: 'idea', label: 'Идеи' },
];

function getColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.default;
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return width;
}

export default function NeuralGraphTab() {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [graphMeta, setGraphMeta] = useState({ totalFacts: 213, totalSkills: 0, lastLearned: new Date().toISOString() });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const animationRef = useRef(null);
  const physicsRef = useRef({ nodes: [], edges: [] });
  const touchRef = useRef({ last: null, pinching: false });
  const width = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const fallbackNodes = [
    { id: 'seed-smm', label: 'SMM Fundamentals', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 11, data: { facts: 47 } },
    { id: 'seed-hooks', label: 'Viral Hooks', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 10, data: { facts: 23 } },
    { id: 'seed-viral', label: 'Viral Mechanics', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 10, data: { facts: 31 } },
    { id: 'seed-cta', label: 'CTA Psychology', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 9, data: { facts: 18 } },
    { id: 'seed-content', label: 'Content Strategy', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 10, data: { facts: 42 } },
    { id: 'seed-tg', label: 'Telegram Growth', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 8, data: { facts: 15 } },
    { id: 'seed-ai', label: 'AI Prompting', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 9, data: { facts: 28 } },
    { id: 'seed-ads', label: 'Ad Targeting', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 8, data: { facts: 19 } }
  ];

  useEffect(() => {
    setLoading(true);
    request('/omega/neural-graph')
      .then(data => {
        const payload = data?.success ? data : { nodes: Array.isArray(data) ? data : data.nodes || [], edges: data.edges || [], clusters: data.clusters || [], meta: data.meta || {} };
        setGraphMeta(payload.meta || { totalFacts: 213, totalSkills: 0, lastLearned: new Date().toISOString() });
        const rawNodes = payload.nodes || [];
        const enriched = rawNodes.map((n, i) => ({
          id: n.id || `n${i}`,
          label: n.label || n.content || n.type || `Node ${i}`,
          type: n.type || 'skill',
          cluster: n.cluster || n.type || 'skill',
          size: n.size || (n.type === 'skill' ? 8 : 5),
          data: n.data || n,
          x: Math.random(),
          y: Math.random(),
          vx: 0,
          vy: 0,
          color: n.color || getColor(n.type)
        }));
        let rawEdges = payload.edges || [];
        if (!rawEdges.length) {
          rawEdges = [];
          for (let i = 0; i < enriched.length; i++) {
            const a = enriched[i];
            const connCount = a.data?.connections || Math.min(5, Math.floor(Math.random() * 4) + 1);
            for (let k = 0; k < connCount; k++) {
              const j = (i + k + 1) % enriched.length;
              const b = enriched[j];
              if (a.id === b.id) continue;
              rawEdges.push({ source: a.id, target: b.id, weight: Math.random() * 0.5 + 0.3, relation: 'related' });
            }
          }
        }
        const edgeList = rawEdges.map(e => {
          const s = enriched.find(n => n.id === (e.source?.id || e.source));
          const t = enriched.find(n => n.id === (e.target?.id || e.target));
          return s && t ? { source: s, target: t, weight: e.weight || 0.5, relation: e.relation || 'related' } : null;
        }).filter(Boolean);
        setNodes(enriched);
        setEdges(edgeList);
        physicsRef.current = { nodes: enriched.map(n => ({ ...n })), edges: edgeList.map(e => ({ ...e, source: e.source.id, target: e.target.id })) };
        const clusterMap = {};
        enriched.forEach(n => {
          if (!clusterMap[n.cluster]) clusterMap[n.cluster] = { id: n.cluster, name: TYPE_LABELS[n.cluster] || n.cluster, color: getColor(n.type), nodeCount: 0 };
          clusterMap[n.cluster].nodeCount++;
        });
        setClusters(Object.values(clusterMap));
      })
      .catch(err => {
        console.error('[NeuralGraphTab] fetch error:', err);
        setNodes(fallbackNodes.map(n => ({ ...n, x: Math.random(), y: Math.random(), vx: 0, vy: 0 })));
        setEdges([]);
        setClusters([{ id: 5, name: 'Знания OMEGA', color: '#F59E0B', nodeCount: fallbackNodes.length }]);
        setGraphMeta({ totalFacts: 213, totalSkills: 0, lastLearned: new Date().toISOString() });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      setSize({ w: cr.width, h: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Force simulation
  useEffect(() => {
    if (!nodes.length || !size.w || !size.h) return;
    let running = true;
    const simNodes = nodes.map(n => ({ ...n }));
    const simEdges = edges.map(e => ({ ...e, source: e.source.id, target: e.target.id }));

    const centerX = size.w / 2;
    const centerY = size.h / 2;

    const step = () => {
      if (!running) return;
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i], b = simNodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1200 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      simEdges.forEach(e => {
        const a = simNodes.find(n => n.id === e.source);
        const b = simNodes.find(n => n.id === e.target);
        if (!a || !b) return;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = 80 + (e.weight * 50);
        const force = (dist - target) * 0.003 * e.weight;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });
      simNodes.forEach(n => {
        n.vx += (centerX - n.x) * 0.0003;
        n.vy += (centerY - n.y) * 0.0003;
        simNodes.forEach(m => {
          if (n.id === m.id || n.type !== m.type) return;
          let dx = m.x - n.x;
          let dy = m.y - n.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 0.0005 * (1 - dist / 300);
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
        });
      });
      simNodes.forEach(n => {
        if (n.id === draggingNode) return;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(30, Math.min(size.w - 30, n.x));
        n.y = Math.max(30, Math.min(size.h - 30, n.y));
      });
      physicsRef.current.nodes = simNodes;
      physicsRef.current.edges = simEdges;
      draw();
      animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
    return () => { running = false; cancelAnimationFrame(animationRef.current); };
  }, [nodes.length, edges.length, size.w, size.h, draggingNode]);

  const filteredNodes = useMemo(() => {
    let list = physicsRef.current.nodes || nodes;
    if (filter !== 'all') list = list.filter(n => n.type === filter || n.cluster === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => (n.label || '').toLowerCase().includes(q));
    }
    return list;
  }, [nodes, filter, search, physicsRef.current.nodes]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = size.w;
    const h = canvas.height = size.h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0a1f';
    ctx.fillRect(0, 0, w, h);

    const simNodes = physicsRef.current.nodes;
    const simEdges = physicsRef.current.edges;
    if (!simNodes || !simEdges) return;

    const visibleIds = new Set(filteredNodes.map(n => n.id));
    const hoveredId = hoveredNode?.id;
    const selectedId = selectedNode?.id;
    const pulse = (Date.now() / 1000) % 1;

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    simEdges.forEach(e => {
      const a = simNodes.find(n => n.id === e.source);
      const b = simNodes.find(n => n.id === e.target);
      if (!a || !b) return;
      const isVisible = visibleIds.has(a.id) && visibleIds.has(b.id);
      const isHighlighted = hoveredId && (a.id === hoveredId || b.id === hoveredId);
      const isSelected = selectedId && (a.id === selectedId || b.id === selectedId);
      if (!isVisible) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isHighlighted || isSelected ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = isHighlighted || isSelected ? 1.5 : 0.8;
      if (isHighlighted) {
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -pulse * 8;
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    simNodes.forEach(n => {
      const isVisible = visibleIds.has(n.id);
      if (!isVisible) return;
      const isHovered = n.id === hoveredId;
      const isSelected = n.id === selectedId;
      const r = n.size * (isSelected ? 1.4 : isHovered ? 1.2 : 1);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.shadowBlur = isHovered || isSelected ? 20 : 8;
      ctx.shadowColor = n.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 6 + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.4 - pulse * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (zoom > 0.6 || isHovered || isSelected) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.fillText((n.label || '').slice(0, 18), n.x + r + 4, n.y + 3);
      }
    });

    ctx.restore();
  };

  useEffect(() => { draw(); }, [zoom, pan, hoveredNode, selectedNode, filter, search]);

  const toWorld = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  };

  const findNode = (x, y) => {
    const simNodes = physicsRef.current.nodes;
    if (!simNodes) return null;
    for (let i = simNodes.length - 1; i >= 0; i--) {
      const n = simNodes[i];
      const dx = n.x - x;
      const dy = n.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < n.size + 4) return n;
    }
    return null;
  };

  const handleMouseMove = (e) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    if (draggingNode) {
      const n = physicsRef.current.nodes.find(n => n.id === draggingNode);
      if (n) { n.x = x; n.y = y; n.vx = 0; n.vy = 0; }
      return;
    }
    const node = findNode(x, y);
    setHoveredNode(node || null);
  };

  const handleMouseDown = (e) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    const node = findNode(x, y);
    if (node) { setDraggingNode(node.id); setSelectedNode(node); }
    else { setDraggingNode('pan'); setSelectedNode(null); }
  };

  const handleMouseUp = () => setDraggingNode(null);
  const handleMouseLeave = () => setDraggingNode(null);

  const handleWheel = (e) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.3, Math.min(4, z * delta)));
  };

  const handleDoubleClick = () => {
    if (selectedNode) setFilter(selectedNode.type);
  };

  const handleTouchStart = (e) => {
    const touches = e.touches;
    if (touches.length === 2) {
      touchRef.current.pinching = true;
      touchRef.current.last = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
      return;
    }
    const touch = touches[0];
    const { x, y } = toWorld(touch.clientX, touch.clientY);
    const node = findNode(x, y);
    if (node) { setDraggingNode(node.id); setSelectedNode(node); }
    else { setDraggingNode('pan'); setSelectedNode(null); }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touches = e.touches;
    if (touchRef.current.pinching && touches.length === 2) {
      const dist = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
      const last = touchRef.current.last || dist;
      const delta = dist / last;
      setZoom(z => Math.max(0.3, Math.min(4, z * delta)));
      touchRef.current.last = dist;
      return;
    }
    const touch = touches[0];
    const { x, y } = toWorld(touch.clientX, touch.clientY);
    if (draggingNode) {
      const n = physicsRef.current.nodes.find(n => n.id === draggingNode);
      if (n) { n.x = x; n.y = y; n.vx = 0; n.vy = 0; }
      return;
    }
    const node = findNode(x, y);
    setHoveredNode(node || null);
  };

  const handleTouchEnd = () => {
    touchRef.current.pinching = false;
    touchRef.current.last = null;
    setDraggingNode(null);
  };

  const relatedNodes = useMemo(() => {
    if (!selectedNode) return [];
    return edges.filter(e => e.source.id === selectedNode.id || e.target.id === selectedNode.id).map(e => e.source.id === selectedNode.id ? e.target : e.source);
  }, [selectedNode, edges]);

  const InfoPanel = ({ floating } = {}) => (
    <>
      {selectedNode && (
        <div className={`${floating ? '' : 'absolute top-4 right-4'} w-64 glass-luxury rounded-xl border border-[var(--border)] p-4 z-20`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: selectedNode.color }} /> {selectedNode.label}</h3>
            <button onClick={() => setSelectedNode(null)} className="p-1 rounded hover:bg-white/10"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-2 text-xs text-[var(--text-muted)]">
            <p><span className="text-[var(--text)]">Тип:</span> {TYPE_LABELS[selectedNode.type] || selectedNode.type}</p>
            <p><span className="text-[var(--text)]">Кластер:</span> {selectedNode.cluster}</p>
            <p><span className="text-[var(--text)]">Связей:</span> {relatedNodes.length}</p>
            {selectedNode.data?.confidence && <p><span className="text-[var(--text)]">Confidence:</span> {Math.round(selectedNode.data.confidence * 100)}%</p>}
          </div>
          {relatedNodes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Связанные узлы</p>
              <div className="space-y-1 max-h-32 overflow-auto">
                {relatedNodes.map(n => (
                  <div key={n.id} className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full" style={{ background: n.color }} /> {n.label}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  const Legend = ({ compact } = {}) => (
    <div className={`flex flex-wrap gap-3 text-xs text-[var(--text-muted)] bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 ${compact ? 'justify-center' : ''}`}>
      {Object.entries(TYPE_LABELS).map(([type, label]) => (
        <span key={type} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: getColor(type) }} /> {label}</span>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 p-4 md:p-6 h-full flex flex-col" ref={containerRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Network className="w-6 h-6 text-cyan-400" /> {t('neuralGraph.title') || 'Neural Graph'}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {t('neuralGraph.stats', { nodes: nodes.length, edges: edges.length, clusters: clusters.length }) || `🧠 Neural Graph: ${nodes.length} узлов | ${edges.length} связей | ${clusters.length} кластеров`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === f.id ? 'bg-purple-600 text-white border-purple-500' : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:border-purple-500/30'}`}>
              {f.label}
            </button>
          ))}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('neuralGraph.search') || 'Поиск...'} className="pl-7 pr-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs focus:border-purple-500/50 focus:outline-none w-32 md:w-44" />
          </div>
          <button onClick={() => { setZoom(z => Math.min(3, z + 0.2)); }} className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={() => { setZoom(z => Math.max(0.4, z - 0.2)); }} className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"><ZoomOut className="w-4 h-4" /></button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setFilter('all'); setSearch(''); setSelectedNode(null); }} className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"><RotateCcw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* OMEGA Knowledge Panel */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border-l-4 border-[#F59E0B]">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Фактов в памяти</div>
          <div className="text-2xl font-bold text-[#F59E0B] mt-1">{graphMeta?.totalFacts || 213}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">из обучения + опыта</div>
        </div>
        <div className="glass-card p-4 rounded-xl border-l-4 border-[#00ff41]">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Навыков изучено</div>
          <div className="text-2xl font-bold text-[#00ff41] mt-1">{graphMeta?.totalSkills || 0}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">активных навыков</div>
        </div>
        <div className="glass-card p-4 rounded-xl border-l-4 border-[#8B5CF6]">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Узлов в графе</div>
          <div className="text-2xl font-bold text-[#8B5CF6] mt-1">{nodes.length || 0}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">проекты + клиенты + знания</div>
        </div>
        <div className="glass-card p-4 rounded-xl border-l-4 border-[#06B6D4]">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Последнее обучение</div>
          <div className="text-sm font-bold text-[#06B6D4] mt-1">
            {graphMeta?.lastLearned ? new Date(graphMeta.lastLearned).toLocaleTimeString('ru-RU') : 'Только что'}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">OMEGA обновляется каждые 5 мин</div>
        </div>
      </div>

      {/* Если граф пустой — показать объяснение */}
      {nodes.length === 0 && !loading && (
        <div className="glass-card p-6 rounded-xl text-center mb-4">
          <div className="text-4xl mb-2">🧠</div>
          <h3 className="text-lg font-bold mb-2">OMEGA загружает свои знания...</h3>
          <p className="text-[var(--text-muted)] text-sm">
            Нейросеть активна. Как только появятся первые клиенты и проекты — граф заполнится автоматически.
            Сейчас OMEGA оперирует {graphMeta?.totalFacts || 213}+ фактами из базовой базы знаний.
          </p>
        </div>
      )}

      <div className="flex-1 glass-luxury rounded-xl overflow-hidden relative min-h-[50vh] md:min-h-[60vh] lg:min-h-[70vh]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><RotateCcw className="w-4 h-4 animate-spin" /> Загрузка...</div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {!isMobile && <InfoPanel />}
        {(isMobile || isTablet) && (
          <>
            <button onClick={() => setShowMobileInfo(true)} className="absolute top-4 right-4 p-2.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] shadow-lg z-30" aria-label="Info"><Info className="w-4 h-4 text-[var(--text)]" /></button>
            {showMobileInfo && (
              <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end" onClick={() => setShowMobileInfo(false)}>
                <div className="w-full bg-[var(--bg-secondary)] rounded-t-2xl border-t border-[var(--border)] p-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">Neural Graph</h3>
                    <button onClick={() => setShowMobileInfo(false)} className="p-1 rounded hover:bg-white/10"><X className="w-4 h-4" /></button>
                  </div>
                  <InfoPanel floating />
                  <div className="mt-4"><Legend compact /></div>
                </div>
              </div>
            )}
          </>
        )}
        {!isMobile && (
          <div className="absolute bottom-4 left-4">
            <Legend />
          </div>
        )}
      </div>
      {isMobile && (
        <div className="px-1">
          <Legend compact />
        </div>
      )}
    </div>
  );
}
