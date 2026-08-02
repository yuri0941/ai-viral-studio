import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_OMEGA_BOT_TOKEN
let omegaBot = null

function createStubBot() {
  return {
    sendMessage: () => Promise.resolve(),
    on: () => {},
    onText: () => {},
    startPolling: () => {},
    stopPolling: () => {},
  }
}

function initOmegaBot() {
  if (!token) {
    console.log('⚠️ TELEGRAM_OMEGA_BOT_TOKEN not set, omega alerts bot disabled')
    omegaBot = createStubBot()
    return omegaBot
  }

  // [P16-HOTFIX] Singleton + deleteWebhook to avoid 409 Conflict on Render restart
  if (omegaBot && omegaBot.token === token) return omegaBot

  const bot = new TelegramBot(token, { polling: false })
  bot.token = token

  bot.on('polling_error', (err) => {
    if (err && err.message && err.message.includes('409')) {
      console.log('[omegaBot] Telegram 409 — another instance running, skipping')
      return
    }
    console.error('OmegaBot polling error:', err?.message || err)
  })

  bot.deleteWebhook({ drop_pending_updates: true })
    .then(() => {
      console.log('[omegaBot] webhook deleted, starting polling')
      bot.startPolling()
    })
    .catch((err) => {
      console.warn('[omegaBot] deleteWebhook failed:', err.message, '- starting polling anyway')
      bot.startPolling()
    })

  omegaBot = bot
  return omegaBot
}

// Initialize on module load if token is present
initOmegaBot()

export function getOmegaBot() {
  return omegaBot || initOmegaBot()
}

export function alertOmega(message) {
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID
  const bot = getOmegaBot()
  if (!chatId || !bot || typeof bot.sendMessage !== 'function') return
  try {
    bot.sendMessage(chatId, `🤖 OMEGA Alert:\n${message}`)
  } catch (e) {
    console.error('[omegaBot] alert failed:', e.message)
  }
}

export { omegaBot }
export default { alertOmega, getOmegaBot, omegaBot }
