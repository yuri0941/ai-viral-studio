import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_OMEGA_BOT_TOKEN

// [P16-FINAL] added: strict singleton to avoid duplicate polling / 409 conflict on Render hot-reload
// [P16-HOTFIX] use global so singleton survives hot-reload on Render
let instance = global.omegaBotInstance || null

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
    const msg = err && err.message ? err.message : String(err)
    if (msg.includes('409') || msg.includes('conflict')) {
      console.log('[omegaBot] Telegram 409/conflict — another instance running, ignoring')
      return
    }
    console.error('OmegaBot polling error:', msg)
  })

  bot.on('webhook_error', (err) => {
    console.error('[omegaBot] webhook error:', err?.message || err)
  })
}

export function getOmegaBot() {
  // [P16-HOTFIX-v2] global flag prevents duplicate polling / 409 conflict on Render hot-reload
  if (global.omegaBotStarted) {
    console.log('[omegaBot] Already started, skipping')
    return instance || createStubBot()
  }
  global.omegaBotStarted = true

  if (!token) {
    console.log('⚠️ TELEGRAM_OMEGA_BOT_TOKEN not set, omega alerts bot disabled')
    instance = createStubBot()
    return instance
  }

  instance = new TelegramBot(token, { polling: false })
  global.omegaBotInstance = instance
  attachHandlers(instance)

  // [P16-HOTFIX-v2] delete webhook + pause before polling to avoid 409 conflict
  ;(async () => {
    try {
      await instance.deleteWebhook({ drop_pending_updates: true })
      await new Promise(r => setTimeout(r, 1000))
      console.log('[omegaBot] webhook deleted, starting polling')
      instance.startPolling()
    } catch (err) {
      console.warn('[omegaBot] deleteWebhook failed:', err.message, '- starting polling anyway')
      await new Promise(r => setTimeout(r, 1000))
      instance.startPolling()
    }
  })()

  return instance
}

// [P16-FINAL] added: lazy init on first use instead of module-load init to prevent duplicate instances
const omegaBot = getOmegaBot()
export { omegaBot }
export default { alertOmega, getOmegaBot, omegaBot }

export async function alertOmega(message) {
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID
  const bot = getOmegaBot()
  if (!chatId || !bot || typeof bot.sendMessage !== 'function') return
  try {
    await bot.sendMessage(chatId, `🤖 OMEGA Alert:\n${message}`)
  } catch (e) {
    console.error('[omegaBot] alert failed:', e.message)
  }
}
