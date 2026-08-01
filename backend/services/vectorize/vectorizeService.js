import axios from 'axios'
import vectorStore from '../vectorStore.js'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_KEY = process.env.CLOUDFLARE_API_KEY || process.env.CLOUDFLARE_API_TOKEN
const INDEX_NAME = 'omega-memory'

export function isVectorizeConfigured() {
    return !!(ACCOUNT_ID && API_KEY)
}

function getHeaders() {
    return {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
    }
}

function baseUrl() {
    return `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v1/indexes/${INDEX_NAME}`
}

export async function ensureIndex() {
    if (!ACCOUNT_ID || !API_KEY) return false
    try {
        await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v1/indexes`,
            {
                name: INDEX_NAME,
                description: 'OMEGA long-term memory vectors',
                config: {
                    dimensions: 768,
                    metric: 'cosine',
                },
            },
            { headers: getHeaders(), timeout: 30000 }
        )
        return true
    } catch (err) {
        if (err.response?.data?.errors?.some(e => e.code === 30101 || /already exists/i.test(e.message))) {
            return true
        }
        console.warn('[vectorizeService] ensureIndex failed:', err.response?.data?.errors || err.message)
        return false
    }
}

export async function upsertMemory(id, text, metadata = {}) {
    if (!isVectorizeConfigured()) {
        await vectorStore.addDocument({ id, text, userId: metadata.userId, metadata })
        return { id, text }
    }
    try {
        const vector = await generateStubVector(text)
        await axios.post(
            `${baseUrl()}/upsert`,
            { vectors: [{ id, values: vector, metadata: { text, ...metadata } }] },
            { headers: getHeaders(), timeout: 30000 }
        )
        return { id, text }
    } catch (err) {
        console.warn('[vectorizeService] upsert failed:', err.response?.data?.errors || err.message)
        await vectorStore.addDocument({ id, text, userId: metadata.userId, metadata }).catch(() => {})
        return { id, text }
    }
}

export async function searchMemory(query, limit = 5, userId = null) {
    if (!isVectorizeConfigured()) {
        return vectorStore.searchSimilar({ query, userId, limit })
    }
    try {
        const vector = await generateStubVector(query)
        const { data } = await axios.post(
            `${baseUrl()}/query`,
            { vector, topK: limit, returnMetadata: true },
            { headers: getHeaders(), timeout: 30000 }
        )
        return data.result?.matches?.map(m => ({
            id: m.id,
            score: m.score,
            text: m.metadata?.text || '',
            metadata: m.metadata,
        })) || []
    } catch (err) {
        console.warn('[vectorizeService] search failed:', err.response?.data?.errors || err.message)
        return vectorStore.searchSimilar({ query, userId, limit })
    }
}

async function generateStubVector(text) {
    // Deterministic 768-dim float vector for demo/fallback.
    // Replace with a real embedding model for semantic search.
    const dims = 768
    const vector = new Array(dims).fill(0)
    let seed = 0
    for (let i = 0; i < text.length; i++) seed += text.charCodeAt(i)
    for (let i = 0; i < dims; i++) {
        const x = Math.sin(seed + i * 7.3) * 10000
        vector[i] = (x - Math.floor(x)) * 2 - 1
    }
    return vector
}

export default { ensureIndex, upsertMemory, searchMemory }
