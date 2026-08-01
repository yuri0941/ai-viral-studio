import { generateContent } from './aiService.js'
import { AiVsHumanRound } from '../models/AiVsHumanRound.js'

const SAMPLE_THEMES = [
    'Как нейросеть помогает создавать вирусные видео',
    '5 ошибок начинающих блогеров в 2026',
    'Почему короткие видео побеждают лонгриды',
    'Как монетизировать личный бренд с нуля',
    'Секреты хуков, которые держат внимание',
    'Какой контент залетает в TikTok в этом месяце',
    'Мифы об алгоритмах YouTube',
    'Как написать цепляющее описание к Shorts',
]

function getWeekKey(date = new Date()) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay() + 1) // Monday
    return d.toISOString().slice(0, 10)
}

export async function generateWeeklyRound() {
    const week = getWeekKey()

    const existing = await AiVsHumanRound.findOne({ week }).lean()
    if (existing) return { status: 'exists', round: existing }

    const theme = SAMPLE_THEMES[Math.floor(Math.random() * SAMPLE_THEMES.length)]
    const platform = 'tiktok'

    let aiPost = ''
    try {
        const aiResult = await generateContent('script', { topic: theme, platform, duration: '60 seconds', style: 'engaging and energetic' })
        aiPost = aiResult?.content || aiResult?.text || `[AI post on: ${theme}]`
    } catch (err) {
        console.error('[aiVsHuman] generateContent failed:', err.message)
        aiPost = `[AI пост на тему: ${theme}]`
    }

    const round = await AiVsHumanRound.create({
        week,
        theme,
        platform,
        aiPost,
        humanPost: '',
        aiVotes: 0,
        humanVotes: 0,
        status: 'active',
        startedAt: new Date(),
    })

    return { status: 'created', round }
}

export async function submitHumanPost(roundId, humanPost) {
    if (!humanPost?.trim()) {
        return { status: 'error', message: 'humanPost is required' }
    }

    const round = await AiVsHumanRound.findByIdAndUpdate(
        roundId,
        { humanPost: humanPost.trim() },
        { new: true }
    )

    if (!round) return { status: 'error', message: 'Round not found' }
    return { status: 'ok', round }
}

export async function vote(roundId, userId, choice) {
    if (!['ai', 'human'].includes(choice)) {
        return { status: 'error', message: 'choice must be ai or human' }
    }

    const round = await AiVsHumanRound.findById(roundId)
    if (!round) return { status: 'error', message: 'Round not found' }
    if (round.status !== 'active') return { status: 'error', message: 'Round is not active' }

    if (round.voters.includes(userId)) {
        return { status: 'error', message: 'You already voted' }
    }

    if (choice === 'ai') round.aiVotes++
    if (choice === 'human') round.humanVotes++
    round.voters.push(userId)
    await round.save()

    return { status: 'ok', round }
}

export async function revealRound(roundId) {
    const round = await AiVsHumanRound.findById(roundId)
    if (!round) return { status: 'error', message: 'Round not found' }

    let winner = 'tie'
    if (round.aiVotes > round.humanVotes) winner = 'ai'
    if (round.humanVotes > round.aiVotes) winner = 'human'

    round.winner = winner
    round.status = 'revealed'
    round.endedAt = new Date()
    await round.save()

    return { status: 'ok', round }
}

export async function autoRevealRounds() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const active = await AiVsHumanRound.find({
        status: 'active',
        startedAt: { $lte: cutoff },
    }).lean()

    for (const r of active) {
        await revealRound(r._id)
    }

    await AiVsHumanRound.updateMany(
        { status: 'revealed', endedAt: { $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        { status: 'archived' }
    )

    return { revealed: active.length }
}

export async function getCurrentRound() {
    await autoRevealRounds()
    const week = getWeekKey()
    let round = await AiVsHumanRound.findOne({ week }).lean()
    if (!round) {
        const created = await generateWeeklyRound()
        round = created.round
    }
    return round
}

export async function getArchive(limit = 20) {
    return AiVsHumanRound.find({ status: { $in: ['revealed', 'archived'] } })
        .sort({ startedAt: -1 })
        .limit(limit)
        .lean()
}

export async function getStats() {
    const all = await AiVsHumanRound.find({ status: { $in: ['revealed', 'archived'] } }).lean()
    const aiWins = all.filter(r => r.winner === 'ai').length
    const humanWins = all.filter(r => r.winner === 'human').length
    const ties = all.filter(r => r.winner === 'tie').length
    const streak = calculateStreak(all)
    return {
        total: all.length,
        aiWins,
        humanWins,
        ties,
        streak,
        aiChampion: streak.ai >= 3,
        humanChampion: streak.human >= 3,
    }
}

function calculateStreak(rounds) {
    let ai = 0
    let human = 0
    const sorted = [...rounds].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
    for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].winner === 'ai') ai++
        else if (sorted[i].winner === 'human') human++
        else break
    }
    return { ai, human }
}

export default {
    generateWeeklyRound,
    submitHumanPost,
    vote,
    revealRound,
    autoRevealRounds,
    getCurrentRound,
    getArchive,
    getStats,
}
