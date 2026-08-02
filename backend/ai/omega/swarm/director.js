import { eventBus } from './eventBus.js'
import { createContentLead } from './lead-content.js'
import { createAnalyticsLead } from './lead-analytics.js'
import { createClientLead } from './lead-client.js'
import { createTechLead } from './lead-tech.js'

/**
 * OMEGA-Director: coordinates all Leads and owns the global memory graph.
 * The Director remembers cross-domain context and routes high-level directives.
 */

export class Director {
    constructor() {
        this.leads = {
            content: createContentLead(),
            analytics: createAnalyticsLead(),
            client: createClientLead(),
            tech: createTechLead(),
        }
        this.memoryStore = new Map()
        this.metrics = { directivesSent: 0, reportsReceived: 0 }
        this._initSubscription()
    }

    _initSubscription() {
        eventBus.subscribe('report:director', (payload, meta) => {
            this.metrics.reportsReceived++
            this.remember(`${payload.from}:${Date.now()}`, payload)
            this.onReport(payload, meta)
        })
    }

    remember(key, value) {
        this.memoryStore.set(key, { value, at: new Date().toISOString() })
    }

    recall(key) {
        return this.memoryStore.get(key)?.value
    }

    dispatch(directive) {
        this.metrics.directivesSent++
        const lead = this.leads[directive.domain]
        if (!lead) {
            console.warn(`[Director] unknown domain: ${directive.domain}`)
            return false
        }
        eventBus.publish(`delegate:${lead.id}`, directive, { source: 'director' })
        return true
    }

    broadcast(message) {
        Object.values(this.leads).forEach(lead => {
            eventBus.publish(`delegate:${lead.id}`, { ...message, broadcast: true }, { source: 'director' })
        })
    }

    onReport(payload, meta) {
        // Override for advanced orchestration: e.g. re-balance agents, trigger cross-domain tasks
    }

    getStatus() {
        return {
            id: 'director',
            name: 'OMEGA-Director',
            metrics: { ...this.metrics },
            memoryKeys: Array.from(this.memoryStore.keys()).slice(-20),
            leads: Object.values(this.leads).map(lead => lead.getStatus()),
        }
    }
}

let directorInstance = null

export function getDirector() {
    if (!directorInstance) {
        directorInstance = new Director()
    }
    return directorInstance
}

export function resetDirector() {
    directorInstance = null
}
