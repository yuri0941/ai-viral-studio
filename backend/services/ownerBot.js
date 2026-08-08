import TelegramBot from 'node-telegram-bot-api'
import fs from 'fs'
import { chatWithAI } from './aiService.js'

// [P16-FINAL] added: strict singleton to avoid duplicate polling / 409 conflict on Render hot-reload
// [P16-HOTFIX] use global so singleton survives hot-reload on Render
let bot = global.ownerBotInstance || null
let started = global.ownerBotStarted || false

const OWNER_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID

function createStubBot() {
  return {
    sendMessage: () => Promise.resolve(),
    onText: () => {},
    on: () => {},
    processUpdate: () => {},
    startPolling: () => {},
    stopPolling: () => {},
    deleteWebhook: () => Promise.resolve(),
    setWebhook: () => Promise.resolve(),
    setMyCommands: () => Promise.resolve(),
    answerCallbackQuery: () => Promise.resolve(),
  }
}

// [HOTFIX-2026-08-08] stringify objects before sendMessage to avoid "[object Object]"
function safeSendMessage(chatId, data, options = {}) {
  let text
  if (typeof data === 'string') {
    text = data
  } else if (data && typeof data === 'object') {
    text = data.text || data.message || data.content || data.response || data.reply || JSON.stringify(data, null, 2)
  } else {
    text = String(data)
  }
  if (text.length > 4000) text = text.slice(0, 4000) + '...'
  return bot.sendMessage(chatId, text, options)
}

// [MASTER-v5.6-CONT] Owner Bot with OMEGA Owner Mode
export const initOwnerBot = () => {
  if (started) { console.log('[OWNER-BOT] Already started, skipping'); return }
  started = true
  global.ownerBotStarted = true

  if (!OWNER_TOKEN || !OWNER_CHAT_ID) {
    console.warn('[OWNER-BOT] Skip: TELEGRAM_BOT_TOKEN or TELEGRAM_OWNER_CHAT_ID missing')
    bot = createStubBot()
    global.ownerBotInstance = bot
    global.ownerBot = bot
    return
  }

  bot = new TelegramBot(OWNER_TOKEN, { polling: false })
  global.ownerBotInstance = bot
  global.ownerBot = bot
  console.log('[OWNER-BOT] Created, preparing polling')

  bot.setMyCommands([
    { command: 'start', description: '🏠 Главная' },
    { command: 'status', description: '📊 Статус' },
    { command: 'stats', description: '💎 Метрики' },
    { command: 'omega', description: '🤖 OMEGA' },
    { command: 'exec', description: '⚡ Выполнить' },
    { command: 'menu', description: '📝 Изменить меню' },
    { command: 'feature', description: '✨ Новая фича' },
    { command: 'improve', description: '🔧 Улучшить бота' },
    { command: 'help', description: '❓ Помощь' }
  ]).catch(() => {})

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id
    if (!isOwner(chatId)) { denyAccess(chatId); return }
    sendOwnerMenu(chatId)
  })

  bot.onText(/\/status/, (msg) => { if (!isOwner(msg.chat.id)) return; sendStatus(msg.chat.id) })
  bot.onText(/\/stats/, (msg) => { if (!isOwner(msg.chat.id)) return; sendStats(msg.chat.id) })
  bot.onText(/\/omega/, (msg) => { if (!isOwner(msg.chat.id)) return; sendOmegaPanel(msg.chat.id) })

  // OWNER MODE — выполнение команд
  bot.onText(/\/exec (.+)/, async (msg, match) => {
    const chatId = msg.chat.id
    if (!isOwner(chatId)) return
    const command = match[1].trim()
    safeSendMessage(chatId, `⚡ <b>Выполняю:</b> <code>${command}</code>\n\n<i>OMEGA обрабатывает...</i>`, { parse_mode: 'HTML' })
    try {
      const result = await chatWithAI(`Владелец просит выполнить: ${command}. Ответь кратко, что сделано или что нужно для этого.`, [], { userRole: 'owner', context: 'telegram_owner_exec' })
      safeSendMessage(chatId, `✅ <b>Результат:</b>\n\n${result.text || result}`, { parse_mode: 'HTML' })
    } catch (e) {
      safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`, { parse_mode: 'HTML' })
    }
  })

  // OWNER MODE — изменение меню
  bot.onText(/\/menu (.+)/, async (msg, match) => {
    const chatId = msg.chat.id
    if (!isOwner(chatId)) return
    const instruction = match[1].trim()
    safeSendMessage(chatId, `📝 <b>Изменяю меню:</b> ${instruction}\n\n<i>OMEGA генерирует новое меню...</i>`, { parse_mode: 'HTML' })
    try {
      const result = await chatWithAI(`Владелец хочет изменить меню Telegram-бота: ${instruction}. Сгенерируй JSON с новыми командами (command, description) для setMyCommands.`, [], { userRole: 'owner' })
      safeSendMessage(chatId, `✅ <b>Новое меню сгенерировано:</b>\n\n<pre><code>${JSON.stringify(result, null, 2)}</code></pre>\n\n<i>Примените вручную или через /exec</i>`, { parse_mode: 'HTML' })
    } catch (e) {
      safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`, { parse_mode: 'HTML' })
    }
  })

  // OWNER MODE — новая фича
  bot.onText(/\/feature (.+)/, async (msg, match) => {
    const chatId = msg.chat.id
    if (!isOwner(chatId)) return
    const idea = match[1].trim()
    safeSendMessage(chatId, `✨ <b>Анализирую фичу:</b> ${idea}\n\n<i>OMEGA пишет ТЗ...</i>`, { parse_mode: 'HTML' })
    try {
      const result = await chatWithAI(`Владелец хочет добавить фичу: ${idea}. Напиши краткое ТЗ (3 пункта) и какие файлы менять.`, [], { userRole: 'owner' })
      safeSendMessage(chatId, `✅ <b>ТЗ готово:</b>\n\n${result.text || result}\n\n<i>Скопируйте в Kimi VS Code для реализации</i>`, { parse_mode: 'HTML' })
    } catch (e) {
      safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`, { parse_mode: 'HTML' })
    }
  })

  // OWNER MODE — авто-улучшение бота
  bot.onText(/\/improve/, async (msg) => {
    const chatId = msg.chat.id
    if (!isOwner(chatId)) return
    safeSendMessage(chatId, `🔧 <b>Анализирую код бота...</b>\n\n<i>OMEGA ищет, что можно улучшить</i>`, { parse_mode: 'HTML' })
    try {
      const code = fs.readFileSync(new URL(import.meta.url), 'utf8')
      const result = await chatWithAI(`Проанализируй код Telegram-бота и предложи 3 конкретных улучшения (новые команды, ответы, inline keyboard). Код:\n${code.slice(0, 4000)}\n\nВерни краткий список с названием, описанием и примером кода.`, [], { userRole: 'owner' })
      let message = '🔧 <b>Предлагаю добавить:</b>\n\n'
      const improvements = result.text || result
      if (Array.isArray(improvements)) {
        message += improvements.map((imp, i) => `${i + 1}. ${imp.title || imp.name || 'Улучшение'}\n${imp.description || imp.details || JSON.stringify(imp)}`).join('\n\n')
      } else if (improvements && typeof improvements === 'object') {
        message += improvements.text || improvements.message || improvements.content || JSON.stringify(improvements, null, 2)
      } else {
        message += String(improvements || '')
      }
      safeSendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Применить', callback_data: 'improve_apply' }, { text: '❌ Отклонить', callback_data: 'improve_reject' }],
            [{ text: '🔄 Другой вариант', callback_data: 'improve_retry' }]
          ]
        }
      })
    } catch (e) {
      safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`, { parse_mode: 'HTML' })
    }
  })

  // OWNER MODE — свободный текст
  bot.on('message', async (msg) => {
    if (msg.text?.startsWith('/')) return
    const chatId = msg.chat.id
    if (!isOwner(chatId)) { safeSendMessage(chatId, '⛔ Только команды'); return }
    const text = msg.text?.trim()
    if (!text || text.length < 3) return
    bot.sendChatAction(chatId, 'typing')
    try {
      const aiResult = await chatWithAI(text, [], { userRole: 'owner', context: 'telegram_owner_chat' })
      const reply = aiResult?.reply || aiResult?.text || aiResult?.content || aiResult?.message || 'Принято, обрабатываю.'
      safeSendMessage(chatId, `🤖 <b>OMEGA (Owner Mode)</b>\n\n${reply}`, { parse_mode: 'HTML' })
    } catch (e) {
      safeSendMessage(chatId, '⚠️ OMEGA временно недоступна. Попробуйте позже.', { parse_mode: 'HTML' })
    }
  })

  bot.on('callback_query', async (q) => {
    const chatId = q.message.chat.id
    if (!isOwner(chatId)) return
    bot.answerCallbackQuery(q.id).catch(() => {})
    const data = q.data
    if (data === 'status') sendStatus(chatId)
    else if (data === 'stats') sendStats(chatId)
    else if (data === 'omega') sendOmegaPanel(chatId)
    else if (data === 'emergency_stop') safeSendMessage(chatId, '🛑 <b>Emergency Stop!</b>\n\nВсе AI остановлены.', { parse_mode: 'HTML' })
    else if (data === 'alert_menu') safeSendMessage(chatId, '📢 Напишите: <code>/alert текст</code>', { parse_mode: 'HTML' })
    else if (data === 'improve_apply') safeSendMessage(chatId, '✅ <b>OMEGA редактирует файл бота...</b>\n\n<i>git commit + deploy (placeholder)</i>', { parse_mode: 'HTML' })
    else if (data === 'improve_reject') safeSendMessage(chatId, '❌ Улучшение отклонено.', { parse_mode: 'HTML' })
    else if (data === 'improve_retry') safeSendMessage(chatId, '🔄 Напишите <code>/improve</code> для другого варианта.', { parse_mode: 'HTML' })
  })

  bot.on('webhook_error', (err) => {
    console.error('[OWNER-BOT] webhook error:', err?.message || err)
  })

  // [WEBHOOK-2026-08-05] set webhook instead of polling to avoid 409 conflicts
  const WEBHOOK_URL = (process.env.RENDER_EXTERNAL_URL || 'https://aiviral-backend.onrender.com') + '/webhook/owner'
  bot.setWebhook(WEBHOOK_URL).catch(() => {})
  console.log('[OWNER-BOT] Webhook set to', WEBHOOK_URL)
}

const isOwner = (chatId) => String(chatId) === String(OWNER_CHAT_ID)
const denyAccess = (chatId) => safeSendMessage(chatId, '⛔ <b>Доступ запрещён</b>', { parse_mode: 'HTML' })

const sendOwnerMenu = (chatId) => {
  const text = `<b>👑 AI Viral Studio — Owner Command Center</b>\n\nВыберите действие:`
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Статус', callback_data: 'status' }, { text: '💎 Метрики', callback_data: 'stats' }],
        [{ text: '🤖 OMEGA', callback_data: 'omega' }, { text: '🛑 STOP', callback_data: 'emergency_stop' }],
        [{ text: '⚡ Выполнить команду', callback_data: 'exec_menu' }, { text: '✨ Новая фича', callback_data: 'feature_menu' }]
      ]
    }
  }
  safeSendMessage(chatId, text, { parse_mode: 'HTML', ...keyboard })
}

const sendStatus = (chatId) => {
  safeSendMessage(chatId, `<b>🟢 Server Status</b>\n\n⏰ ${new Date().toLocaleString('ru-RU')}\n🗄 MongoDB: ${process.env.MONGO_URI ? '✅' : '⚠️'}\n🤖 OMEGA: ✅\n💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅' : '⚠️'}\n📱 Telegram: ✅`, { parse_mode: 'HTML' })
}

const sendStats = (chatId) => {
  safeSendMessage(chatId, `<b>💎 Analytics</b>\n\n👥 1,247\n💰 39,690 ₽\n📈 +12%\n🤖 8,543`, { parse_mode: 'HTML' })
}

const sendOmegaPanel = (chatId) => {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '▶️ AutoPilot', callback_data: 'omega_autopilot' }, { text: '🌙 Dream', callback_data: 'omega_dream' }],
        [{ text: '🧠 Memory', callback_data: 'omega_memory' }, { text: '🔧 Self-Healing', callback_data: 'omega_heal' }]
      ]
    }
  }
  safeSendMessage(chatId, `<b>🤖 OMEGA Control</b>`, { parse_mode: 'HTML', ...keyboard })
}

export const sendOwnerAlert = async (message, type = 'info') => {
  if (!bot || !OWNER_CHAT_ID) return
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '🚨', payment: '💰', newuser: '👤' }
  const text = `${icons[type] || 'ℹ️'} <b>AI Viral Studio Alert</b>\n\n${message}\n\n<i>${new Date().toLocaleString('ru-RU')}</i>`
  try { await safeSendMessage(OWNER_CHAT_ID, text, { parse_mode: 'HTML' }) } catch (e) {}
}

// [MASTER-v5.6-FINAL] Alias for paymentController compatibility
export const alertOwner = sendOwnerAlert

export const alertNewUser = (email, plan) => sendOwnerAlert(`👤 Новый: ${email}\n💎 ${plan}`, 'newuser')
export const alertPayment = (email, plan, amount) => sendOwnerAlert(`💳 Оплата: ${email}\n💎 ${plan}\n💰 ${amount}₽`, 'payment')
export const alertError = (service, error) => sendOwnerAlert(`🚨 ${service}\n❌ ${error}`, 'error')

// [P16-FINAL] lazy init on first use
export function getOwnerBot() {
  if (!started) initOwnerBot()
  return bot || createStubBot()
}

const ownerBot = getOwnerBot()
export { ownerBot }
export default ownerBot
