import { Integration } from '../models/index.js'
import { CrisisEvent } from '../models/index.js'
import { analyzeBatch, analyzeSentiment } from './sentimentAnalysis.js'
import { alertOwner } from './ownerBot.js'
import { AuditLog } from '../models/index.js'
import { chatWithAI } from './aiService.js'
import { setAutopilotEnabled } from './autoPilot.js'

const CRISIS_WINDOW_MS = 15 * 60 * 1000
const CRISIS_NEGATIVE_THRESHOLD = 70
const CRISIS_COUNT_THRESHOLD = 10

export function isConfigured() {
    return true
}

export async function getConnectedSources(ownerId) {
    try {
        const integrations = await Integration.find({ ownerId, connected: true }).lean()
        return integrations.map(i => i.provider)
    } catch (err) {
        return []
    }
}

export function detectCrisisType(comments = []) {
    const text = comments.map(c => c.text || '').join(' ').toLowerCase()
    if (/конкурент|конкуренты|сорвал|слили|демпинг|наезд/.test(text)) return 'competitor_attack'
    if (/обман|развод|мошен|кидалы|ложь|неправда|фейк|fake|scam/.test(text)) return 'misinformation'
    if (/ненавижу|хейтер|токсич|гнида|ублюдок|тварь|fuck|hate/.test(text)) return 'hate_wave'
    if (comments.length > 50) return 'viral_negative'
    return 'other'
}

export async function analyzeComments({ ownerId, projectId, platform, comments = [] }) {
    if (!comments.length) return { status: 'no_data', message: 'Нет комментариев для анализа' }

    const analyzed = analyzeBatch(comments)
    const negative = analyzed.filter(c => c.score < CRISIS_NEGATIVE_THRESHOLD)
    const avg = analyzed.reduce((sum, c) => sum + c.score, 0) / analyzed.length

    const sources = await getConnectedSources(ownerId)
    if (!sources.length) {
        return { status: 'no_sources', message: 'Подключите соцсети в Интеграциях для мониторинга комментариев', negativeCount: negative.length }
    }

    const crisisType = detectCrisisType(negative)
    const isCrisis = negative.length >= CRISIS_COUNT_THRESHOLD && avg < 40

    if (!isCrisis) {
        return { status: 'ok', negativeCount: negative.length, averageSentiment: avg, analyzedCount: analyzed.length }
    }

    let suggestedResponse = ''
    try {
        const prompt = `Напиши короткий, спокойный, профессиональный ответ бренда на волну негативных комментариев. Тип кризиса: ${crisisType}. Не оправдывайся агрессивно, признай проблему, предложи решение. 2-3 предложения.`
        const ai = await chatWithAI(prompt, [], 'ru')
        suggestedResponse = ai?.reply?.slice(0, 800) || ''
    } catch (err) {
        suggestedResponse = 'Спасибо за обратную связь. Мы внимательно изучаем ситуацию и свяжемся с вами в ближайшее время.'
    }

    const event = await CrisisEvent.create({
        ownerId,
        projectId: projectId || null,
        type: crisisType,
        platform: platform || sources.join(', '),
        status: 'active',
        negativeComments: negative.length,
        totalComments: analyzed.length,
        averageSentiment: avg,
        suggestedResponse,
        metadata: { topComments: negative.slice(0, 5).map(c => c.text) },
    })

    await AuditLog.create({
        action: 'Crisis detected',
        user: 'system',
        ownerId,
        type: 'security',
        severity: 'high',
        metadata: { crisisId: event._id, type: crisisType, negative: negative.length, platform },
    }).catch(() => {})

    await alertOwner(`🔴 Кризис-алерт: ${crisisType} на ${platform || sources.join(', ')}. Негативных комментариев: ${negative.length}. Средний сентимент: ${avg.toFixed(1)}.`).catch(() => {})

    return { status: 'crisis', event }
}

export async function resolveCrisis(crisisId, ownerId, { response, autoActions = [] }) {
    const event = await CrisisEvent.findOne({ _id: crisisId, ownerId })
    if (!event) return { status: 'error', message: 'Crisis not found' }

    event.status = 'resolved'
    event.resolvedAt = new Date()
    event.finalResponse = response || event.suggestedResponse
    event.autoActions = autoActions
    await event.save()

    await AuditLog.create({
        action: 'Crisis resolved',
        user: 'owner',
        ownerId,
        type: 'security',
        severity: 'medium',
        metadata: { crisisId: event._id, response: event.finalResponse, actions: autoActions },
    }).catch(() => {})

    return { status: 'resolved', event }
}

export async function rejectCrisis(crisisId, ownerId) {
    const event = await CrisisEvent.findOneAndUpdate({ _id: crisisId, ownerId }, { status: 'rejected' }, { new: true })
    if (!event) return { status: 'error', message: 'Crisis not found' }
    return { status: 'rejected', event }
}

export async function pauseAutopilot(ownerId, pause = true) {
    try {
        await setAutopilotEnabled(ownerId, !pause)
        return { paused: pause }
    } catch (err) {
        return { paused: false, error: err.message }
    }
}

export async function listCrises(ownerId) {
    return CrisisEvent.find({ ownerId }).sort({ createdAt: -1 }).lean()
}

export async function getCrisisStats(ownerId) {
    const [active, attention, resolved] = await Promise.all([
        CrisisEvent.countDocuments({ ownerId, status: 'active' }),
        CrisisEvent.countDocuments({ ownerId, status: 'attention' }),
        CrisisEvent.countDocuments({ ownerId, status: 'resolved' }),
    ])
    return { active, attention, resolved, total: active + attention + resolved }
}

export default {
    isConfigured,
    getConnectedSources,
    detectCrisisType,
    analyzeComments,
    resolveCrisis,
    rejectCrisis,
    pauseAutopilot,
    listCrises,
    getCrisisStats,
}
