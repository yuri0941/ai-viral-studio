// ============================================
// OMEGA Frontend SDK — единая точка входа
// Версия: 1.0 Lite
// ============================================

export { OmegaCore, OMEGA_STATES, OMEGA_AUTONOMY_LEVELS, OMEGA_TASK_TYPES } from './omegaCore.js'
export { OmegaMemory, MEMORY_LEVELS } from './omegaMemory.js'
export { OMEGA_SKILLS, registerDefaultSkills } from './omegaSkills.js'
export { OMEGA_TOOLS, registerDefaultTools } from './omegaTools.js'
export { OmegaAutonomyManager, APPROVAL_STATUSES, ACTION_TYPES, RISK_LEVELS, assessRisk, canExecuteAutonomously } from './omegaAutonomy.js'
export { OmegaLearning, LEARNING_LEVELS, LEARNING_STATUSES } from './omegaLearning.js'
export {
    OmegaCommunicationAdapter,
    OmegaPersonality,
    OmegaEmotionMemory,
    PERSONALITY_PRESETS,
    EMOTIONS,
    detectEmotion,
} from './omegaCommunication.js'

/**
 * Фабрика для быстрого создания полноценного инстанса OMEGA.
 */
export async function createOmega(options = {}) {
    const [{ OmegaCore }, { OmegaMemory }, { OmegaAutonomyManager }, { OmegaLearning }, { OmegaCommunicationAdapter }] =
        await Promise.all([
            import('./omegaCore.js'),
            import('./omegaMemory.js'),
            import('./omegaAutonomy.js'),
            import('./omegaLearning.js'),
            import('./omegaCommunication.js'),
        ])

    const core = new OmegaCore(options.core)
    const memory = new OmegaMemory(options.memory)
    const autonomy = new OmegaAutonomyManager(options.autonomy)
    const learning = new OmegaLearning(options.learning)
    const communication = new OmegaCommunicationAdapter(options.personality)

    core.memory = memory
    core.autonomyManager = autonomy
    core.learning = learning
    core.communication = communication

    return { core, memory, autonomy, learning, communication }
}
