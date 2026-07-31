import TelegramBot from 'node-telegram-bot-api'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID

let bot = null

if (TOKEN && CHAT_ID) {
  bot = new TelegramBot(TOKEN, { polling: true })

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      '👋 Бот AI Viral Studio активирован.\n\nКоманды:\n/status — статус сервера'
    )
  })

  bot.onText(/\/status/, async (msg) => {
    try {
      const { default: User } = await import('../models/User.js')
      const { Payment } = await import('../models/index.js')
      const users = await User.countDocuments()
      const payments = await Payment.countDocuments({ status: 'succeeded' })
      bot.sendMessage(
        msg.chat.id,
        `📊 Статус AI Viral Studio\n🟢 Сервер: UP\n👥 Пользователей: ${users}\n💰 Успешных платежей: ${payments}\n⏰ ${new Date().toLocaleString('ru-RU')}`
      )
    } catch (e) {
      bot.sendMessage(msg.chat.id, '❌ Ошибка получения статуса')
    }
  })
}

export async function alertOwner(message) {
  if (!bot || !CHAT_ID) {
    console.warn('[ownerBot] Telegram bot not configured, skipping alert:', message)
    return
  }
  try {
    await bot.sendMessage(CHAT_ID, `🤖 <b>AI Viral Studio</b>\n\n${message}`, {
      parse_mode: 'HTML',
    })
  } catch (e) {
    console.error('[ownerBot] alert error:', e.message)
  }
}

export default bot
