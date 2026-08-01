import { ScheduledPost, User, Payment } from '../models/index.js'
import { chatWithAI } from './aiService.js'
import { generateCover } from './imageGeneration.js'

async function calculateClientGrowth(userId) {
    const now = new Date()
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000)

    const recentPosts = await ScheduledPost.countDocuments({ userId, createdAt: { $gte: thirtyDaysAgo } })
    const previousPosts = await ScheduledPost.countDocuments({ userId, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } })

    const recentPayments = await Payment.aggregate([
        { $match: { userId, status: 'succeeded', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const previousPayments = await Payment.aggregate([
        { $match: { userId, status: 'succeeded', createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ])

    const recentRevenue = recentPayments[0]?.total || 0
    const previousRevenue = previousPayments[0]?.total || 0

    const postGrowth = previousPosts > 0 ? ((recentPosts - previousPosts) / previousPosts) * 100 : (recentPosts > 0 ? 100 : 0)
    const revenueGrowth = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : (recentRevenue > 0 ? 100 : 0)

    return {
        userId,
        recentPosts,
        previousPosts,
        postGrowth,
        recentRevenue,
        previousRevenue,
        revenueGrowth,
        score: Math.max(postGrowth, revenueGrowth),
    }
}

export async function findCaseStudyCandidates(minGrowth = 20) {
    const users = await User.find({ role: { $in: ['creator', 'client'] } }).select('_id name email niche').lean()
    const candidates = []
    for (const user of users) {
        try {
            const growth = await calculateClientGrowth(user._id)
            if (growth.score >= minGrowth) {
                candidates.push({ user, growth })
            }
        } catch (err) {
            console.warn('[caseStudy] growth calc failed for', user._id, err.message)
        }
    }
    return candidates.sort((a, b) => b.growth.score - a.growth.score)
}

export async function generateCaseStudy(userId, options = {}) {
    const candidates = await findCaseStudyCandidates(20)
    const candidate = candidates.find(c => String(c.user._id) === String(userId)) || candidates[0]

    if (!candidate) {
        return {
            status: 'no_data',
            message: 'Недостаточно данных для кейса. Нужен клиент с ростом метрик >20% за 30 дней.',
        }
    }

    const { user, growth } = candidate
    const prompt = `Напиши маркетинговый кейс для клиента ${user.name || 'AI Viral Studio'} (ниша: ${user.niche || 'контент'}). 
За последние 30 дней: рост публикаций ${growth.postGrowth.toFixed(1)}%, рост выручки ${growth.revenueGrowth.toFixed(1)}%.
Структура: Проблема → Решение (OMEGA AI + автоматизация) → Результаты (цифры) → Цитата клиента. 
Язык: русский. Объём: 300-400 слов.`

    const aiResult = await chatWithAI(prompt, [], 'ru')
    const cover = await generateCover({
        prompt: `Professional case study cover image for AI viral content platform, ${user.niche || 'social media'} growth, success story, modern minimal design`,
        style: 'minimal',
        size: '1200x628',
    })

    return {
        status: 'success',
        data: {
            id: `case-${Date.now()}`,
            client: user,
            growth,
            content: aiResult.reply || aiResult.content || aiResult.text || '',
            coverUrl: cover.url,
            createdAt: new Date().toISOString(),
            status: 'draft',
        },
    }
}

export default {
    findCaseStudyCandidates,
    generateCaseStudy,
}
