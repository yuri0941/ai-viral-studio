import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN

// [P16-FINAL] added: strict singleton to avoid duplicate polling / 409 conflict on Render hot-reload
// [P16-HOTFIX] use global so singleton survives hot-reload on Render
let instance = global.ownerBotInstance || null

function createStubBot() {
  return {
    sendMessage: () => Promise.resolve(),
    onText: () => {},
    on: () => {},
    processUpdate: () => {},
    startPolling: () => {},
    stopPolling: () => {},
    deleteWebhook: () => Promise.resolve(),
  }
}

function attachHandlers(bot) {
  bot.on('polling_error', (err) => {
    const msg = err && err.message ? err.message : String(err)
    if (msg.includes('409') || msg.includes('conflict')) {
      console.log('[ownerBot] Telegram 409/conflict — another instance running, ignoring')
      return
    }
    console.error('OwnerBot polling error:', msg)
  })

  bot.on('webhook_error', (err) => {
    console.error('[ownerBot] webhook error:', err?.message || err)
  })

  bot.onText(/\/start/, (msg) => bot.sendMessage(msg.chat.id, 'Бот активирован. Команды: /status'))

  bot.onText(/\/status/, async (msg) => {
    try {
      // [P16-HOTFIX] fixed import paths relative to backend/services
      const { default: User } = await import('../models/User.js')
      const { Payment } = await import('../models/index.js')
      const users = await User.countDocuments()
      const payments = await Payment.countDocuments({ status: 'succeeded' })
      bot.sendMessage(msg.chat.id, `🟢 UP\n👥 ${users}\n💰 ${payments}\n⏰ ${new Date().toLocaleString('ru-RU')}`)
    } catch (e) {
      bot.sendMessage(msg.chat.id, '❌ Ошибка получения статуса')
    }
  })
}

export function getOwnerBot() {
  // [P16-HOTFIX-v2] global flag prevents duplicate polling / 409 conflict on Render hot-reload
  if (global.ownerBotStarted) {
    console.log('[ownerBot] Already started, skipping')
    return instance || createStubBot()
  }
  global.ownerBotStarted = true

  if (!token) {
    console.log('⚠️ TELEGRAM_BOT_TOKEN not set, owner bot disabled')
    instance = createStubBot()
    return instance
  }

  instance = new TelegramBot(token, { polling: false })
  global.ownerBotInstance = instance
  attachHandlers(instance)

  // [P16-HOTFIX-v2] delete webhook + pause before polling to avoid 409 conflict
  ;(async () => {
    try {
      await instance.deleteWebhook({ drop_pending_updates: true })
      await new Promise(r => setTimeout(r, 1000))
      console.log('[ownerBot] webhook deleted, starting polling')
      instance.startPolling()
    } catch (err) {
      console.warn('[ownerBot] deleteWebhook failed:', err.message, '- starting polling anyway')
      await new Promise(r => setTimeout(r, 1000))
      instance.startPolling()
    }
  })()

  return instance
}

// [P16-FINAL] added: lazy init on first use instead of module-load init to prevent duplicate instances
const ownerBot = getOwnerBot()
export { ownerBot }
export default ownerBot

export const alertOwner = async (message) => {
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID
  const bot = getOwnerBot()
  if (!chatId || !bot || typeof bot.sendMessage !== 'function') return
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' })
  } catch (e) {
    console.error('[ownerBot] alert failed:', e.message)
  }
}
