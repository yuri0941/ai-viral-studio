import { ScheduledPost, User } from '../models/index.js'

const PERIOD_DAYS = {
    week: 7,
    month: 30,
    all: 365 * 10,
}

function getStartDate(period) {
    const days = PERIOD_DAYS[period] || PERIOD_DAYS.week
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export async function calculateViralScore(userId) {
    const startDate = getStartDate('week')
    const posts = await ScheduledPost.find({ userId, createdAt: { $gte: startDate } }).lean()

    let views = 0
    let likes = 0
    let shares = 0
    let comments = 0

    posts.forEach(post => {
        const stats = post.stats || post.analytics || {}
        views += Number(stats.views || stats.impressions || 0)
        likes += Number(stats.likes || stats.reactions || 0)
        shares += Number(stats.shares || 0)
        comments += Number(stats.comments || 0)
    })

    // [P20] added: viral score formula
    const engagementRate = views > 0 ? ((likes + shares * 2 + comments * 1.5) / views) * 100 : 0
    const viewsScore = Math.log10(Math.max(views, 1)) * 100
    const engagementScore = engagementRate * 50
    const viralScore = Math.round(viewsScore + engagementScore)

    return {
        userId,
        views,
        likes,
        shares,
        comments,
        engagementRate: Number(engagementRate.toFixed(2)),
        viralScore,
    }
}

export async function getLeaderboard(period = 'week', niche = 'all') {
    const startDate = getStartDate(period)
    const match = { createdAt: { $gte: startDate } }

    const posts = await ScheduledPost.find(match).lean()
    const userMap = new Map()

    for (const post of posts) {
        const uid = String(post.userId)
        if (!userMap.has(uid)) {
            userMap.set(uid, { views: 0, likes: 0, shares: 0, comments: 0 })
        }
        const stats = post.stats || post.analytics || {}
        const entry = userMap.get(uid)
        entry.views += Number(stats.views || stats.impressions || 0)
        entry.likes += Number(stats.likes || stats.reactions || 0)
        entry.shares += Number(stats.shares || 0)
        entry.comments += Number(stats.comments || 0)
        entry.niche = post.niche || entry.niche || 'general'
    }

    const userIds = Array.from(userMap.keys())
    const users = await User.find({ _id: { $in: userIds } }).select('name avatar niche role subscription').lean()
    const userById = new Map(users.map(u => [String(u._id), u]))

    const results = []
    for (const [uid, data] of userMap.entries()) {
        const user = userById.get(uid) || {}
        const engagementRate = data.views > 0 ? ((data.likes + data.shares * 2 + data.comments * 1.5) / data.views) * 100 : 0
        const viewsScore = Math.log10(Math.max(data.views, 1)) * 100
        const engagementScore = engagementRate * 50
        const viralScore = Math.round(viewsScore + engagementScore)

        if (niche !== 'all' && (user.niche || data.niche || '').toLowerCase() !== niche.toLowerCase()) {
            continue
        }

        results.push({
            userId: uid,
            rank: 0,
            name: user.name || 'Anonymous',
            avatar: user.avatar || '',
            niche: user.niche || data.niche || 'general',
            views: data.views,
            likes: data.likes,
            shares: data.shares,
            comments: data.comments,
            engagementRate: Number(engagementRate.toFixed(2)),
            viralScore,
            anonymous: true,
        })
    }

    results.sort((a, b) => b.viralScore - a.viralScore)
    results.forEach((r, i) => { r.rank = i + 1 })

    return results.slice(0, 100)
}

export async function getTop3(period = 'week', niche = 'all') {
    const leaderboard = await getLeaderboard(period, niche)
    const top3 = leaderboard.slice(0, 3)
    const prizes = [
        { place: 1, credits: 500, label: '🥇 1 место — 500 кредитов' },
        { place: 2, credits: 300, label: '🥈 2 место — 300 кредитов' },
        { place: 3, credits: 150, label: '🥉 3 место — 150 кредитов' },
    ]
    return top3.map((entry, i) => ({
        ...entry,
        prize: prizes[i] || { place: i + 1, credits: 0, label: `${i + 1} место` },
    }))
}

export default {
    calculateViralScore,
    getLeaderboard,
    getTop3,
}
