// [P1.6-PREP] founding-программа: слот = первая успешная оплата.
// Авто-выкл скидки при заполнении слотов без деплоя; TG-алерты владельцу.
// [PLANCONFIG-ADMIN] скидка и число слотов — из FoundingConfig (БД, hot-reload); дефолты 30%/50.
import FoundingSlot from '../models/FoundingSlot.js'
import FoundingConfig from '../models/FoundingConfig.js'

export const FOUNDING_TOTAL_SLOTS = 50 // legacy-экспорт для обратной совместимости; реальное значение — FoundingConfig
const ALERT_THRESHOLDS = [40, 50]

export async function getFoundingConfig() {
  try {
    const cfg = await FoundingConfig.getConfig()
    return { discountPercent: cfg.discountPercent ?? 30, totalSlots: cfg.totalSlots ?? 50 }
  } catch (err) {
    console.warn('[founding] config read failed, fallback 30%/50:', err.message)
    return { discountPercent: 30, totalSlots: 50 }
  }
}

export async function getFoundingStats() {
    const { totalSlots, discountPercent } = await getFoundingConfig()
    const used = await FoundingSlot.countDocuments()
    const remaining = Math.max(0, totalSlots - used)
    return { total: totalSlots, used, remaining, active: remaining > 0, discountPercent }
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

    const { used, remaining, total } = await getFoundingStats()
    if (ALERT_THRESHOLDS.includes(used) || used === total) {
        try {
            const { alertOwner } = await import('./ownerBot.js')
            const msg = used >= total
                ? `🔥 Founding-программа ЗАВЕРШЕНА: занято ${used}/${total} слотов.\nСкидка основателя для новых оплат отключена автоматически.`
                : `⚡ Founding-слоты: занято ${used}/${total} (осталось ${remaining}).\nСледующий алерт — на ${total} (авто-выкл скидки).`
            alertOwner?.(msg, 'payment').catch(() => {})
        } catch { /* алерт best-effort */ }
    }
    return { counted: true, used, remaining }
}
