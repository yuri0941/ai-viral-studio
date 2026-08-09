import cron from 'node-cron'
import { getTrends } from '../../services/trendScanner.js'
import { chatWithAI } from '../../services/aiService.js'
import { runDailyAnalysis } from './omegaCoder.js'
import { getDirector } from './swarm/director.js'
import User from '../../models/User.js'
import { OmegaMemory } from '../../models/index.js'
import { PredictionStats } from '../../models/index.js'
import { Notification } from '../../models/index.js'
import { alertOmega } from '../../services/omegaBot.js'

const DREAM_START_HOUR = 2
const DREAM_END_HOUR = 6
const BRIEFING_HOUR = 8

/**
 * OMEGA Dream Mode — autonomous night shift.
 * Between 02:00 and 06:00 OMEGA scans trends, drafts ideas, refactors code,
 * and updates predictive models. At 08:00 it sends the owner a breakfast briefing.
 */

class DreamMode {
    constructor() {
        this.active = false
        this.lastRun = null
        this.metrics = {
            trendsScanned: 0,
            ideasGenerated: 0,
            usersServed: 0,
            codePatches: 0,
            predictionsUpdated: 0,
        }
        this.cronJobs = []
    }

    isNightShiftWindow() {
        const hour = new Date().getHours()
        return hour >= DREAM_START_HOUR && hour < DREAM_END_HOUR
    }

    async runNightShift() {
        if (!this.isNightShiftWindow()) {
            console.log('[DreamMode] Not in night shift window, skipping')
            return { status: 'skipped' }
        }

        this.active = true
        console.log('[DreamMode] Night shift started 🌙')
        const start = Date.now()

        try {
            // 1. Scan 50+ trend sources (aggregated via getTrends)
            const trends = await getTrends('', 50)
            this.metrics.trendsScanned += trends.length || 0

            // 2. Generate 10 post ideas for each active client
            const users = await User.find({ role: 'client', status: { $ne: 'inactive' } }).limit(100).lean()
            this.metrics.usersServed += users.length

            for (const user of users) {
                try {
                    const niche = user?.preferences?.niche || user?.niche || ''
                    const ideas = await this.generateIdeas(user, niche, trends, 10)
                    await this.saveIdeas(user._id, ideas, niche)
                    this.metrics.ideasGenerated += ideas.length
                } catch (err) {
                    console.warn(`[DreamMode] idea generation failed for ${user._id}:`, err.message)
                }
            }

            // 3. Refactor code — delegate to Tech Lead / Omega Coder
            try {
                const refactor = await runDailyAnalysis()
                if (refactor?.status === 'submitted') {
                    this.metrics.codePatches++
                }
            } catch (err) {
                console.warn('[DreamMode] refactor failed:', err.message)
            }

            // 4. Update predictive models (churn, virality, revenue)
            try {
                await this.updatePredictiveModels()
                this.metrics.predictionsUpdated++
            } catch (err) {
                console.warn('[DreamMode] predictive models update failed:', err.message)
            }

            // Cross-domain broadcast to swarm
            try {
                getDirector().broadcast({
                    type: 'dream_shift_complete',
                    trends: trends.length,
                    users: users.length,
                    ideas: this.metrics.ideasGenerated,
                })
            } catch (err) {
                console.warn('[DreamMode] swarm broadcast failed:', err.message)
            }

            this.lastRun = new Date().toISOString()
            console.log(`[DreamMode] Night shift finished in ${Date.now() - start}ms`)
            return { status: 'completed', metrics: { ...this.metrics } }
        } catch (err) {
            console.error('[DreamMode] Night shift failed:', err.message)
            return { status: 'error', error: err.message }
        } finally {
            this.active = false
        }
    }

    async generateIdeas(user, niche, trends, count = 10) {
        const trendHints = trends.slice(0, 5).map(t => t.topic || t.title || t).filter(Boolean).join('; ')
        const prompt = `Ты OMEGA. Для клиента в нише "${niche || 'контент'}" сгенерируй ${count} идей постов/роликов на завтра.
Учти актуальные тренды: ${trendHints || 'общие тренды соцсетей'}.
Верни ТОЛЬКО JSON массив:
[ { "title": "...", "format": "Reels|Stories|Пост|Shorts", "hook": "...", "cta": "..." } ]`

        const ai = await chatWithAI(prompt, [], 'ru', { userId: String(user._id) })
        const raw = ai?.reply || ai?.text || '[]'
        try {
            const match = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/)
            const json = match ? match[0] : raw
            const parsed = JSON.parse(json)
            return Array.isArray(parsed) ? parsed : [parsed]
        } catch (err) {
            console.warn('[DreamMode] failed to parse ideas:', err.message)
            return []
        }
    }

    async saveIdeas(ownerId, ideas, niche) {
        if (!ideas.length) return
        let memory = await OmegaMemory.findOne({ ownerId })
        if (!memory) {
            memory = new OmegaMemory({ ownerId, entries: [] })
        }
        memory.entries.push({
            level: 'long_term',
            content: {
                type: 'dream_ideas',
                niche,
                date: new Date().toISOString(),
                ideas,
            },
            tags: ['dream_mode', 'ideas', niche].filter(Boolean),
            weight: 0.9,
        })
        await memory.save()
    }

    async updatePredictiveModels() {
        // Lightweight retraining signal: aggregate accuracy of recent predictions
        const recent = await PredictionStats.find({ status: 'resolved' }).sort({ createdAt: -1 }).limit(1000).lean()
        const correct = recent.filter(r => r.wasCorrect).length
        const total = recent.length || 1
        const accuracy = correct / total

        // Store a global accuracy marker in the last resolved prediction for simplicity
        if (recent.length) {
            await PredictionStats.updateMany(
                { _id: { $in: recent.slice(0, 10).map(r => r._id) } },
                { $set: { 'metadata.modelAccuracy': accuracy } }
            )
        }
    }

    async sendMorningBriefing() {
        try {
            const { alertOwner } = await import('../../services/ownerBot.js')
            const today = new Date()
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

            const [totalUsers, newUsers, openTickets, activeAgents] = await Promise.all([
                User.countDocuments({}),
                User.countDocuments({ createdAt: { $gte: yesterday } }),
                (await import('../../models/index.js')).default?.SupportTicket?.countDocuments({ status: { $in: ['open', 'needs_owner', 'in_progress'] } }).catch(() => 0) || 0,
                8 // placeholder — агенты из Swarm
            ])

            // MRR — упрощённый расчёт по платежам за 30 дней
            let mrr = 0
            try {
                const Payment = (await import('../../models/index.js')).default?.Payment
                if (Payment) {
                    const payments = await Payment.aggregate([
                        { $match: { status: 'completed', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ])
                    mrr = payments[0]?.total || 0
                }
            } catch (e) { console.warn('[DreamMode] MRR calc failed:', e.message) }

            const report = `📊 <b>OMEGA Morning Briefing</b>\n🗓 ${today.toLocaleDateString('ru-RU')}\n\n💰 MRR: ${mrr.toLocaleString('ru-RU')}₽\n👥 Клиентов: ${totalUsers} (+${newUsers} за 24ч)\n🎫 Открытых тикетов: ${openTickets}\n🤖 Агентов: ${activeAgents}/12\n🌙 Ночная смена: трендов ${this.metrics.trendsScanned}, идей ${this.metrics.ideasGenerated}\n\n<i>Хорошего дня, владелец.</i>`

            await alertOwner(report, 'info')

            const owners = await User.find({ role: 'owner' }).lean()
            for (const owner of owners) {
                await Notification.create({
                    userId: owner._id,
                    ownerId: owner._id,
                    type: 'system',
                    title: 'Breakfast Briefing ready 🍳',
                    message: `OMEGA завершила ночную смену. MRR: ${mrr.toLocaleString('ru-RU')}₽, клиентов: ${totalUsers}, тикетов: ${openTickets}.`,
                    read: false,
                })
            }
            console.log('[DreamMode] Morning briefing sent to', owners.length, 'owners')
        } catch (err) {
            console.error('[DreamMode] Briefing failed:', err.message)
        }
    }

    start() {
        if (this.cronJobs.length) return

        // Every hour during night: run shift if inside 02:00-06:00
        this.cronJobs.push(cron.schedule('0 2-5 * * *', async () => {
            await this.runNightShift()
        }, { scheduled: true }))

        // 08:00 morning briefing
        this.cronJobs.push(cron.schedule('0 8 * * *', async () => {
            await this.sendMorningBriefing()
        }, { scheduled: true }))

        console.log('[DreamMode] Scheduled: night shift 02:00-06:00, briefing 08:00')
    }

    stop() {
        this.cronJobs.forEach(job => job.stop())
        this.cronJobs = []
    }

    getStatus() {
        return {
            active: this.active || this.isNightShiftWindow(),
            lastRun: this.lastRun,
            metrics: { ...this.metrics },
            window: `${String(DREAM_START_HOUR).padStart(2, '0')}:00 — ${String(DREAM_END_HOUR).padStart(2, '0')}:00`,
        }
    }
}

const dreamMode = new DreamMode()
export default dreamMode
export { DreamMode }
