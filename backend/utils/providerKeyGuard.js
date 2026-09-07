// [HOTFIX-FINAL-2 З3] Вывод мёртвого провайдер-ключа из ротации по факту 401/403.
// 1) мгновенный стоп в процессе (apiKeyCache = KEY_DISABLED-маркер, env-фолбэк тоже блокируется)
// 2) персистентно: ApiKey.isActive=false в БД (переживает рестарт, виден в кабинете)
// 3) алерт владельцу в TG — новый ключ добавляет только он
export async function disableProviderKey(provider, reason = '401') {
    try {
        global.apiKeyCache = global.apiKeyCache || {}
        global.apiKeyCache[provider] = '__disabled_in_cabinet__'

        const { default: ApiKey } = await import('../models/ApiKey.js')
        const doc = await ApiKey.findOne({ provider }).sort({ updatedAt: -1 })
        if (doc && doc.isActive !== false) {
            doc.isActive = false
            doc.status = 'invalid'
            doc.lastError = `auto-disabled: ${reason} @ ${new Date().toISOString()}`
            await doc.save()
        }
        console.warn(`[KEY-GUARD] provider=${provider} выведен из ротации (${reason})`)

        const { sendOwnerAlert } = await import('../services/ownerBot.js')
        await sendOwnerAlert(
            `🔑 Ключ <b>${provider}</b> отключён автоматически (${reason}).\nПровайдер выведен из ротации, живые провайдеры продолжают работу.\nНовый ключ — Кабинет → API Ключи.`,
            'warning'
        )
    } catch (e) {
        console.warn('[KEY-GUARD] disableProviderKey failed:', e.message)
    }
}

export default { disableProviderKey }
