// [P1.5-METRICS] серверные счётчики воронки + MRR. Без внешних сервисов, без персональных данных.
// Любая ошибка метрик НЕ должна валить основной флоу — вызывающий код оборачивает в try/catch.
import mongoose from 'mongoose'
import MetricsDaily from '../models/MetricsDaily.js'
import Subscription from '../models/Subscription.js'

// Идемпотентность событий: уникальный ключ на событие (paid:<paymentId>, first_post:<userId>).
// Duplicate key (11000) = событие уже посчитано → пропуск.
const metricsGuardSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
})
const MetricsGuard = mongoose.model('MetricsGuard', metricsGuardSchema)

function utcDayKey(d = new Date()) {
    return d.toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

async function inc(field, by = 1) {
    await MetricsDaily.updateOne(
        { date: utcDayKey() },
        { $inc: { [field]: by } },
        { upsert: true }
    )
}

// Атомарный «захват» события; true = считаем, false = уже посчитано
async function claim(key) {
    try {
        await MetricsGuard.create({ key })
        return true
    } catch (e) {
        if (e?.code === 11000) return false
        throw e
    }
}

export async function trackVisit() {
    await inc('visits')
}

export async function trackSignup() {
    await inc('signups')
}

// Первая успешная публикация пользователя — один раз на пользователя
export async function trackFirstPost(userId) {
    if (!userId) return
    if (await claim(`first_post:${userId}`)) await inc('firstPosts')
}

// paid: идемпотентно по paymentId — тот же платёж никогда не считается дважды
export async function trackPaid({ paymentId, amountRub = 0 }) {
    if (!paymentId) return
    if (await claim(`paid:${paymentId}`)) {
        await MetricsDaily.updateOne(
            { date: utcDayKey() },
            { $inc: { paidCount: 1, revenueRub: Math.round(Number(amountRub)) || 0 } },
            { upsert: true }
        )
    }
}

// Воронка за N дней (включая сегодня). Честные нули, если данных нет.
export async function getFunnel(days = 7) {
    const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    const rows = await MetricsDaily.find({ date: { $gte: utcDayKey(since) } }).lean()
    const sum = { visits: 0, signups: 0, firstPosts: 0, paidCount: 0, revenueRub: 0 }
    for (const r of rows) {
        sum.visits += r.visits || 0
        sum.signups += r.signups || 0
        sum.firstPosts += r.firstPosts || 0
        sum.paidCount += r.paidCount || 0
        sum.revenueRub += r.revenueRub || 0
    }
    return { days, ...sum }
}

// MRR: сумма по активным платным подпискам, цена — из последнего платежа подписки
// (founding −30% уже учтён в сумме платежа). Free = 0. Нет платежей → честный 0.
export async function calcMRR() {
    const subs = await Subscription.find({ status: 'active' }).lean()
    let mrr = 0
    let paying = 0
    for (const sub of subs) {
        if (!sub.plan || sub.plan === 'free') continue
        let price = 0
        const history = Array.isArray(sub.paymentHistory) ? sub.paymentHistory : []
        const lastPaid = [...history].reverse().find(p => p.status === 'paid' && Number(p.amount) > 0)
        if (lastPaid) price = Number(lastPaid.amount)
        if (!price && Number(sub.amount) > 0) price = Number(sub.amount)
        if (price > 0) {
            mrr += price
            paying++
        }
    }
    return { mrr, paying }
}

function pct(part, total) {
    if (!total) return '0%'
    return `${Math.round((part / total) * 100)}%`
}

function formatFunnelLine(f) {
    return `визиты ${f.visits} → регистрации ${f.signups} (${pct(f.signups, f.visits)}) → первый пост ${f.firstPosts} (${pct(f.firstPosts, f.signups)}) → оплаты ${f.paidCount} (${pct(f.paidCount, f.firstPosts)})`
}

// Блок для Daily Report (дополняет существующий текст, не заменяет)
export async function buildDailyMetricsBlock() {
    const f7 = await getFunnel(7)
    const { mrr, paying } = await calcMRR()
    return `📊 ВОРОНКА 7 дней: ${formatFunnelLine(f7)}\n💰 MRR: ${mrr.toLocaleString('ru-RU')} ₽ | платящих: ${paying} | выручка 7 дней: ${f7.revenueRub.toLocaleString('ru-RU')} ₽`
}

// Карточка для owner-бота: команда «метрики» / «воронка»
export async function buildMetricsCard() {
    const [f7, f30, { mrr, paying }] = await Promise.all([getFunnel(7), getFunnel(30), calcMRR()])
    return [
        '📊 <b>Метрики — AI Viral Studio</b>',
        '━━━━━━━━━━━━━━',
        `<b>Воронка 7 дней:</b> ${formatFunnelLine(f7)}`,
        `<b>Воронка 30 дней:</b> ${formatFunnelLine(f30)}`,
        '━━━━━━━━━━━━━━',
        `💰 <b>MRR:</b> ${mrr.toLocaleString('ru-RU')} ₽ | платящих: ${paying}`,
        `💵 Выручка 30 дней: ${f30.revenueRub.toLocaleString('ru-RU')} ₽`,
    ].join('\n')
}
