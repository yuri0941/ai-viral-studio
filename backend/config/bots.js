import './env.js'

// [BOT-ROUTING-FIX] Единая точка правды для Telegram-ботов и канала.
// Все username-ы без ведущего @; ссылки собираются через helpers.

export const CLIENT_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.TELEGRAM_OMEGA_BOT_TOKEN ||
  ''

export const OWNER_BOT_TOKEN =
  process.env.TELEGRAM_OWNER_BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN ||
  ''

export const CLIENT_BOT_USERNAME =
  process.env.CLIENT_BOT_USERNAME ||
  process.env.TELEGRAM_BOT_USERNAME ||
  'aiviral_alerts_bot'

export const OWNER_BOT_USERNAME =
  process.env.OWNER_BOT_USERNAME ||
  process.env.TELEGRAM_OWNER_BOT_USERNAME ||
  'omega_aiviral_bot'

export const CHANNEL_USERNAME =
  process.env.TELEGRAM_CHANNEL_USERNAME ||
  process.env.TELEGRAM_CHANNEL ||
  'aiviralstudio'

export const OWNER_TELEGRAM_USERNAME =
  process.env.OWNER_TELEGRAM_USERNAME ||
  process.env.TELEGRAM_OWNER_USERNAME ||
  'Tvinki013'

export const OWNER_NAME =
  process.env.OWNER_NAME || 'Юрий'

function buildBotUrl(username, deepLink) {
  if (!username) return '#'
  const base = `https://t.me/${username.replace(/^@/, '')}`
  if (!deepLink) return base
  return `${base}?start=${encodeURIComponent(deepLink)}`
}

export function clientBotUrl(deepLink) {
  return buildBotUrl(CLIENT_BOT_USERNAME, deepLink)
}

export function ownerBotUrl(deepLink) {
  return buildBotUrl(OWNER_BOT_USERNAME, deepLink)
}

export function channelUrl() {
  return buildBotUrl(CHANNEL_USERNAME)
}
