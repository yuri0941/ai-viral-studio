// [ADDONS-COMPOSITION-LINK] Проверка доступа к функции по entitlement.
// Реальная разблокировка: активная запись UserAddon (не истекла, не отменена),
// фича входит в (живой состав аддона ∪ снапшот на момент покупки) —
// добавление работает сразу у всех, удалённое живёт до конца оплаченного периода.
import UserAddon from '../models/UserAddon.js'
import Addon from '../models/Addon.js'
import { isImplemented } from '../config/addonEntitlements.js'

export async function hasEntitlement(userId, featureKey) {
    if (!isImplemented(featureKey)) return false
    const rows = await UserAddon.find({ userId, status: 'active', expiresAt: { $gt: new Date() } }).lean()
    if (!rows.length) return false
    const ids = rows.map(r => r.addonId)
    const addons = await Addon.find({ id: { $in: ids } }).lean()
    const featuresById = new Map(addons.map(a => [a.id, a.features || []]))
    return rows.some(r => {
        const merged = new Set([...(featuresById.get(r.addonId) || []), ...(r.featuresSnapshot || [])])
        return merged.has(featureKey)
    })
}

export function requireEntitlement(featureKey) {
    return async (req, res, next) => {
        try {
            if (req.user?.role === 'owner') return next() // владельцу всё доступно
            const ok = await hasEntitlement(req.user._id, featureKey)
            if (!ok) return res.status(402).json({ success: false, error: 'Требуется аддон', entitlement: featureKey })
            next()
        } catch (err) {
            res.status(500).json({ success: false, error: err.message })
        }
    }
}
