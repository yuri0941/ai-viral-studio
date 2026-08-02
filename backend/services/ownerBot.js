import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN
let ownerBot

if (!token) {
  console.log('⚠️ TELEGRAM_BOT_TOKEN not set, owner bot disabled')
  // [P16] stub so imports don't break
  ownerBot = {
    sendMessage: () => Promise.resolve(),
    onText: () => {},
    on: () => {},
    processUpdate: () => {},
  }
} else {
  // [P16] Always use polling (Render + webhook removed earlier caused conflicts)
  const bot = new TelegramBot(token, { polling: true })

  bot.on('polling_error', (err) => console.error('OwnerBot polling error:', err.message))

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

  ownerBot = bot
}

global.ownerBot = ownerBot

export { ownerBot }
export default ownerBot

export const alertOwner = async (message) => {
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID
  const bot = global.ownerBot
  if (!chatId || !bot || typeof bot.sendMessage !== 'function') return
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' })
  } catch (e) {
    console.error('Telegram alert failed:', e.message)
  }
}
