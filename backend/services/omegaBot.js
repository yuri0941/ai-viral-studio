import TelegramBot from 'node-telegram-bot-api'
import { chatWithAI } from './aiService.js'

// [P16-FINAL] singleton to avoid duplicate polling / 409 conflict
let bot = global.omegaBotInstance || null
let started = global.omegaBotStarted || false

const OMEGA_TOKEN = process.env.TELEGRAM_OMEGA_BOT_TOKEN
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID

function createStubBot() {
  return {
    sendMessage: () => Promise.resolve(),
    on: () => {},
    onText: () => {},
    startPolling: () => {},
    stopPolling: () => {},
    deleteWebhook: () => Promise.resolve(),
    setMyCommands: () => Promise.resolve(),
    answerCallbackQuery: () => Promise.resolve(),
  }
}

// [MASTER-v5.6-CONT] OMEGA Bot with Owner Mode & Auto-Features
export const initOmegaBot = () => {
  if (started) { console.log('[OMEGA-BOT] Already started, skipping'); return }
  started = true
  global.omegaBotStarted = true

  if (!OMEGA_TOKEN) {
    console.warn('[OMEGA-BOT] Skip: TELEGRAM_OMEGA_BOT_TOKEN missing')
    bot = createStubBot()
    global.omegaBotInstance = bot
    return
  }

  bot = new TelegramBot(OMEGA_TOKEN, { polling: false })
  global.omegaBotInstance = bot
  console.log('[OMEGA-BOT] Created, preparing polling')

  updateBotMenu()

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id
    const name = msg.from.first_name || 'друг'
    const isOwner = String(chatId) === String(OWNER_CHAT_ID)

    const welcome = isOwner
      ? `<b>👋 Привет, Босс!</b>\n\nЯ <b>OMEGA</b> — ваш AI-ассистент.\n\n<b>Owner Mode активирован.</b>\nПишите свободно — я выполню любую задачу.\n\n<b>Команды:</b>\n/exec [задача] — выполнить\n/feature [идея] — новая фича\n/menu [изменение] — изменить меню\n/help — справка`
      : `<b>👋 Привет, ${name}!</b>\n\nЯ <b>OMEGA</b> — AI-ассистент AI Viral Studio 🤖\n\n<b>Я умею:</b>\n• ✍️ Создавать посты\n• 🔥 Генерировать хуки\n• 🔍 Анализировать конкурентов\n• 📅 Составлять контент-план\n• 🎨 Генерировать обложки\n\n<i>Выберите действие или просто напишите!</i>`

    const keyboard = isOwner ? {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚡ Выполнить задачу', callback_data: 'owner_exec' }, { text: '✨ Новая фича', callback_data: 'owner_feature' }],
          [{ text: '🤖 OMEGA Core', callback_data: 'owner_omega' }, { text: '📊 Статус', callback_data: 'owner_status' }]
        ]
      }
    } : {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✍️ Создать пост', callback_data: 'create_post' }, { text: '🔥 Хук', callback_data: 'generate_hook' }],
          [{ text: '🔍 Анализ', callback_data: 'analyze' }, { text: '📅 План', callback_data: 'content_plan' }],
          [{ text: '🎨 Обложка', callback_data: 'ai_cover' }, { text: '💬 Свободно', callback_data: 'free_chat' }]
        ]
      }
    }

    bot.sendMessage(chatId, welcome, { parse_mode: 'HTML', ...keyboard })
  })

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id
    const isOwner = String(chatId) === String(OWNER_CHAT_ID)
    const help = isOwner
      ? `<b>👑 Owner Commands</b>\n\n/start — Главное меню\n/exec [задача] — Выполнить\n/feature [идея] — ТЗ для новой фичи\n/menu [описание] — Изменить меню\n/help — Эта справка\n\n<i>Свободный текст — OMEGA выполнит как команду</i>`
      : `<b>🤖 OMEGA Help</b>\n\n/create_post — Создать пост\n/hook — Хук для видео\n/analyze — Анализ конкурента\n/plan — Контент-план\n/cover — AI-обложка\n\n<i>Или просто напишите тему!</i>`
    bot.sendMessage(chatId, help, { parse_mode: 'HTML' })
  })

  // Главный обработчик — AI для всех
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return
    const chatId = msg.chat.id
    const text = msg.text?.trim()
    const isOwner = String(chatId) === String(OWNER_CHAT_ID)
    if (!text) return

    bot.sendChatAction(chatId, 'typing')

    try {
      const result = await chatWithAI(text, [], {
        userRole: isOwner ? 'owner' : 'client',
        language: 'ru',
        context: isOwner ? 'telegram_owner_chat' : 'telegram_bot'
      })

      const formatted = formatOmegaResponse(result.text || result, isOwner)

      const keyboard = isOwner ? {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Готово', callback_data: 'owner_done' }, { text: '🔄 Уточнить', callback_data: 'owner_refine' }],
            [{ text: '📝 В ТЗ', callback_data: 'owner_tz' }, { text: '⚡ Применить', callback_data: 'owner_apply' }]
          ]
        }
      } : {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Использовать', callback_data: 'use_result' }, { text: '🔄 Переделать', callback_data: 'regenerate' }],
            [{ text: '📋 Скопировать', callback_data: 'copy' }, { text: '📤 Опубликовать', callback_data: 'publish_menu' }]
          ]
        }
      }

      bot.sendMessage(chatId, formatted, { parse_mode: 'HTML', ...keyboard })
    } catch (err) {
      bot.sendMessage(chatId, `⚠️ <b>OMEGA Error</b>\n\n${err.message}`, { parse_mode: 'HTML' })
    }
  })

  // Callbacks
  bot.on('callback_query', async (q) => {
    const chatId = q.message.chat.id
    const data = q.data
    const isOwner = String(chatId) === String(OWNER_CHAT_ID)
    bot.answerCallbackQuery(q.id).catch(() => {})

    if (isOwner) {
      if (data === 'owner_exec') bot.sendMessage(chatId, '⚡ Напишите задачу:\n<i>Например: "Создай пост про кофейню"</i>', { parse_mode: 'HTML' })
      else if (data === 'owner_feature') bot.sendMessage(chatId, '✨ Опишите фичу:\n<i>Например: "Добавить голосовой ввод"</i>', { parse_mode: 'HTML' })
      else if (data === 'owner_omega') bot.sendMessage(chatId, '🤖 <b>OMEGA Core</b>\n\nAutoPilot: ✅\nDream Mode: 🌙\nSelf-Healing: 🔧', { parse_mode: 'HTML' })
      else if (data === 'owner_status') bot.sendMessage(chatId, `🟢 <b>Статус</b>\n\n${new Date().toLocaleString('ru-RU')}\nOMEGA: Online`, { parse_mode: 'HTML' })
      else if (data === 'owner_done') bot.sendMessage(chatId, '✅ Задача выполнена!', { parse_mode: 'HTML' })
      else if (data === 'owner_refine') bot.sendMessage(chatId, '🔄 Напишите уточнение:', { parse_mode: 'HTML' })
      else if (data === 'owner_tz') bot.sendMessage(chatId, '📝 Скопируйте результат и отправьте в Kimi VS Code.', { parse_mode: 'HTML' })
      else if (data === 'owner_apply') bot.sendMessage(chatId, '⚡ <b>Применение...</b>\n\nФункция в разработке. Скопируйте код вручную.', { parse_mode: 'HTML' })
    } else {
      if (data === 'create_post') bot.sendMessage(chatId, '✍️ Напишите тему:', { parse_mode: 'HTML' })
      else if (data === 'generate_hook') bot.sendMessage(chatId, '🔥 Напишите тему видео:', { parse_mode: 'HTML' })
      else if (data === 'analyze') bot.sendMessage(chatId, '🔍 Отправьте ссылку:', { parse_mode: 'HTML' })
      else if (data === 'content_plan') bot.sendMessage(chatId, '📅 Ниша и период:', { parse_mode: 'HTML' })
      else if (data === 'ai_cover') bot.sendMessage(chatId, '🎨 Опишите картинку:', { parse_mode: 'HTML' })
      else if (data === 'free_chat') bot.sendMessage(chatId, '💬 Режим свободного общения.', { parse_mode: 'HTML' })
      else if (data === 'regenerate') bot.sendMessage(chatId, '🔄 Напишите заново:', { parse_mode: 'HTML' })
      else if (data === 'use_result') bot.sendMessage(chatId, '✅ Сохранено!', { parse_mode: 'HTML' })
      else if (data === 'copy') bot.sendMessage(chatId, '📋 Скопировано!', { parse_mode: 'HTML' })
      else if (data === 'publish_menu') {
        bot.sendMessage(chatId, '📤 <b>Платформа:</b>', { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '✈️ Telegram', callback_data: 'pub_tg' }, { text: '🔵 VK', callback_data: 'pub_vk' }]] } })
      }
    }
  })

  bot.on('polling_error', (err) => {
    const msg = err && err.message ? err.message : String(err)
    if (msg.includes('409') || msg.includes('conflict')) {
      console.log('[OMEGA-BOT] Telegram 409/conflict — another instance running, ignoring')
      return
    }
    console.error('[OMEGA-BOT]', msg)
  })

  bot.on('webhook_error', (err) => {
    console.error('[OMEGA-BOT] webhook error:', err?.message || err)
  })

  // Start polling safely
  const startPollingSafe = (botInstance, name) => {
    try {
      if (botInstance._polling && botInstance._polling.abortController) {
        console.log(`[${name}] Already polling, skipping`)
        return
      }
      botInstance.startPolling()
      console.log(`[${name}] Polling started successfully`)
    } catch (e) {
      if (
        e.message?.includes('409') ||
        e.response?.statusCode === 409 ||
        (e.code === 'ETELEGRAM' && e.message?.includes('conflict'))
      ) {
        console.log(`[${name}] 409 conflict — another instance running, ignoring`)
      } else {
        console.error(`[${name}] Polling error:`, e.message)
      }
    }
  }

  ;(async () => {
    try {
      await bot.deleteWebhook({ drop_pending_updates: true })
      await new Promise(r => setTimeout(r, 1000))
      console.log('[OMEGA-BOT] webhook deleted, starting polling')
      startPollingSafe(bot, 'OMEGA-BOT')
    } catch (err) {
      console.warn('[OMEGA-BOT] deleteWebhook failed:', err.message, '- starting polling anyway')
      await new Promise(r => setTimeout(r, 1000))
      startPollingSafe(bot, 'OMEGA-BOT')
    }
  })()
}

const updateBotMenu = () => {
  if (!bot) return
  const commands = [
    { command: 'start', description: '🚀 Начать' },
    { command: 'create_post', description: '✍️ Создать пост' },
    { command: 'hook', description: '🔥 Хук' },
    { command: 'analyze', description: '🔍 Анализ' },
    { command: 'plan', description: '📅 План' },
    { command: 'cover', description: '🎨 Обложка' },
    { command: 'help', description: '❓ Помощь' }
  ]
  bot.setMyCommands(commands).catch(() => {})
}

const formatOmegaResponse = (text, isOwner) => {
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
  return isOwner
    ? `🤖 <b>OMEGA (Owner Mode)</b>\n\n${formatted}\n\n<i>⚡ Готово к применению</i>`
    : `🤖 <b>OMEGA</b>\n\n${formatted}\n\n<i>👍 Используйте кнопки ниже</i>`
}

export const handleOmegaWebhook = async (req, res) => {
  if (bot && req.body) bot.processUpdate(req.body)
  res.sendStatus(200)
}

export function getOmegaBot() {
  if (!started) initOmegaBot()
  return bot || createStubBot()
}

export async function alertOmega(message) {
  const chatId = OWNER_CHAT_ID
  const b = getOmegaBot()
  if (!chatId || !b || typeof b.sendMessage !== 'function') return
  try {
    await b.sendMessage(chatId, `🤖 OMEGA Alert:\n${message}`)
  } catch (e) {
    console.error('[omegaBot] alert failed:', e.message)
  }
}

const omegaBot = getOmegaBot()
export { omegaBot }
export default { alertOmega, getOmegaBot, omegaBot }
