import TelegramBot from 'node-telegram-bot-api'
import fs from 'fs'
import { chatWithAI } from './aiService.js'
import { isOwner, getOwnerContext } from './ownerContext.js'
import { createTicket } from './supportService.js'
import { getAdPricing } from './adPricingService.js'

// [P16-FINAL] singleton to avoid duplicate polling / 409 conflict
let bot = global.omegaBotInstance || null
let started = global.omegaBotStarted || false

const OMEGA_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_OMEGA_BOT_TOKEN
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID

// [v9.9.2-MASTER-FIX] client support state per chat
const supportState = global.omegaSupportState || new Map()
global.omegaSupportState = supportState

// [v9.9.5-TELEGRAM-UNIFIED] client video creation state per chat
const videoState = global.omegaVideoState || new Map()
global.omegaVideoState = videoState

function createStubBot() {
  return {
    sendMessage: () => Promise.resolve(),
    on: () => {},
    onText: () => {},
    startPolling: () => {},
    stopPolling: () => {},
    deleteWebhook: () => Promise.resolve(),
    setWebhook: () => Promise.resolve(),
    setMyCommands: () => Promise.resolve(),
    answerCallbackQuery: () => Promise.resolve(),
  }
}

// [HOTFIX-2026-08-08] stringify objects before sendMessage to avoid "[object Object]"
function sendClientMenu(chatId) {
  bot.sendMessage(chatId, `✦ <b>AI Viral Studio</b> ✦\n━━━━━━━━━━━━━━\n<i>OMEGA AI — ваш SMM-отдел</i>\n\nВыберите действие:`, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 Реклама в канале', callback_data: 'ad:start' }, { text: '💰 Скидки', callback_data: 'discount:list' }],
        [{ text: '🎬 Видео / Reels', callback_data: 'video:start' }, { text: '💬 Поддержка', callback_data: 'support:start' }],
        [{ text: '📊 Мои заказы', callback_data: 'ad:myorders' }, { text: '💎 Тарифы', callback_data: 'ad:prices' }],
        [{ text: '🚀 Перейти в приложение', url: 'https://aiviral-studio.ru' }]
      ]
    }
  })
}

function safeSendMessage(chatId, data, options = {}) {
  let text
  if (typeof data === 'string') {
    text = data
  } else if (data && typeof data === 'object') {
    text = data.text || data.message || data.content || data.response || data.reply || data.result || JSON.stringify(data, null, 2)
  } else {
    text = String(data)
  }
  if (text.length > 4000) text = text.slice(0, 4000) + '...'
  return bot.sendMessage(chatId, text, options)
}

// [MASTER-v5.6-CONT] OMEGA Bot with Owner Mode & Auto-Features
export const initOmegaBot = () => {
  if (started) { console.log('[OMEGA-BOT] Already started, skipping'); return }
  started = true
  global.omegaBotStarted = true

  if (!OMEGA_TOKEN) {
    console.warn('[OMEGA-BOT] Skip: TELEGRAM_BOT_TOKEN / TELEGRAM_OMEGA_BOT_TOKEN missing')
    bot = createStubBot()
    global.omegaBotInstance = bot
    return
  }

  bot = new TelegramBot(OMEGA_TOKEN, { polling: false })
  global.omegaBotInstance = bot
  console.log('[OMEGA-BOT] Created, preparing webhook')

  updateBotMenu()

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) {
      sendClientMenu(chatId)
      return;
    }
    const context = await getOwnerContext(chatId);
    const name = context?.name || 'Юрий';
    bot.sendMessage(chatId, `🤖 <b>OMEGA (Owner Mode)</b>\n\nЯ готова к работе, ${name}.\nИспользуйте /menu для навигации.`, { parse_mode: 'HTML' });
  })

  // [v9.9.5-TELEGRAM-UNIFIED] client ad order command
  bot.onText(/\/ad (.+)/, async (msg, match) => {
    const chatId = msg.chat.id
    const adText = match[1]
    const ownerBot = new TelegramBot(process.env.TELEGRAM_OWNER_BOT_TOKEN, { polling: false })
    ownerBot.sendMessage(process.env.OWNER_CHAT_ID, `🛒 <b>Новый заказ рекламы!</b>\n━━━━━━━━━━━━━━\nКлиент: @${msg.from.username || 'unknown'}\nID: ${chatId}\nТекст: ${adText.slice(0, 100)}...`, { parse_mode: 'HTML' })
    bot.sendMessage(chatId, `✅ <b>Заявка отправлена!</b>\n━━━━━━━━━━━━━━\nВладелец рассмотрит и свяжется с вами.`, { parse_mode: 'HTML' })
  })

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id
    const isOwner = String(chatId) === String(OWNER_CHAT_ID)
    const help = isOwner
      ? `<b>👑 Owner Commands</b>\n\n/start — Главное меню\n/exec [задача] — Выполнить\n/feature [идея] — ТЗ для новой фичи\n/menu [описание] — Изменить меню\n/improve — Улучшить бота\n/help — Эта справка\n\n<i>Свободный текст — OMEGA выполнит как команду</i>`
      : `<b>🤖 OMEGA Help</b>\n\n/create_post — Создать пост\n/hook — Хук для видео\n/analyze — Анализ конкурента\n/plan — Контент-план\n/cover — AI-обложка\n\n<i>Или просто напишите тему!</i>`
    safeSendMessage(chatId, help, { parse_mode: 'HTML' })
  })

  // OWNER MODE — авто-улучшение бота
  bot.onText(/\/improve/, async (msg) => {
    const chatId = msg.chat.id
    const isOwner = String(chatId) === String(OWNER_CHAT_ID)
    if (!isOwner) { safeSendMessage(chatId, '⛔ Только владелец'); return }
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

  // [v9.9.2-MASTER-FIX] client support flow + existing AI handler
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return
    const chatId = msg.chat.id
    const text = msg.text?.trim()
    const owner = isOwner(chatId)
    if (!text) return

    // Support ticket flow for non-owners
    if (!owner && supportState.get(chatId)) {
      bot.sendChatAction(chatId, 'typing')
      try {
        const ticket = await createTicket({
          userEmail: `tg_${chatId}@aiviral-studio.ru`,
          userName: msg.chat.username || msg.chat.first_name || `Telegram ${chatId}`,
          subject: 'Telegram Support',
          description: text,
          telegramChatId: String(chatId)
        })
        let reply = `🎫 <b>Обращение #${ticket._id.toString().slice(-6)} создано</b>\n`
        if (ticket.aiSuggestion && ticket.status === 'ai_handled') {
          reply += `💡 <b>OMEGA совет:</b>\n${ticket.aiSuggestion}\n\nПомогло?`
          bot.sendMessage(chatId, reply, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '👍 Помогло', callback_data: `ticket:${ticket._id}:resolve` },
                 { text: '👎 Нет', callback_data: `ticket:${ticket._id}:escalate` }]
              ]
            }
          })
        } else {
          reply += `⏳ Передаю оператору. Ожидайте...`
          bot.sendMessage(chatId, reply, { parse_mode: 'HTML' })
        }
        supportState.delete(chatId)
      } catch (err) {
        console.error('[OMEGA-BOT] support ticket failed:', err.message)
        safeSendMessage(chatId, '⚠️ Не удалось создать обращение. Попробуйте позже.', { parse_mode: 'HTML' })
      }
      return
    }

    // [v9.9.5-TELEGRAM-UNIFIED] client video topic collection
    if (!owner && videoState.get(chatId)?.step === 'awaiting_topic') {
      bot.sendMessage(chatId, `🎬 <b>Сценарий готов!</b>\n━━━━━━━━━━━━━━\nХук: "Как ${msg.text} за 24 часа?"\n\n👇 Создать видео в приложении:\nhttps://aiviral-studio.ru/video-creator`, { parse_mode: 'HTML' })
      videoState.delete(chatId)
      return
    }

    bot.sendChatAction(chatId, 'typing')

    try {
      const result = await chatWithAI(text, [], {
        userRole: owner ? 'owner' : 'client',
        language: 'ru',
        context: owner ? 'telegram_owner_chat' : 'telegram_bot'
      })

      const rawText = result.text || result
      const textToFormat = typeof rawText === 'string' ? rawText : (rawText && typeof rawText === 'object' ? (rawText.text || rawText.message || rawText.content || JSON.stringify(rawText, null, 2)) : String(rawText))
      const formatted = formatOmegaResponse(textToFormat, owner)

      const keyboard = owner ? {
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
            [{ text: '📋 Скопировать', callback_data: 'copy' }, { text: '📤 Опубликовать', callback_data: 'publish_menu' }],
            [{ text: '💬 Поддержка', callback_data: 'support:start' }]
          ]
        }
      }

      safeSendMessage(chatId, formatted, { parse_mode: 'HTML', ...keyboard })
    } catch (err) {
      safeSendMessage(chatId, `⚠️ <b>OMEGA Error</b>\n\n${err.message}`, { parse_mode: 'HTML' })
    }
  })

  // Callbacks
  bot.on('callback_query', async (q) => {
    const chatId = q.message.chat.id
    const data = q.data
    const owner = isOwner(chatId)
    bot.answerCallbackQuery(q.id).catch(() => {})

    // [v9.9.2-MASTER-FIX] unified support callbacks (work for everyone)
    if (data === 'support:start') {
      supportState.set(chatId, true)
      bot.sendMessage(chatId, '💬 <b>Поддержка</b>\nОпишите проблему одним сообщением. OMEGA ответит или передаст оператору.', { parse_mode: 'HTML' })
      return
    }
    if (data.startsWith('ticket:')) {
      const [, ticketId, action] = data.split(':')
      try {
        const SupportTicket = (await import('../models/SupportTicket.js')).default
        const ticket = await SupportTicket.findById(ticketId)
        if (ticket) {
          if (action === 'resolve') {
            ticket.status = 'resolved'
            await ticket.save()
            safeSendMessage(chatId, '✅ Обращение закрыто. Рады помочь!', { parse_mode: 'HTML' })
          } else if (action === 'escalate') {
            ticket.status = 'needs_owner'
            await ticket.save()
            safeSendMessage(chatId, '⏳ Передаю оператору. Ожидайте...', { parse_mode: 'HTML' })
          }
        }
      } catch (err) {
        console.error('[OMEGA-BOT] ticket callback failed:', err.message)
        safeSendMessage(chatId, '⚠️ Не удалось обновить обращение.', { parse_mode: 'HTML' })
      }
      return
    }

    // [v9.9.5-TELEGRAM-UNIFIED] client luxury menu callbacks
    if (!owner) {
      if (data === 'ad:start') {
        const prices = getAdPricing()
        let text = `🛒 <b>Реклама в канале @aiviralstudio</b>\n━━━━━━━━━━━━━━\n`
        Object.entries(prices).forEach(([k, v]) => { text += `\n• ${v.description} — ${v.price.toLocaleString('ru-RU')}₽` })
        text += `\n━━━━━━━━━━━━━━\nНапишите /ad ваш_текст`
        bot.sendMessage(chatId, text, { parse_mode: 'HTML' })
        return
      }
      if (data === 'discount:list') {
        bot.sendMessage(chatId, `💰 <b>Активные промокоды</b>\n━━━━━━━━━━━━━━\n🔥 OMEGA20 — скидка 20%\n🔥 OMEGA30 — скидка 30%\n━━━━━━━━━━━━━━\n👇 Применить в приложении:\nhttps://aiviral-studio.ru/signup`, { parse_mode: 'HTML' })
        return
      }
      if (data === 'video:start') {
        bot.sendMessage(chatId, `🎬 <b>Создание видео</b>\n━━━━━━━━━━━━━━\nНапишите тему (например: "как продвигать кофейню в TikTok")`, { parse_mode: 'HTML' })
        videoState.set(chatId, { step: 'awaiting_topic' })
        return
      }
      if (data === 'ad:myorders') {
        bot.sendMessage(chatId, `📊 <b>Ваши заказы</b>\n━━━━━━━━━━━━━━\nУ вас пока нет активных заказов.\nСоздать: /ad`, { parse_mode: 'HTML' })
        return
      }
      if (data === 'ad:prices') {
        bot.sendMessage(chatId, `💎 <b>Тарифы приложения</b>\n━━━━━━━━━━━━━━\n• Free — 0₽ (10 генераций)\n• Pro — 990₽/мес\n• Agency — 4990₽/мес\n━━━━━━━━━━━━━━\nhttps://aiviral-studio.ru/pricing`, { parse_mode: 'HTML' })
        return
      }
    }

    if (owner) {
      if (data === 'owner_exec') safeSendMessage(chatId, '⚡ Напишите задачу:\n<i>Например: "Создай пост про кофейню"</i>', { parse_mode: 'HTML' })
      else if (data === 'owner_feature') safeSendMessage(chatId, '✨ Опишите фичу:\n<i>Например: "Добавить голосовой ввод"</i>', { parse_mode: 'HTML' })
      else if (data === 'owner_omega') safeSendMessage(chatId, '🤖 <b>OMEGA Core</b>\n\nAutoPilot: ✅\nDream Mode: 🌙\nSelf-Healing: 🔧', { parse_mode: 'HTML' })
      else if (data === 'owner_status') safeSendMessage(chatId, `🟢 <b>Статус</b>\n\n${new Date().toLocaleString('ru-RU')}\nOMEGA: Online`, { parse_mode: 'HTML' })
      else if (data === 'owner_done') safeSendMessage(chatId, '✅ Задача выполнена!', { parse_mode: 'HTML' })
      else if (data === 'owner_refine') safeSendMessage(chatId, '🔄 Напишите уточнение:', { parse_mode: 'HTML' })
      else if (data === 'owner_tz') safeSendMessage(chatId, '📝 Скопируйте результат и отправьте в Kimi VS Code.', { parse_mode: 'HTML' })
      else if (data === 'owner_apply') safeSendMessage(chatId, '⚡ <b>Применение...</b>\n\nФункция в разработке. Скопируйте код вручную.', { parse_mode: 'HTML' })
      else if (data === 'improve_apply') safeSendMessage(chatId, '✅ <b>OMEGA редактирует файл бота...</b>\n\n<i>git commit + deploy (placeholder)</i>', { parse_mode: 'HTML' })
      else if (data === 'improve_reject') safeSendMessage(chatId, '❌ Улучшение отклонено.', { parse_mode: 'HTML' })
      else if (data === 'improve_retry') safeSendMessage(chatId, '🔄 Напишите <code>/improve</code> для другого варианта.', { parse_mode: 'HTML' })
    } else {
      if (data === 'create_post') safeSendMessage(chatId, '✍️ Напишите тему:', { parse_mode: 'HTML' })
      else if (data === 'generate_hook') safeSendMessage(chatId, '🔥 Напишите тему видео:', { parse_mode: 'HTML' })
      else if (data === 'analyze') safeSendMessage(chatId, '🔍 Отправьте ссылку:', { parse_mode: 'HTML' })
      else if (data === 'content_plan') safeSendMessage(chatId, '📅 Ниша и период:', { parse_mode: 'HTML' })
      else if (data === 'ai_cover') safeSendMessage(chatId, '🎨 Опишите картинку:', { parse_mode: 'HTML' })
      else if (data === 'free_chat') safeSendMessage(chatId, '💬 Режим свободного общения.', { parse_mode: 'HTML' })
      else if (data === 'regenerate') safeSendMessage(chatId, '🔄 Напишите заново:', { parse_mode: 'HTML' })
      else if (data === 'use_result') safeSendMessage(chatId, '✅ Сохранено!', { parse_mode: 'HTML' })
      else if (data === 'copy') safeSendMessage(chatId, '📋 Скопировано!', { parse_mode: 'HTML' })
      else if (data === 'publish_menu') {
        safeSendMessage(chatId, '📤 <b>Платформа:</b>', { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '✈️ Telegram', callback_data: 'pub_tg' }, { text: '🔵 VK', callback_data: 'pub_vk' }]] } })
      }
    }
  })

  bot.on('webhook_error', (err) => {
    console.error('[OMEGA-BOT] webhook error:', err?.message || err)
  })

  // [WEBHOOK-2026-08-05] set webhook instead of polling to avoid 409 conflicts
  const WEBHOOK_URL = (process.env.RENDER_EXTERNAL_URL || 'https://aiviral-backend.onrender.com') + '/webhook/omega'
  bot.setWebhook(WEBHOOK_URL).catch(() => {})
  console.log('[OMEGA-BOT] Webhook set to', WEBHOOK_URL)
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
    { command: 'improve', description: '🔧 Улучшить бота' },
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
    await safeSendMessage(chatId, `🤖 OMEGA Alert:\n${message}`)
  } catch (e) {
    console.error('[omegaBot] alert failed:', e.message)
  }
}

const omegaBot = getOmegaBot()
export { omegaBot }
export default { alertOmega, getOmegaBot, omegaBot }
