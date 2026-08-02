import { Agent } from './agent.js'
import { eventBus } from './eventBus.js'

/**
 * Base OMEGA Lead.
 * A Lead manages a squad of Agents and reports to the Director.
 */

export class Lead {
    constructor({ id, name, domain, autonomyLevel = 3, agentConfigs = [] }) {
        this.id = id
        this.name = name
        this.domain = domain
        this.autonomyLevel = autonomyLevel
        this.agents = agentConfigs.map(cfg => new Agent({ ...cfg, leadId: this.id }))
        this.memoryStore = new Map()
        this.metrics = { tasksReceived: 0, tasksDelegated: 0, reportsReceived: 0 }
        this._initSubscription()
    }

    _initSubscription() {
        eventBus.subscribe(`delegate:${this.id}`, (payload, meta) => {
            this.handleDirective(payload, meta).catch(err => {
                console.error(`[Lead ${this.id}] directive failed:`, err.message)
            })
        })

        eventBus.subscribe(`report:${this.id}`, (payload, meta) => {
            this.metrics.reportsReceived++
            this.remember(`report:${payload.from}:${Date.now()}`, payload)
            this.onAgentReport(payload, meta)
        })
    }

    remember(key, value) {
        this.memoryStore.set(key, { value, at: new Date().toISOString() })
    }

    recall(key) {
        return this.memoryStore.get(key)?.value
    }

    async handleDirective(payload, meta) {
        this.metrics.tasksReceived++
        const agent = this.selectAgent(payload)
        if (!agent) {
            throw new Error(`No agent available for task ${payload.type}`)
        }
        this.metrics.tasksDelegated++
        eventBus.publish(`task:${agent.role}`, payload, { ...meta, delegatedBy: this.id, agent: agent.id })
    }

    selectAgent(payload) {
        // Simple round-robin / skill matching
        const available = this.agents.filter(a => a.status !== 'working')
        if (available.length === 0) return this.agents[0]
        if (payload.skill) {
            const skilled = available.filter(a => a.skillTree[payload.skill])
            if (skilled.length) return skilled[Math.floor(Math.random() * skilled.length)]
        }
        return available[Math.floor(Math.random() * available.length)]
    }

    onAgentReport(payload, meta) {
        // Override in subclasses for domain-specific aggregation
    }

    broadcast(message, meta = {}) {
        this.agents.forEach(agent => {
            eventBus.publish(`task:${agent.role}`, { ...message, broadcast: true }, { ...meta, from: this.id })
        })
    }

    getStatus() {
        return {
            id: this.id,
            name: this.name,
            domain: this.domain,
            autonomyLevel: this.autonomyLevel,
            metrics: { ...this.metrics },
            memoryKeys: Array.from(this.memoryStore.keys()),
            agents: this.agents.map(a => a.getStatus()),
        }
    }
}

export default Lead
