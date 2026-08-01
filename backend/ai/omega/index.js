// ============================================
// OMEGA Backend SDK — единая точка входа
// Версия: 1.0 Lite
// ============================================

export { OmegaCore, OMEGA_STATES, OMEGA_AUTONOMY_LEVELS, OMEGA_TASK_TYPES } from './omegaCore.js'

/**
 * Создаёт и настраивает серверное ядро OMEGA.
 */
export async function createOmegaBackend(config = {}) {
    const { OmegaCore } = await import('./omegaCore.js')
    const core = new OmegaCore(config)

    // Провайдеры берутся из переменных окружения
    const providers = [
        {
            id: 'groq',
            name: 'Groq',
            enabled: !!process.env.GROQ_API_KEY,
            hasKey: !!process.env.GROQ_API_KEY,
            reliability: 0.96,
            latency: 120,
            strengths: ['chat', 'code'],
        },
        {
            id: 'openrouter',
            name: 'OpenRouter',
            enabled: !!process.env.OPENROUTER_API_KEY,
            hasKey: !!process.env.OPENROUTER_API_KEY,
            reliability: 0.94,
            latency: 180,
            strengths: ['chat', 'vision'],
        },
        {
            id: 'deepseek',
            name: 'DeepSeek',
            enabled: !!process.env.DEEPSEEK_API_KEY,
            hasKey: !!process.env.DEEPSEEK_API_KEY,
            reliability: 0.92,
            latency: 250,
            strengths: ['chat', 'analysis'],
        },
    ]

    core.setProviders(providers)
    return core
}
