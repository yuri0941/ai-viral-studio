import { Lead } from './lead.js'

export function createContentLead() {
    return new Lead({
        id: 'lead-content',
        name: 'Lead: Content',
        domain: 'content',
        autonomyLevel: 3,
        agentConfigs: [
            { id: 'agent-writer', name: 'Writer', role: 'writer', autonomyLevel: 3, skills: ['copywriting', 'hooks'] },
            { id: 'agent-designer', name: 'Designer', role: 'designer', autonomyLevel: 2, skills: ['visuals', 'cover'] },
            { id: 'agent-seo', name: 'SEO Specialist', role: 'seo', autonomyLevel: 2, skills: ['hashtags', 'metadata'] },
        ],
    })
}
