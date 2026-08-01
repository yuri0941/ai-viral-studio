import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN
let bot

if (token) {
  const isDev = process.env.NODE_ENV !== 'production'
  bot = new TelegramBot(token, {
    polling: isDev,
    webHook: !isDev ? { port: false } : false,
  })
  global.ownerBot = bot

  // В production webhook (если есть RENDER_EXTERNAL_URL)
  if (!isDev && process.env.RENDER_EXTERNAL_URL) {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/bot${token}`
    bot.setWebhook(webhookUrl).catch(err => {
      console.log('Telegram webhook setup failed (non-critical):', err.message)
    })
  }

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
} else {
  console.warn('[ownerBot] TELEGRAM_BOT_TOKEN not set, bot disabled')
}

export const alertOwner = async (message) => {
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID
  if (!chatId || !bot) return
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' })
  } catch (e) {
    console.error('Telegram alert failed:', e.message)
  }
}

export default bot
