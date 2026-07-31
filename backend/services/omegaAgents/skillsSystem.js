import { OmegaAgent } from './agentsRegistry.js'

const LEVEL_THRESHOLDS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
const BONUS_BY_LEVEL = { 1: 3, 2: 10, 3: 25, 50: 100, 100: 250, 250: 500, 500: 1000, 1000: 2500, 2500: 5000, 5000: 10000, 10000: 20000 }

function levelForUsage(count) {
    let level = 1
    for (const threshold of LEVEL_THRESHOLDS) {
        if (count >= threshold) level++
    }
    return Math.min(level, 10)
}

export function getLimitForAgent(level = 1) {
    return BONUS_BY_LEVEL[level] || 3
}

export async function incrementUsage(agentName) {
    return OmegaAgent.findOneAndUpdate(
        { name: agentName },
        { $inc: { usageCount: 1 }, $set: { updatedAt: new Date() } },
        { new: true }
    )
}

const SKILL_UNLOCKS = {
    TrendScout: { threshold: 50, skill: 'trend_forecast', message: 'TrendScout Lv.2: открыт навык trend_forecast' },
    CompetitorSpy: { threshold: 10, skill: 'ad_campaign_analysis', message: 'CompetitorSpy: открыт навык ad_campaign_analysis' },
    ContentForge: { threshold: 100, skill: 'long_form_copy', message: 'ContentForge: открыт навык long_form_copy' },
    ViralPredictor: { threshold: 25, skill: 'audience_match', message: 'ViralPredictor: открыт навык audience_match' },
}

export async function maybeUnlockSkill(agentName) {
    const unlock = SKILL_UNLOCKS[agentName]
    if (!unlock) return

    const agent = await OmegaAgent.findOne({ name: agentName }).lean()
    if (!agent) return

    const nextLevel = levelForUsage(agent.usageCount)
    if (nextLevel !== agent.level) {
        await OmegaAgent.findOneAndUpdate(
            { name: agentName },
            { $set: { level: nextLevel, updatedAt: new Date() } }
        )
    }

    if (agent.usageCount >= unlock.threshold && !agent.unlockedSkills.includes(unlock.skill)) {
        await OmegaAgent.findOneAndUpdate(
            { name: agentName },
            { $push: { unlockedSkills: unlock.skill } }
        )
        console.log(`[skillsSystem] ${unlock.message}`)
    }
}

export async function getSkillLevels() {
    return OmegaAgent.find({}, { name: 1, level: 1, usageCount: 1, unlockedSkills: 1, status: 1 }).lean()
}

export default { incrementUsage, maybeUnlockSkill, getSkillLevels, getLimitForAgent }
