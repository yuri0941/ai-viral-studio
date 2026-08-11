import User from '../models/User.js'

/**
 * [v9.9.19.15.2] Единый источник правды о подключённых соцсетях.
 * Читает ТОЛЬКО user.socials (+ access tokens). Legacy Integration-коллекция
 * используется только старыми legacy-платформами (publishers/index.js).
 *
 * @param {string|object} userOrId — User._id или уже загруженный user-документ
 * @returns {Promise<{user: object, vk: object, telegram: object}>}
 */
export async function getConnectedSocials(userOrId) {
  let user = userOrId
  if (!user || typeof user === 'string' || user instanceof String || user._bsontype) {
    user = await User.findById(userOrId)
      .select('+vkToken +vkRefreshToken socials.vk telegramBotToken telegramChatId telegramId preferences.language')
      .lean()
  }

  const vkEnabled = !!user?.socials?.vk?.enabled
  const vkToken = !!user?.vkToken
  const vkUserId = !!(user?.vkUserId || user?.socials?.vk?.userId)
  const vkNeedsScope = user?.socials?.vk?.needsScope ?? true

  const vk = {
    connected: vkEnabled && vkToken && vkUserId && !vkNeedsScope,
    enabled: vkEnabled,
    hasToken: vkToken,
    hasUserId: vkUserId,
    needsScope: vkNeedsScope,
    reason: !vkEnabled || !vkUserId
      ? 'not_connected'
      : !vkToken
        ? 'no_token'
        : vkNeedsScope
          ? 'needs_scope'
          : 'ok',
  }

  const tgToken = !!user?.telegramBotToken
  const tgChatId = !!(user?.telegramChatId || user?.telegramId)

  const telegram = {
    connected: tgToken && tgChatId,
    hasToken: tgToken,
    hasChatId: tgChatId,
    chatId: user?.telegramChatId || user?.telegramId || null,
    reason: !tgToken
      ? 'not_connected'
      : !tgChatId
        ? 'no_chat'
        : 'ok',
  }

  return { user, vk, telegram, language: user?.preferences?.language || 'ru' }
}

const REASON_TEXT = {
  ru: {
    not_connected: 'не подключён (Соцсети → подключить)',
    no_token: 'токен не найден — переподключите в Соцсетях',
    needs_scope: 'требуется разрешение на публикацию (Соцсети → VK → Разрешить)',
    no_chat: 'не указан chat ID Telegram',
    ok: 'подключён',
  },
  en: {
    not_connected: 'not connected (Socials → connect)',
    no_token: 'token missing — reconnect in Socials',
    needs_scope: 'publication permission required (Socials → VK → Allow)',
    no_chat: 'Telegram chat ID is missing',
    ok: 'connected',
  },
}

/**
 * Возвращает человекочитаемую причину по коду.
 */
export function getPlatformReasonText(platform, reasonCode, lang = 'ru') {
  const dict = REASON_TEXT[lang] || REASON_TEXT.ru
  return dict[reasonCode] || dict.not_connected
}

/**
 * Формирует однострочный summary причин по платформам для алерта/лога.
 */
export function formatPlatformReasons(status, lang = 'ru') {
  const parts = []
  if (status.vk) parts.push(`VK — ${getPlatformReasonText('vk', status.vk.reason, lang)}`)
  if (status.telegram) parts.push(`Telegram — ${getPlatformReasonText('telegram', status.telegram.reason, lang)}`)
  return parts.join('; ') || (lang === 'ru' ? 'нет данных о платформах' : 'no platform data')
}
