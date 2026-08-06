import { getMemoryContext } from './omegaMemory.js'
import { getContext, simpleEmbedding } from './neuralGraph.js'
import { LearningDataset } from '../../models/LearningDataset.js'

function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0
    let dot = 0, na = 0, nb = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
        na += a[i] * a[i]
        nb += b[i] * b[i]
    }
    if (na === 0 || nb === 0) return 0
    return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function buildVector(text) {
    // 384-d simple character-frequency embedding for similarity search
    const v = new Array(384).fill(0)
    const str = String(text).toLowerCase()
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i)
        v[code % 384] += 1
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
    return v.map(x => x / norm)
}

class PatternEngine {
    async search(query) {
        const queryVec = buildVector(query)
        const [neuralNodes, memoryText, dataset] = await Promise.all([
            Promise.resolve(getContext(query, 5)),
            Promise.resolve(''), // memory context is used below for enrichment only
            LearningDataset.find({ source: { $in: ['local_brain', 'pattern', 'groq'] } }).limit(200).lean().catch(() => []),
        ])

        const candidates = []

        // Neural Graph candidates
        neuralNodes.forEach((node, idx) => {
            const score = cosineSimilarity(queryVec, simpleEmbedding(`${node.label} ${JSON.stringify(node.data || {})}`))
            if (node.data?.response) {
                candidates.push({ text: node.data.response, score, source: 'neural_graph' })
            } else if (node.label) {
                candidates.push({ text: node.label, score: score * 0.7, source: 'neural_graph' })
            }
        })

        // Dataset candidates
        dataset.forEach(doc => {
            const score = cosineSimilarity(queryVec, doc.vector?.length ? doc.vector : buildVector(doc.message))
            candidates.push({
                text: doc.message,
                score,
                source: doc.source,
                role: doc.role,
                intent: doc.intent,
            })
        })

        candidates.sort((a, b) => b.score - a.score)
        return candidates.slice(0, 5)
    }

    async generate(prompt) {
        const candidates = await this.search(prompt)
        const top = candidates[0]
        if (!top) return null

        if (top.score > 0.85) {
            return {
                text: adaptResponse(top.text, prompt),
                source: 'local_brain',
                patternSource: top.source,
            }
        }

        if (top.score >= 0.60 && candidates.length >= 3) {
            const combined = candidates.slice(0, 3).map(c => c.text).join('\n---\n')
            return {
                text: synthesize(prompt, combined),
                source: 'local_brain',
                patternSource: 'combined',
            }
        }

        return null
    }
}

function adaptResponse(base, prompt) {
    return `[OMEGA Local] ${base}\n\n(адаптировано под: ${prompt.slice(0, 80)}...)`
}

function synthesize(prompt, combined) {
    return `[OMEGA Local] На основе похожих случаев:\n\n${combined}\n\n(запрос: ${prompt.slice(0, 80)}...)`
}

export class LocalBrain {
    constructor() {
        this.model = null
        this.type = 'pattern'
        this.modelLoaded = false
    }

    async loadModel() {
        try {
            const { LlamaModel } = await import('node-llama-cpp')
            const modelPath = process.env.LOCAL_MODEL_PATH || './models/tinyllama.gguf'
            this.model = new LlamaModel({ modelPath })
            this.type = 'tinyllama'
            this.modelLoaded = true
            console.log('[LOCAL_BRAIN] TinyLlama loaded')
        } catch (err) {
            console.log('[LOCAL_BRAIN] Local model not found, using PatternEngine')
            this.model = null
            this.type = 'pattern'
            this.modelLoaded = false
        }
    }

    async generate(prompt, maxTokens = 256, temperature = 0.7) {
        if (!this.modelLoaded && this.type === 'pattern') {
            await this.loadModel()
        }

        if (this.modelLoaded && this.model) {
            try {
                const context = await this.model.createContext()
                const session = context.getSession()
                const system = 'You are OMEGA, AI assistant for AI Viral Studio. Answer in Russian or English. Be concise, helpful, creative.'
                const fullPrompt = `${system}\nUser: ${prompt}\nOMEGA:`
                const result = await session.prompt(fullPrompt, { maxTokens, temperature })
                return { text: result, source: 'local_brain', model: 'tinyllama' }
            } catch (err) {
                console.error('[LOCAL_BRAIN] TinyLlama inference failed:', err.message)
            }
        }

        const pattern = new PatternEngine()
        const answer = await pattern.generate(prompt)
        if (answer) return { text: answer.text, source: answer.source, model: 'pattern' }
        return null
    }
}

export default LocalBrain
