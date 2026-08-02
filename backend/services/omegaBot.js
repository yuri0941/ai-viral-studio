import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_OMEGA_BOT_TOKEN
let omegaBot

if (!token) {
  console.log('⚠️ TELEGRAM_OMEGA_BOT_TOKEN not set, omega alerts bot disabled')
  omegaBot = {
    sendMessage: () => Promise.resolve(),
    on: () => {},
    onText: () => {},
  }
} else {
  omegaBot = new TelegramBot(token, { polling: true })
  omegaBot.on('polling_error', (err) => console.error('OmegaBot polling error:', err.message))
}

export function alertOmega(message) {
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID
  if (!chatId || !omegaBot || typeof omegaBot.sendMessage !== 'function') return
  try {
    omegaBot.sendMessage(chatId, `🤖 OMEGA Alert:\n${message}`)
  } catch (e) {
    console.error('[omegaBot] alert failed:', e.message)
  }
}

export { omegaBot }
export default { alertOmega, omegaBot }
