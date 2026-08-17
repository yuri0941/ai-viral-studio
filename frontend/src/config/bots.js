// [BOT-ROUTING-FIX] Единая точка правды для Telegram-username в UI.
// Vite заменит import.meta.env.VITE_* при сборке; fallback сохраняет локальную разработку.

const CLIENT_BOT_USERNAME = import.meta.env.VITE_CLIENT_BOT_USERNAME || 'aiviral_omega_bot'
const OWNER_BOT_USERNAME = import.meta.env.VITE_OWNER_BOT_USERNAME || 'aiviral_alerts_bot'
const CHANNEL_USERNAME = import.meta.env.VITE_TELEGRAM_CHANNEL_USERNAME || 'aiviralstudio'

function buildUrl(username, startParam) {
  const name = String(username || '').replace(/^@/, '')
  if (!name) return '#'
  const base = `https://t.me/${name}`
  return startParam ? `${base}?start=${encodeURIComponent(startParam)}` : base
}

export const CLIENT_BOT_URL = buildUrl(CLIENT_BOT_USERNAME)
export const OWNER_BOT_URL = buildUrl(OWNER_BOT_USERNAME)
export const CHANNEL_URL = buildUrl(CHANNEL_USERNAME)

export { CLIENT_BOT_USERNAME, OWNER_BOT_USERNAME, CHANNEL_USERNAME }

export function clientBotUrl(startParam) {
  return buildUrl(CLIENT_BOT_USERNAME, startParam)
}

export function ownerBotUrl(startParam) {
  return buildUrl(OWNER_BOT_USERNAME, startParam)
}
