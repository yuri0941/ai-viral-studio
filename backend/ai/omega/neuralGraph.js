// ============================================
// OMEGA Neural Graph — in-memory граф знаний (не требует Neo4j)
// ============================================

import crypto from 'crypto'
import { ProjectWorkspace, User, OmegaSkill } from '../../models/index.js'

const nodes = new Map()

function hashId(type, data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data)
    return crypto.createHash('sha256').update(`${type}:${payload}`).digest('hex').slice(0, 16)
}

export function simpleEmbedding(text) {
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

// [v9.9.19.6] Восстановление in-memory графа из MongoDB при старте.
// In-memory Map — только кэш; источник истины — CognitiveNode в MongoDB.
export async function hydrateFromDB(limit = 300) {
    try {
        const { default: CognitiveNode } = await import('../../models/CognitiveNode.js')
        const docs = await CognitiveNode.find({ archived: { $ne: true } }).sort({ _id: -1 }).limit(limit).lean()
        let count = 0
        for (const d of docs) {
            addNode(d.type, String(d.content || '').slice(0, 120), { source: d.source, confidence: d.confidence }, [], { id: `cog-${d._id}` })
            count++
        }
        console.log(`[NeuralGraph] Hydrated ${count} nodes from MongoDB`)
        return count
    } catch (e) {
        console.warn('[NeuralGraph] hydrate failed:', e.message)
        return 0
    }
}

// [v9.9.19-NEURAL-PLUS] Generate graph data with seed knowledge
export async function generateGraphData(ownerId) {
    try {
        let projects = []
        let users = []
        let skills = []

        try {
            projects = await ProjectWorkspace.find().limit(50).lean()
        } catch {}
        try {
            users = await User.find({ role: { $in: ['client', 'creator', 'business', 'owner'] } }).limit(50).lean()
        } catch {}
        try {
            skills = await OmegaSkill.find().limit(50).lean()
        } catch {}

        const graphNodes = []
        const edges = []

        const projectNodes = projects.map((p, i) => ({
            id: `project-${p._id || i}`,
            label: p.name || `Project ${i + 1}`,
            type: 'project',
            cluster: 1,
            color: '#F97316',
            size: 12,
            data: { description: (p.description || '').substring(0, 50), status: p.status || 'active' }
        }))
        graphNodes.push(...projectNodes)

        const clientNodes = users.map((u, i) => ({
            id: `client-${u._id || i}`,
            label: u.name || u.email || `Client ${i + 1}`,
            type: 'client',
            cluster: 2,
            color: '#8B5CF6',
            size: 10,
            data: { niche: u.niche || 'unknown', subscription: u.subscription || 'free' }
        }))
        graphNodes.push(...clientNodes)

        const skillNodes = skills.map((s, i) => ({
            id: `skill-${s._id || i}`,
            label: s.name || `Skill ${i + 1}`,
            type: 'skill',
            cluster: 3,
            color: '#00ff41',
            size: 8,
            data: {
                confidence: s.level ? Math.min(100, Math.round((s.level / (s.maxLevel || 10)) * 100)) : 50,
                source: s.source || 'auto'
            }
        }))
        graphNodes.push(...skillNodes)

        projectNodes.forEach((p, i) => {
            if (clientNodes[i]) edges.push({ source: p.id, target: clientNodes[i].id, weight: 0.7, relation: 'client' })
            if (skillNodes[i % skillNodes.length]) edges.push({ source: p.id, target: skillNodes[i % skillNodes.length].id, weight: 0.5, relation: 'uses' })
        })

        // === [v9.9.19.6] ЗНАНИЯ OMEGA: реальные изученные навыки (SkillNode), seed — только fallback ===
        let learnedSkills = []
        try {
            const { default: SkillNode } = await import('../../models/SkillNode.js')
            learnedSkills = await SkillNode.find().sort({ learnedAt: -1 }).limit(50).lean()
        } catch {}

        const knowledgeNodes = learnedSkills.length
            ? learnedSkills.map((s, i) => ({
                id: `kn-${s._id}`,
                label: s.name,
                type: 'knowledge',
                cluster: 5,
                color: '#F59E0B',
                size: Math.min(14, 8 + (s.facts?.length || 0)),
                data: {
                    facts: s.facts?.length || 0,
                    summary: (s.summary || '').substring(0, 120),
                    source: s.source || 'ai',
                    learnedAt: s.learnedAt,
                    appliedCount: s.appliedCount || 0
                }
            }))
            : [
                { id: 'seed-smm', label: 'SMM Fundamentals', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 11, data: { facts: 47, source: 'training' } },
                { id: 'seed-hooks', label: 'Viral Hooks', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 10, data: { facts: 23, source: 'training' } },
                { id: 'seed-viral', label: 'Viral Mechanics', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 10, data: { facts: 31, source: 'training' } },
                { id: 'seed-cta', label: 'CTA Psychology', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 9, data: { facts: 18, source: 'training' } },
                { id: 'seed-content', label: 'Content Strategy', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 10, data: { facts: 42, source: 'training' } },
                { id: 'seed-tg', label: 'Telegram Growth', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 8, data: { facts: 15, source: 'training' } },
                { id: 'seed-ai', label: 'AI Prompting', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 9, data: { facts: 28, source: 'training' } },
                { id: 'seed-ads', label: 'Ad Targeting', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 8, data: { facts: 19, source: 'training' } }
            ]
        graphNodes.push(...knowledgeNodes)

        // === [v9.9.19.14] 2.4 узлы из 12 слоёв памяти: semantic → knowledge, episodic → memory,
        // instrumental → tech, prospective → idea. Граф строится из памяти, не только из SkillNode ===
        try {
            const { getLayerEntries } = await import('../../services/memoryLayerService.js')
            const existingIds = new Set(graphNodes.map(n => n.id))

            const semanticEntries = getLayerEntries('semantic', 20)
            semanticEntries.forEach((e, i) => {
                const id = `sem-${e.id || i}`
                if (existingIds.has(id)) return
                const label = String(typeof e.content === 'string' ? e.content : JSON.stringify(e.content)).slice(0, 40)
                graphNodes.push({ id, label, type: 'knowledge', cluster: 5, size: 7, data: { source: 'memory_semantic', createdAt: e.createdAt } })
                existingIds.add(id)
            })

            const episodicEntries = getLayerEntries('episodic', 12)
            episodicEntries.forEach((e, i) => {
                const id = `ep-${e.id || i}`
                const label = String(typeof e.content === 'string' ? e.content : JSON.stringify(e.content)).slice(0, 40)
                graphNodes.push({ id, label, type: 'memory', cluster: 6, size: 6, data: { source: 'memory_episodic', createdAt: e.createdAt } })
            })

            const instrumentalEntries = getLayerEntries('instrumental', 10)
            instrumentalEntries.forEach((e, i) => {
                const id = `ins-${e.id || i}`
                const label = String(typeof e.content === 'string' ? e.content : JSON.stringify(e.content)).slice(0, 40)
                graphNodes.push({ id, label, type: 'tech', cluster: 7, size: 6, data: { source: 'memory_instrumental', createdAt: e.createdAt } })
            })

            const prospectiveEntries = getLayerEntries('prospective', 10)
            prospectiveEntries.forEach((e, i) => {
                const id = `pro-${e.id || i}`
                const label = String(typeof e.content === 'string' ? e.content : JSON.stringify(e.content)).slice(0, 40)
                graphNodes.push({ id, label, type: 'idea', cluster: 8, size: 6, data: { source: 'memory_prospective', createdAt: e.createdAt } })
            })

            // Связи новых узлов с ядром — граф не распадается на изолированные точки
            for (const n of graphNodes) {
                if (['memory', 'tech', 'idea'].includes(n.type)) {
                    edges.push({ source: 'omega-core', target: n.id, weight: 0.4, relation: 'memory' })
                }
            }
        } catch (e) {
            console.warn('[NeuralGraph] memory layers nodes failed:', e.message)
        }

        // === [v9.9.19.14] 2.1 персистентные координаты: узлы с сохранённой позицией получают nx/ny ===
        try {
            const { default: GraphNodePosition } = await import('../../models/GraphNodePosition.js')
            const positions = await GraphNodePosition.find({}).lean()
            const posMap = Object.fromEntries(positions.map(p => [p.nodeId, p]))
            for (const n of graphNodes) {
                const p = posMap[n.id]
                if (p && Number.isFinite(p.nx) && Number.isFinite(p.ny)) {
                    n.nx = p.nx
                    n.ny = p.ny
                }
            }
        } catch (e) {
            console.warn('[NeuralGraph] positions load failed:', e.message)
        }

        for (let i = 0; i < knowledgeNodes.length - 1; i++) {
            edges.push({ source: knowledgeNodes[i].id, target: knowledgeNodes[i + 1].id, weight: 0.6, relation: 'related' })
        }

        // OMEGA Core
        const coreNode = {
            id: 'omega-core',
            label: 'OMEGA Core',
            type: 'core',
            cluster: 0,
            color: '#8B5CF6',
            size: 20,
            data: { status: 'active', ownerId: ownerId?.toString?.() || null }
        }
        graphNodes.push(coreNode)
        if (knowledgeNodes[0]) edges.push({ source: 'omega-core', target: knowledgeNodes[0].id, weight: 1, relation: 'knows' })

        const totalFacts = graphNodes.filter(n => n.data?.facts).reduce((a, n) => a + (n.data.facts || 0), 0)

        // [v9.9.19.14] кластеры считаем по факту — новые типы (memory/tech/idea) не выпадают из выборки
        const clusterDefs = [
            { id: 0, name: 'OMEGA Core', types: ['core'] },
            { id: 1, name: 'Проекты', types: ['project'] },
            { id: 2, name: 'Клиенты', types: ['client'] },
            { id: 3, name: 'Навыки', types: ['skill'] },
            { id: 5, name: 'Знания OMEGA', types: ['knowledge'] },
            { id: 6, name: 'Память', types: ['memory'] },
            { id: 7, name: 'Инструменты', types: ['tech'] },
            { id: 8, name: 'Идеи', types: ['idea'] },
        ]
        const clusters = clusterDefs
            .map(c => ({ id: c.id, name: c.name, nodeCount: graphNodes.filter(n => c.types.includes(n.type)).length }))
            .filter(c => c.nodeCount > 0)

        return {
            nodes: graphNodes,
            edges,
            clusters,
            meta: {
                totalFacts,
                totalSkills: skillNodes.length,
                learnedSkills: learnedSkills.length,
                totalClients: clientNodes.length,
                totalProjects: projectNodes.length,
                lastLearned: learnedSkills[0]?.learnedAt || new Date().toISOString()
            }
        }
    } catch (e) {
        console.error('[NeuralGraph] Critical error:', e)
        return {
            nodes: [
                { id: 'omega-core', label: 'OMEGA Core', type: 'core', cluster: 0, color: '#8B5CF6', size: 20, data: { status: 'active' } },
                { id: 'seed-smm', label: 'SMM Basics', type: 'knowledge', cluster: 5, color: '#F59E0B', size: 10, data: { facts: 47 } }
            ],
            edges: [{ source: 'omega-core', target: 'seed-smm', weight: 1, relation: 'knows' }],
            clusters: [{ id: 5, name: 'Знания OMEGA', color: '#F59E0B', nodeCount: 1 }],
            meta: { totalFacts: 47, totalSkills: 0, totalClients: 0, totalProjects: 0, lastLearned: new Date().toISOString() }
        }
    }
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
    generateGraphData,
    hydrateFromDB,
}
