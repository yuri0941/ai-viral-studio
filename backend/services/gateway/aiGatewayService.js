import axios from 'axios'

const RATE_LIMIT_PER_MINUTE = 100
const logs = []
const userRequests = new Map()

function isRateLimited(userId) {
    if (!userId) return false
    const now = Date.now()
    const windowStart = now - 60 * 1000
    const entries = userRequests.get(userId) || []
    const recent = entries.filter(t => t > windowStart)
    if (recent.length >= RATE_LIMIT_PER_MINUTE) {
        userRequests.set(userId, recent)
        return true
    }
    recent.push(now)
    userRequests.set(userId, recent)
    return false
}

export function logAIEvent({ userId, provider, prompt, status, latency, error, tokens }) {
    const entry = {
        userId,
        provider,
        prompt: prompt?.slice(0, 200),
        status,
        latency,
        error: error?.message || error,
        tokens,
        timestamp: new Date(),
    }
    logs.unshift(entry)
    if (logs.length > 1000) logs.pop()
}

export function getRecentLogs(limit = 100) {
    return logs.slice(0, limit)
}

export async function callAI(provider, prompt, { userId, history = [], language = 'ru' } = {}) {
    if (isRateLimited(userId)) {
        const err = new Error('AI Gateway rate limit exceeded: 100 req/min')
        err.status = 429
        logAIEvent({ userId, provider, prompt, status: 429, error: err })
        throw err
    }

    const start = Date.now()
    try {
        const { chatWithAI } = await import('../aiService.js')
        const result = await chatWithAI(prompt, history, language)
        const latency = Date.now() - start
        logAIEvent({
            userId,
            provider: result.provider || provider,
            prompt,
            status: result.success ? 200 : 500,
            latency,
            tokens: result.usage?.total_tokens,
        })
        return result
    } catch (err) {
        const latency = Date.now() - start
        logAIEvent({ userId, provider, prompt, status: err.status || 500, latency, error: err })
        throw err
    }
}

export default { callAI, logAIEvent, getRecentLogs, isRateLimited }
