// ============================================
// OMEGA Core (Backend) — серверная версия ядра
// Версия: 1.0 Lite (фундамент для OMEGA v5)
// ============================================

import * as neuralGraph from './neuralGraph.js'
import { getDirector } from './swarm/director.js'
import dreamMode from './dreamMode.js'
import { scheduleDailyAnalysis, getApprovalQueue } from './omegaCoder.js'

export const OMEGA_STATES = {
    IDLE: 'idle',
    THINKING: 'thinking',
    EXECUTING: 'executing',
    LEARNING: 'learning',
    PAUSED: 'paused',
    ERROR: 'error',
}

export const OMEGA_AUTONOMY_LEVELS = {
    ASSIST: 0,
    SUGGEST: 1,
    SEMI_AUTO: 2,
    FULL_AUTO: 3,
}

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
 * Backend-ядро OMEGA.
 * Отвечает за оркестрацию навыков, роутинг к AI-провайдерам,
 * принятие решений и управление автономностью.
 */
export class OmegaCore {
    constructor(config = {}) {
        this.state = OMEGA_STATES.IDLE
        this.autonomy = config.autonomy ?? OMEGA_AUTONOMY_LEVELS.SUGGEST
        this.activeProvider = config.activeProvider || null
        this.providers = config.providers || []
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
        this.aiService = config.aiService || null
        this.graph = config.graph || neuralGraph
        this.director = config.director || getDirector()
        this.dreamMode = config.dreamMode || dreamMode
        this.coderScheduled = false
    }

    getGraphContext(query, depth = 3) {
        try {
            const nodes = this.graph.getContext(query, depth)
            if (nodes.length === 0) return ''
            return 'Релевантный контекст из нейро-графа:\n' + nodes.map(n => `- [${n.type}] ${n.label}`).join('\n')
        } catch (err) {
            console.warn('[OmegaCore] getGraphContext failed:', err.message)
            return ''
        }
    }

    startAutonomyServices() {
        if (this.coderScheduled) return
        scheduleDailyAnalysis()
        this.dreamMode.start()
        this.coderScheduled = true
        console.log('[OmegaCore] Autonomy services started (coder + dream mode)')
    }

    stopAutonomyServices() {
        this.dreamMode.stop()
        this.coderScheduled = false
    }

    registerSkill(skill) {
        if (!skill?.id) throw new Error('Skill must have an id')
        this.skills.set(skill.id, skill)
    }

    registerTool(tool) {
        if (!tool?.id) throw new Error('Tool must have an id')
        this.tools.set(tool.id, tool)
    }

    setProviders(providers) {
        this.providers = providers.filter(p => {
            if (!p.enabled) {
                console.log(`[OMEGA] Provider ${p.id?.toUpperCase() || p.name} skipped — disabled by owner`)
                return false
            }
            if (!p.hasKey) {
                console.log(`[OMEGA] Provider ${p.id?.toUpperCase() || p.name} skipped — no key`)
                return false
            }
            console.log(`[OMEGA] Provider ${p.id?.toUpperCase() || p.name} active — enabled + key found`)
            return true
        })
        if (!this.activeProvider && this.providers.length > 0) {
            this.activeProvider = this.providers[0].id
        }
    }

    routeModel(taskType, complexity = 1) {
        if (this.providers.length === 0) {
            return { id: 'mock', name: 'Mock', reason: 'no_providers_available' }
        }

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

    async decide(context) {
        this.setState(OMEGA_STATES.THINKING)
        this.metrics.decisionsTotal++

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

        const intent = this.detectIntent(context.message || context.prompt || '')
        if (intent) {
            const skill = this.skills.get(intent.skillId)
            if (skill) {
                decision.action = 'execute_skill'
                decision.skillId = intent.skillId
                decision.confidence = intent.confidence
                decision.reason = `Detected intent: ${intent.name}`
            }
        }

        this.setState(OMEGA_STATES.IDLE)
        return decision
    }

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

    async executeTool(toolId, params = {}) {
        const tool = this.tools.get(toolId)
        if (!tool) {
            this.lastError = `Tool ${toolId} not found`
            throw new Error(this.lastError)
        }
        return tool.execute(params, this)
    }

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

    async generateResponse(prompt, options = {}) {
        this.metrics.requestsTotal++
        if (!this.aiService) {
            return { text: `[OMEGA mock] ${prompt}`, provider: 'mock' }
        }
        try {
            const provider = this.routeModel(options.taskType || OMEGA_TASK_TYPES.CHAT, options.complexity)
            const response = await this.aiService.generateResponse(prompt, { provider: provider.id })
            return { text: response, provider: provider.id }
        } catch (err) {
            this.metrics.errorsTotal++
            this.lastError = err.message
            throw err
        }
    }

    setAutonomy(level) {
        if (!Object.values(OMEGA_AUTONOMY_LEVELS).includes(level)) {
            throw new Error(`Invalid autonomy level: ${level}`)
        }
        this.autonomy = level
    }

    setState(state) {
        if (!Object.values(OMEGA_STATES).includes(state)) {
            throw new Error(`Invalid state: ${state}`)
        }
        this.state = state
    }

    getStatus() {
        return {
            state: this.state,
            autonomy: this.autonomy,
            activeProvider: this.activeProvider,
            providers: this.providers.map(p => p.id),
            skills: Array.from(this.skills.keys()),
            tools: Array.from(this.tools.keys()),
            metrics: { ...this.metrics },
            graphNodes: this.graph ? this.graph.exportGraph().length : 0,
            currentTask: this.currentTask,
            lastError: this.lastError,
            swarm: this.director ? this.director.getStatus() : null,
            dreamMode: this.dreamMode ? this.dreamMode.getStatus() : null,
            coderQueue: getApprovalQueue ? getApprovalQueue() : [],
        }
    }
}

export default OmegaCore
