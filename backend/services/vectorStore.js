// ============================================
// RAG Vector Store — Chroma Cloud + In-Memory fallback
// ============================================
// If CHROMA_API_KEY, CHROMA_TENANT and CHROMA_DATABASE are set, the system
// uses Chroma Cloud. Otherwise it keeps vectors in a Node.js Map (limit 1000).

import { CloudClient } from 'chromadb'

const API_KEY = process.env.CHROMA_API_KEY
const TENANT = process.env.CHROMA_TENANT
const DATABASE = process.env.CHROMA_DATABASE
// [P16-HOTFIX-v2] Chroma disabled by default to avoid DefaultEmbeddingFunction / timeout errors.
// Set CHROMA_ENABLED=true in env to opt-in.
const CHROMA_ENABLED = process.env.CHROMA_ENABLED === 'true'

let chromaClient = null

// [P16-HOTFIX-v2] dummy embedding function prevents Chroma trying to load ONNX models
const fallbackEmbeddingFunction = {
    generate: async (texts) => texts.map(() => new Array(384).fill(0)),
}

export const getChromaClient = () => {
    if (!CHROMA_ENABLED) {
        if (API_KEY) console.log('[Chroma] CHROMA_ENABLED != true — using in-memory fallback')
        return null
    }
    if (!chromaClient && API_KEY && TENANT && DATABASE) {
        try {
            chromaClient = new CloudClient({
                api_key: API_KEY,
                tenant: TENANT,
                database: DATABASE,
            })
            console.log('✅ Chroma Cloud connected')
        } catch (err) {
            console.error('❌ Chroma Cloud connection failed:', err.message)
        }
    }
    return chromaClient
}

export const isChromaConnected = () => !!chromaClient

// Backward-compatible alias
export const isConfigured = isChromaConnected

// In-memory fallback
const memoryFallback = new Map()
const MAX_MEMORY = 1000

function collectionName(userId) {
    return `omega_memory_${String(userId)}`
}

export const addToVectorMemory = async ({ id, text, metadata = {}, userId }) => {
    if (!text || !userId) {
        return { status: 'error', message: 'text and userId are required' }
    }

    const chroma = getChromaClient()

    if (!chroma) {
        const key = collectionName(userId)
        if (!memoryFallback.has(key)) memoryFallback.set(key, [])
        const docs = memoryFallback.get(key)
        docs.push({ id, text, metadata, date: new Date().toISOString() })
        if (docs.length > MAX_MEMORY) docs.shift()
        return { status: 'fallback', message: 'Chroma not configured — saved to in-memory' }
    }

    try {
        const collection = await chroma.getOrCreateCollection({
            name: collectionName(userId),
            embeddingFunction: fallbackEmbeddingFunction, // [P16-HOTFIX-v2]
        })

        await collection.add({
            ids: [id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`],
            documents: [String(text).slice(0, 4000)],
            metadatas: [{ ...metadata, userId: String(userId), date: new Date().toISOString() }],
        })

        return { status: 'success', id }
    } catch (err) {
        // [P16-HOTFIX-v2] fallback to in-memory when Chroma fails
        console.error('[Chroma] add failed, falling back to memory:', err.message)
        const key = collectionName(userId)
        if (!memoryFallback.has(key)) memoryFallback.set(key, [])
        const docs = memoryFallback.get(key)
        docs.push({ id, text, metadata, date: new Date().toISOString() })
        if (docs.length > MAX_MEMORY) docs.shift()
        return { status: 'fallback', message: err.message }
    }
}

export const searchVectorMemory = async ({ query, userId, limit = 5 }) => {
    if (!query || !userId) {
        return { status: 'error', message: 'query and userId are required', results: [] }
    }

    const chroma = getChromaClient()

    if (!chroma) {
        const key = collectionName(userId)
        const docs = memoryFallback.get(key) || []
        const results = docs
            .filter(d => String(d.text).toLowerCase().includes(String(query).toLowerCase()))
            .slice(-limit)
            .map(d => ({ text: d.text, metadata: d.metadata, distance: 0 }))
        return { status: 'fallback', results }
    }

    try {
        const collection = await chroma.getCollection({
            name: collectionName(userId),
            embeddingFunction: fallbackEmbeddingFunction, // [P16-HOTFIX-v2]
        })

        const results = await collection.query({
            queryTexts: [String(query)],
            nResults: limit,
        })

        return {
            status: 'success',
            results: results.documents[0]?.map((doc, i) => ({
                text: doc,
                metadata: results.metadatas?.[0]?.[i],
                distance: results.distances?.[0]?.[i],
            })) || [],
        }
    } catch (err) {
        // [P16-HOTFIX] If Chroma query fails, fall back to in-memory search so OMEGA keeps working
        console.error('Chroma search error:', err.message)
        const key = collectionName(userId)
        const docs = memoryFallback.get(key) || []
        const fallbackResults = docs
            .filter(d => String(d.text).toLowerCase().includes(String(query).toLowerCase()))
            .slice(-limit)
            .map(d => ({ text: d.text, metadata: d.metadata, distance: 0 }))
        return { status: 'fallback', message: err.message, results: fallbackResults }
    }
}

export const deleteFromVectorMemory = async ({ id, userId }) => {
    if (!userId) {
        return { status: 'error', message: 'userId is required' }
    }

    const chroma = getChromaClient()

    if (!chroma) {
        const key = collectionName(userId)
        const docs = memoryFallback.get(key) || []
        if (id) {
            memoryFallback.set(key, docs.filter(d => d.id !== id))
        } else {
            memoryFallback.delete(key)
        }
        return { status: 'fallback' }
    }

    try {
        const collection = await chroma.getCollection({
            name: collectionName(userId),
            embeddingFunction: fallbackEmbeddingFunction, // [P16-HOTFIX-v2]
        })
        if (id) {
            await collection.delete({ ids: [id] })
        } else {
            const all = await collection.get({})
            const ids = all.ids
            if (ids && ids.length) await collection.delete({ ids })
        }
        return { status: 'success' }
    } catch (err) {
        // [P16-HOTFIX-v2] fallback to in-memory delete when Chroma fails
        console.error('[Chroma] delete failed, falling back to memory:', err.message)
        const key = collectionName(userId)
        const docs = memoryFallback.get(key) || []
        if (id) {
            memoryFallback.set(key, docs.filter(d => d.id !== id))
        } else {
            memoryFallback.delete(key)
        }
        return { status: 'fallback', message: err.message }
    }
}

export const clearVectorMemory = async (userId) => {
    return deleteFromVectorMemory({ userId })
}

// Backward-compatible wrappers
export async function addDocument({ id, text, userId, metadata = {} }) {
    if (!text || !userId) return
    return addToVectorMemory({ id, text, userId, metadata })
}

export async function searchSimilar({ query, userId, limit = 3 }) {
    const res = await searchVectorMemory({ query, userId, limit })
    return res.results || []
}

export async function addChatMessage({ userId, role, content }) {
    if (!userId || !content) return
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return addToVectorMemory({ id, text: `${role}: ${content}`, userId, metadata: { type: 'chat', role } })
}

export async function getStoreStatus() {
    const chroma = getChromaClient()
    let count = 0
    if (chroma) {
        try {
            // Total count across collections is expensive; we just report connection status.
            count = memoryFallback.size
        } catch (err) {
            console.error('Chroma status error:', err.message)
        }
    } else {
        count = memoryFallback.size
    }

    return {
        configured: isChromaConnected(),
        backend: isChromaConnected() ? 'Chroma Cloud' : 'In-Memory',
        count,
        limit: MAX_MEMORY,
    }
}

export default {
    isConfigured,
    isChromaConnected,
    getChromaClient,
    addDocument,
    addToVectorMemory,
    searchSimilar,
    searchVectorMemory,
    addChatMessage,
    deleteFromVectorMemory,
    clearVectorMemory,
    getStoreStatus,
}
