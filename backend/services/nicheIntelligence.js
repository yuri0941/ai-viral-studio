import ScheduledPost from '../models/ScheduledPost.js'
import { User } from '../models/index.js'

const KNOWN_NICHES = ['кофейня', 'coffee', 'smm', 'бьюти', 'beauty', 'авто', 'auto', 'it', 'финансы', 'finance', 'недвижимость', 'real estate', 'edtech', 'образование', 'travel', 'туризм', 'food', 'еда', 'спорт', 'fitness', 'здоровье', 'health']

function detectNiche(user) {
    const text = `${user.name || ''} ${user.niche || ''} ${JSON.stringify(user.socialAccounts || {})}`.toLowerCase()
    for (const niche of KNOWN_NICHES) {
        if (text.includes(niche)) return niche
    }
    return 'general'
}

function estimateCTR(post) {
    const views = Number(post.analytics?.views) || Number(post.views) || 1
    const likes = Number(post.analytics?.likes) || Number(post.likes) || 0
    const shares = Number(post.analytics?.shares) || Number(post.shares) || 0
    const comments = Number(post.analytics?.comments) || Number(post.comments) || 0
    const engagement = likes + shares * 2 + comments * 3
    return Math.min(100, (engagement / views) * 100)
}

export async function aggregateNicheIntelligence() {
    const posts = await ScheduledPost.find({ status: 'published' }).lean()
    const users = await User.find({}).lean()
    const userNicheMap = Object.fromEntries(users.map(u => [u._id.toString(), detectNiche(u)]))

    const nicheStats = {}

    for (const post of posts) {
        const niche = userNicheMap[post.userId?.toString()] || 'general'
        if (!nicheStats[niche]) {
            nicheStats[niche] = {
                posts: 0,
                totalCtr: 0,
                byType: {},
                byPlatform: {},
                hooks: {},
                bestTimes: {},
            }
        }

        const s = nicheStats[niche]
        s.posts++
        const ctr = estimateCTR(post)
        s.totalCtr += ctr

        const types = post.types || ['post']
        for (const type of types) {
            if (!s.byType[type]) s.byType[type] = { count: 0, ctr: 0 }
            s.byType[type].count++
            s.byType[type].ctr += ctr
        }

        const platforms = post.platforms || ['unknown']
        for (const platform of platforms) {
            if (!s.byPlatform[platform]) s.byPlatform[platform] = { count: 0, ctr: 0 }
            s.byPlatform[platform].count++
            s.byPlatform[platform].ctr += ctr
        }

        const hour = post.scheduledAt ? new Date(post.scheduledAt).getHours() : null
        if (hour !== null) {
            const slot = `${hour}:00`
            if (!s.bestTimes[slot]) s.bestTimes[slot] = { count: 0, ctr: 0 }
            s.bestTimes[slot].count++
            s.bestTimes[slot].ctr += ctr
        }
    }

    for (const niche of Object.keys(nicheStats)) {
        const s = nicheStats[niche]
        s.avgCtr = s.posts > 0 ? Math.round((s.totalCtr / s.posts) * 100) / 100 : 0

        for (const type of Object.keys(s.byType)) {
            const item = s.byType[type]
            item.avgCtr = item.count > 0 ? Math.round((item.ctr / item.count) * 100) / 100 : 0
        }
        for (const platform of Object.keys(s.byPlatform)) {
            const item = s.byPlatform[platform]
            item.avgCtr = item.count > 0 ? Math.round((item.ctr / item.count) * 100) / 100 : 0
        }
        for (const slot of Object.keys(s.bestTimes)) {
            const item = s.bestTimes[slot]
            item.avgCtr = item.count > 0 ? Math.round((item.ctr / item.count) * 100) / 100 : 0
        }

        // Top formats: sort by CTR improvement vs niche average
        s.formatRecommendations = Object.entries(s.byType)
            .map(([type, data]) => ({ type, avgCtr: data.avgCtr, delta: Math.round((data.avgCtr - s.avgCtr) * 100) / 100 }))
            .sort((a, b) => b.avgCtr - a.avgCtr)

        s.topHooks = Object.entries(s.hooks)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([hook, count]) => ({ hook, count }))

        s.bestTimeSlots = Object.entries(s.bestTimes)
            .sort((a, b) => b[1].avgCtr - a[1].avgCtr)
            .slice(0, 3)
            .map(([slot, data]) => ({ slot, avgCtr: data.avgCtr }))

        // Cross-industry transfer ideas
        s.crossTrends = generateCrossTrends(niche, nicheStats)
    }

    return nicheStats
}

function generateCrossTrends(currentNiche, allNiches) {
    const ideas = []
    const others = Object.entries(allNiches).filter(([n]) => n !== currentNiche)
    others.sort((a, b) => b[1].avgCtr - a[1].avgCtr)
    for (let i = 0; i < Math.min(2, others.length); i++) {
        const [niche, data] = others[i]
        ideas.push(`Тренд из ниши "${niche}" (средний CTR ${data.avgCtr}%) может зайти у вас через формат ${data.formatRecommendations?.[0]?.type || 'Reels'}.`)
    }
    return ideas
}

export async function getNicheComparison(userId) {
    const user = await User.findById(userId).lean()
    const userNiche = detectNiche(user)
    const all = await aggregateNicheIntelligence()
    const niche = all[userNiche] || all['general']

    const userPosts = await ScheduledPost.find({ userId, status: 'published' }).lean()
    const userCtr = userPosts.length > 0
        ? Math.round((userPosts.reduce((sum, p) => sum + estimateCTR(p), 0) / userPosts.length) * 100) / 100
        : 0

    return {
        userNiche,
        userCtr,
        nicheAvgCtr: niche?.avgCtr || 0,
        formatRecommendations: niche?.formatRecommendations || [],
        bestTimeSlots: niche?.bestTimeSlots || [],
        crossTrends: niche?.crossTrends || [],
        topHooks: niche?.topHooks || [],
    }
}

export default { aggregateNicheIntelligence, getNicheComparison }
