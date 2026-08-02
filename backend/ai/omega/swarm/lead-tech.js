import { Lead } from './lead.js'

export function createTechLead() {
    return new Lead({
        id: 'lead-tech',
        name: 'Lead: Tech',
        domain: 'tech',
        autonomyLevel: 3,
        agentConfigs: [
            { id: 'agent-coder', name: 'Coder', role: 'coder', autonomyLevel: 3, skills: ['refactor', 'optimize'] },
            { id: 'agent-ops', name: 'DevOps', role: 'ops', autonomyLevel: 2, skills: ['monitoring', 'alerts'] },
            { id: 'agent-security', name: 'Security Guard', role: 'security', autonomyLevel: 2, skills: ['privacy', 'audit'] },
        ],
    })
}
