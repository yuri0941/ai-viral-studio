// ============================================
// RAG Vector Store — In-Memory fallback
// ============================================
// If CHROMADB_URL or CLOUDFLARE_VECTORIZE_API_KEY is set, the system is
// considered "configured". Otherwise we keep vectors in a Node.js Map (limit 1000).

const memory = new Map()
const MAX_MEMORY = 1000

function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }
    if (normA === 0 || normB === 0) return 0
    return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function hashToVector(text, dim = 128) {
    const vec = new Array(dim).fill(0)
    for (let i = 0; i < text.length; i++) {
        vec[i % dim] += text.charCodeAt(i) % 10
    }
    return vec.map(v => v / Math.max(text.length / dim, 1))
}

export function isConfigured() {
    return !!(process.env.CHROMADB_URL || process.env.CLOUDFLARE_VECTORIZE_API_KEY)
}

export async function addDocument({ id, text, userId, metadata = {} }) {
    if (!text || !userId) return
    const key = `${userId}:${id || Date.now()}`
    const doc = {
        id: key,
        text: String(text).slice(0, 4000),
        userId: String(userId),
        vector: hashToVector(text),
        metadata,
        createdAt: new Date().toISOString(),
    }
    memory.set(key, doc)

    if (memory.size > MAX_MEMORY) {
        const oldest = [...memory.entries()]
            .sort((a, b) => new Date(a[1].createdAt) - new Date(b[1].createdAt))[0]
        if (oldest) memory.delete(oldest[0])
    }
}

export async function searchSimilar({ query, userId, limit = 3 }) {
    if (!query || !userId) return []
    const queryVector = hashToVector(query)
    const results = [...memory.values()]
        .filter(doc => doc.userId === String(userId))
        .map(doc => ({
            ...doc,
            score: cosineSimilarity(queryVector, doc.vector),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    return results
}

export async function addChatMessage({ userId, role, content }) {
    if (!userId || !content) return
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await addDocument({ id, text: `${role}: ${content}`, userId, metadata: { type: 'chat', role } })
}

export function getStoreStatus() {
    return {
        configured: isConfigured(),
        backend: isConfigured() ? 'ChromaDB/Cloudflare Vectorize' : 'In-Memory',
        count: memory.size,
        limit: MAX_MEMORY,
    }
}

export default {
    isConfigured,
    addDocument,
    searchSimilar,
    addChatMessage,
    getStoreStatus,
}
