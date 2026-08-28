// [security-hardening Б5-З2.1] Верификация Telegram webhook по X-Telegram-Bot-Api-Secret-Token.
// Секрет задаётся в env TELEGRAM_WEBHOOK_SECRET и передаётся в setWebhook(secret_token).
// Если env не задан — верификация выключена (обратная совместимость), warn один раз.
// Hot-reload из Б4 не ломается: botReloader передаёт тот же secret_token при переустановке.

let warnedMissing = false

export function getTgWebhookSecret() {
    const s = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
    if (!s && !warnedMissing) {
        warnedMissing = true
        console.warn('[TG-WEBHOOK] TELEGRAM_WEBHOOK_SECRET не задан — webhook-эндпоинты без верификации секрета')
    }
    return s || null
}

// Express middleware: 403 для чужих запросов, если секрет настроен
export function verifyTgWebhookSecret(req, res, next) {
    const secret = getTgWebhookSecret()
    if (!secret) return next() // секрет не настроен — не ломаем существующий деплой
    const header = req.headers['x-telegram-bot-api-secret-token']
    if (header !== secret) {
        console.warn(`[TG-WEBHOOK] 403: неверный/отсутствующий secret_token (ip=${req.ip})`)
        return res.sendStatus(403)
    }
    next()
}
