// [OWNER-REMOTE-CONTROL] единая обёртка действий владельца: используется и TG-ботом, и кабинетом.
// Логика возврата НЕ дублируется — вызывается существующий admin refund handler из routes/payments.js.
import Payment from '../models/Payment.js'
import Subscription from '../models/Subscription.js'
import ScheduledPost from '../models/ScheduledPost.js'
import SupportTicket from '../models/SupportTicket.js'
import AuditLog from '../models/AuditLog.js'
import { getOwnerFlags, setOwnerFlag } from '../models/OwnerSettings.js'
import { calcMRR, getFunnel } from './metricsService.js'

// ============ аудит действий владельца (существующий AuditLog, без новых моделей) ============
export async function logOwnerAction(action, params = {}, result = 'ok', actor = 'owner-telegram') {
    try {
        await AuditLog.create({
            action,
            user: actor,
            type: 'owner',
            severity: action.includes('refund') || action.includes('maintenance') ? 'high' : 'medium',
            metadata: { params, result: String(result).slice(0, 300) },
            timestamp: new Date(),
        })
    } catch (e) {
        console.warn('[ownerActions] audit log failed:', e.message)
    }
}

// ============ «статус»: карточка состояния ============
export async function getStatusData() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [payments24, mrrData, scheduled, publishing, failed24, openTickets, flags] = await Promise.all([
        Payment.find({ status: 'succeeded', paidAt: { $gte: dayAgo } }).select('amount').lean(),
        calcMRR(),
        ScheduledPost.countDocuments({ status: 'scheduled' }),
        ScheduledPost.countDocuments({ status: 'publishing' }),
        ScheduledPost.countDocuments({ status: 'failed', updatedAt: { $gte: dayAgo } }),
        SupportTicket.countDocuments({ status: { $in: ['open', 'needs_owner', 'in_progress'] } }),
        getOwnerFlags(true),
    ])
    return {
        uptimeSec: Math.round(process.uptime()),
        payments24h: {
            count: payments24.length,
            sumRub: payments24.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        },
        mrr: mrrData.mrr,
        paying: mrrData.paying,
        queue: { scheduled, publishing, failed24h: failed24 },
        openTickets,
        flags,
    }
}

function formatUptime(sec) {
    const d = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    if (d > 0) return `${d}д ${h}ч`
    if (h > 0) return `${h}ч ${m}м`
    return `${m}м`
}

export function formatStatusCard(s) {
    return [
        '🖥 <b>Статус — AI Viral Studio</b>',
        '━━━━━━━━━━━━━━',
        `⏱ Uptime: ${formatUptime(s.uptimeSec)}`,
        `💳 Платежи 24ч: ${s.payments24h.count} шт на ${s.payments24h.sumRub.toLocaleString('ru-RU')} ₽`,
        `💰 MRR: ${s.mrr.toLocaleString('ru-RU')} ₽ | платящих: ${s.paying}`,
        `📮 Очередь постов: scheduled ${s.queue.scheduled} | publishing ${s.queue.publishing} | failed 24ч ${s.queue.failed24h}`,
        `🎫 Открытые тикеты: ${s.openTickets}`,
        '━━━━━━━━━━━━━━',
        `🛠 Техработы: ${s.flags.maintenanceMode ? '<b>ON</b>' : 'off'} | 📝 Регистрация: ${s.flags.registrationEnabled ? 'on' : '<b>OFF</b>'}`,
    ].join('\n')
}

// ============ «верни платёж»: поиск + возврат через СУЩЕСТВУЮЩИЙ admin refund ============
export async function findRefundablePayment(identifier) {
    const id = String(identifier || '').trim()
    if (!id) return null
    let payment = null
    if (id.includes('@')) {
        const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        payment = await Payment.findOne({
            customerEmail: new RegExp(`^${escaped}$`, 'i'),
            status: 'succeeded',
        }).sort({ paidAt: -1, createdAt: -1 }).lean()
    } else {
        payment = await Payment.findOne({ yookassaPaymentId: id }).lean()
    }
    return payment
}

// Вызов существующего admin refund handler без дублирования логики (включая чек возврата 19.13-lite)
async function callExistingAdminRefund(subscriptionId) {
    const { adminRefundHandler } = await import('../routes/payments.js')
    const req = { params: { subscriptionId: String(subscriptionId) }, user: { role: 'owner' } }
    const res = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this },
        json(payload) { this.body = payload; return this },
    }
    await adminRefundHandler(req, res)
    return { statusCode: res.statusCode, body: res.body }
}

const inFlightRefunds = new Set()

export async function refundByPaymentId(paymentId, actor = 'owner-telegram') {
    if (inFlightRefunds.has(paymentId)) {
        return { ok: false, reason: 'in_progress', message: 'Возврат уже выполняется, повторное нажатие игнорировано.' }
    }
    inFlightRefunds.add(paymentId)
    try {
        const payment = await Payment.findOne({ yookassaPaymentId: paymentId }).lean()
        if (!payment) return { ok: false, reason: 'not_found', message: 'Платёж не найден.' }
        if (payment.status === 'refunded') return { ok: false, reason: 'already_refunded', message: 'Этот платёж уже возвращён.' }

        const sub = await Subscription.findOne({ providerPaymentId: paymentId })
        if (!sub) return { ok: false, reason: 'not_found', message: 'Подписка по этому платежу не найдена.' }
        if (sub.status === 'refunded') return { ok: false, reason: 'already_refunded', message: 'Возврат по этой подписке уже выполнен.' }

        const r = await callExistingAdminRefund(sub._id)
        const ok = r.statusCode === 200 && r.body?.success
        await logOwnerAction(
            'owner.refund',
            { paymentId, subscriptionId: String(sub._id), email: payment.customerEmail || '', amount: payment.amount },
            ok ? 'ok' : (r.body?.error || `HTTP ${r.statusCode}`),
            actor
        )
        if (!ok) return { ok: false, reason: 'refund_failed', message: r.body?.error || 'Ошибка возврата.' }
        return { ok: true, message: 'Возврат выполнен. Чек возврата — по правилам 54-ФЗ (рубильник YOOKASSA_RECEIPTS).', payment }
    } catch (e) {
        await logOwnerAction('owner.refund', { paymentId }, `exception: ${e.message}`, actor)
        return { ok: false, reason: 'exception', message: `Ошибка: ${e.message}` }
    } finally {
        inFlightRefunds.delete(paymentId)
    }
}

// ============ рубильники (единый источник истины — OwnerSettings, разделяется с кабинетом) ============
export async function setMaintenance(on, actor = 'owner-telegram') {
    const r = await setOwnerFlag('maintenanceMode', on)
    await logOwnerAction(on ? 'owner.maintenance.on' : 'owner.maintenance.off', {}, 'ok', actor)
    return r.maintenanceMode
}

export async function setRegistration(on, actor = 'owner-telegram') {
    const r = await setOwnerFlag('registrationEnabled', on)
    await logOwnerAction(on ? 'owner.registration.on' : 'owner.registration.off', {}, 'ok', actor)
    return r.registrationEnabled
}

// ============ виджет метрик для кабинета (данные из metricsService P1.5, без дублирования) ============
export async function getOwnerMetricsWidget() {
    const [f7, { mrr, paying }] = await Promise.all([getFunnel(7), calcMRR()])
    return { funnel7d: f7, mrr, paying }
}
