import cron from 'node-cron'
import User from '../models/User.js'
import Subscription from '../models/Subscription.js'
import AuditLog from '../models/AuditLog.js'
import { OwnerSettings } from '../models/OwnerSettings.js'
import { chatWithAI, extractText } from './aiService.js'
import { sendEmail } from './emailService.js'
import { sendOwnerAlert } from '../integrations/telegram/ownerBot.js'
import { sendPush } from '../controllers/pushController.js'

export async function generateDailyReport(ownerId) {
    const now = new Date()
    const yesterday = new Date(now - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const owner = await User.findById(ownerId)
    if (!owner) throw new Error('Owner not found')

    const subscriptions = await Subscription.find({ status: 'active' }).lean()
    const mrr = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0)
    const newUsers = await User.countDocuments({ createdAt: { $gte: yesterday } })
    const errors = await AuditLog.countDocuments({
        type: { $in: ['error', 'security'] },
        timestamp: { $gte: yesterday },
    })

    const topTrends = ['Shorts/Reels', 'AI-обложки', 'Личные истории']
    const summary = `MRR: ${mrr}, новых пользователей: ${newUsers}, ошибок: ${errors}. Тренды: ${topTrends.join(', ')}.`
    let recommendations = []
    try {
        const ai = await chatWithAI(
            `Владельцу платформы нужен утренний отчёт. ${summary} Дай 3 короткие рекомендации (по одному предложению). Ответь строго JSON: { "recommendations": ["...", "...", "..."] }.`,
            [],
            'ru',
            { userId: ownerId }
        )
        const text = extractText(ai)
        const match = text.match(/\{[\s\S]*\}/)
        const parsed = match ? JSON.parse(match[0]) : null
        recommendations = parsed?.recommendations || []
    } catch (e) {
        console.error('[autoReportService] AI recommendations failed:', e.message)
        recommendations = [
            'Проверьте конверсию подписок: предложите лимитированный апгрейд.',
            'Запустите ретаргетинг на неактивных пользователей за 7 дней.',
            'Обновите шаблоны хуков под текущие тренды в нишах клиентов.',
        ]
    }

    const report = {
        date: now,
        mrr,
        newUsers,
        errors,
        topTrends,
        recommendations,
        generatedBy: 'OMEGA',
    }

    await OwnerSettings.findOneAndUpdate(
        { ownerId },
        { $set: { lastReport: report } },
        { upsert: true, new: true }
    )

    return report
}

export async function sendReport(ownerId, report, channels = ['in-app']) {
    const owner = await User.findById(ownerId)
    if (!owner) return

    const text = `📊 Утренний отчёт OMEGA\n\nMRR: ${report.mrr}\nНовых пользователей: ${report.newUsers}\nОшибок за 24ч: ${report.errors}\n\nТоп-тренды: ${report.topTrends.join(', ')}\n\nРекомендации:\n${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    const html = `<h2>📊 Утренний отчёт OMEGA</h2><p><b>MRR:</b> ${report.mrr}</p><p><b>Новых пользователей:</b> ${report.newUsers}</p><p><b>Ошибок за 24ч:</b> ${report.errors}</p><p><b>Топ-тренды:</b> ${report.topTrends.join(', ')}</p><ul>${report.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>`

    for (const channel of channels) {
        try {
            if (channel === 'email' && owner.email) {
                await sendEmail({ to: owner.email, subject: 'Утренний отчёт OMEGA', text, html })
            }
            if (channel === 'telegram') {
                await sendOwnerAlert(text)
            }
            if (channel === 'in-app') {
                await sendPush({ title: 'Утренний отчёт OMEGA', body: `MRR ${report.mrr}, новых ${report.newUsers}`, route: '/owner?tab=autoReport' })
            }
        } catch (e) {
            console.error('[autoReportService] channel send failed:', channel, e.message)
        }
    }
}

export async function runDailyReports() {
    console.log('[AUTO-REPORT] Generating daily reports...')
    const owners = await User.find({ role: { $in: ['owner', 'admin'] } }).select('_id').lean()
    for (const owner of owners) {
        try {
            const settings = await OwnerSettings.findOne({ ownerId: owner._id }).lean()
            if (settings?.autoReport?.enabled === false) continue
            const report = await generateDailyReport(owner._id)
            const channels = settings?.autoReport?.channels || ['in-app']
            await sendReport(owner._id, report, channels)
        } catch (e) {
            console.error('[AUTO-REPORT] owner failed:', owner._id, e.message)
        }
    }
}

export function startAutoReportCron() {
    if (!cron.validate('0 8 * * *')) return
    cron.schedule('0 8 * * *', () => {
        runDailyReports().catch(e => console.error('[AUTO-REPORT] cron error:', e.message))
    }, { timezone: 'Europe/Moscow' })
    console.log('[AUTO-REPORT] cron scheduled at 08:00 Europe/Moscow')
}
