import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN
const isProduction = process.env.NODE_ENV === 'production'
let bot

if (isProduction && process.env.RENDER_EXTERNAL_URL) {
  bot = new TelegramBot(token, { webHook: { port: process.env.PORT || 10000 } })
  bot.setWebHook(`${process.env.RENDER_EXTERNAL_URL}/bot${token}`)
} else {
  bot = new TelegramBot(token, { polling: true })
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

export default bot
