// ============================================
// OMEGA Core — центральное ядро AI-системы
// Версия: 1.0 Lite (фундамент для OMEGA v5)
// ============================================

/**
 * Состояния жизненного цикла OMEGA.
 */
export const OMEGA_STATES = {
    IDLE: 'idle',
    THINKING: 'thinking',
    EXECUTING: 'executing',
    LEARNING: 'learning',
    PAUSED: 'paused',
    ERROR: 'error',
}

/**
 * Уровни автономности принятия решений.
 */
export const OMEGA_AUTONOMY_LEVELS = {
    ASSIST: 0,      // Только советы, без действий
    SUGGEST: 1,     // Предлагает действия, ждёт одобрения
    SEMI_AUTO: 2,   // Действует в рамках разрешённых категорий
    FULL_AUTO: 3,   // Полная автономия (требует явного включения)
}

/**
 * Приоритеты задач для роутинга моделей.
 */
export const OMEGA_TASK_TYPES = {
    CHAT: 'chat',
    ANALYSIS: 'analysis',
    CREATION: 'creation',
    CODE: 'code',
    VISION: 'vision',
    CRISIS: 'crisis',
    MEMORY: 'memory',
}

/**
 * OMEGA Core — роутинг моделей, принятие решений, оркестрация навыков.
 */
export class OmegaCore {
    constructor(config = {}) {
        this.state = OMEGA_STATES.IDLE
        this.autonomy = config.autonomy ?? OMEGA_AUTONOMY_LEVELS.SUGGEST
        this.activeProvider = config.activeProvider || null
        this.providers = config.providers || []
        this.memory = config.memory || null
        this.skills = new Map()
        this.tools = new Map()
        this.currentTask = null
        this.lastError = null
        this.metrics = {
            requestsTotal: 0,
            errorsTotal: 0,
            decisionsTotal: 0,
            skillsExecuted: 0,
        }
    }

    /**
     * Регистрирует навык OMEGA.
     */
    registerSkill(skill) {
        if (!skill?.id) throw new Error('Skill must have an id')
        this.skills.set(skill.id, skill)
    }

    /**
     * Регистрирует инструмент (tool) OMEGA.
     */
    registerTool(tool) {
        if (!tool?.id) throw new Error('Tool must have an id')
        this.tools.set(tool.id, tool)
    }

    /**
     * Устанавливает список доступных AI-провайдеров.
     */
    setProviders(providers) {
        this.providers = providers.filter(p => p.enabled && p.hasKey)
        if (!this.activeProvider && this.providers.length > 0) {
            this.activeProvider = this.providers[0].id
        }
    }

    /**
     * Выбирает оптимальную модель/провайдер под задачу.
     */
    routeModel(taskType, complexity = 1) {
        if (this.providers.length === 0) {
            return { id: 'mock', name: 'Mock', reason: 'no_providers_available' }
        }

        // Простая эвристика: для кода и кризиса — самый быстрый/мощный;
        // для чата — любой доступный; для vision — провайдер с vision.
        let candidates = this.providers
        if (taskType === OMEGA_TASK_TYPES.CODE) {
            candidates = this.providers.filter(p => p.strengths?.includes('code'))
        } else if (taskType === OMEGA_TASK_TYPES.VISION) {
            candidates = this.providers.filter(p => p.capabilities?.includes('vision'))
        } else if (taskType === OMEGA_TASK_TYPES.CRISIS) {
            candidates = this.providers.filter(p => p.reliability >= 0.95)
        }

        const pool = candidates.length > 0 ? candidates : this.providers
        const sorted = pool.sort((a, b) => {
            const scoreA = (a.reliability || 0.9) * 100 - (a.latency || 0)
            const scoreB = (b.reliability || 0.9) * 100 - (b.latency || 0)
            return scoreB - scoreA
        })

        const chosen = complexity > 2 ? sorted[0] : sorted[Math.min(1, sorted.length - 1)]
        this.activeProvider = chosen.id
        return chosen
    }

    /**
     * Принимает решение на основе контекста и памяти.
     */
    async decide(context) {
        this.setState(OMEGA_STATES.THINKING)
        this.metrics.decisionsTotal++

        const enrichedContext = await this.enrichContext(context)
        const decision = {
            action: 'advise',
            skillId: null,
            toolId: null,
            payload: null,
            confidence: 0.7,
            requiresApproval: this.autonomy < OMEGA_AUTONOMY_LEVELS.SEMI_AUTO,
            reason: '',
            timestamp: new Date().toISOString(),
        }

        // Простая эвристика: если контекст содержит ключевые слова — маппим на навык.
        const intent = this.detectIntent(enrichedContext.message || enrichedContext.prompt || '')

        if (intent) {
            const skill = this.skills.get(intent.skillId)
            if (skill) {
                decision.action = 'execute_skill'
                decision.skillId = intent.skillId
                decision.confidence = intent.confidence
                decision.reason = `Detected intent: ${intent.name}`
            }
        }

        if (this.memory && decision.action !== 'execute_skill') {
            const relevant = await this.memory.recall(enrichedContext.message || '', 3)
            if (relevant.length > 0) {
                decision.memoryHits = relevant
                decision.confidence = Math.min(0.95, decision.confidence + 0.1)
            }
        }

        this.setState(OMEGA_STATES.IDLE)
        return decision
    }

    /**
     * Выполняет навык по ID.
     */
    async executeSkill(skillId, params = {}) {
        const skill = this.skills.get(skillId)
        if (!skill) {
            this.lastError = `Skill ${skillId} not found`
            throw new Error(this.lastError)
        }

        this.setState(OMEGA_STATES.EXECUTING)
        this.currentTask = { skillId, startedAt: Date.now() }
        this.metrics.skillsExecuted++

        try {
            const result = await skill.execute(params, this)
            this.currentTask = null
            this.setState(OMEGA_STATES.IDLE)
            return { success: true, result, skillId }
        } catch (err) {
            this.lastError = err.message
            this.metrics.errorsTotal++
            this.setState(OMEGA_STATES.ERROR)
            throw err
        }
    }

    /**
     * Выполняет инструмент по ID.
     */
    async executeTool(toolId, params = {}) {
        const tool = this.tools.get(toolId)
        if (!tool) {
            this.lastError = `Tool ${toolId} not found`
            throw new Error(this.lastError)
        }
        return tool.execute(params, this)
    }

    /**
     * Обогащает контекст данными из памяти и профиля.
     */
    async enrichContext(context) {
        if (!this.memory) return context
        const memory = await this.memory.recall(context.message || context.prompt || '', 2)
        return {
            ...context,
            memory,
            autonomy: this.autonomy,
            provider: this.activeProvider,
        }
    }

    /**
     * Простое определение намерения по ключевым словам.
     */
    detectIntent(text) {
        const lower = text.toLowerCase()
        for (const [id, skill] of this.skills) {
            if (!skill.triggers) continue
            for (const trigger of skill.triggers) {
                if (lower.includes(trigger.toLowerCase())) {
                    return { skillId: id, name: skill.name, confidence: 0.75 }
                }
            }
        }
        return null
    }

    /**
     * Устанавливает уровень автономности.
     */
    setAutonomy(level) {
        if (!(level in Object.values(OMEGA_AUTONOMY_LEVELS))) {
            throw new Error(`Invalid autonomy level: ${level}`)
        }
        this.autonomy = level
    }

    /**
     * Устанавливает состояние ядра.
     */
    setState(state) {
        if (!Object.values(OMEGA_STATES).includes(state)) {
            throw new Error(`Invalid state: ${state}`)
        }
        this.state = state
    }

    /**
     * Возвращает текущий статус OMEGA.
     */
    getStatus() {
        return {
            state: this.state,
            autonomy: this.autonomy,
            activeProvider: this.activeProvider,
            providers: this.providers.map(p => p.id),
            skills: Array.from(this.skills.keys()),
            tools: Array.from(this.tools.keys()),
            metrics: { ...this.metrics },
            currentTask: this.currentTask,
            lastError: this.lastError,
        }
    }
}

export default OmegaCore
