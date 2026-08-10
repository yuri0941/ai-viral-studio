import PDFDocument from 'pdfkit'
import { ScheduledPost, User, Campaign } from '../models/index.js'
import { chatWithAI, extractText } from './aiService.js'

const PRICING = {
    oneOff: { min: 49, max: 149 },
    subscription: 19,
}

function getPeriodDays(period) {
    const map = { week: 7, month: 30, quarter: 90, year: 365, all: 365 * 10 }
    return map[period] || 30
}

function getReportPrice(period, format) {
    const base = period === 'year' || period === 'all' ? 149 : period === 'quarter' ? 99 : period === 'month' ? 79 : 49
    const formatMultiplier = format === 'pdf' ? 1.2 : 1
    return Math.round(base * formatMultiplier)
}

async function aggregateNicheData(niche, period) {
    const startDate = new Date(Date.now() - getPeriodDays(period) * 24 * 60 * 60 * 1000)

    const userMatch = niche === 'all' ? {} : { niche: { $regex: niche, $options: 'i' } }
    const users = await User.find(userMatch).select('_id niche').lean()
    const userIds = users.map(u => u._id)

    const posts = await ScheduledPost.find({
        userId: { $in: userIds },
        createdAt: { $gte: startDate },
    }).lean()

    let totalViews = 0
    let totalLikes = 0
    let totalShares = 0
    let totalComments = 0
    const platformCounts = {}
    const statusCounts = {}

    posts.forEach(post => {
        const stats = post.stats || post.analytics || {}
        totalViews += Number(stats.views || stats.impressions || 0)
        totalLikes += Number(stats.likes || stats.reactions || 0)
        totalShares += Number(stats.shares || 0)
        totalComments += Number(stats.comments || 0)

        const platform = post.platform || 'unknown'
        platformCounts[platform] = (platformCounts[platform] || 0) + 1

        const status = post.status || 'draft'
        statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    const engagementRate = totalViews > 0
        ? ((totalLikes + totalShares * 2 + totalComments * 1.5) / totalViews) * 100
        : 0

    const adSpendAgg = await Campaign.aggregate([
        { $match: { ownerId: { $in: userIds }, createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$spend' } } },
    ])
    const totalAdSpend = adSpendAgg[0]?.total || 0

    return {
        niche,
        period,
        sampleSize: users.length,
        totalPosts: posts.length,
        totalViews,
        totalLikes,
        totalShares,
        totalComments,
        engagementRate: Number(engagementRate.toFixed(2)),
        totalAdSpend,
        platformDistribution: platformCounts,
        statusDistribution: statusCounts,
        generatedAt: new Date().toISOString(),
    }
}

async function generateInsights(niche, data) {
    const prompt = `Проанализируй анонимные данные нише "${niche}" за период ${data.period}:
- Постов: ${data.totalPosts}
- Просмотров: ${data.totalViews}
- Лайков: ${data.totalLikes}
- Поделились: ${data.totalShares}
- Комментариев: ${data.totalComments}
- ER: ${data.engagementRate}%
- Ad spend: $${data.totalAdSpend}

Дай 3 кратких инсайта и 3 рекомендации для креаторов в этой нише. Ответ на русском, без markdown, максимум 400 слов.`

    try {
        const result = await chatWithAI(prompt, [], 'ru')
        return extractText(result)
    } catch (err) {
        console.warn('[dataIntelligence] AI insights failed:', err.message)
        return 'Инсайты генерируются OMEGA...'
    }
}

export async function generateNicheReport(niche, period, format = 'json') {
    const data = await aggregateNicheData(niche, period)
    const insights = await generateInsights(niche, data)
    const report = { ...data, insights }

    if (format === 'pdf') {
        return generatePDF(report)
    }

    return {
        success: true,
        format: 'json',
        price: getReportPrice(period, format),
        subscriptionPrice: PRICING.subscription,
        data: report,
    }
}

function generatePDF(report) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 })
            const chunks = []
            doc.on('data', chunk => chunks.push(chunk))
            doc.on('end', () => {
                const buffer = Buffer.concat(chunks)
                resolve({
                    success: true,
                    format: 'pdf',
                    price: getReportPrice(report.period, 'pdf'),
                    subscriptionPrice: PRICING.subscription,
                    base64: buffer.toString('base64'),
                    filename: `omega-niche-report-${report.niche}-${report.period}.pdf`,
                })
            })

            doc.fontSize(24).text('OMEGA Data Intelligence Report', 50, 50)
            doc.fontSize(14).text(`Ниша: ${report.niche} | Период: ${report.period}`, 50, 90)
            doc.moveDown()

            doc.fontSize(12).text(`Выборка: ${report.sampleSize} креаторов`)
            doc.text(`Постов: ${report.totalPosts}`)
            doc.text(`Просмотров: ${report.totalViews}`)
            doc.text(`Лайков: ${report.totalLikes}`)
            doc.text(`Поделились: ${report.totalShares}`)
            doc.text(`Комментариев: ${report.totalComments}`)
            doc.text(`Engagement Rate: ${report.engagementRate}%`)
            doc.text(`Ad Spend: $${report.totalAdSpend}`)
            doc.moveDown()

            doc.fontSize(16).text('Инсайты OMEGA')
            doc.fontSize(11).text(report.insights)
            doc.end()
        } catch (err) {
            reject(err)
        }
    })
}

export function getPricing() {
    return { ...PRICING }
}

export default {
    generateNicheReport,
    getPricing,
}
