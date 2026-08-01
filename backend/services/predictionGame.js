import { predictViralScore } from './predictiveEngine.js'
import { PredictionStats } from '../models/PredictionStats.js'
import ScheduledPost from '../models/ScheduledPost.js'

function parseEstimatedViews(estimatedViews) {
    if (!estimatedViews) return { min: 0, max: 0, center: 0 }
    const cleaned = String(estimatedViews).toLowerCase().replace(/[^0-9k\s\-–—]/g, '').trim()
    const parts = cleaned.split(/[\s\-–—]+/).filter(Boolean)
    const parse = (s) => {
        if (!s) return 0
        const n = parseFloat(s.replace('k', ''))
        return s.includes('k') ? n * 1000 : n
    }

    if (parts.length >= 2) {
        const [a, b] = [parse(parts[0]), parse(parts[1])]
        return { min: Math.min(a, b), max: Math.max(a, b), center: (a + b) / 2 }
    }

    const center = parse(parts[0])
    return { min: Math.round(center * 0.85), max: Math.round(center * 1.15), center }
}

export async function createPrediction({ userId, postId, content, platform, niche }) {
    if (!userId || !content) {
        return { status: 'error', message: 'userId and content are required' }
    }

    const prediction = await predictViralScore(userId, content)

    if (prediction.status === 'insufficient_data') {
        return {
            status: 'insufficient_data',
            message: `Недостаточно данных для споров. ${prediction.message}`,
            action: prediction.action,
        }
    }

    if (prediction.status !== 'ok') {
        return {
            status: 'error',
            message: prediction.message || 'Не удалось сделать прогноз',
        }
    }

    const doc = await PredictionStats.create({
        userId,
        postId: postId || null,
        platform: platform || 'unknown',
        niche: niche || '',
        prediction: {
            estimatedViews: prediction.estimatedViews,
            score: prediction.score,
            direction: 'none',
            wager: 'skip',
        },
        actual: { views: 0 },
        status: 'pending',
    })

    return {
        status: 'ok',
        predictionId: doc._id,
        estimatedViews: prediction.estimatedViews,
        score: prediction.score,
        reasoning: prediction.reasoning,
        suggestions: prediction.suggestions,
        message: `Предсказываю ${prediction.estimatedViews} просмотров (±15%). Спорим?`,
    }
}

export async function placeWager(predictionId, wager) {
    if (!['more', 'less', 'skip'].includes(wager)) {
        return { status: 'error', message: 'Invalid wager. Use more, less or skip' }
    }

    const doc = await PredictionStats.findByIdAndUpdate(
        predictionId,
        { 'prediction.wager': wager },
        { new: true }
    )

    if (!doc) {
        return { status: 'error', message: 'Prediction not found' }
    }

    return {
        status: 'ok',
        predictionId: doc._id,
        wager: doc.prediction.wager,
        message: wager === 'skip' ? 'Спор пропущен' : `Спор принят: ${wager === 'more' ? 'больше' : 'меньше'} прогноза`,
    }
}

export async function resolvePrediction(predictionId, actualViews) {
    const doc = await PredictionStats.findById(predictionId)
    if (!doc) return { status: 'error', message: 'Prediction not found' }
    if (doc.status !== 'pending') return { status: 'error', message: 'Prediction already resolved' }

    const parsed = parseEstimatedViews(doc.prediction.estimatedViews)
    const actual = Number(actualViews) || 0
    const omegaCorrect = actual >= parsed.min && actual <= parsed.max

    let reward = { credits: 0, discount: 0 }
    if (doc.prediction.wager !== 'skip') {
        if (omegaCorrect) {
            reward.credits = 10
        } else {
            reward.discount = 20
        }
    }

    doc.actual.views = actual
    doc.wasCorrect = omegaCorrect
    doc.reward = reward
    doc.resolvedAt = new Date()
    doc.status = 'resolved'
    await doc.save()

    return {
        status: 'ok',
        predictionId: doc._id,
        omegaCorrect,
        reward,
        message: omegaCorrect
            ? 'OMEGA угадала! +10 кредитов'
            : 'OMEGA ошиблась. Скидка 20% на следующую генерацию',
    }
}

export async function resolvePredictionsFromAnalytics(userId, updates) {
    const results = []
    for (const { predictionId, actualViews } of updates || []) {
        try {
            const res = await resolvePrediction(predictionId, actualViews)
            results.push(res)
        } catch (err) {
            results.push({ status: 'error', predictionId, message: err.message })
        }
    }
    return results
}

export async function autoResolveOldPredictions() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const pending = await PredictionStats.find({
        status: 'pending',
        createdAt: { $lte: cutoff },
    }).lean()

    for (const p of pending) {
        const post = p.postId ? await ScheduledPost.findById(p.postId).lean() : null
        const actualViews = post?.analytics?.views || post?.views || 0
        if (actualViews > 0) {
            await resolvePrediction(p._id, actualViews)
        }
    }

    // Mark stale predictions without analytics as expired
    await PredictionStats.updateMany(
        { status: 'pending', createdAt: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        { status: 'expired' }
    )

    return { resolved: pending.length }
}

export async function getPendingPredictions(userId) {
    return PredictionStats.find({ userId, status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
}

export async function getLeaderboard(userId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const stats = await PredictionStats.find({
        userId,
        status: 'resolved',
        resolvedAt: { $gte: since },
    }).lean()

    const total = stats.length
    const correct = stats.filter(s => s.wasCorrect).length
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    const creditsEarned = stats.reduce((sum, s) => sum + (s.reward?.credits || 0), 0)
    const discountsEarned = stats.reduce((sum, s) => sum + (s.reward?.discount ? 1 : 0), 0)

    const byPlatform = {}
    const byNiche = {}
    for (const s of stats) {
        const keyP = s.platform || 'unknown'
        const keyN = s.niche || 'unknown'
        if (!byPlatform[keyP]) byPlatform[keyP] = { total: 0, correct: 0 }
        if (!byNiche[keyN]) byNiche[keyN] = { total: 0, correct: 0 }
        byPlatform[keyP].total++
        byNiche[keyN].total++
        if (s.wasCorrect) {
            byPlatform[keyP].correct++
            byNiche[keyN].correct++
        }
    }

    return {
        total,
        correct,
        accuracy,
        creditsEarned,
        discountsEarned,
        byPlatform,
        byNiche,
        recent: stats.slice(-20).reverse(),
    }
}

export async function getAccuracyStats(userId) {
    const weekly = []
    for (let i = 0; i < 4; i++) {
        const start = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
        const end = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
        const stats = await PredictionStats.find({
            userId,
            status: 'resolved',
            resolvedAt: { $gte: start, $lte: end },
        }).lean()
        const total = stats.length
        const correct = stats.filter(s => s.wasCorrect).length
        weekly.push({
            week: `Неделя ${4 - i}`,
            accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
            total,
        })
    }
    return weekly.reverse()
}

export default {
    createPrediction,
    placeWager,
    resolvePrediction,
    resolvePredictionsFromAnalytics,
    autoResolveOldPredictions,
    getPendingPredictions,
    getLeaderboard,
    getAccuracyStats,
}
