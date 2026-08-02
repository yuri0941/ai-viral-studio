import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_OMEGA_BOT_TOKEN

// [P16-FINAL] added: strict singleton to avoid duplicate polling / 409 conflict on Render hot-reload
let instance = null

function createStubBot() {
  return {
    sendMessage: () => Promise.resolve(),
    on: () => {},
    onText: () => {},
    startPolling: () => {},
    stopPolling: () => {},
    deleteWebhook: () => Promise.resolve(),
  }
}

function attachHandlers(bot) {
  bot.on('polling_error', (err) => {
    if (err && err.message && err.message.includes('409')) {
      console.log('[omegaBot] Telegram 409 — another instance running, skipping')
      return
    }
    console.error('OmegaBot polling error:', err?.message || err)
  })
}

export function getOmegaBot() {
  if (!instance) {
    if (!token) {
      console.log('⚠️ TELEGRAM_OMEGA_BOT_TOKEN not set, omega alerts bot disabled')
      instance = createStubBot()
      return instance
    }

    instance = new TelegramBot(token, { polling: false })
    attachHandlers(instance)

    instance.deleteWebhook({ drop_pending_updates: true })
      .then(() => {
        console.log('[omegaBot] webhook deleted, starting polling')
        instance.startPolling()
      })
      .catch((err) => {
        console.warn('[omegaBot] deleteWebhook failed:', err.message, '- starting polling anyway')
        instance.startPolling()
      })
  }
  return instance
}

// [P16-FINAL] added: lazy init on first use instead of module-load init to prevent duplicate instances
const omegaBot = getOmegaBot()
export { omegaBot }
export default { alertOmega, getOmegaBot, omegaBot }

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
