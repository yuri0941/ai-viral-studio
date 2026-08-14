// [P1.6-PREP] founding-программа: 50 слотов −30%, слот = первая успешная оплата.
// Авто-выкл скидки при 50/50 без деплоя; TG-алерты владельцу на 40 и 50 слоте.
import FoundingSlot from '../models/FoundingSlot.js'

export const FOUNDING_TOTAL_SLOTS = 50
const ALERT_THRESHOLDS = [40, 50]

export async function getFoundingStats() {
    const used = await FoundingSlot.countDocuments()
    const remaining = Math.max(0, FOUNDING_TOTAL_SLOTS - used)
    return { total: FOUNDING_TOTAL_SLOTS, used, remaining, active: remaining > 0 }
}

// Право на скидку: флаг isFoundingMember + (слот уже занят этим пользователем ИЛИ слоты ещё есть)
export async function isFoundingDiscountEligible(user) {
    if (!user?.isFoundingMember) return false
    if (!user?._id) return false
    const ownSlot = await FoundingSlot.exists({ userId: user._id })
    if (ownSlot) return true
    const { active } = await getFoundingStats()
    return active
}

// Вызывается из webhook ЮKassa после активации подписки (в try/catch вызывающего).
// Идемпотентно: unique userId — повторная оплата/повторный webhook не создаёт дубль.
export async function markFoundingSlotPaid(userId, paymentId = '') {
    if (!userId) return { counted: false }
    const User = (await import('../models/User.js')).default
    const user = await User.findById(userId).select('isFoundingMember email').lean()
    if (!user?.isFoundingMember) return { counted: false }

    try {
        await FoundingSlot.create({ userId, paymentId: String(paymentId || '') })
    } catch (e) {
        if (e?.code === 11000) return { counted: false, already: true } // слот уже был занят этим пользователем
        throw e
    }

    const { used, remaining } = await getFoundingStats()
    if (ALERT_THRESHOLDS.includes(used)) {
        try {
            const { alertOwner } = await import('./ownerBot.js')
            const msg = used >= FOUNDING_TOTAL_SLOTS
                ? `🔥 Founding-программа ЗАВЕРШЕНА: занято ${used}/${FOUNDING_TOTAL_SLOTS} слотов.\nСкидка −30% для новых оплат отключена автоматически.`
                : `⚡ Founding-слоты: занято ${used}/${FOUNDING_TOTAL_SLOTS} (осталось ${remaining}).\nСледующий алерт — на ${FOUNDING_TOTAL_SLOTS} (авто-выкл скидки).`
            alertOwner?.(msg, 'payment').catch(() => {})
        } catch { /* алерт best-effort */ }
    }
    return { counted: true, used, remaining }
}
