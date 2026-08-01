// ============================================
// OMEGA Backend SDK — единая точка входа
// Версия: 1.0 Lite
// ============================================

import { isEnabled } from '../../services/aiService.js'

export { OmegaCore, OMEGA_STATES, OMEGA_AUTONOMY_LEVELS, OMEGA_TASK_TYPES } from './omegaCore.js'

const PROVIDER_DEFS = [
    { id: 'groq', name: 'Groq', reliability: 0.96, latency: 120, strengths: ['chat', 'code'] },
    { id: 'openrouter', name: 'OpenRouter', reliability: 0.94, latency: 180, strengths: ['chat', 'vision'] },
    { id: 'gemini', name: 'Google Gemini', reliability: 0.92, latency: 200, strengths: ['chat', 'vision'] },
    { id: 'github', name: 'GitHub Models', reliability: 0.90, latency: 250, strengths: ['chat', 'code'] },
    { id: 'huggingface', name: 'HuggingFace', reliability: 0.70, latency: 400, strengths: ['chat'] },
    { id: 'workersai', name: 'Cloudflare Workers AI', reliability: 0.85, latency: 300, strengths: ['chat'] },
    { id: 'cloudflare', name: 'Cloudflare Workers AI (legacy)', reliability: 0.85, latency: 300, strengths: ['chat'] },
    { id: 'fireworks', name: 'Fireworks AI', reliability: 0.88, latency: 280, strengths: ['chat'] },
    { id: 'mistral', name: 'Mistral AI', reliability: 0.90, latency: 220, strengths: ['chat'] },
    { id: 'cohere', name: 'Cohere', reliability: 0.88, latency: 260, strengths: ['chat'] },
    { id: 'deepseek', name: 'DeepSeek', reliability: 0.92, latency: 250, strengths: ['chat', 'analysis'] },
    { id: 'pollinations', name: 'Pollinations AI', reliability: 0.60, latency: 500, strengths: ['chat'] },
]

/**
 * Создаёт и настраивает серверное ядро OMEGA.
 */
export async function createOmegaBackend(config = {}) {
    const { OmegaCore } = await import('./omegaCore.js')
    const core = new OmegaCore(config)

    const providers = await Promise.all(PROVIDER_DEFS.map(async (def) => {
        const envKey = process.env[`${def.id.toUpperCase()}_API_KEY`]
        return {
            ...def,
            enabled: await isEnabled(def.id),
            hasKey: !!envKey,
        }
    }))

    core.setProviders(providers)
    return core
}
