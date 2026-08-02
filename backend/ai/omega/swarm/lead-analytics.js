import { Lead } from './lead.js'

export function createAnalyticsLead() {
    return new Lead({
        id: 'lead-analytics',
        name: 'Lead: Analytics',
        domain: 'analytics',
        autonomyLevel: 3,
        agentConfigs: [
            { id: 'agent-metrics', name: 'Metrics Analyst', role: 'metrics', autonomyLevel: 3, skills: ['ctr', 'engagement'] },
            { id: 'agent-forecast', name: 'Forecast Analyst', role: 'forecast', autonomyLevel: 2, skills: ['trends', 'predictions'] },
            { id: 'agent-ab', name: 'A/B Tester', role: 'abtester', autonomyLevel: 2, skills: ['ab_test', 'winner'] },
        ],
    })
}
