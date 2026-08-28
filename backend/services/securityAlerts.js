// [security-hardening Б5-З6] Критичные события → TG-алерт владельцу через owner-бота.
// Кулдаун 10 минут на тип события, чтобы волна ошибок не спамила.
const COOLDOWN_MS = 10 * 60 * 1000
const lastSent = new Map()

const TYPES = {
    '5xx_wave': '🌊 Волна 5xx на backend',
    'payment_webhook': '💳 Сбой платёжного вебхука',
    'guard_breach': '🛡 Подозрение на обход guard (prod)',
    'webhook_forgery': '🚨 Подделка webhook',
}

export async function alertCritical(type, details = '') {
    const now = Date.now()
    const last = lastSent.get(type) || 0
    if (now - last < COOLDOWN_MS) return false
    lastSent.set(type, now)
    try {
        const { alertOwner } = await import('./ownerBot.js')
        await alertOwner?.(
            `🚨 <b>${TYPES[type] || type}</b>\n${String(details).slice(0, 300)}\n<i>Кулдаун 10 мин на этот тип события.</i>`,
            'security'
        )
        return true
    } catch (err) {
        console.warn('[securityAlerts] TG-алерт не доставлен:', err.message)
        return false
    }
}

// Счётчик 5xx: волна = >10 ошибок за 60 сек → один алерт (с кулдауном)
const errWindow = []
export function track5xx(path, status) {
    const now = Date.now()
    errWindow.push(now)
    while (errWindow.length && now - errWindow[0] > 60 * 1000) errWindow.shift()
    if (errWindow.length === 11) {
        alertCritical('5xx_wave', `>10 ответов 5xx за минуту. Последний: ${status} ${path}`)
    }
}
