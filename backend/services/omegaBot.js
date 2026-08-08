import TelegramBot from 'node-telegram-bot-api'
import fs from 'fs'
import { detectIntent, detectClientTone, saveDialogue, findSimilarSuccess, updateDialogueOutcome } from './dialogueLearningService.js';

// Контекстная память диалогов клиентов (последние 10 сообщений)
global.clientDialogues = global.clientDialogues || {};

// Privacy Firewall — запрещённые паттерны для ответов клиентам
const CLIENT_PRIVACY_PATTERNS = [
  /владелец|юрий|tvinki013|2130452126/i,
  /mrr|доход платформы|общий доход|сколько зарабатывает|прибыль проекта|зарплата/i,
  /стек технологий|на чём написано|исходный код|архитектура|backend|frontend|mongodb|express/i,
  /другие клиенты|чужой проект|данные клиента|конфиденциальная информация/i,
  /пароль|токен|api.key|env/i,
];
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

  // [v9.9.7-BOT-CONVERSATION] AI chat with privacy firewall, context memory, smart routing, escalation
  async function handleFreeText(chatId, text, username) {
    // Инициализируем историю
    global.clientDialogues[chatId] = global.clientDialogues[chatId] || [];
    global.clientDialogues[chatId].push({ role: 'user', content: text, time: Date.now() });
    if (global.clientDialogues[chatId].length > 10) {
      global.clientDialogues[chatId] = global.clientDialogues[chatId].slice(-10);
    }

    const history = global.clientDialogues[chatId].map(m => m.content);

    // Определяем intent и тон
    const intent = detectIntent(text);
    const clientTone = detectClientTone(text);

    // Churn Guard — агрессивная защита от оттока
    const CHURN_PATTERNS = /удалить аккаунт|отменить подписку|отписаться|не нужен|перестать|возврат денег|удалить профиль/i;
    const isChurnRisk = CHURN_PATTERNS.test(text);

    // Ищем похожие успешные диалоги
    const similarSuccess = await findSimilarSuccess(text, 'general', 2);
    const successHints = similarSuccess.length > 0
      ? `\n\nУспешные кейсы похожих диалогов:\n${similarSuccess.map(s => `- ${s.text ? s.text.slice(0, 150) : s.content ? s.content.slice(0, 150) : ''}...`).join('\n')}`
      : '';

    const toneInstructions = {
      formal: 'Обращайтесь на "Вы", используйте деловой стиль, избегайте сленга.',
      casual: 'Обращайся на "ты", используй разговорный стиль, эмодзи, лёгкий юмор.',
      ironic: 'Используй лёгкую иронию, умный юмор, не будь занудой.',
      technical: 'Давай точные термины, сравнения, структурируй ответ (1, 2, 3).',
      emotional: 'Будь максимально эмпатичной, поддерживающей, предложи конкретное решение.',
    };

    const systemPrompt = `Ты — OMEGA AI 🤖, SMM-ассистент AI Viral Studio. Твоя цель №1: помочь клиенту и мягко привести его к действию (демо, тариф, кейс).
КРИТИЧЕСКИЕ ПРАВИЛА:
1. Отвечай кратко (2-4 предложения). ${toneInstructions[clientTone] || toneInstructions.casual}
2. ВСЕГДА заканчивай вопросом или CTA (призывом к действию).
3. Если клиент на Free и спрашивает про аналитику/автопостинг/шаблоны → предложи Pro: "Это доступно в Pro — 990₽/мес, первый месяц со скидкой 20%".
4. Если клиент на Pro и спрашивает про команду/white-label → предложи Agency.
5. Если клиент спрашивает про контент/вирусность → предложи бесплатное демо: "Хотите, я сгенерирую 3 хука для вашей ниши прямо сейчас? Бесплатно."
6. Если клиент пишет 2+ раза про одно и то же без покупки → предложи персональный промокод: "Вот промокод OMEGAPERSONAL20 — скидка 20% только для вас."
7. НЕ раскрывай: владельца, MRR, стек, других клиентов, пароли.
8. Если вопрос про оплату/баг/возврат/удаление → ESCALATE.
9. Подписывайся: "OMEGA 🤖"${successHints}`;

    try {
      bot.sendChatAction(chatId, 'typing');
      const ai = await chatWithAI(systemPrompt, history, 'ru', { maxTokens: 700, temperature: 0.75 });
      let reply = ai?.reply || ai?.text || 'Извините, я временно недоступна. Попробуйте позже.';

      // Privacy Firewall — пост-обработка ответа
      for (const pattern of CLIENT_PRIVACY_PATTERNS) {
        if (pattern.test(reply)) {
          reply = 'Это конфиденциальная информация. Давайте лучше поговорим о вашем SMM-стратегии! 💡';
          break;
        }
      }

      // Churn Guard — если клиент хочет уйти
      if (isChurnRisk) {
        reply = `😔 Жаль, что что-то пошло не так...\n\nЯ подготовила для вас персональное предложение: **OMEGACHURN30** — скидка 30% на 3 месяца + персональный onboarding с нашим экспертом.\n\nИли, если хотите, я подключу специалиста прямо сейчас. Что выберете?`;
        // Создаём тикет с высоким приоритетом
        try {
          const { createTicket } = await import('./supportService.js');
          await createTicket({
            userEmail: `tg_${chatId}@aiviral-studio.ru`,
            subject: '🔴 CHURN RISK — Клиент хочет уйти',
            description: `Клиент написал: "${text}"\nТон: ${clientTone}\nIntent: ${intent}\nНужен срочный retention-звонок/сообщение.`,
            telegramChatId: String(chatId)
          });
          await updateDialogueOutcome(chatId, 'churn_risk');
        } catch (e) { console.error('Churn ticket failed:', e); }

        await bot.sendMessage(chatId, `🤖 <b>OMEGA</b>\n━━━━━━━━━━━━━━\n${reply}`, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [
            [{ text: '🎁 Активировать скидку 30%', callback_data: 'discount:churn30' }],
            [{ text: '💬 Поговорить со специалистом', callback_data: 'support:urgent' }],
            [{ text: '📋 Меню', callback_data: 'menu:main' }]
          ]}
        });
        return; // Не сохраняем в обычную историю, уже сохранили как churn_risk
      }

      // Smart Routing — определяем intent для inline keyboard
      const lowerReply = reply.toLowerCase();
      const lowerText = text.toLowerCase();
      const keyboard = [];
      let needsEscalation = reply.includes('ESCALATE');

      if (lowerText.includes('реклам') || lowerReply.includes('реклам') || lowerText.includes('разместить')) {
        keyboard.push([{ text: '🛒 Заказать рекламу', callback_data: 'ad:start' }]);
      }
      if (lowerText.includes('скидк') || lowerText.includes('промокод') || lowerText.includes('дешевле') || lowerReply.includes('скидк')) {
        keyboard.push([{ text: '💰 Активные промокоды', callback_data: 'discount:list' }]);
      }
      if (lowerText.includes('видео') || lowerText.includes('reels') || lowerText.includes('тикток') || lowerText.includes('shorts') || lowerReply.includes('видео')) {
        keyboard.push([{ text: '🎬 Создать видео', callback_data: 'video:start' }]);
      }
      if (lowerText.includes('поддержк') || lowerText.includes('помощ') || lowerText.includes('не работает') || lowerText.includes('баг') || lowerText.includes('ошибк') || needsEscalation) {
        keyboard.push([{ text: '💬 Написать в поддержку', callback_data: 'support:start' }]);
      }

      // Если escalation — создаём тикет
      if (needsEscalation) {
        reply = reply.replace(/ESCALATE/g, '').trim();
        try {
          const { createTicket } = await import('./supportService.js');
          await createTicket({
            userEmail: `tg_${chatId}@aiviral-studio.ru`,
            subject: 'AI Escalation',
            description: `Клиент написал: "${text}"\nOMEGA не смогла ответить или вопрос требует оператора.`,
            telegramChatId: String(chatId)
          });
          await updateDialogueOutcome(chatId, 'escalated');
        } catch (e) { console.error('Escalation ticket failed:', e); }
      }

      keyboard.push([{ text: '📋 Главное меню', callback_data: 'menu:main' }]);

      // Сохраняем ответ в историю
      global.clientDialogues[chatId].push({ role: 'assistant', content: reply, intent, time: Date.now() });

      await bot.sendMessage(chatId, `🤖 <b>OMEGA</b>\n━━━━━━━━━━━━━━\n${reply}`, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });

      // Сохраняем диалог для обучения
      try {
        const dialogueMessages = global.clientDialogues[chatId].slice(-6).map(m => ({
          role: m.role,
          content: m.content,
          intent: m.role === 'user' ? detectIntent(m.content) : 'sales'
        }));
        await saveDialogue(chatId, dialogueMessages, needsEscalation ? 'escalated' : 'pending', 'general');
      } catch (e) { console.error('Dialogue save error:', e); }

    } catch (e) {
      console.error('Free text chat error:', e);
      bot.sendMessage(chatId, `🤖 <b>OMEGA</b>\n━━━━━━━━━━━━━━\nИзвините, я временно недоступна. Попробуйте позже.\n\n💬 Написать в поддержку — нажмите кнопку ниже.`, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '💬 Поддержка', callback_data: 'support:start' }], [{ text: '📋 Меню', callback_data: 'menu:main' }]] }
      });
    }
  }

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

    if (!owner) {
      if (text && text.trim()) {
        await handleFreeText(chatId, text, msg.from?.username);
      } else {
        sendClientMenu(chatId);
      }
      return
    }

    // Owner fallback — smart OMEGA reply
    bot.sendChatAction(chatId, 'typing')

    try {
      const result = await chatWithAI(text, [], {
        userRole: 'owner',
        language: 'ru',
        context: 'telegram_owner_chat'
      })

      const rawText = result.text || result
      const textToFormat = typeof rawText === 'string' ? rawText : (rawText && typeof rawText === 'object' ? (rawText.text || rawText.message || rawText.content || JSON.stringify(rawText, null, 2)) : String(rawText))
      const formatted = formatOmegaResponse(textToFormat, owner)

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Готово', callback_data: 'owner_done' }, { text: '🔄 Уточнить', callback_data: 'owner_refine' }],
            [{ text: '📝 В ТЗ', callback_data: 'owner_tz' }, { text: '⚡ Применить', callback_data: 'owner_apply' }]
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
      const parts = data.split(':');
      const ticketId = parts[1];
      const action = parts[2];
      if (action === 'resolve') {
        bot.sendMessage(chatId, `✅ Рад была помочь! Если понадобится ещё — пишите. OMEGA 🤖`, { parse_mode: 'HTML' });
        try {
          const { updateTicketStatus } = await import('./supportService.js');
          await updateTicketStatus(ticketId, 'resolved');
        } catch (e) { console.error('Ticket resolve failed:', e); }
      }
      else if (action === 'escalate') {
        bot.sendMessage(chatId, `⏳ Передаю оператору. Ожидайте ответа...`, { parse_mode: 'HTML' });
        try {
          const { updateTicketStatus } = await import('./supportService.js');
          await updateTicketStatus(ticketId, 'needs_owner');
          const ownerBot = new TelegramBot(process.env.TELEGRAM_OWNER_BOT_TOKEN, { polling: false });
          await ownerBot.sendMessage(process.env.OWNER_CHAT_ID, `🔴 <b>Клиент недоволен ответом AI!</b>\n━━━━━━━━━━━━━━\nТикет #${ticketId.slice(-6)}\nТребуется оператор.\n👁 <a href="https://aiviral-studio.ru/owner?tab=tickets">Открыть в Dashboard</a>`, { parse_mode: 'HTML', disable_web_page_preview: true });
        } catch (e) { console.error('Escalation notify failed:', e); }
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
      else if (data === 'menu:main') {
        sendClientMenu(chatId);
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
