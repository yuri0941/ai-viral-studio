import { AgentLog } from '../models/AgentLog.js'

const ROLES = ['researcher', 'coder', 'designer', 'tester', 'marketer', 'analyst']
const ROLE_EMOJIS = {
    researcher: '🔍',
    coder: '💻',
    designer: '🎨',
    tester: '🧪',
    marketer: '📢',
    analyst: '📊',
}

class SwarmDirector {
    constructor() {
        this.agents = new Map()
        this.maxAgents = 50
        this.counter = 0
    }

    spawnAgent(role, task, priority = 'normal') {
        if (!ROLES.includes(role)) throw new Error(`Unknown role: ${role}. Allowed: ${ROLES.join(', ')}`)
        if (this.agents.size >= this.maxAgents) throw new Error('Agent limit reached (50)')
        this.counter += 1
        const id = `agent-${this.counter}`
        const agent = {
            id,
            number: this.counter,
            role,
            task: task || 'Idle',
            priority,
            status: 'working',
            progress: 0,
            createdAt: new Date().toISOString(),
            emoji: ROLE_EMOJIS[role],
        }
        this.agents.set(id, agent)
        this._log(id, role, `Spawned with task: ${task}`, 'info')
        this._simulateProgress(id)
        return agent
    }

    killAgent(id) {
        const agent = this.agents.get(id)
        if (!agent) return null
        agent.status = 'killed'
        this._log(id, agent.role, 'Agent killed by user', 'warning')
        this.agents.delete(id)
        return { id, killed: true }
    }

    getAgents(filter = 'all') {
        const list = Array.from(this.agents.values())
        if (filter === 'working') return list.filter(a => a.status === 'working')
        if (filter === 'idle') return list.filter(a => a.status === 'idle')
        if (filter === 'error') return list.filter(a => a.status === 'error')
        if (filter === 'completed') return list.filter(a => a.status === 'completed')
        return list
    }

    getStatus(id) {
        return this.agents.get(id) || null
    }

    assignTask(id, task) {
        const agent = this.agents.get(id)
        if (!agent) return null
        agent.task = task
        agent.status = 'working'
        agent.progress = 0
        this._log(id, agent.role, `New task assigned: ${task}`, 'info')
        this._simulateProgress(id)
        return agent
    }

    pauseAgent(id) {
        const agent = this.agents.get(id)
        if (!agent) return null
        agent.status = agent.status === 'paused' ? 'working' : 'paused'
        this._log(id, agent.role, `Agent ${agent.status === 'paused' ? 'paused' : 'resumed'}`, 'info')
        return agent
    }

    async getLogs(id, limit = 50) {
        try {
            return await AgentLog.find({ agentId: id }).sort({ createdAt: -1 }).limit(limit).lean()
        } catch (err) {
            console.error('[SwarmDirector] getLogs error:', err.message)
            return []
        }
    }

    async _log(agentId, role, message, level = 'info') {
        try {
            await AgentLog.create({ agentId, role, task: '', message, level })
        } catch (err) {
            console.error('[SwarmDirector] log error:', err.message)
        }
    }

    _simulateProgress(id) {
        const agent = this.agents.get(id)
        if (!agent) return
        const interval = setInterval(() => {
            const a = this.agents.get(id)
            if (!a) { clearInterval(interval); return }
            if (a.status === 'paused') return
            if (a.status === 'killed') { clearInterval(interval); return }
            a.progress += Math.random() * 4
            if (a.progress >= 100) {
                a.progress = 100
                a.status = Math.random() > 0.9 ? 'error' : 'completed'
                clearInterval(interval)
                this._log(id, a.role, `Task ${a.status === 'error' ? 'failed' : 'completed'}`, a.status === 'error' ? 'error' : 'success')
            }
        }, 2000 + Math.random() * 3000)
    }
}

const globalDirector = global.swarmDirector || new SwarmDirector()
global.swarmDirector = globalDirector

export { SwarmDirector, globalDirector }
export default globalDirector
