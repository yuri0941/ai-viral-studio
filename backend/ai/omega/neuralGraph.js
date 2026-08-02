// ============================================
// OMEGA Neural Graph — in-memory граф знаний (не требует Neo4j)
// ============================================

import crypto from 'crypto'

const nodes = new Map()

function hashId(type, data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data)
    return crypto.createHash('sha256').update(`${type}:${payload}`).digest('hex').slice(0, 16)
}

function simpleEmbedding(text) {
    // Упрощённый fake-embedding: частотный вектор букв (для in-memory similarity)
    const vector = new Array(128).fill(0)
    const normalized = String(text).toLowerCase()
    for (const ch of normalized) {
        const idx = ch.charCodeAt(0)
        if (idx < 128) vector[idx] += 1
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1
    return vector.map(v => v / norm)
}

function cosineSimilarity(a, b) {
    let dot = 0
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
    return dot
}

export function addNode(type, label, data = {}, edges = [], options = {}) {
    const id = options.id || hashId(type, label)
    const embedding = simpleEmbedding(`${label} ${JSON.stringify(data)}`)
    const node = {
        id,
        type,
        label,
        data,
        edges: Array.isArray(edges) ? edges : [],
        embedding,
        timestamp: Date.now(),
        accessLevel: options.accessLevel || 'public',
    }
    nodes.set(id, node)
    return node
}

export function getNode(id) {
    return nodes.get(id) || null
}

export function findNodesByType(type) {
    return Array.from(nodes.values()).filter(n => n.type === type)
}

export function findPath(fromId, toId, maxDepth = 5) {
    const start = nodes.get(fromId)
    if (!start) return null

    const queue = [[start.id]]
    const visited = new Set()

    while (queue.length > 0) {
        const path = queue.shift()
        const currentId = path[path.length - 1]
        if (currentId === toId) return path.map(id => nodes.get(id))
        if (path.length > maxDepth) continue

        const current = nodes.get(currentId)
        if (!current) continue

        for (const edge of current.edges) {
            const nextId = typeof edge === 'string' ? edge : edge.id
            if (!nextId || visited.has(nextId)) continue
            visited.add(nextId)
            queue.push([...path, nextId])
        }
    }

    return null
}

export function getContext(query, depth = 3) {
    const queryEmbedding = simpleEmbedding(query)
    const scored = Array.from(nodes.values()).map(node => ({
        node,
        score: cosineSimilarity(queryEmbedding, node.embedding),
    }))

    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, depth)

    // Расширяем соседями до depth
    const included = new Set(top.map(t => t.node.id))
    const contextNodes = []

    for (const { node } of top) {
        contextNodes.push(node)
        for (const edge of node.edges.slice(0, depth)) {
            const neighborId = typeof edge === 'string' ? edge : edge.id
            if (neighborId && nodes.has(neighborId) && !included.has(neighborId)) {
                included.add(neighborId)
                contextNodes.push(nodes.get(neighborId))
            }
        }
    }

    return contextNodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        data: n.data,
        accessLevel: n.accessLevel,
        timestamp: n.timestamp,
    }))
}

export function pruneOldNodes(maxAgeMs = 90 * 24 * 60 * 60 * 1000) {
    const now = Date.now()
    let removed = 0
    for (const [id, node] of nodes) {
        if (now - node.timestamp > maxAgeMs) {
            nodes.delete(id)
            removed++
        }
    }
    return removed
}

export function exportGraph() {
    return Array.from(nodes.values()).map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        data: n.data,
        edges: n.edges,
        accessLevel: n.accessLevel,
        timestamp: n.timestamp,
    }))
}

export function importGraph(data) {
    if (!Array.isArray(data)) return 0
    let imported = 0
    for (const item of data) {
        if (!item.id || !item.type) continue
        nodes.set(item.id, {
            ...item,
            embedding: simpleEmbedding(`${item.label} ${JSON.stringify(item.data)}`),
            timestamp: item.timestamp || Date.now(),
        })
        imported++
    }
    return imported
}

export function clearGraph() {
    nodes.clear()
}

export default {
    addNode,
    getNode,
    findNodesByType,
    findPath,
    getContext,
    pruneOldNodes,
    exportGraph,
    importGraph,
    clearGraph,
}
