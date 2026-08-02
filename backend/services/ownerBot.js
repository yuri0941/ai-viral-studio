import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN
let ownerBot = null

function createStubBot() {
  return {
    sendMessage: () => Promise.resolve(),
    onText: () => {},
    on: () => {},
    processUpdate: () => {},
    startPolling: () => {},
    stopPolling: () => {},
  }
}

function initOwnerBot() {
  if (!token) {
    console.log('⚠️ TELEGRAM_BOT_TOKEN not set, owner bot disabled')
    ownerBot = createStubBot()
    return ownerBot
  }

  // [P16-HOTFIX] Singleton + deleteWebhook to avoid 409 Conflict on Render restart
  if (ownerBot && ownerBot.token === token) return ownerBot

  const bot = new TelegramBot(token, { polling: false })
  bot.token = token

  bot.on('polling_error', (err) => {
    if (err && err.message && err.message.includes('409')) {
      console.log('[ownerBot] Telegram 409 — another instance running, skipping')
      return
    }
    console.error('OwnerBot polling error:', err?.message || err)
  })

  bot.onText(/\/start/, (msg) => bot.sendMessage(msg.chat.id, 'Бот активирован. Команды: /status'))

  bot.onText(/\/status/, async (msg) => {
    try {
      const { default: User } = await import('../../models/User.js')
      const { Payment } = await import('../../models/index.js')
      const users = await User.countDocuments()
      const payments = await Payment.countDocuments({ status: 'succeeded' })
      bot.sendMessage(msg.chat.id, `🟢 UP\n👥 ${users}\n💰 ${payments}\n⏰ ${new Date().toLocaleString('ru-RU')}`)
    } catch (e) {
      bot.sendMessage(msg.chat.id, '❌ Ошибка получения статуса')
    }
  })

  bot.deleteWebhook({ drop_pending_updates: true })
    .then(() => {
      console.log('[ownerBot] webhook deleted, starting polling')
      bot.startPolling()
    })
    .catch((err) => {
      console.warn('[ownerBot] deleteWebhook failed:', err.message, '- starting polling anyway')
      bot.startPolling()
    })

  ownerBot = bot
  global.ownerBot = bot
  return ownerBot
}

// Initialize on module load if token is present
initOwnerBot()

export function getOwnerBot() {
  return ownerBot || initOwnerBot()
}

export { ownerBot }
export default ownerBot

export const alertOwner = async (message) => {
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID
  const bot = getOwnerBot()
  if (!chatId || !bot || typeof bot.sendMessage !== 'function') return
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' })
  } catch (e) {
    console.error('Telegram alert failed:', e.message)
  }
}
