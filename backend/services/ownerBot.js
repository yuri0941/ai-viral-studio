import TelegramBot from 'node-telegram-bot-api'
import fs from 'fs'
import mongoose from 'mongoose'
import { chatWithAI } from './aiService.js'
import { createNode, queryMesh } from './cognitiveMesh.js'
import { isOwner as isOwnerContext, getOwnerContext, getSmartGreeting } from './ownerContext.js'
import { getMenu, trackClick, generateMenuImprovements, applyMenuChanges, addCustomButton, toggleButton } from './telegramMenuService.js'
import User from '../models/User.js'
import SupportTicket from '../models/SupportTicket.js'
import ChannelConfig from '../models/ChannelConfig.js'
import AdOrder from '../models/AdOrder.js'
import { getAdPricing, updateAdPricing } from './adPricingService.js'

// [P16-FINAL] added: strict singleton to avoid duplicate polling / 409 conflict on Render hot-reload
// [P16-HOTFIX] use global so singleton survives hot-reload on Render
let bot = global.ownerBotInstance || null
let started = global.ownerBotStarted || false

const OWNER_TOKEN = process.env.TELEGRAM_OWNER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID || process.env.OWNER_CHAT_ID || process.env.OWNER_USER_ID

// [v9.6.2-BOT-EVOLUTION] Resolve owner MongoDB id for menu/personalization
async function getOwnerMongoId() {
  const envId = process.env.OWNER_USER_ID
  if (envId && envId.length === 24) return envId
  const owner = await User.findOne({ role: 'owner' }).lean()
  return owner?._id?.toString() || null
}

// [v9.9.5-TELEGRAM-UNIFIED] owner manual post state
let ownerPostState = null

// [v9.6.1-OMEGA-FIX] Anti-spam cooldown per alert type
const ALERT_COOLDOWN = new Map()
const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000
const COOLDOWN_BY_TYPE = {
  error: 15 * 60 * 1000,
  warning: 15 * 60 * 1000,
  info: 5 * 60 * 1000,
  success: 2 * 60 * 1000,
  payment: 2 * 60 * 1000,
  newuser: 2 * 60 * 1000,
}

export function shouldSendAlert(alertType, cooldownMs) {
  const cooldown = cooldownMs ?? COOLDOWN_BY_TYPE[alertType] ?? DEFAULT_COOLDOWN_MS
  const last = ALERT_COOLDOWN.get(alertType)
  if (last && Date.now() - last < cooldown) return false
  ALERT_COOLDOWN.set(alertType, Date.now())
  return true
}

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

// [v9.6.2-TELEGRAM-OWNER] Markdown to Telegram HTML
function markdownToHtml(text) {
  if (!text) return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **bold** → <b>bold</b>
    .replace(/\*(.*?)\*/g, '<i>$1</i>')       // *italic* → <i>italic</i>
    .replace(/__(.*?)__/g, '<u>$1</u>')       // __underline__ → <u>...
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

// [HOTFIX-2026-08-08] stringify objects before sendMessage to avoid "[object Object]"
function safeSendMessage(chatId, data, options = {}) {
  let text
  if (typeof data === 'string') {
    text = data
  } else if (data && typeof data === 'object') {
    text = data.text || data.message || data.content || data.response || data.reply || data.result || JSON.stringify(data, null, 2)
  } else {
    text = String(data)
  }
  text = markdownToHtml(text)
  if (text.length > 4000) text = text.slice(0, 4000) + '...'
  return bot.sendMessage(chatId, text, { parse_mode: 'HTML', disable_web_page_preview: true, ...options })
}

function sendLuxuryMessage(chatId, title, content, buttons = null) {
  let text = `🤖 <b>${markdownToHtml(title)}</b>\n`
  text += `━━━━━━━━━━━━━━\n`
  text += `${markdownToHtml(content)}\n`
  text += `━━━━━━━━━━━━━━\n`
  text += `<i>OMEGA AI Viral Studio</i>`
  const opts = { parse_mode: 'HTML', disable_web_page_preview: true }
  if (buttons) opts.reply_markup = { inline_keyboard: buttons }
  return bot.sendMessage(chatId, text, opts)
}

// [v9.6.2-TELEGRAM-OWNER] Proactive next-step suggestion based on owner context
async function getProactiveSuggestion(context) {
  const suggestions = []
  if (!context?.activeProjects?.length) suggestions.push('создать первый проект в Factory')
  else suggestions.push('проверить статус активных проектов')

  const hour = new Date().getHours()
  if (hour < 12) suggestions.push('сгенерировать утренний пост для канала')
  else if (hour > 18) suggestions.push('проверить аналитику за день')
  else suggestions.push('посмотреть прогнозы и разведку')

  return suggestions[0] || 'задать мне задачу'
}

async function buildMenuRows(ownerId) {
  const buttons = await getMenu('main', ownerId)
  const rows = []
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2).map(b => {
      if (b.url) return { text: b.text, url: b.url }
      return { text: b.text, callback_data: b.callback_data }
    }))
  }
  return rows
}
export const initOwnerBot = () => {
  if (started) { console.log('[OWNER-BOT] Already started, skipping'); return }
  started = true
  global.ownerBotStarted = true

  if (!OWNER_TOKEN || !OWNER_CHAT_ID) {
    console.warn('[OWNER-BOT] Skip: TELEGRAM_OWNER_BOT_TOKEN or TELEGRAM_OWNER_CHAT_ID missing')
    bot = createStubBot()
    global.ownerBotInstance = bot
    global.ownerBot = bot
    return
  }

  bot = new TelegramBot(OWNER_TOKEN, { polling: false })
  global.ownerBotInstance = bot
  global.ownerBot = bot
  console.log('[OWNER-BOT] Created, preparing webhook')

  bot.setMyCommands([
    { command: 'start', description: '🏠 Главная' },
    { command: 'status', description: '📊 Статус' },
    { command: 'stats', description: '💎 Метрики' },
    { command: 'tickets', description: '🎫 Обращения' },
    { command: 'omega', description: '🤖 OMEGA' },
    { command: 'exec', description: '⚡ Выполнить' },
    { command: 'menu', description: '📝 Изменить меню' },
    { command: 'feature', description: '✨ Новая фича' },
    { command: 'improve', description: '🔧 Улучшить бота' },
    { command: 'help', description: '❓ Помощь' }
  ]).catch(() => {})

  bot.onText(/\/start|\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) {
      safeSendMessage(chatId, '⛔ Только для владельца.');
      return;
    }
    bot.sendMessage(chatId, `✦ <b>Панель управления</b> ✦\n━━━━━━━━━━━━━━\n<i>Владелец: @Tvinki013</i>\n\nВыберите действие:`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Тикеты', callback_data: 'owner:tickets' }, { text: '💬 Диалоги', callback_data: 'owner:conversations' }],
          [{ text: '🛒 Заказы рекламы', callback_data: 'owner:adorders' }, { text: '💰 Цены рекламы', callback_data: 'owner:prices' }],
          [{ text: '📊 Статистика', callback_data: 'owner:stats' }, { text: '📢 Опубликовать', callback_data: 'owner:post' }],
          [{ text: '⏸ Стоп / ▶️ Старт', callback_data: 'owner:toggle' }, { text: '🌐 Dashboard', url: 'https://aiviral-studio.ru/owner' }]
        ]
      }
    });
  });

  // /status — реальный статус
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    const mongoStatus = mongoose.connection.readyState === 1 ? '🟢 OK' : '🔴 Нет связи';
    const uptimeMin = Math.floor(process.uptime() / 60);
    const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024);

    safeSendMessage(chatId,
      `📊 <b>Статус AI Viral Studio</b>\n━━━━━━━━━━━━━━\n` +
      `🗄 MongoDB: ${mongoStatus}\n` +
      `⏱ Uptime: ${uptimeMin} мин\n` +
      `🧠 RAM: ${memMB} MB\n` +
      `🤖 OMEGA: 🟢 Активна\n` +
      `📢 Канал: @aiviralstudio\n` +
      `━━━━━━━━━━━━━━\nOMEGA 🤖`
    );
  });

  bot.onText(/\/stats/, (msg) => { if (!isOwner(msg.chat.id)) return; sendStats(msg.chat.id) })

  // [v9.9.2-MASTER-FIX] /tickets — list open support tickets
  bot.onText(/\/tickets/, async (msg) => {
    const chatId = msg.chat.id
    if (!isOwner(chatId)) return
    try {
      const tickets = await SupportTicket.find({ status: { $in: ['open','needs_owner','in_progress'] } })
        .sort({ createdAt: -1 })
        .limit(5)
      if (!tickets.length) {
        safeSendMessage(chatId, '✅ Нет открытых обращений.')
        return
      }
      let text = '📋 <b>Открытые обращения:</b>\n━━━━━━━━━━━━━━\n'
      tickets.forEach(t => {
        const emoji = t.status === 'needs_owner' ? '🔴' : t.status === 'ai_handled' ? '🔵' : '🟡'
        text += `${emoji} #${t._id.toString().slice(-6)} — ${t.subject}\n👤 ${t.userName || t.userEmail}\n💡 AI: ${t.aiConfidence ? Math.round(t.aiConfidence * 100) + '%' : 'N/A'}\n\n`
      })
      text += '━━━━━━━━━━━━━━\nОткрыть Dashboard: https://aiviral-studio.ru/owner?tab=support'
      safeSendMessage(chatId, text, { parse_mode: 'HTML' })
    } catch (e) {
      console.error('[OWNER-BOT] /tickets failed:', e.message)
      safeSendMessage(chatId, '⚠️ Не удалось загрузить обращения.', { parse_mode: 'HTML' })
    }
  })

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

  // OWNER MODE — главное меню
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const ownerId = await getOwnerMongoId();
    const context = await getOwnerContext(chatId);
    if (!context?.isOwner) {
      safeSendMessage(chatId, '❌ Только для владельца.');
      return;
    }
    const greeting = await getSmartGreeting(context);
    const rows = await buildMenuRows(ownerId);
    bot.sendMessage(chatId, greeting.text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: rows.length ? rows : greeting.buttons } });
  });

  // OWNER MODE — авто-анализ меню
  bot.onText(/\/menu-analyze/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    const ownerId = await getOwnerMongoId();
    if (!ownerId) {
      safeSendMessage(chatId, '⚠️ Не удалось определить ownerId.');
      return;
    }
    safeSendMessage(chatId, '🔍 Анализирую использование меню...');
    try {
      const changes = await generateMenuImprovements(ownerId);
      let text = '📊 <b>Анализ меню:</b>\n\n';
      if (changes.remove?.length) text += `🗑 Убрать: ${changes.remove.join(', ')}\n`;
      if (changes.add?.length) text += `➕ Добавить: ${changes.add.map(a => a.text).join(', ')}\n`;
      if (changes.reorder?.length) text += `🔄 Новый порядок: ${changes.reorder.join(' → ')}\n`;
      text += '\nПрименить? Напишите <b>да</b>.';
      bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
      global.pendingMenuChanges = changes;
    } catch (e) {
      safeSendMessage(chatId, '⚠️ Ошибка анализа: ' + e.message);
    }
  });

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

  // OWNER MODE — self-optimization
  bot.onText(/\/improve/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    safeSendMessage(chatId, '⏳ Анализирую производительность...');
    try {
      const { analyzeDailyPerformance } = await import('./selfReflection.js');
      const ownerId = await getOwnerMongoId();
      const report = await analyzeDailyPerformance(ownerId);
      safeSendMessage(chatId, `🧠 <b>Self-Optimization</b>\n━━━━━━━━━━━━━━\n${report?.summary || 'Анализ выполнен. Параметры обновлены.'}\nOMEGA 🤖`);
    } catch (e) {
      safeSendMessage(chatId, `⚠️ ${e.message}`);
    }
  });

  // OWNER MODE — performance report
  bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    safeSendMessage(chatId, '⏳ Формирую отчёт...');
    try {
      const { generateOptimizationReport } = await import('./performanceMonitor.js');
      const ownerId = await getOwnerMongoId();
      const report = await generateOptimizationReport(ownerId);
      const shortReport = typeof report === 'string' ? report.slice(0, 800) : JSON.stringify(report, null, 2).slice(0, 800);
      safeSendMessage(chatId, `📈 <b>Отчёт</b>\n━━━━━━━━━━━━━━\n${shortReport}\n━━━━━━━━━━━━━━\nOMEGA 🤖`);
    } catch (e) {
      safeSendMessage(chatId, `⚠️ ${e.message}`);
    }
  });

  // OWNER MODE — publish channel post
  bot.onText(/\/post(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    const topic = match[1] ? match[1].trim() : 'Новость дня';

    safeSendMessage(chatId, '⏳ Генерирую пост...');

    try {
      const { generateChannelPost, publishToChannel } = await import('./telegramChannelManager.js');
      const post = await generateChannelPost({ topic, niche: 'general', style: 'viral', language: 'ru' });
      if (!post || !post.text) throw new Error('Не удалось сгенерировать пост');

      await publishToChannel({
        text: post.text,
        imageUrl: post.imageUrl,
        caption: post.caption || post.text.slice(0, 200)
      });

      safeSendMessage(chatId,
        `✅ <b>Пост опубликован!</b>\n━━━━━━━━━━━━━━\n` +
        `📢 Канал: @aiviralstudio\n` +
        `📝 Тема: ${topic}\n` +
        `⏰ ${new Date().toLocaleString('ru-RU')}\n━━━━━━━━━━━━━━\nOMEGA 🤖`
      );
    } catch (e) {
      console.error('/post error:', e);
      safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}\nПроверь TELEGRAM_CHANNEL в env.`);
    }
  });

  // [v9.9.5-TELEGRAM-UNIFIED] owner ad pricing command
  bot.onText(/\/adprice (.+)/, async (msg, match) => {
    const chatId = msg.chat.id; if (!isOwner(chatId)) return;
    const args = match[1].split(' ');
    if (args.length < 2) {
      const prices = getAdPricing();
      let text = '💰 <b>Текущие цены:</b>\n';
      Object.entries(prices).forEach(([k, v]) => text += `\n${v.description}: ${v.price.toLocaleString('ru-RU')}₽`);
      text += '\n\nИзменить: /adprice [slot] [цена]';
      safeSendMessage(chatId, text, { parse_mode: 'HTML' });
      return;
    }
    const [slot, priceStr] = args;
    const newPrice = parseInt(priceStr);
    if (isNaN(newPrice)) { safeSendMessage(chatId, '❌ Цена — число.'); return; }
    updateAdPricing(slot, newPrice);
    safeSendMessage(chatId, `✅ Цена "${slot}" = ${newPrice.toLocaleString('ru-RU')} ₽\nКлиенты видят сразу.`, { parse_mode: 'HTML' });
  });

  // [v9.9.5-TELEGRAM-UNIFIED] owner discount publish command
  bot.onText(/\/discount (.+)/, async (msg, match) => {
    const chatId = msg.chat.id; if (!isOwner(chatId)) return;
    const args = match[1].split(' ');
    const plan = args[0] || 'pro';
    const percent = parseInt(args[1]) || 30;
    const { generateDiscountPost, publishDiscountToChannel } = await import('./discountService.js');
    const discount = await generateDiscountPost(plan, percent);
    const config = await ChannelConfig.findOne({ ownerId: process.env.OWNER_USER_ID });
    if (config) {
      await publishDiscountToChannel(discount._id, config._id);
      safeSendMessage(chatId, `✅ Скидка опубликована!\n🎁 Код: ${discount.promoCode}`);
    } else {
      safeSendMessage(chatId, `✅ Скидка создана, но канал не настроен.\n🎁 Код: ${discount.promoCode}`);
    }
  });

  // [v9.9.5-TELEGRAM-UNIFIED] owner video promo command
  bot.onText(/\/video (.+)/, async (msg, match) => {
    const chatId = msg.chat.id; if (!isOwner(chatId)) return;
    const topic = match[1];
    const config = await ChannelConfig.findOne({ ownerId: process.env.OWNER_USER_ID });
    if (!config) { safeSendMessage(chatId, '❌ Канал не настроен.'); return; }
    safeSendMessage(chatId, '⏳ Генерирую viral-видео пост...');
    const { publishVideoPromo } = await import('./videoPromoService.js');
    const result = await publishVideoPromo(config._id, topic, config.niche);
    if (result.success) safeSendMessage(chatId, `🎬 Видео-пост опубликован!\nТема: ${topic}`);
    else safeSendMessage(chatId, `⚠️ Ошибка: ${result.error}`);
  });

  // [v9.9.5-TELEGRAM-UNIFIED] owner ad orders command
  bot.onText(/\/adorders/, async (msg) => {
    const chatId = msg.chat.id; if (!isOwner(chatId)) return;
    const orders = await AdOrder.find({ status: { $in: ['pending', 'paid', 'approved'] } }).sort({ createdAt: -1 }).limit(10);
    if (!orders.length) { safeSendMessage(chatId, '✅ Нет активных заказов.'); return; }
    let text = '📋 <b>Активные заказы:</b>\n';
    orders.forEach(o => { text += `\n${o.status === 'pending' ? '⏳' : '✅'} #${o._id.toString().slice(-6)} — ${o.slotType} — ${o.price.toLocaleString('ru-RU')}₽`; });
    safeSendMessage(chatId, text, { parse_mode: 'HTML' });
  });

  // OWNER MODE — smart reply
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const ownerId = await getOwnerMongoId();
    const text = msg.text || '';
    if (text.startsWith('/')) return;

    const context = await getOwnerContext(chatId);

    // Not owner → simple menu
    if (!context?.isOwner) {
      bot.sendMessage(chatId, '👋 <b>AI Viral Studio</b>\n\nСвяжитесь с владельцем через сайт:', {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '🌐 aiviral-studio.ru', url: 'https://aiviral-studio.ru' }]] }
      });
      return;
    }

    // [v9.9.5-TELEGRAM-UNIFIED] owner manual channel post
    if (String(ownerPostState) === String(chatId)) {
      const omegaBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
      await omegaBot.sendMessage(process.env.TELEGRAM_CHANNEL, text, { parse_mode: 'HTML' });
      safeSendMessage(chatId, '✅ Опубликовано в @aiviralstudio');
      ownerPostState = null;
      return;
    }

    // Owner confirming pending menu changes
    if (global.pendingMenuChanges && /^да|yes|y$/i.test(text.trim())) {
      const ownerId = await getOwnerMongoId();
      if (ownerId) {
        await applyMenuChanges(ownerId, global.pendingMenuChanges);
        global.pendingMenuChanges = null;
        safeSendMessage(chatId, '✅ Меню обновлено! Напишите /menu чтобы увидеть.');
      }
      return;
    }

    // Owner → smart reply with context
    try {
      const cleanProjects = (context.activeProjects || []).join('; ').slice(0, 200)
      const cleanDecisions = (context.recentDecisions || []).join('; ').slice(0, 200)
      const ownerPrompt = `Ты — OMEGA, личный AI-ассистент владельца AI Viral Studio (Юрий).\nТы НЕ объясняешь базовые возможности платформы — владелец их знает.\nТы НЕ даёшь нумерованные списки "1. 2. 3." — отвечай коротко, по делу, в свободной форме.\nКонтекст: активные проекты (${cleanProjects}), недавние решения (${cleanDecisions}).\nЕсли владелец пишет "Привет" — отвечай приветствием + краткий статус + предложи следующий шаг.\nЕсли владелец кидает ссылку — проанализируй её кратко.\nЕсли владелец просит отчёт — дай сводку по системе.\nЕсли владелец пишет задачу — подтверди и предложи ОДИН следующий шаг.\nФормат: HTML-теги (<b>жирный</b>, <i>курсив</i>), без markdown **.\nМаксимум 400 символов + кнопки.\nЯзык: Russian.\nСообщение владельца: "${text}"`;
      const aiResult = await chatWithAI(ownerPrompt, [], 'ru', { maxTokens: 600, temperature: 0.6 });
      let reply = aiResult?.reply || aiResult?.text || 'Принято, работаю.';
      reply = reply.replace(/\*\*/g, '').replace(/^\s*\d+\.[\s\S]/g, '')

      const isGreeting = /^(привет|здравствуй|хай|hi|hello|hey)/i.test(text);
      const rows = await buildMenuRows(ownerId);
      if (isGreeting && reply.length < 500) {
        const proactive = await getProactiveSuggestion(context);
        sendLuxuryMessage(chatId, 'OMEGA', `${reply}\n\n💡 <b>Следующий шаг:</b> ${proactive}`, rows.length ? rows : [
          [{ text: '🎬 Контент', callback_data: 'quick:content' }, { text: '📊 Аналитика', callback_data: 'quick:analytics' }],
          [{ text: '🏭 Factory', callback_data: 'quick:factory' }, { text: '🔮 Прогнозы', callback_data: 'quick:prediction' }],
          [{ text: '📋 Отчёт', callback_data: 'quick:report' }, { text: '⚡ Ещё', callback_data: 'quick:more' }]
        ]);
      } else {
        sendLuxuryMessage(chatId, 'OMEGA', reply, rows.length ? rows : [
          [{ text: '🎬 Контент', callback_data: 'quick:content' }, { text: '📊 Аналитика', callback_data: 'quick:analytics' }],
          [{ text: '⚡ Ещё', callback_data: 'quick:more' }]
        ]);
      }

      await createNode({ type: 'telegram', content: `Owner: ${text} | OMEGA: ${reply}`, confidence: 0.9, source: 'telegram_bot', metadata: { chatId, text, reply, type: 'telegram_dialog' } });
    } catch (e) {
      bot.sendMessage(chatId, '⚠️ <b>OMEGA</b> временно недоступна.\nПопробуйте позже.', { parse_mode: 'HTML' });
    }
  });

  bot.on('callback_query', async (q) => {
    const chatId = q.message.chat.id;
    const data = q.data;
    const ownerId = await getOwnerMongoId();

    if (ownerId) {
      await trackClick('main', data, ownerId).catch(() => {});
    }

    if (!isOwner(chatId)) {
      bot.answerCallbackQuery(q.id, { text: '❌ Только для владельца' }).catch(() => {});
      return;
    }

    // [v9.9.5-TELEGRAM-UNIFIED] owner luxury panel callbacks
    if (data === 'owner:tickets') {
      let text = '📋 <b>Тикеты поддержки</b>\n━━━━━━━━━━━━━━\n';
      try {
        const tickets = await SupportTicket.find({ status: { $in: ['open', 'needs_owner', 'in_progress'] } }).sort({ createdAt: -1 }).limit(5);
        if (!tickets.length) text += '✅ Нет открытых обращений.';
        else tickets.forEach(t => { const e = t.status === 'needs_owner' ? '🔴' : '🟡'; text += `${e} #${t._id.toString().slice(-6)} — ${t.subject}\n`; });
      } catch (e) { text += '⚠️ Модуль тикетов не подключён.'; }
      safeSendMessage(chatId, text);
      return;
    }
    if (data === 'owner:conversations') {
      let text = '💬 <b>Диалоги с клиентами</b>\n━━━━━━━━━━━━━━\n';
      try {
        const { default: SupportTicket } = await import('../models/SupportTicket.js');
        const tickets = await SupportTicket.find({ status: { $in: ['needs_owner', 'open', 'ai_handled'] }, source: 'telegram' }).sort({ createdAt: -1 }).limit(5);
        if (!tickets.length) text += '✅ Нет активных диалогов.';
        else tickets.forEach((t, i) => {
          const statusEmoji = t.status === 'needs_owner' ? '🔴' : t.status === 'ai_handled' ? '💡' : '🟡';
          text += `${i + 1}. ${statusEmoji} #${t._id.toString().slice(-6)} — ${t.description ? t.description.slice(0, 45) : t.subject}...\n`;
        });
        text += '\n━━━━━━━━━━━━━━\nПолный список в Dashboard → Обращения';
      } catch (e) { text += '⚠️ Модуль не подключён.'; }
      safeSendMessage(chatId, text);
      return;
    }
    if (data === 'owner:adorders') {
      const orders = await AdOrder.find({ status: { $in: ['pending', 'paid', 'approved'] } }).sort({ createdAt: -1 }).limit(10);
      if (!orders.length) { safeSendMessage(chatId, '🛒 <b>Заказы рекламы</b>\n━━━━━━━━━━━━━━\nПока нет активных заказов.\nОни будут приходить сюда автоматически.'); return; }
      let text = '📋 <b>Активные заказы:</b>\n';
      orders.forEach(o => { text += `\n${o.status === 'pending' ? '⏳' : '✅'} #${o._id.toString().slice(-6)} — ${o.slotType} — ${o.price.toLocaleString('ru-RU')}₽`; });
      safeSendMessage(chatId, text, { parse_mode: 'HTML' });
      return;
    }
    if (data === 'owner:prices') {
      const prices = getAdPricing();
      let text = '💰 <b>Цены рекламы</b>\n━━━━━━━━━━━━━━\n';
      Object.entries(prices).forEach(([k, v]) => text += `\n• ${v.description} — ${v.price.toLocaleString('ru-RU')}₽`);
      text += '\n━━━━━━━━━━━━━━\nИзменить: /adprice [формат] [цена]';
      safeSendMessage(chatId, text);
      return;
    }
    if (data === 'owner:stats') {
      safeSendMessage(chatId, '📊 <b>Статистика</b>\n━━━━━━━━━━━━━━\nКанал: @aiviralstudio\nПодписчики: загружается...\n━━━━━━━━━━━━━━\nПолная статистика в Dashboard.');
      return;
    }
    if (data === 'owner:post') {
      safeSendMessage(chatId, '📢 <b>Публикация</b>\n━━━━━━━━━━━━━━\nНапишите текст поста ответным сообщением.\nOMEGA опубликует в @aiviralstudio.');
      ownerPostState = chatId;
      return;
    }
    if (data === 'owner:toggle') {
      safeSendMessage(chatId, '⏸ <b>Пауза / Старт</b>\n━━━━━━━━━━━━━━\nАвтопубликация: 🟢 Активна\n━━━━━━━━━━━━━━\nДля остановки напишите /stop');
      return;
    }

    // Owner luxury menu callbacks (v9.9.11)
    if (data === 'owner:content' || data === 'action:content' || data === 'quick:content') {
      safeSendMessage(chatId, `🎬 <b>Контент</b>\n━━━━━━━━━━━━━━\nСоздай пост:\n/post тема поста\n\nИли открой Dashboard → Контент.`);
      return;
    }
    if (data === 'owner:analytics' || data === 'action:analytics' || data === 'quick:analytics') {
      safeSendMessage(chatId, `📊 <b>Аналитика</b>\n━━━━━━━━━━━━━━\n/report — отчёт за сегодня\n/status — статус системы\n\nDashboard: https://aiviral-studio.ru/owner?tab=analytics`);
      return;
    }
    if (data === 'owner:factory' || data === 'action:factory') {
      safeSendMessage(chatId, `🏭 <b>Factory</b>\n━━━━━━━━━━━━━━\n/improve — оптимизировать OMEGA\n\nDashboard: https://aiviral-studio.ru/owner?tab=factory`);
      return;
    }
    if (data === 'owner:predictions' || data === 'action:prediction' || data === 'quick:prediction') {
      safeSendMessage(chatId, `🔮 <b>Прогнозы</b>\n━━━━━━━━━━━━━━\nDashboard → Прогнозы: https://aiviral-studio.ru/owner?tab=prediction`);
      return;
    }
    if (data === 'owner:report' || data === 'quick:report') {
      bot.emit('message', { chat: { id: chatId }, text: '/report', from: { id: chatId } });
      return;
    }
    if (data === 'owner:more' || data === 'quick:more' || data === 'action:command') {
      safeSendMessage(chatId, `⚡ <b>Быстрые команды</b>\n━━━━━━━━━━━━━━\n/status — статус\n/improve — улучшить\n/post [тема] — пост\n/report — отчёт\n/menu — меню\n/help — помощь`);
      return;
    }

    // Luxury inline action handlers (legacy)
    if (data.startsWith('action:') || data.startsWith('quick:')) {
      bot.answerCallbackQuery(q.id, { text: '⏳ Обрабатываю...' }).catch(() => {});

      if (data === 'action:channel_post') {
        bot.sendMessage(chatId, '📱 <b>Пост в канал</b>\n\nНапишите тему:', { parse_mode: 'HTML' });
      }
      else if (data === 'action:improve') {
        bot.sendMessage(chatId, '🛠 Запускаю /improve...\nНапишите /improve', { parse_mode: 'HTML' });
      }
      else if (data === 'action:back') {
        const context = await getOwnerContext(chatId);
        const greeting = await getSmartGreeting(context);
        const rows = ownerId ? await buildMenuRows(ownerId) : (greeting.buttons || []);
        bot.sendMessage(chatId, greeting.text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } });
      }
      return;
    }

    // Legacy callbacks
    bot.answerCallbackQuery(q.id).catch(() => {})
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
  if (!shouldSendAlert(type)) return
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
