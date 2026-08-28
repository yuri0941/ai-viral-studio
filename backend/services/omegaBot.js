import TelegramBot from 'node-telegram-bot-api'
import { getTgWebhookSecret } from '../utils/tgWebhookSecret.js' // [security-hardening Б5-З2.1]
import { getOwnerChatId, getOwnerChatIdSync } from '../models/OwnerSettings.js' // [OWNER-REMOTE-CONTROL]
import fs from 'fs'
import { wrapBotHtmlSending } from '../utils/telegramHtml.js'
import User from '../models/User.js'
import { getConnectUserId } from '../utils/telegramConnectStore.js'
import { detectIntent, detectClientTone, saveDialogue, findSimilarSuccess, updateDialogueOutcome } from './dialogueLearningService.js';
import { detectIntent as detectActionIntent } from '../ai/omega/intentEngine.js';
import { executeAction } from '../ai/omega/actionEngine.js';
import { handleConciergeRequest } from './concierge.js';
import { recordOutcome } from '../ai/omega/learningEngine.js';

// Контекстная память диалогов клиентов (последние 10 сообщений)
// [v9.9.19.6] хранится в MongoDB (ClientDialogue) — переживает рестарт; global — только кэш
global.clientDialogues = global.clientDialogues || {};

async function getDialogueContext(chatId) {
  if (global.clientDialogues[chatId]) return global.clientDialogues[chatId];
  try {
    const { default: ClientDialogue } = await import('../models/ClientDialogue.js');
    const doc = await ClientDialogue.findOne({ telegramChatId: String(chatId) }).sort({ updatedAt: -1 }).lean();
    global.clientDialogues[chatId] = (doc?.messages || []).slice(-10)
      .map(m => ({ role: m.role, content: m.content, time: new Date(m.timestamp || Date.now()).getTime() }));
  } catch (e) {
    global.clientDialogues[chatId] = [];
  }
  return global.clientDialogues[chatId];
}

async function persistDialogueContext(chatId) {
  try {
    const { default: ClientDialogue } = await import('../models/ClientDialogue.js');
    const messages = (global.clientDialogues[chatId] || []).slice(-10)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000), intent: 'other', timestamp: new Date(m.time || Date.now()) }));
    await ClientDialogue.findOneAndUpdate(
      { telegramChatId: String(chatId) },
      { $set: { messages, updatedAt: new Date() } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (e) { console.warn('[omegaBot] dialogue persist failed:', e.message); }
}

// [P2.1] единый privacy-модуль (запреты + фильтр исходящих + блок для системного промпта)
import { sanitizeClientReply, PRIVACY_PROMPT_BLOCK } from '../utils/botPrivacy.js'
import { findFaqAnswer, findFaqCandidates } from './faqService.js'
import { chatWithAI, extractText } from './aiService.js'
import { isOwner, getOwnerContext } from './ownerContext.js'
import { createTicket, appendToOpenTicket } from './supportService.js'
import { isWebSearchQuery, searchWeb, formatWebResultsLuxury } from './webSearch.js'
import { getAdPricing } from './adPricingService.js'
import { saveFeedback, rateFeedback } from './feedbackService.js'
import { CLIENT_BOT_USERNAME, CHANNEL_USERNAME, clientBotUrl } from '../config/bots.js'
import { markdownToHtml } from './linkGuard.js'

// [TG-FREETEXT-HOTFIX] доступ к singleton-боту через global, чтобы юнит-тесты могли подставлять stub
function getBot() { return global.omegaBotInstance || bot }

// [TG-FREETEXT-HOTFIX] точки подмены зависимостей для handleFreeText (юнит-тесты)
const handleFreeTextDeps = {
  chatWithAI,
  extractText,
  findFaqCandidates,
  findSimilarSuccess,
  createTicket,
  appendToOpenTicket,
  saveDialogue,
  updateDialogueOutcome,
  sanitizeClientReply,
  saveFeedback,
  persistDialogueContext,
  searchWeb,
  formatWebResultsLuxury,
}
export function setHandleFreeTextDeps(deps) { Object.assign(handleFreeTextDeps, deps) }

// [v9.9.7-BOT-CONVERSATION] AI chat with privacy firewall, context memory, smart routing, escalation
export async function handleFreeText(chatId, text, username) {
  // [P2.1] антиспам: не чаще 1 AI-ответа в 4 сек на чат
  const lastCall = freeTextRate.get(String(chatId)) || 0
  if (Date.now() - lastCall < 4000) return
  freeTextRate.set(String(chatId), Date.now())

  // [v9.9.19.6] контекст из MongoDB (переживает рестарт), кэш в global
  const dialogue = await getDialogueContext(chatId);
  dialogue.push({ role: 'user', content: text, time: Date.now() });
  if (dialogue.length > 10) dialogue.splice(0, dialogue.length - 10);
  handleFreeTextDeps.persistDialogueContext(chatId); // не блокируем ответ

  // [TG-FREETEXT-HOTFIX] передаём объекты {role, content}, как ожидает chatWithAI
  const history = dialogue.map(m => ({ role: m.role, content: m.content }));

  // Определяем intent и тон
  const intent = detectIntent(text);
  const clientTone = detectClientTone(text);
  const actionIntent = detectActionIntent(text);

  // Auto-Escalation: confidence <0.6 или явно support/churn/pricing
  const needsEscalationByConfidence = actionIntent && actionIntent.confidence <= 0.6 && actionIntent.intent === 'UNKNOWN_ACTION';

  // Churn Guard — агрессивная защита от оттока
  const CHURN_PATTERNS = /удалить аккаунт|отменить подписку|отписаться|не нужен|перестать|возврат денег|удалить профиль/i;
  const isChurnRisk = CHURN_PATTERNS.test(text);

  // Ищем похожие успешные диалоги
  const similarSuccess = await handleFreeTextDeps.findSimilarSuccess(text, 'general', 2);
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

  // [P2.1] FAQ-кандидаты из базы знаний: бот отвечает ТОЛЬКО из базы + фактов аккаунта, не выдумывает
  let faqBlock = ''
  try {
    const candidates = await handleFreeTextDeps.findFaqCandidates(text, 3)
    if (candidates.length) {
      faqBlock = `\n\nБАЗА ЗНАНИЙ (отвечай ТОЛЬКО по ней и по фактам аккаунта клиента; если ответа нет — честно скажи, что не знаешь, и предложи оператора через ESCALATE — ничего не выдумывай):\n${candidates.map(a => `• ${a.question} → ${a.answer}`).join('\n')}`
    }
  } catch { /* база недоступна — не блокируем ответ */ }

  // [PLANCONFIG-ADMIN] цена Pro — из PlanConfig (кэш), без хардкода; фолбэк — нейтральная формулировка без цифр
  let proPriceText = ''
  try {
    const { getPlanSync } = await import('./planConfigCache.js')
    const proPrice = getPlanSync('pro').price
    if (proPrice > 0) proPriceText = ` — ${proPrice}₽/мес`
  } catch { /* без цифры */ }

  const systemPrompt = `Ты — OMEGA AI 🤖, SMM-ассистент AI Viral Studio. Твоя цель №1: помочь клиенту и мягко привести его к действию (демо, тариф, кейс).
КРИТИЧЕСКИЕ ПРАВИЛА:
1. Отвечай кратко (2-4 предложения). ${toneInstructions[clientTone] || toneInstructions.casual}
2. ВСЕГДА заканчивай вопросом или CTA (призывом к действию).
3. Если клиент на Free и спрашивает про аналитику/автопостинг/шаблоны → предложи Pro: "Это доступно в Pro${proPriceText}. Актуальные условия — на странице тарифов."
4. Если клиент на Pro и спрашивает про команду/white-label → предложи Agency.
5. Если клиент спрашивает про контент/вирусность → предложи бесплатное демо: "Хотите, я сгенерирую 3 хука для вашей ниши прямо сейчас? Бесплатно."
6. Если клиент пишет 2+ раза про одно и то же без покупки → предложи персональный промокод: "Вот промокод OMEGAPERSONAL20 — скидка 20% только для вас."
7. НЕ раскрывай: владельца, MRR, стек, других клиентов, пароли.
8. Если вопрос про оплату/баг/возврат/удаление → ESCALATE.
9. Подписывайся: "OMEGA 🤖"
10. Я — AI-ассистент, не человек; если просят человека или я не знаю ответ — честно говори об этом и предлагай оператора.${PRIVACY_PROMPT_BLOCK}${faqBlock}${successHints}`;

  try {
    getBot().sendChatAction(chatId, 'typing');
    let webContext = ''
    if (isWebSearchQuery(text)) {
      try {
        const results = await handleFreeTextDeps.searchWeb(text, 3)
        webContext = '\n\n' + handleFreeTextDeps.formatWebResultsLuxury(results)
      } catch (e) { console.warn('[omegaBot] web search failed:', e.message) }
    }
    const ai = await handleFreeTextDeps.chatWithAI(systemPrompt + webContext, history, 'ru', { maxTokens: 700, temperature: 0.75 });
    let reply = handleFreeTextDeps.extractText(ai) || 'Извините, я временно недоступна. Попробуйте позже.';

    // [P2.1] Privacy Firewall — единый модуль utils/botPrivacy (фильтр исходящих)
    const sanitized = handleFreeTextDeps.sanitizeClientReply(reply)
    if (sanitized.blocked) {
      console.warn('[OMEGA-BOT][PRIVACY] blocked leak in reply:', reply.slice(0, 120))
      reply = sanitized.text
    }

    // Churn Guard — если клиент хочет уйти
    if (isChurnRisk) {
      reply = `😔 Мы ценим вас и хотим всё исправить.\n\n<b>OMEGACHURN30</b> — скидка 30% на 3 месяца + персональный onboarding.`;
      try {
        await handleFreeTextDeps.createTicket({
          userEmail: `tg_${chatId}@aiviral-studio.ru`,
          subject: '🔴 CHURN RISK — Клиент хочет уйти',
          description: `Клиент написал: "${text}"\nТон: ${clientTone}\nIntent: ${intent}\nНужен срочный retention-звонок/сообщение.`,
          telegramChatId: String(chatId)
        });
        await handleFreeTextDeps.updateDialogueOutcome(chatId, 'churn_risk');
      } catch (e) { console.error('Churn ticket failed:', e); }

      await getBot().sendMessage(chatId, `🛡 <b>Churn Guard</b>\n━━━━━━━━━━━━━━\n${reply}`, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [
          [{ text: '🎁 Активировать OMEGACHURN30', callback_data: 'discount:churn30' }],
          [{ text: '💬 Поговорить со специалистом', callback_data: 'support:urgent' }],
          [{ text: '📋 Меню', callback_data: 'menu:main' }]
        ]}
      });
      return;
    }

    // Smart Routing — определяем intent для inline keyboard
    const lowerReply = reply.toLowerCase();
    const lowerText = text.toLowerCase();
    const keyboard = [];
    let needsEscalation = reply.includes('ESCALATE') || needsEscalationByConfidence;

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
        await handleFreeTextDeps.createTicket({
          userEmail: `tg_${chatId}@aiviral-studio.ru`,
          subject: 'AI Escalation',
          description: `Клиент написал: "${text}"\nOMEGA не смогла ответить или вопрос требует оператора.`,
          telegramChatId: String(chatId)
        });
        await handleFreeTextDeps.updateDialogueOutcome(chatId, 'escalated');
      } catch (e) { console.error('Escalation ticket failed:', e); }
    }

    keyboard.push([{ text: '📋 Главное меню', callback_data: 'menu:main' }]);

    // Сохраняем ответ в историю (+ персист в MongoDB)
    global.clientDialogues[chatId].push({ role: 'assistant', content: reply, intent, time: Date.now() });
    handleFreeTextDeps.persistDialogueContext(chatId);

    const formattedReply = reply
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.+?)\*/g, '<i>$1</i>')
      .replace(/^(\d+)\.\s/gm, '$1️⃣ ')

    await getBot().sendMessage(chatId, `✦ <b>OMEGA</b> ✦\n━━━━━━━━━━━━━━\n${formattedReply}`, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });

    // [v9.9.17-ANTI-FAIL] feedback buttons
    try {
      const fb = await handleFreeTextDeps.saveFeedback({ userId: String(chatId), role: 'client', message: text, response: reply, context: 'telegram' });
      getBot().sendMessage(chatId, 'Оцените ответ:', {
        reply_markup: { inline_keyboard: [[
          { text: '👍', callback_data: `feedback:up:${fb._id}` },
          { text: '👎', callback_data: `feedback:down:${fb._id}` }
        ]]}
      });
    } catch (e) { console.error('Feedback save error:', e); }

    // Сохраняем диалог для обучения
    try {
      const dialogueMessages = global.clientDialogues[chatId].slice(-6).map(m => ({
        role: m.role,
        content: m.content,
        intent: m.role === 'user' ? detectIntent(m.content) : 'sales'
      }));
      await handleFreeTextDeps.saveDialogue(chatId, dialogueMessages, needsEscalation ? 'escalated' : 'pending', 'general');
    } catch (e) { console.error('Dialogue save error:', e); }

  } catch (e) {
    // [TG-FREETEXT-HOTFIX] ошибки кода не маскируем под «все провайдеры лежат» — лог + честный текст
    console.error('Free text chat error:', e);
    getBot().sendMessage(chatId, `⚠️ <b>Ошибка обработки сообщения</b>\n━━━━━━━━━━━━━━\nМы уже видим лог. Попробуйте ещё раз или обратитесь в поддержку.\n\n💬 Написать в поддержку — нажмите кнопку ниже.`, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '💬 Поддержка', callback_data: 'support:start' }], [{ text: '📋 Меню', callback_data: 'menu:main' }]] }
    });
  }
}

// [P16-FINAL] singleton to avoid duplicate polling / 409 conflict
let bot = global.omegaBotInstance || null
let started = global.omegaBotStarted || false
let initPromise = global.omegaBotInitPromise || null

const OMEGA_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_OMEGA_BOT_TOKEN
// [OWNER-REMOTE-CONTROL] chat_id владельца — через getOwnerChatId()/getOwnerChatIdSync() (OwnerSettings → env fallback)

// [v9.9.2-MASTER-FIX] client support state per chat
const supportState = global.omegaSupportState || new Map()
global.omegaSupportState = supportState

// [v9.9.5-TELEGRAM-UNIFIED] client video creation state per chat
const videoState = global.omegaVideoState || new Map()
global.omegaVideoState = videoState

// [P2.1 SLA-ЧЕСТНОСТЬ] ночь по МСК (00:00–07:59) — бот честно говорит, что он AI
export function isNightMsk() {
  const h = new Date(Date.now() + 3 * 3600 * 1000).getUTCHours()
  return h >= 0 && h < 8
}
export function slaHonestNote() {
  return isNightMsk()
    ? '\n\n🌙 <i>Я AI-ассистент OMEGA. Сейчас ночь — специалист подключится утром. Ваш запрос записан — повторять не придётся.</i>'
    : ''
}

// [P2.1 TAKEOVER] активный ручной диалог владельца с клиентом (AI молчит). Кэш 30 сек.
const takeoverCache = global.omegaTakeoverCache || new Map()
global.omegaTakeoverCache = takeoverCache
export async function getActiveTakeover(chatId) {
  const key = String(chatId)
  const cached = takeoverCache.get(key)
  if (cached && Date.now() - cached.at < 30000) return cached.ticketId ? cached : null
  try {
    const { default: SupportTicket } = await import('../models/SupportTicket.js')
    const t = await SupportTicket.findOne({ telegramChatId: key, takeoverBy: { $ne: null }, status: 'in_progress' }).select('_id takeoverBy').lean()
    const entry = { at: Date.now(), ticketId: t?._id?.toString() || null, ownerChatId: t?.takeoverBy || null }
    takeoverCache.set(key, entry)
    return entry.ticketId ? entry : null
  } catch {
    return null
  }
}
export function invalidateTakeoverCache(chatId) { takeoverCache.delete(String(chatId)) }

// [P2.1] антиспам rate-limit на AI-ответы свободного текста (4 сек на чат)
const freeTextRate = global.omegaFreeTextRate || new Map()
global.omegaFreeTextRate = freeTextRate

function createStubBot() {
  return {
    __isStub: true, // [OWNER-OMEGA] маркер заглушки — botReloader не трогает stub
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
  bot.sendMessage(chatId, `✦ <b>AI Viral Studio</b> ✦\n━━━━━━━━━━━━━━\n<i>OMEGA AI — ваш SMM-отдел</i>\n\nВыберите действие или просто напишите вопрос:`, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        // [P2.1] guided-кнопки первого уровня (до свободного текста)
        [{ text: '🔌 Подключить соцсеть', callback_data: 'guide:connect' }, { text: '🧾 Где мой чек', callback_data: 'guide:receipt' }],
        [{ text: '💎 Тарифы', callback_data: 'ad:prices' }, { text: '👤 Человек', callback_data: 'guide:human' }],
        [{ text: '🛒 Реклама в канале', callback_data: 'ad:start' }, { text: '💰 Скидки', callback_data: 'discount:list' }],
        [{ text: '🎬 Видео / Reels', callback_data: 'video:start' }, { text: '💬 Поддержка', callback_data: 'support:start' }],
        [{ text: '📊 Мои заказы', callback_data: 'ad:myorders' }, { text: '🚀 Перейти в приложение', url: 'https://aiviral-studio.ru' }]
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

// [19.17.8-NOTIFY-RESILIENCE] exported sender for system notifications to clients
export function sendClientMessage(chatId, text, options = {}) {
  if (!chatId) return Promise.resolve()
  return safeSendMessage(chatId, text, options)
}

// [MASTER-v5.6-CONT] OMEGA Bot with Owner Mode & Auto-Features
export const initOmegaBot = () => {
  if (initPromise) return initPromise
  initPromise = (async () => {
    if (started) { console.debug('[OMEGA-BOT] Already started, skipping'); return }
    started = true
    global.omegaBotStarted = true

    if (!OMEGA_TOKEN) {
      console.warn('[OMEGA-BOT] Skip: TELEGRAM_BOT_TOKEN / TELEGRAM_OMEGA_BOT_TOKEN missing')
      bot = createStubBot()
      global.omegaBotInstance = bot
      return
    }

  bot = new TelegramBot(OMEGA_TOKEN, { polling: false })
  wrapBotHtmlSending(bot, 'omega') // [v9.9.19.14] HTML валидация + plain fallback на всех sendMessage
  global.omegaBotInstance = bot
  global.omegaBot = bot
  console.log('[OMEGA-BOT] Created, preparing webhook')

  bot.deleteWebhook({ drop_pending_updates: true }).catch(() => {})

  updateBotMenu()

  bot.onText(/\/start(?:\s+(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const startParam = match?.[1];

    // [v9.9.19.7-SOCIAL-CONNECT-RESILIENT] deep-link привязка: ${clientBotUrl()}?start=connect_<token>
    if (startParam && /^connect_[a-f0-9]{24}$/i.test(startParam)) {
      try {
        const token = startParam.replace(/^connect_/, '');
        const userId = getConnectUserId(token);
        if (!userId) {
          bot.sendMessage(chatId, `⚠️ Не удалось привязать аккаунт — ссылка устарела. Откройте профиль в приложении и нажмите «Подключить Telegram» ещё раз.`, { parse_mode: 'HTML' });
          return;
        }
        const linked = await User.findByIdAndUpdate(
          userId,
          {
            telegramId: String(msg.from.id),
            telegramChatId: String(chatId),
            telegramUsername: msg.from.username || '',
            'socials.telegram.username': msg.from.username || String(msg.from.id),
            'socials.telegram.userId': String(msg.from.id),
            'socials.telegram.enabled': true,
          },
          { new: true }
        );
        if (linked) {
          bot.sendMessage(chatId, `✅ <b>Telegram подключён к AI Viral Studio!</b>\n━━━━━━━━━━━━━━\nАккаунт: <b>${linked.name || linked.email}</b>\n\nТеперь вы будете получать уведомления здесь. Можете писать мне — я отвечу как AI-ассистент 🤖`, { parse_mode: 'HTML' });
          return;
        }
        bot.sendMessage(chatId, `⚠️ Не удалось привязать аккаунт — ссылка устарела. Откройте профиль в приложении и нажмите «Подключить Telegram» ещё раз.`, { parse_mode: 'HTML' });
        return;
      } catch (e) {
        console.error('[OMEGA-BOT] start-link error:', e.message);
      }
    }

    // [P2.1] deep-link «Продолжить в Telegram» из SupportTab: ${clientBotUrl()}?start=support_<ticketId>
    if (startParam && /^support_[a-f0-9]{24}$/i.test(startParam)) {
      try {
        const ticketId = startParam.replace(/^support_/, '');
        const { default: SupportTicket } = await import('../models/SupportTicket.js');
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
          bot.sendMessage(chatId, '⚠️ Обращение не найдено. Напишите ваш вопрос здесь — я помогу.', { parse_mode: 'HTML' });
          return;
        }
        ticket.telegramChatId = String(chatId);
        ticket.updatedAt = new Date();
        await ticket.save();
        const { addMessage } = await import('./supportService.js');
        await addMessage(ticketId, 'system', 'Диалог продолжен в Telegram');
        bot.sendMessage(chatId, `💬 <b>Обращение #${ticketId.slice(-6)} продолжается здесь</b>\n━━━━━━━━━━━━━━\nТема: ${ticket.subject}\n\nПишите — я отвечу, а специалист уже видит этот диалог. Ответ придёт в этот чат.${slaHonestNote()}`, { parse_mode: 'HTML' });
        return;
      } catch (e) {
        console.error('[OMEGA-BOT] start support-link error:', e.message);
      }
    }

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
    const adNotifyChatId = await getOwnerChatId() // [OWNER-REMOTE-CONTROL]
    if (adNotifyChatId) ownerBot.sendMessage(adNotifyChatId, `🛒 <b>Новый заказ рекламы!</b>\n━━━━━━━━━━━━━━\nКлиент: @${msg.from.username || 'unknown'}\nID: ${chatId}\nТекст: ${adText.slice(0, 100)}...`, { parse_mode: 'HTML' })
    bot.sendMessage(chatId, `✅ <b>Заявка отправлена!</b>\n━━━━━━━━━━━━━━\nВладелец рассмотрит и свяжется с вами.`, { parse_mode: 'HTML' })
  })

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id
    const isOwner = String(chatId) === String(getOwnerChatIdSync())
    const help = isOwner
      ? `<b>👑 Owner Commands</b>\n\n/start — Главное меню\n/exec [задача] — Выполнить\n/feature [идея] — ТЗ для новой фичи\n/menu [описание] — Изменить меню\n/improve — Улучшить бота\n/help — Эта справка\n\n<i>Свободный текст — OMEGA выполнит как команду</i>`
      : `<b>🤖 OMEGA Help</b>\n\n/create_post — Создать пост\n/hook — Хук для видео\n/analyze — Анализ конкурента\n/plan — Контент-план\n/cover — AI-обложка\n/ideas — 3 идеи для контента\n/trends — Тренды ниши\n\n<i>Или просто напишите тему!</i>`
    safeSendMessage(chatId, help, { parse_mode: 'HTML' })
  })

  // [v9.9.19.6] /ideas — 3 content ideas with cards
  bot.onText(/\/ideas(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id
    const niche = (match[1] || 'smm').trim()
    try {
      bot.sendChatAction(chatId, 'typing')
      const result = await chatWithAI(`Предложи 3 идеи для коротких вирусных постов в нише "${niche}". Ответь строго: 1) ... 2) ... 3) ...`, [], 'ru', { maxTokens: 400 })
      const text = extractText(result) || '1) История клиента 2) Тренд дня 3) Челлендж'
      const ideas = text.split(/\n?\d+\)\s*/).filter(Boolean).slice(0, 3)
      const lines = ideas.map((idea, i) => `${i + 1}️⃣ <b>Идея ${i + 1}</b>\n${idea.trim()}`).join('\n\n')
      bot.sendMessage(chatId, `✦ <b>Идеи для ${niche}</b> ✦\n━━━━━━━━━━━━━━\n\n${lines}`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Выбрать идею 1', callback_data: 'idea:1' }, { text: '✅ Выбрать идею 2', callback_data: 'idea:2' }],
            [{ text: '✅ Выбрать идею 3', callback_data: 'idea:3' }, { text: '🔄 Ещё', callback_data: 'ideas:more' }]
          ]
        }
      })
    } catch (e) {
      safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`, { parse_mode: 'HTML' })
    }
  })

  // [v9.9.19.6] /trends — web search trends
  bot.onText(/\/trends(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id
    const niche = (match[1] || 'smm').trim()
    try {
      bot.sendChatAction(chatId, 'typing')
      const { getTrendingTopics, formatWebResultsLuxury } = await import('./webSearch.js')
      const trends = await getTrendingTopics(niche, 5)
      const lines = trends.map((t, i) => `${i + 1}️⃣ ${t}`).join('\n')
      bot.sendMessage(chatId, `🔥 <b>Тренды ${niche}</b>\n━━━━━━━━━━━━━━\n\n${lines || 'Тренды временно недоступны'}`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Создать пост по тренду', callback_data: 'trend:post' }, { text: '🔄 Обновить', callback_data: 'trends:refresh' }]
          ]
        }
      })
    } catch (e) {
      safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`, { parse_mode: 'HTML' })
    }
  })

  // OWNER MODE — авто-улучшение бота
  bot.onText(/\/improve/, async (msg) => {
    const chatId = msg.chat.id
    const isOwner = String(chatId) === String(getOwnerChatIdSync())
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

  // handleFreeText moved to module scope and exported above

  // [v9.9.19-MASTER-AUDIT] голосовые сообщения → Whisper STT (Groq/OpenAI) → обычный текстовый поток
  bot.on('voice', async (msg) => {
    const chatId = msg.chat.id
    try {
      try { await bot.sendChatAction(chatId, 'typing') } catch (e) {}
      const fileLink = await bot.getFileLink(msg.voice.file_id)
      const resp = await fetch(fileLink)
      const buffer = Buffer.from(await resp.arrayBuffer())
      const { transcribeAudio } = await import('./voiceService.js')
      const result = await transcribeAudio(buffer, 'voice.ogg', 'audio/ogg')
      if (!result.text) {
        bot.sendMessage(chatId, result.needsKey
          ? '🎤 <b>Голосовые скоро заработают</b>\n━━━━━━━━━━━━━━\nВладельцу нужно добавить ключ OpenAI или Groq в Кабинет → API Ключи.\nПока напишите текстом — я отвечу!'
          : '⚠️ Не удалось распознать голосовое. Попробуйте ещё раз или напишите текстом.', { parse_mode: 'HTML' })
        return
      }
      bot.sendMessage(chatId, `🎤 <i>Распознано:</i> «${result.text.slice(0, 200)}»`, { parse_mode: 'HTML' })
      // Дальше — как обычное текстовое сообщение (интенты, concierge, AI-диалог)
      bot.emit('message', { ...msg, text: result.text, voice: undefined })
    } catch (e) {
      console.error('[OMEGA-BOT] voice error:', e.message)
      bot.sendMessage(chatId, '⚠️ Ошибка обработки голосового. Напишите текстом, пожалуйста.').catch(() => {})
    }
  })

  // [v9.9.19.2-v4-CHANNEL-AUTO] приём подписчиков: auto-approve живых, decline спам-ботов.
  // NB: Bot API не отдаёт дату регистрации аккаунта — эвристики: пустой username, username/имя только из цифр.
  bot.on('chat_join_request', async (req) => {
    try {
      const user = req.from;
      const username = user.username || '';
      const name = `${user.first_name || ''}${user.last_name || ''}`.replace(/\s/g, '');
      const isSpamBot = !username || /^\d+$/.test(username) || /^\d+$/.test(name);
      if (isSpamBot) {
        await bot.declineChatJoinRequest(req.chat.id, user.id);
        console.log(`[CHANNEL-AUTO] join declined: id=${user.id} username=${username || 'none'} (spam heuristics)`);
        return;
      }
      await bot.approveChatJoinRequest(req.chat.id, user.id);
      console.log(`[CHANNEL-AUTO] join approved: @${username}`);
      bot.sendMessage(user.id, `Добро пожаловать в @${CHANNEL_USERNAME}! Я OMEGA — ассистент канала. Задавай вопросы в комментариях или пиши сюда.`).catch(() => {});
    } catch (e) {
      console.warn('[CHANNEL-AUTO] join request failed:', e.message);
    }
  });

  // [v9.9.19.2-v4-CHANNEL-AUTO] лимит авто-ответов в комментариях: не более 10 в час
  const commentRate = global.omegaCommentRate || { windowStart: Date.now(), count: 0 };
  global.omegaCommentRate = commentRate;

  // [v9.9.19.2-v4-CHANNEL-AUTO] сообщения дискуссионной группы канала: модерация + ответы на вопросы
  async function handleGroupMessage(msg) {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from || from.is_bot) return;
    const text = msg.text || msg.caption || '';

    // 8.4.4 исключения: владелец канала не модерируется
    const isExempt = isOwner(from.id) || String(from.id) === String(getOwnerChatIdSync());

    // 8.4.2-8.4.3 авто-модерация: запрещённые слова → delete + warn → ban
    if (!isExempt && text) {
      try {
        const { checkMessage } = await import('./moderationService.js');
        const verdict = await checkMessage({ userId: from.id, username: from.username, chatId, text });
        if (verdict.violation) {
          await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
          if (verdict.action === 'ban') {
            const until = Math.floor(Date.now() / 1000) + verdict.muteDurationHours * 3600;
            await bot.banChatMember(chatId, from.id, { until_date: until }).catch(() => {});
            bot.sendMessage(chatId, `⛔ @${from.username || from.id} ограничен на ${verdict.muteDurationHours}ч: повторные нарушения правил.`).catch(() => {});
          } else {
            bot.sendMessage(chatId, `⚠️ Сообщение удалено: нарушение правил (@${from.username || from.id}, предупреждение ${verdict.count}/${verdict.banThreshold})`).catch(() => {});
          }
          return;
        }
      } catch (e) { console.warn('[MODERATION] check failed:', e.message); }
    }

    if (!text) return;
    // 8.5.2 OMEGA отвечает на @упоминания и вопросы
    const isMention = text.includes(`@${CLIENT_BOT_USERNAME}`);
    const isQuestion = text.includes('?') || /^(как|почему|зачем|сколько|когда|что|где|какой|какие)\b/i.test(text.trim());
    if (!isMention && !isQuestion) return;

    // 8.5.4 лимит: не более 10 авто-ответов в час
    if (Date.now() - commentRate.windowStart > 3600000) { commentRate.windowStart = Date.now(); commentRate.count = 0; }
    if (commentRate.count >= 10) {
      console.log('[CHANNEL-AUTO] comment rate limit reached (10/h)');
      return;
    }
    commentRate.count++;

    // 8.5.3 эскалация владельцу: ценовая политика, сотрудничество, жалоба
    if (/цен[аы]|стоимост|тариф|сотруднич|жалоб|претензи|возврат/i.test(text)) {
      try {
        const { createTicket } = await import('./supportService.js');
        await createTicket({
          userEmail: `tg_${from.id}@aiviral-studio.ru`,
          subject: '💬 Эскалация из комментариев канала',
          description: `@${from.username || from.id} спросил: "${text.slice(0, 500)}"`,
          telegramChatId: String(from.id)
        });
        const { alertOwner } = await import('./ownerBot.js');
        alertOwner?.(`💬 Эскалация из комментариев\n@${from.username || from.id}: «${text.slice(0, 200)}»\nТикет создан.`);
        bot.sendMessage(chatId, 'Передала ваш вопрос владельцу — ответим лично 🙌', { reply_to_message_id: msg.message_id }).catch(() => {});
      } catch (e) { console.warn('[CHANNEL-AUTO] comment escalation failed:', e.message); }
      return;
    }

    // Ответ из Learning Graph + контекст последних постов канала
    try {
      const { getSkillFactsForContext } = await import('./skillService.js');
      const facts = await getSkillFactsForContext(3).catch(() => []);
      const factsBlock = facts.length ? `\nОпирайся на факты: ${facts.map(f => f.fact).join('; ')}` : '';
      let postsContext = '';
      try {
        const { default: ChannelConfig } = await import('../models/ChannelConfig.js');
        const cfg = await ChannelConfig.findOne({ active: true }).lean();
        const last = (cfg?.postsHistory || []).slice(-5).map(p => p.title).filter(Boolean);
        if (last.length) postsContext = `\nПоследние посты канала: ${last.join(' | ')}`;
      } catch { /* не критично */ }
      const ai = await chatWithAI(
        `Ты OMEGA — экспертный ассистент Telegram-канала @${CHANNEL_USERNAME} (AI, SMM, виральный контент). Ответь на комментарий подписчика: кратко (1-3 предложения), экспертно, лаконично, с мягким призывом к действию. Без markdown и звёздочек.${factsBlock}${postsContext}\n\nКомментарий: "${text.slice(0, 500)}"`,
        [], 'ru', { maxTokens: 300 }
      );
      const reply = extractText(ai).replace(/\*\*/g, '').trim();
      if (reply) bot.sendMessage(chatId, reply.slice(0, 800), { reply_to_message_id: msg.message_id }).catch(() => {});
    } catch (e) { console.warn('[CHANNEL-AUTO] comment reply failed:', e.message); }
  }

  // [v9.9.2-MASTER-FIX] client support flow + existing AI handler
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return
    const chatId = msg.chat.id
    const text = msg.text?.trim()
    const owner = isOwner(chatId)
    if (!text) return

    // [v9.9.19.2-v4-CHANNEL-AUTO] комментарии канала (дискуссионная группа) → модерация + ответы
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
      await handleGroupMessage(msg)
      return
    }

    // [P2.1 TAKEOVER] владелец ведёт диалог вручную — AI молчит, сообщения клиента ретранслируются владельцу
    if (!owner) {
      const takeover = await getActiveTakeover(chatId)
      if (takeover) {
        try {
          const { default: SupportTicket } = await import('../models/SupportTicket.js')
          await SupportTicket.findByIdAndUpdate(takeover.ticketId, {
            $push: { messages: { sender: 'client', text: text.slice(0, 2000), timestamp: new Date() } },
            $set: { updatedAt: new Date() }
          })
          const { default: ClientDialogue } = await import('../models/ClientDialogue.js')
          await ClientDialogue.findOneAndUpdate(
            { telegramChatId: String(chatId) },
            { $push: { messages: { role: 'user', content: text.slice(0, 2000), intent: 'support', timestamp: new Date() } }, $set: { updatedAt: new Date() } },
            { upsert: true }
          )
          const { alertOwner } = await import('./ownerBot.js')
          await alertOwner(`💬 <b>Клиент (тикет #${takeover.ticketId.slice(-6)}):</b>\n${text.slice(0, 1000)}`)
        } catch (e) { console.warn('[OMEGA-BOT] takeover relay failed:', e.message) }
        return
      }
    }

    // Support ticket flow for non-owners
    if (!owner && supportState.get(chatId)) {
      bot.sendChatAction(chatId, 'typing')
      try {
        const ticket = await createTicket({
          userEmail: `tg_${chatId}@aiviral-studio.ru`,
          userName: msg.chat.username || msg.chat.first_name || `Telegram ${chatId}`,
          subject: 'Telegram Support',
          description: text,
          telegramChatId: String(chatId),
          source: 'telegram'
        })
        let reply = `🎫 <b>Обращение #${ticket._id.toString().slice(-6)} создано</b>\n`
        if (ticket.aiSuggestion && ticket.status === 'ai_handled') {
          reply += `💡 <b>OMEGA совет:</b>\n${markdownToHtml(ticket.aiSuggestion)}\n\nПомогло?`
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
          bot.sendMessage(chatId, reply + slaHonestNote(), { parse_mode: 'HTML' })
        }
        supportState.delete(chatId)
      } catch (err) {
        console.error('[OMEGA-BOT] support ticket failed:', err.message)
        safeSendMessage(chatId, '⚠️ Не удалось создать обращение. Попробуйте позже.', { parse_mode: 'HTML' })
      }
      return
    }

    // [SUPPORT-PUSH-FIX] если у клиента уже есть открытый тикет — новые сообщения идут в него, AI молчит
    if (!owner) {
      try {
        const openTicket = await appendToOpenTicket(chatId, text)
        if (openTicket && openTicket.status !== 'ai_handled') {
          safeSendMessage(chatId, `✅ Сообщение добавлено к обращению #${openTicket._id.toString().slice(-6)}. Специалист увидит его в этом чате.`, { parse_mode: 'HTML' })
          return
        }
      } catch (e) { console.warn('[OMEGA-BOT] append to open ticket failed:', e.message) }
    }

    // [v9.9.5-TELEGRAM-UNIFIED] client video topic collection
    if (!owner && videoState.get(chatId)?.step === 'awaiting_topic') {
      bot.sendMessage(chatId, `🎬 <b>Сценарий готов!</b>\n━━━━━━━━━━━━━━\nХук: "Как ${msg.text} за 24 часа?"\n\n👇 Создать видео в приложении:\nhttps://aiviral-studio.ru/video-creator`, { parse_mode: 'HTML' })
      videoState.delete(chatId)
      return
    }

    // Intent detection for clients
    const intent = detectActionIntent(text);
    if (['post', 'ticket', 'image', 'video', 'status', 'report'].includes(intent.action)) {
      const result = await executeAction({ intent, text, chatId, userRole: 'client', bot });
      await recordOutcome({ userId: chatId, intent: intent.intent, action: intent.action, success: result.success, error: result.error, metadata: result });
      return;
    }

    // [v9.9.20] Concierge: booking / order / purchase
    const conciergeIntent = ['booking', 'order', 'purchase'].includes(intent.action) || /(забронируй|закажи|оплатить|тариф|подписка)/i.test(text);
    if (conciergeIntent) {
      try {
        const user = await User.findOne({ telegramId: String(msg.from.id) });
        const result = await handleConciergeRequest(user?._id || chatId, text);
        safeSendMessage(chatId, result.message, { parse_mode: 'HTML' });
        return;
      } catch (e) {
        console.error('[OMEGA-BOT] concierge error:', e.message);
      }
    }

    if (!owner) {
      if (text && text.trim()) {
        // [P2.1] сначала база знаний: точное попадание → ответ из FAQ (не выдумка), нет — дальше в AI-поток
        try {
          const hit = await findFaqAnswer(text, 2)
          if (hit) {
            const dlg = await getDialogueContext(chatId)
            dlg.push({ role: 'user', content: text, time: Date.now() }, { role: 'assistant', content: hit.article.answer, time: Date.now() })
            persistDialogueContext(chatId)
            bot.sendMessage(chatId, `💡 ${hit.article.answer}`, {
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [
                [{ text: '👍 Помогло', callback_data: 'faq:helped' }, { text: '👤 Человек', callback_data: 'guide:human' }],
                [{ text: '📋 Меню', callback_data: 'menu:main' }]
              ] }
            })
            return
          }
        } catch (e) { console.warn('[omegaBot] FAQ lookup failed:', e.message) }
        // [v9.9.19.2-v4-CHANNEL-AUTO] FAQ-автоответ из Learning Graph (изученные навыки), не generic-текст.
        // Сложное → дальше в handleFreeText (там эскалация владельцу через тикет).
        if (/цен[аы]|сколько стоит|тариф|как подключить|поддержка/i.test(text)) {
          try {
            const { getSkillFactsForContext } = await import('./skillService.js');
            const facts = await getSkillFactsForContext(4).catch(() => []);
            if (facts.length) {
              const ai = await chatWithAI(
                `Ты OMEGA — ассистент AI Viral Studio. Ответь на вопрос клиента, опираясь ТОЛЬКО на эти изученные факты (ничего не выдумывай): ${facts.map(f => f.fact).join('; ')}\n\nКратко (2-4 предложения), по делу, с призывом к действию. Без markdown.\n\nВопрос: "${text.slice(0, 300)}"`,
                [], 'ru', { maxTokens: 400 }
              );
              const reply = extractText(ai).replace(/\*\*/g, '').trim();
              if (reply && reply.length > 20) {
                safeSendMessage(chatId, reply, { parse_mode: 'HTML' });
                return;
              }
            }
          } catch (e) { console.warn('[omegaBot] FAQ skills answer failed:', e.message); }
        }
        await handleFreeText(chatId, text, msg.from?.username);
      } else {
        sendClientMenu(chatId);
      }
      return
    }

    // Owner fallback — smart OMEGA reply
    bot.sendChatAction(chatId, 'typing')

    try {
      // [v9.9.19.3] FIX: был options-объект на месте lang + JSON.stringify всего ответа в чат
      const result = await chatWithAI(text, [], 'ru', {
        userRole: 'owner',
        context: 'telegram_owner_chat'
      })

      const textToFormat = extractText(result) || 'Принято.'
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
      bot.sendMessage(chatId, `💬 <b>Поддержка</b>\nОпишите проблему одним сообщением. OMEGA ответит или передаст оператору.${slaHonestNote()}`, { parse_mode: 'HTML' })
      return
    }

    // [P2.1] CSAT 1–5 после закрытия тикета
    if (data.startsWith('csat:')) {
      const [, ticketId, scoreRaw] = data.split(':')
      const score = parseInt(scoreRaw, 10)
      try {
        const { default: SupportTicket } = await import('../models/SupportTicket.js')
        const ticket = await SupportTicket.findByIdAndUpdate(ticketId, { csat: score, csatAt: new Date(), updatedAt: new Date() }, { new: true })
        bot.sendMessage(chatId, score >= 4 ? '🙏 Спасибо за высокую оценку! Рады помочь.' : '🙏 Спасибо за оценку — мы учтём её, чтобы стать лучше.', { parse_mode: 'HTML' })
        if (ticket && score <= 2) {
          const { alertOwner } = await import('./ownerBot.js')
          const { buildTakeoverSummary } = await import('./supportService.js')
          const summary = await buildTakeoverSummary(ticket).catch(() => '')
          await alertOwner(`⚠️ <b>Низкая оценка поддержки: ${score}/5</b>\nТикет #${ticketId.slice(-6)}\n${summary}`)
        }
      } catch (e) { console.error('[OMEGA-BOT] csat failed:', e.message) }
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: q.message.message_id }).catch(() => {})
      return
    }
    if (data.startsWith('feedback:up:') || data.startsWith('feedback:down:')) {
      const [, rating, id] = data.split(':');
      await rateFeedback(id, rating === 'up' ? '👍' : '👎');
      bot.answerCallbackQuery(q.id, { text: 'Спасибо за оценку!' });
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: q.message.message_id }).catch(() => {});
      return;
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
          // [P2.1] CSAT после закрытия
          bot.sendMessage(chatId, 'Оцените, пожалуйста, помощь (1–5):', {
            reply_markup: { inline_keyboard: [[1, 2, 3, 4, 5].map(n => ({ text: String(n), callback_data: `csat:${ticketId}:${n}` }))] }
          });
        } catch (e) { console.error('Ticket resolve failed:', e); }
      }
      else if (action === 'escalate') {
        bot.sendMessage(chatId, `⏳ Передаю оператору. Ожидайте ответа...${slaHonestNote()}`, { parse_mode: 'HTML' });
        try {
          const { updateTicketStatus } = await import('./supportService.js');
          await updateTicketStatus(ticketId, 'needs_owner');
          const ownerBot = new TelegramBot(process.env.TELEGRAM_OWNER_BOT_TOKEN, { polling: false });
          await ownerBot.sendMessage(await getOwnerChatId(), `🔴 <b>Клиент недоволен ответом AI!</b>\n━━━━━━━━━━━━━━\nТикет #${ticketId.slice(-6)}\nТребуется оператор.\n👁 <a href="https://aiviral-studio.ru/owner?tab=tickets">Открыть в Dashboard</a>`, { parse_mode: 'HTML', disable_web_page_preview: true });
        } catch (e) { console.error('Escalation notify failed:', e); }
      }
      return
    }

    // [v9.9.5-TELEGRAM-UNIFIED] client luxury menu callbacks
    // [P2.1] guided-кнопки первого уровня
    if (data === 'guide:connect') {
      bot.sendMessage(chatId, `🔌 <b>Подключение соцсети</b>\n━━━━━━━━━━━━━━\nКабинет → Настройки → YouTube → «Подключить» — откроется окно Google, выберите канал и разрешите доступ.\n\nПосле подключения видео из Планировщика публикуются автоматически.\n\n👇 Открыть настройки:\nhttps://aiviral-studio.ru/settings?tab=youtube`, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '👍 Понятно', callback_data: 'faq:helped' }, { text: '👤 Человек', callback_data: 'guide:human' }], [{ text: '📋 Меню', callback_data: 'menu:main' }]] }
      })
      return
    }
    if (data === 'guide:receipt') {
      bot.sendMessage(chatId, `🧾 <b>Где мой чек</b>\n━━━━━━━━━━━━━━\nЧек приходит на email сразу после оплаты (проверьте «Спам»).\nИстория платежей и повторная отправка чека: Кабинет → Настройки → Платежи.\n\nНе пришёл? Напишите нам — поможем.`, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '👍 Понятно', callback_data: 'faq:helped' }, { text: '💬 Написать в поддержку', callback_data: 'support:start' }], [{ text: '📋 Меню', callback_data: 'menu:main' }]] }
      })
      return
    }
    if (data === 'guide:human') {
      try {
        const { createTicket } = await import('./supportService.js')
        const ticket = await createTicket({
          userEmail: `tg_${chatId}@aiviral-studio.ru`,
          userName: q.from?.username || q.from?.first_name || `Telegram ${chatId}`,
          subject: '👤 Клиент просит оператора',
          description: 'Клиент нажал «Человек» в меню бота и просит живого оператора.',
          telegramChatId: String(chatId),
          source: 'telegram'
        })
        bot.sendMessage(chatId, `👤 <b>Записал ваш запрос</b>\n━━━━━━━━━━━━━━\nЯ AI-ассистент OMEGA — специалист подключится к диалогу здесь, в Telegram. Номер обращения: #${ticket._id.toString().slice(-6)}. Повторять не придётся.${slaHonestNote()}`, { parse_mode: 'HTML' })
      } catch (e) {
        console.error('[OMEGA-BOT] guide:human ticket failed:', e.message)
        bot.sendMessage(chatId, '⚠️ Не удалось создать обращение. Напишите ваш вопрос текстом — я передам специалисту.', { parse_mode: 'HTML' })
      }
      return
    }
    if (data === 'faq:helped') {
      bot.answerCallbackQuery(q.id, { text: 'Рады помочь! 🙌' }).catch(() => {})
      bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '📋 Меню', callback_data: 'menu:main' }]] }, { chat_id: chatId, message_id: q.message.message_id }).catch(() => {})
      return
    }

    if (!owner) {
      if (data === 'ad:start') {
        const prices = getAdPricing()
        let text = `🛒 <b>Реклама в канале @${CHANNEL_USERNAME}</b>\n━━━━━━━━━━━━━━\n`
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
      if (data === 'ideas:more') {
        bot.emit('message', { chat: { id: chatId }, text: '/ideas', from: { id: chatId } })
        return
      }
      if (data === 'trends:refresh') {
        bot.emit('message', { chat: { id: chatId }, text: '/trends', from: { id: chatId } })
        return
      }
      if (data.startsWith('idea:')) {
        const idx = data.split(':')[1]
        bot.sendMessage(chatId, `✅ <b>Идея ${idx} выбрана</b>\n━━━━━━━━━━━━━━\nНапишите, для какой ниши — и я сгенерирую пост.`, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: '📝 Создать пост', callback_data: 'post:start' }, { text: '📋 Меню', callback_data: 'menu:main' }]] }
        })
        return
      }
      if (data === 'ad:myorders') {
        bot.sendMessage(chatId, `📊 <b>Ваши заказы</b>\n━━━━━━━━━━━━━━\nУ вас пока нет активных заказов.\nСоздать: /ad`, { parse_mode: 'HTML' })
        return
      }
      if (data === 'ad:prices') {
        // [P1.6-PREP] живые тарифы из PlanConfig (кэш ≤60 сек), формат сообщения прежний
        try {
          const { getCachedPlansForBot } = await import('./planDisplayService.js')
          const lines = await getCachedPlansForBot()
          bot.sendMessage(chatId, `💎 <b>Тарифы приложения</b>\n━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━\nhttps://aiviral-studio.ru/pricing`, { parse_mode: 'HTML' })
        } catch (e) {
          console.warn('[omegaBot] plans fetch failed:', e.message)
          bot.sendMessage(chatId, `💎 <b>Тарифы приложения</b>\n━━━━━━━━━━━━━━\nАктуальные тарифы — на сайте:\nhttps://aiviral-studio.ru/pricing`, { parse_mode: 'HTML' })
        }
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

  async function trySetWebhook(attempt = 1) {
    try {
      await bot.deleteWebhook({ drop_pending_updates: true })
      // [security-hardening Б5-З2.1] secret_token — чужие запросы отсекаются на приёме (403)
      const secret = getTgWebhookSecret()
      await bot.setWebhook(WEBHOOK_URL, secret ? { secret_token: secret } : {})
      console.log('[OMEGA-BOT] Webhook set to', WEBHOOK_URL)
      return true
    } catch (e) {
      if (String(e.message).includes('409') && attempt < 3) {
        console.warn(`[OMEGA-BOT] Webhook 409 conflict, retry ${attempt}/3 in 20s`)
        await new Promise(r => setTimeout(r, 20000))
        return trySetWebhook(attempt + 1)
      }
      console.error('[OMEGA-BOT] Webhook failed, falling back to polling:', e.message)
      bot.stopPolling?.()
      bot.startPolling?.()
      scheduleWebhookRestore()
      return false
    }
  }

  function scheduleWebhookRestore() {
    if (global.omegaWebhookRestoreCron) return
    import('node-cron').then(({ default: cron }) => {
      global.omegaWebhookRestoreCron = cron.schedule('*/30 * * * *', async () => {
        console.log('[OMEGA-BOT] cron: retrying webhook from polling fallback')
        try {
          await bot.deleteWebhook({ drop_pending_updates: true })
          // [security-hardening Б5-З2.1] secret_token при восстановлении webhook из polling
          const secret = getTgWebhookSecret()
          await bot.setWebhook(WEBHOOK_URL, secret ? { secret_token: secret } : {})
          console.log('[OMEGA-BOT] Webhook restored from polling')
          bot.stopPolling?.()
          global.omegaWebhookRestoreCron.stop?.()
          global.omegaWebhookRestoreCron = null
        } catch (e) {
          console.warn('[OMEGA-BOT] cron: webhook restore failed:', e.message)
        }
      })
    }).catch(() => {})
  }

  trySetWebhook()
  })().catch(e => {
    console.error('[OMEGA-BOT] init error:', e.message)
  })
  global.omegaBotInitPromise = initPromise
  return initPromise
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
  const chatId = await getOwnerChatId() // [OWNER-REMOTE-CONTROL]
  const b = getOmegaBot()
  if (!chatId || !b || typeof b.sendMessage !== 'function') return
  try {
    await safeSendMessage(chatId, `🤖 OMEGA Alert:\n${message}`)
  } catch (e) {
    console.error('[omegaBot] alert failed:', e.message)
  }
}

// [v9.9.19.15.8] Send a notification to a client's Telegram chat via the OMEGA bot.
export async function sendClientNotification(chatId, text) {
  if (!chatId) return
  const b = getOmegaBot()
  if (!b || typeof b.sendMessage !== 'function') return
  try {
    await safeSendMessage(chatId, text)
  } catch (e) {
    console.error('[omegaBot] client notification failed:', e.message)
  }
}

const omegaBot = null
export { omegaBot }
export default { alertOmega, getOmegaBot, sendClientNotification, omegaBot }
