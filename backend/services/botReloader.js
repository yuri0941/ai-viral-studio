// [OWNER-OMEGA] Hot-reload токенов TG-ботов из кабинета (ApiKeysTab) без деплоя.
// node-telegram-bot-api использует this.token на КАЖДЫЙ запрос (_buildURL), поэтому подмена
// instance.token безопасна и сохраняет все зарегистрированные хендлеры; затем webhook
// переустанавливается корректной последовательностью deleteWebhook → setWebhook.
// env остаётся fallback: если ключ в кабинете не задан, боты стартуют на env (config/bots.js).

import { getTgWebhookSecret } from '../utils/tgWebhookSecret.js' // [security-hardening Б5-З2.1]
import { isProdWebhookHost, getBotBaseUrl } from '../utils/tgWebhookGuard.js' // [TG-ASK-OWNER ЗАДАЧА 0]

const KINDS = {
    telegram_bot: { webhook: '/webhook/omega', label: 'client' },
    telegram_owner_bot: { webhook: '/webhook/owner', label: 'owner' },
}

function instanceFor(kind) {
    return kind === 'telegram_owner_bot'
        ? (global.ownerBotInstance || global.ownerBot)
        : (global.omegaBotInstance || global.omegaBot)
}

export async function reloadBotToken(kind, newToken) {
    const cfg = KINDS[kind]
    if (!cfg) return { ok: false, reason: 'unknown_kind' }
    const token = String(newToken || '').trim()
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) return { ok: false, reason: 'bad_format', message: 'Токен выглядит как 123456:ABC-DEF... из @BotFather' }

    const instance = instanceFor(kind)
    if (!instance || typeof instance.setWebhook !== 'function' || instance.__isStub) {
        return { ok: false, reason: 'bot_not_running', message: 'Бот не запущен (нет стартового токена в env) — сохраните ключ и перезапустите сервис один раз.' }
    }

    // Проверяем токен ДО переключения — старый бот не должен пострадать от опечатки
    const me = await fetch(`https://api.telegram.org/bot${token}/getMe`)
        .then(r => r.json())
        .catch(e => ({ ok: false, description: e.message }))
    if (!me.ok) return { ok: false, reason: 'invalid_token', message: `Telegram отклонил токен: ${me.description || 'unauthorized'}` }

    instance.token = token
    // [TG-ASK-OWNER ЗАДАЧА 0] не прод-хост webhook не переустанавливает — прод-бот продолжает работать
    if (!isProdWebhookHost()) {
        console.log(`[BOT-RELOAD] ${kind}: не прод-хост — webhook не переустанавливаю (токен применён локально)`)
        return { ok: true, webhookSkipped: true, botUsername: me.result?.username, message: `Бот @${me.result?.username} переподключён (webhook не трогали: не прод-хост)` }
    }
    const url = `${getBotBaseUrl()}${cfg.webhook}`
    try {
        await instance.deleteWebhook({ drop_pending_updates: false })
        // [security-hardening Б5-З2.1] переустановка webhook с тем же secret_token, иначе приём начнёт отдавать 403
        const secret = getTgWebhookSecret()
        await instance.setWebhook(url, secret ? { secret_token: secret } : {})
    } catch (e) {
        console.error(`[BOT-RELOAD] ${kind}: webhook failed:`, e.message)
        return { ok: false, reason: 'webhook_failed', message: `Токен применён, но webhook не установлен: ${e.message}` }
    }
    console.log(`[BOT-RELOAD] ${kind} (${cfg.label}): webhook переустановлен на ${url} (@${me.result?.username})`)
    return { ok: true, url, botUsername: me.result?.username, message: `Бот @${me.result?.username} переподключён (webhook обновлён)` }
}
