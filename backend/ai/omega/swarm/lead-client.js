import { Lead } from './lead.js'

export function createClientLead() {
    return new Lead({
        id: 'lead-client',
        name: 'Lead: Client Success',
        domain: 'client',
        autonomyLevel: 2,
        agentConfigs: [
            { id: 'agent-onboarding', name: 'Onboarding Guide', role: 'onboarding', autonomyLevel: 2, skills: ['welcome', 'setup'] },
            { id: 'agent-retention', name: 'Retention Agent', role: 'retention', autonomyLevel: 3, skills: ['churn', 'reactivation'] },
            { id: 'agent-support', name: 'Support Agent', role: 'support', autonomyLevel: 1, skills: ['faq', 'escalation'] },
        ],
    })
}
