import React, { useEffect, useRef, useState, useCallback } from 'react'

const NODE_TYPES = {
  project: '#8B5CF6',
  client: '#06B6D4',
  error: '#F97316',
  idea: '#00ff41',
  trend: '#F59E0B',
  tech: '#EC4899',
}

const TYPE_LABELS = {
  project: 'Проект',
  client: 'Клиент',
  error: 'Ошибка',
  idea: 'Идея',
  trend: 'Тренд',
  tech: 'Технология',
}

const FALLBACK_NODES = [
  { id: 'n1', label: 'ContentAI', type: 'project', x: 0.2, y: 0.3, connections: 5 },
  { id: 'n2', label: 'Viral Engine', type: 'project', x: 0.5, y: 0.2, connections: 7 },
  { id: 'n3', label: 'Analytics Core', type: 'tech', x: 0.7, y: 0.3, connections: 4 },
  { id: 'n4', label: 'CoffeeHype', type: 'client', x: 0.3, y: 0.5, connections: 3 },
  { id: 'n5', label: 'BeautyBox', type: 'client', x: 0.6, y: 0.5, connections: 4 },
  { id: 'n6', label: 'AI Viral Studio', type: 'project', x: 0.5, y: 0.4, connections: 8 },
  { id: 'n7', label: 'Reels Hook #1', type: 'idea', x: 0.2, y: 0.6, connections: 2 },
  { id: 'n8', label: 'Trend TikTok 2026', type: 'trend', x: 0.8, y: 0.6, connections: 5 },
  { id: 'n9', label: 'Groq API', type: 'tech', x: 0.4, y: 0.7, connections: 3 },
  { id: 'n10', label: 'Auth Timeout', type: 'error', x: 0.7, y: 0.7, connections: 2 },
  { id: 'n11', label: 'Scheduler', type: 'tech', x: 0.1, y: 0.4, connections: 3 },
  { id: 'n12', label: 'FitnessPro', type: 'client', x: 0.9, y: 0.4, connections: 3 },
  { id: 'n13', label: 'Shorts Script', type: 'idea', x: 0.3, y: 0.8, connections: 2 },
  { id: 'n14', label: 'YouTube Trend', type: 'trend', x: 0.6, y: 0.8, connections: 4 },
  { id: 'n15', label: 'Redis Cache', type: 'tech', x: 0.5, y: 0.1, connections: 3 },
  { id: 'n16', label: 'MongoDB', type: 'tech', x: 0.8, y: 0.2, connections: 4 },
  { id: 'n17', label: 'Omega Core', type: 'project', x: 0.45, y: 0.35, connections: 6 },
  { id: 'n18', label: 'AutoPilot', type: 'project', x: 0.55, y: 0.45, connections: 5 },
  { id: 'n19', label: 'Replicate Gen', type: 'tech', x: 0.25, y: 0.25, connections: 2 },
  { id: 'n20', label: 'Brand Voice', type: 'project', x: 0.65, y: 0.25, connections: 3 },
  { id: 'n21', label: 'TravelBlog', type: 'client', x: 0.35, y: 0.55, connections: 3 },
  { id: 'n22', label: 'FinanceTips', type: 'client', x: 0.75, y: 0.55, connections: 3 },
  { id: 'n23', label: 'Hook Generator', type: 'idea', x: 0.15, y: 0.75, connections: 2 },
  { id: 'n24', label: 'Cover AI', type: 'idea', x: 0.85, y: 0.75, connections: 2 },
  { id: 'n25', label: 'Webhook Fail', type: 'error', x: 0.5, y: 0.75, connections: 2 },
  { id: 'n26', label: 'Stripe Webhook', type: 'tech', x: 0.4, y: 0.15, connections: 3 },
  { id: 'n27', label: 'Self-Healing', type: 'project', x: 0.6, y: 0.15, connections: 4 },
  { id: 'n28', label: 'FoodBlog', type: 'client', x: 0.2, y: 0.45, connections: 2 },
  { id: 'n29', label: 'Neural Graph', type: 'tech', x: 0.7, y: 0.45, connections: 4 },
  { id: 'n30', label: 'Learning Dataset', type: 'tech', x: 0.5, y: 0.6, connections: 5 },
]

function buildEdges(nodes) {
  const edges = []
  nodes.forEach((a, i) => {
    nodes.forEach((b, j) => {
      if (i >= j) return
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 0.35) {
        edges.push({ source: a.id, target: b.id, weight: Math.max(0.15, 1 - dist) })
      }
    })
  })
  return edges
}

export default function OmegaBrainViz({ nodes: propNodes }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [nodes, setNodes] = useState(FALLBACK_NODES)
  const [edges, setEdges] = useState(() => buildEdges(FALLBACK_NODES))
  const [status, setStatus] = useState({ nodes: 30, edges: 0, clusters: 5, lastUpdate: new Date().toISOString() })
  const [filter, setFilter] = useState('all')
  const [hovered, setHovered] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const pinchRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/omega/neural-graph/nodes')
        if (!res.ok) throw new Error('network')
        const data = await res.json()
        if (Array.isArray(data) && data.length) {
          setNodes(data)
          setEdges(buildEdges(data))
        }
        const sres = await fetch('/api/omega/neural-graph/status')
        if (sres.ok) setStatus(await sres.json())
      } catch (err) {
        console.warn('[OmegaBrainViz] using fallback neural nodes:', err.message)
        setStatus(prev => ({ ...prev, nodes: FALLBACK_NODES.length, edges: edges.length, clusters: 5 }))
      }
    }
    if (!propNodes) load()
    else {
      setNodes(propNodes)
      setEdges(buildEdges(propNodes))
    }
  }, [propNodes])

  useEffect(() => {
    setEdges(buildEdges(nodes))
  }, [nodes])

  const filteredNodes = filter === 'all' ? nodes : nodes.filter(n => n.type === filter)
  const filteredIds = new Set(filteredNodes.map(n => n.id))
  const filteredEdges = edges.filter(e => filteredIds.has(e.source) && filteredIds.has(e.target))

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    // Background
    ctx.fillStyle = '#0a0a1f'
    ctx.fillRect(0, 0, width, height)

    // Stars
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < 100; i++) {
      const sx = ((i * 137.5) % width)
      const sy = ((i * 73.3) % height)
      const r = (i % 2) + 0.5
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    ctx.save()
    ctx.translate(offset.x + width / 2, offset.y + height / 2)
    ctx.scale(scale, scale)

    const t = timeRef.current
    const positions = {}
    filteredNodes.forEach(n => {
      const baseX = (n.x - 0.5) * width * 0.85
      const baseY = (n.y - 0.5) * height * 0.85
      const floatX = Math.sin(t * 0.001 + n.x * 10) * 4
      const floatY = Math.cos(t * 0.001 + n.y * 10) * 4
      positions[n.id] = { x: baseX + floatX, y: baseY + floatY, node: n }
    })

    // Edges
    filteredEdges.forEach(e => {
      const a = positions[e.source]
      const b = positions[e.target]
      if (!a || !b) return
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + e.weight * 0.25})`
      ctx.lineWidth = 0.5 + e.weight * 0.5
      ctx.stroke()
    })

    // Nodes
    filteredNodes.forEach(n => {
      const p = positions[n.id]
      const r = hovered === n.id ? 14 : (6 + (n.connections || 1) * 0.8)
      const color = NODE_TYPES[n.type] || '#8B5CF6'
      ctx.save()
      ctx.shadowColor = color
      ctx.shadowBlur = hovered === n.id ? 24 : 10
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      if (hovered === n.id) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(n.label, p.x, p.y + r + 16)
      }
    })

    ctx.restore()
  }, [filteredNodes, filteredEdges, hovered, offset, scale])

  useEffect(() => {
    let raf
    let observer
    let isVisible = true
    const loop = (time) => {
      if (!isVisible) return
      timeRef.current = time
      draw()
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = null
      }
    }
    if (containerRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting
        if (isVisible) start()
        else stop()
      }, { threshold: 0.05 })
      observer.observe(containerRef.current)
      start()
    } else {
      start()
    }
    return () => {
      stop()
      if (observer) observer.disconnect()
    }
  }, [draw])

  const getNodeAt = (clientX, clientY) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return null
    const rect = container.getBoundingClientRect()
    const x = clientX - rect.left - rect.width / 2 - offset.x
    const y = clientY - rect.top - rect.height / 2 - offset.y
    const t = timeRef.current
    return filteredNodes.find(n => {
      const baseX = (n.x - 0.5) * rect.width * 0.85
      const baseY = (n.y - 0.5) * rect.height * 0.85
      const fx = Math.sin(t * 0.001 + n.x * 10) * 4
      const fy = Math.cos(t * 0.001 + n.y * 10) * 4
      const dx = (baseX + fx) * scale - x
      const dy = (baseY + fy) * scale - y
      return Math.sqrt(dx * dx + dy * dy) < 18
    }) || null
  }

  const handleMouseMove = (e) => {
    const node = getNodeAt(e.clientX, e.clientY)
    setHovered(node ? node.id : null)
    if (node) {
      setTooltip({ x: e.clientX, y: e.clientY, node })
    } else {
      setTooltip(null)
    }
    if (dragRef.current) {
      setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }))
    }
  }

  const handleMouseDown = (e) => {
    const node = getNodeAt(e.clientX, e.clientY)
    if (node) {
      dragRef.current = { type: 'node', node, startX: e.clientX, startY: e.clientY }
    } else {
      dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, offset: { ...offset } }
    }
  }

  const handleMouseUp = () => {
    dragRef.current = null
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.min(3, Math.max(0.5, prev * delta)))
  }

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      const node = getNodeAt(t.clientX, t.clientY)
      dragRef.current = { type: node ? 'node' : 'pan', node, startX: t.clientX, startY: t.clientY, offset: { ...offset } }
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      pinchRef.current = { startDist: d, startScale: scale }
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragRef.current) {
      const t = e.touches[0]
      const node = getNodeAt(t.clientX, t.clientY)
      setHovered(node ? node.id : null)
      if (dragRef.current.type === 'pan') {
        setOffset({
          x: dragRef.current.offset.x + (t.clientX - dragRef.current.startX),
          y: dragRef.current.offset.y + (t.clientY - dragRef.current.startY),
        })
      }
      if (node) {
        setTooltip({ x: t.clientX, y: t.clientY, node })
      } else {
        setTooltip(null)
      }
    } else if (e.touches.length === 2 && pinchRef.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      const ratio = d / pinchRef.current.startDist
      setScale(Math.min(3, Math.max(0.5, pinchRef.current.startScale * ratio)))
    }
  }

  const handleTouchEnd = () => {
    dragRef.current = null
    pinchRef.current = null
  }

  const filters = [
    { key: 'all', label: 'Все' },
    { key: 'project', label: 'Проекты' },
    { key: 'client', label: 'Клиенты' },
    { key: 'error', label: 'Ошибки' },
    { key: 'idea', label: 'Идеи' },
  ]

  return (
    <div className="w-full space-y-4">
      <div className="glass-card glow-border rounded-2xl p-4 md:p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="text-sm text-[var(--text-muted)]">
            🧠 Neural Graph: {status.nodes} nodes | {status.edges || edges.length} connections | {status.clusters} clusters
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === f.key
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() => { setOffset({ x: 0, y: 0 }); setScale(1) }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </div>
        <div ref={containerRef} className="w-full h-[400px] md:h-[600px] rounded-xl relative cursor-grab active:cursor-grabbing">
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded-xl"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setHovered(null); setTooltip(null); dragRef.current = null }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          {tooltip && (
            <div
              className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl glass-card border border-white/10 text-xs"
              style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
            >
              <div className="font-semibold text-white">{tooltip.node.label}</div>
              <div className="text-gray-300">{TYPE_LABELS[tooltip.node.type] || tooltip.node.type}</div>
              <div className="text-gray-400">connections: {tooltip.node.connections || 0}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
