import { eventBus } from './eventBus.js'

/**
 * Base OMEGA Agent.
 * Every agent has:
 *  - memoryStore: specialization-specific memory
 *  - skillTree: skills it can improve
 *  - autonomyLevel: 1..5 (1 = assist only, 5 = full auto)
 *  - reportTo: parent Lead ID
 */

export class Agent {
    constructor({ id, name, role, leadId, autonomyLevel = 2, skills = [] }) {
        this.id = id
        this.name = name
        this.role = role
        this.leadId = leadId
        this.autonomyLevel = autonomyLevel
        this.memoryStore = new Map()
        this.skillTree = skills.reduce((acc, skill) => {
            acc[skill] = { level: 1, xp: 0 }
            return acc
        }, {})
        this.status = 'idle'
        this.metrics = { tasksTotal: 0, errorsTotal: 0 }
        this._initSubscription()
    }

    _initSubscription() {
        this._unsubscribe = eventBus.subscribe(`task:${this.role}`, (payload, meta) => {
            this.handleTask(payload, meta).catch(err => {
                console.error(`[Agent ${this.id}] task failed:`, err.message)
                this.metrics.errorsTotal++
            })
        })
    }

    remember(key, value) {
        this.memoryStore.set(key, { value, at: new Date().toISOString() })
    }

    recall(key) {
        return this.memoryStore.get(key)?.value
    }

    async handleTask(payload, meta) {
        this.status = 'working'
        this.metrics.tasksTotal++
        try {
            const result = await this.execute(payload, meta)
            this.status = 'idle'
            this.gainXp(payload.skill || 'general')
            eventBus.publish(`report:${this.leadId}`, {
                from: this.id,
                role: this.role,
                result,
                originalTask: payload,
            }, { source: this.id })
            return result
        } catch (err) {
            this.status = 'error'
            throw err
        }
    }

    async execute(payload, meta) {
        // Override in subclasses
        return { agent: this.id, role: this.role, payload, meta }
    }

    gainXp(skill) {
        if (!this.skillTree[skill]) return
        this.skillTree[skill].xp += 1
        if (this.skillTree[skill].xp >= this.skillTree[skill].level * 5) {
            this.skillTree[skill].level += 1
            this.skillTree[skill].xp = 0
        }
    }

    getStatus() {
        return {
            id: this.id,
            name: this.name,
            role: this.role,
            leadId: this.leadId,
            autonomyLevel: this.autonomyLevel,
            status: this.status,
            memoryKeys: Array.from(this.memoryStore.keys()),
            skillTree: this.skillTree,
            metrics: { ...this.metrics },
        }
    }
}

export default Agent
