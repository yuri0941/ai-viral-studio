import mongoose from 'mongoose'

const agentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    role: { type: String, required: true, index: true },
    skills: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
    level: { type: Number, default: 1, min: 1, max: 10 },
    usageCount: { type: Number, default: 0 },
    unlockedSkills: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

export const OmegaAgent = mongoose.models.OmegaAgent || mongoose.model('OmegaAgent', agentSchema, 'omega_agents')

const DEFAULT_AGENTS = [
    { name: 'TrendScout', role: 'trends', skills: ['google_trends', 'tiktok_api', 'news_parser'], status: 'active', level: 1, usageCount: 0 },
    { name: 'CompetitorSpy', role: 'competitors', skills: ['instagram_scraper', 'youtube_api'], status: 'active', level: 1, usageCount: 0 },
    { name: 'ContentForge', role: 'content', skills: ['copywriting', 'seo', 'hashtags'], status: 'active', level: 1, usageCount: 0 },
    { name: 'ViralPredictor', role: 'predict', skills: ['analytics', 'ml_score'], status: 'paused', level: 1, usageCount: 0 },
    { name: 'SEOAgent', role: 'seo', skills: ['seo_audit', 'keyword_research'], status: 'active', level: 1, usageCount: 0 },
    { name: 'AnalyticsAgent', role: 'analytics', skills: ['metrics', 'dashboards'], status: 'active', level: 1, usageCount: 0 },
    { name: 'SupportAgent', role: 'support', skills: ['auto_reply', 'ticket_classification'], status: 'active', level: 1, usageCount: 0 },
    { name: 'DesignAgent', role: 'design', skills: ['thumbnail_ideas', 'visual_concepts'], status: 'active', level: 1, usageCount: 0 },
    { name: 'LegalAgent', role: 'legal', skills: ['risk_check', 'compliance'], status: 'paused', level: 1, usageCount: 0 },
    { name: 'FinanceAgent', role: 'finance', skills: ['revenue_forecast', 'payout_check'], status: 'active', level: 1, usageCount: 0 },
]

export async function seedAgents() {
    try {
        for (const agent of DEFAULT_AGENTS) {
            await OmegaAgent.findOneAndUpdate(
                { name: agent.name },
                { $setOnInsert: agent },
                { upsert: true, new: true }
            )
        }
    } catch (err) {
        console.warn('[agentsRegistry] seed failed:', err.message)
    }
}

export async function getAgents(filter = {}) {
    return OmegaAgent.find(filter).lean()
}

export async function getAgentByName(name) {
    return OmegaAgent.findOne({ name }).lean()
}

export default { OmegaAgent, seedAgents, getAgents, getAgentByName }
