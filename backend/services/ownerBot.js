import TelegramBot from 'node-telegram-bot-api'
import { getTgWebhookSecret } from '../utils/tgWebhookSecret.js' // [security-hardening Б5-З2.1]
import fs from 'fs'
import mongoose from 'mongoose'
import { chatWithAI, extractText } from './aiService.js'
import { generateChannelPost, generateWeeklyCalendar, publishToChannel } from './channelManager.js'
import { publishToChannel as telegramPublish, getChannelStats as getTgChannelStats } from './telegramChannelManager.js'
import { buildKeyDigest } from './dailyReport.js'
import { createNode, queryMesh } from './cognitiveMesh.js'
import { isOwner as isOwnerContext, getOwnerContext, getSmartGreeting } from './ownerContext.js'
import { getMenu, trackClick, generateMenuImprovements, applyMenuChanges, addCustomButton, toggleButton } from './telegramMenuService.js'
import User from '../models/User.js'
import SupportTicket from '../models/SupportTicket.js'
import ChannelConfig from '../models/ChannelConfig.js'
import AdOrder from '../models/AdOrder.js'
import { getAdPricing, updateAdPricing } from './adPricingService.js'
import { detectIntent } from '../ai/omega/intentEngine.js'
import { executeAction } from '../ai/omega/actionEngine.js'
import { recordOutcome } from '../ai/omega/learningEngine.js'
import { ROLE_INSTRUCTIONS } from '../ai/omega/contextEngine.js'
import { submitOwnerCommand, getCommandsLog } from './commandExecutor.js'
import { wrapBotHtmlSending } from '../utils/telegramHtml.js'
import PlanConfig from '../models/PlanConfig.js'
import AdPricing from '../models/AdPricing.js'
import PriceChangeLog from '../models/PriceChangeLog.js'
import { analyzePricing, marginAfter } from './pricingAnalysis.js'
import { getOwnerChatId, getOwnerChatIdSync } from '../models/OwnerSettings.js' // [OWNER-REMOTE-CONTROL]
import { OWNER_BOT_USERNAME, CHANNEL_USERNAME, CLIENT_BOT_USERNAME, OWNER_TELEGRAM_USERNAME, OWNER_NAME } from '../config/bots.js'
import { handleBatchCallback, handleBatchRejectReason } from './batchReport.js' // [TG-REPORT-HOOK]
import { handleAskCallback, handleAskFreeText } from './askOwner.js' // [TG-ASK-OWNER]
import { isProdWebhookHost, getBotBaseUrl } from '../utils/tgWebhookGuard.js' // [TG-ASK-OWNER ЗАДАЧА 0]

// [P16-FINAL] added: strict singleton to avoid duplicate polling / 409 conflict on Render hot-reload
// [P16-HOTFIX] use global so singleton survives hot-reload on Render
let bot = global.ownerBotInstance || null
let started = global.ownerBotStarted || false
let initPromise = global.ownerBotInitPromise || null

const OWNER_TOKEN = process.env.TELEGRAM_OWNER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
// [OWNER-REMOTE-CONTROL] chat_id владельца — через getOwnerChatId()/getOwnerChatIdSync()
// (OwnerSettings.ownerTelegramChatId → env fallback), прямых чтений process.env здесь больше нет.

// [v9.6.2-BOT-EVOLUTION] Resolve owner MongoDB id for menu/personalization
async function getOwnerMongoId() {
  const envId = process.env.OWNER_USER_ID
  if (envId && envId.length === 24) return envId
  const owner = await User.findOne({ role: 'owner' }).lean()
  return owner?._id?.toString() || null
}

// [v9.9.5-TELEGRAM-UNIFIED] owner manual post state
const ownerPostState = () => global.ownerPostState || null
global.ownerPostState = global.ownerPostState || null

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
    __isStub: true, // [OWNER-OMEGA] маркер заглушки — botReloader не трогает stub
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

// [v9.9.19.6] typing effect before AI-heavy replies
async function withTyping(chatId, fn) {
  try { await bot.sendChatAction(chatId, 'typing') } catch (e) {}
  const result = await fn()
  return result
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
  if (initPromise) return initPromise
  initPromise = (async () => {
    if (started) { console.debug('[OWNER-BOT] Already started, skipping'); return }
    started = true
    global.ownerBotStarted = true

  if (!OWNER_TOKEN || !getOwnerChatIdSync()) {
    console.warn('[OWNER-BOT] Skip: TELEGRAM_OWNER_BOT_TOKEN or owner chat id missing')
    bot = createStubBot()
    global.ownerBotInstance = bot
    global.ownerBot = bot
    return
  }
  // [OWNER-REMOTE-CONTROL] прогреваем кэш chat_id из OwnerSettings (hot-reload смены TG)
  getOwnerChatId(true).catch(() => {})

  bot = new TelegramBot(OWNER_TOKEN, { polling: false })
  wrapBotHtmlSending(bot, 'owner') // [v9.9.19.14] HTML валидация + plain fallback на всех sendMessage
  global.ownerBotInstance = bot
  global.ownerBot = bot
  console.log('[OWNER-BOT] Created, preparing webhook')

  bot.setMyCommands([
    { command: 'start', description: '🏠 Главная' },
    { command: 'status', description: '📊 Статус' },
    { command: 'stats', description: '💎 Метрики' },
    { command: 'tickets', description: '🎫 Обращения' },
    { command: 'omega', description: '🤖 OMEGA' },
    { command: 'keystatus', description: '🔑 Ключи ИИ' },
    { command: 'exec', description: '⚡ Выполнить' },
    { command: 'menu', description: '📝 Изменить меню' },
    { command: 'feature', description: '✨ Новая фича' },
    { command: 'improve', description: '🔧 Улучшить бота' },
    { command: 'help', description: '❓ Помощь' }
  ]).catch(() => {})

  // [v9.9.19-MASTER-AUDIT] только /start — /menu обрабатывается ниже отдельным умным меню (иначе дубль ответа)
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) {
      safeSendMessage(chatId, '⛔ Только для владельца.');
      return;
    }
    bot.sendMessage(chatId, `✦ <b>Панель управления</b> ✦\n━━━━━━━━━━━━━━\n<i>Владелец: @${OWNER_TELEGRAM_USERNAME}</i>\n\nВыберите действие:`, {
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

  // /status — luxury real-time status card
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    const mongoStatus = mongoose.connection.readyState === 1 ? '🟢' : '🔴';
    const uptimeMin = Math.floor(process.uptime() / 60);
    const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const aiStatus = '🟢';

    const text = [
      `✦ <b>AI Viral Studio — Status</b> ✦`,
      `<pre><code>`,
      `🗄  MongoDB    ${mongoStatus} OK`,
      `⏱  Uptime     ${uptimeMin} min`,
      `🧠  RAM        ${memMB} MB`,
      `🤖  OMEGA      ${aiStatus} Active`,
      `📢  Channel    @${CHANNEL_USERNAME}`,
      `</code></pre>`,
      `━━━━━━━━━━━━━━`,
      `<i>OMEGA Command Center</i>`
    ].join('\n');

    safeSendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 Метрики', callback_data: 'stats' }, { text: '🤖 OMEGA', callback_data: 'omega' }],
          [{ text: '🌐 Dashboard', url: 'https://aiviral-studio.ru/owner' }]
        ]
      }
    });
  });

  bot.onText(/\/stats/, (msg) => { if (!isOwner(msg.chat.id)) return; sendStats(msg.chat.id) })

  // [v9.9.19.14.4] /keystatus — AI keys digest on demand
  bot.onText(/\/keystatus/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    try {
      const section = await buildKeyDigest();
      safeSendMessage(chatId, `🔑 <b>Статус ключей ИИ</b>${section || '\n⚠️ Не удалось построить сводку'}`, { parse_mode: 'HTML' });
    } catch (e) {
      console.error('[OWNER-BOT] /keystatus failed:', e.message);
      safeSendMessage(chatId, '⚠️ Не удалось загрузить статус ключей.', { parse_mode: 'HTML' });
    }
  })

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
    await withTyping(chatId, async () => {
      try {
        const result = await chatWithAI(`Владелец просит выполнить: ${command}. Ответь кратко, что сделано или что нужно для этого.`, [], { userRole: 'owner', context: 'telegram_owner_exec' })
        safeSendMessage(chatId, `✅ <b>Результат:</b>\n\n${result.text || result}`, { parse_mode: 'HTML' })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`, { parse_mode: 'HTML' })
      }
    });
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

  // OWNER MODE — Project Factory
  bot.onText(/\/factory(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    const desc = match[1] ? match[1].trim() : 'новый проект AI Viral Studio';
    safeSendMessage(chatId, `🏭 Генерирую проект: <i>${desc}</i>...`, { parse_mode: 'HTML' });
    try {
      const { generateProject } = await import('../ai/omega/projectFactory.js');
      const { exportProject } = await import('../ai/omega/projectFactory.js');
      const project = await generateProject({ description: desc, type: 'auto', stack: 'Vite+React+Node', ownerId: getOwnerChatIdSync() });
      project.variants.forEach((variant, i) => {
        bot.sendMessage(chatId, `📁 <b>Вариант ${i+1}</b>: ${variant.name}\n👁 Preview: <a href="${variant.preview}">открыть</a>`, { parse_mode: 'HTML' }).catch(() => {});
      });
      const zip = await exportProject(project.variants[0], 'zip');
      await bot.sendDocument(chatId, Buffer.from(zip), {}, { filename: 'project.zip' });
    } catch (e) {
      console.error('[OWNER-BOT] /factory error:', e);
      safeSendMessage(chatId, `⚠️ Ошибка Factory: ${e.message}`);
    }
  });

  // OWNER MODE — Emergency Stop
  bot.onText(/\/stop/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    // [v9.9.19.3] реальный стоп, а не просто текст
    const { setEmergencyStop } = await import('../routes/admin.js');
    setEmergencyStop(true);
    safeSendMessage(chatId, '🛑 <b>Emergency Stop</b>\n━━━━━━━━━━━━━━\nВсе AI-операции приостановлены (реально).\nДля возобновления: /resume', { parse_mode: 'HTML' });
  });

  // [v9.9.19.3] снятие emergency stop из бота
  bot.onText(/\/resume/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    const { setEmergencyStop } = await import('../routes/admin.js');
    setEmergencyStop(false);
    safeSendMessage(chatId, '▶️ <b>OMEGA возобновила работу</b>\nВсе AI-операции активны.', { parse_mode: 'HTML' });
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
      // [v9.9.19.3] никакого сырого JSON в чат
      const shortReport = typeof report === 'string'
        ? report.slice(0, 800)
        : (report?.summary || report?.text || report?.message || '✅ Отчёт сформирован. Полная версия — в Dashboard → Аналитика.');
      safeSendMessage(chatId, `📈 <b>Отчёт</b>\n━━━━━━━━━━━━━━\n${shortReport}\n━━━━━━━━━━━━━━\nOMEGA 🤖`);
    } catch (e) {
      safeSendMessage(chatId, `⚠️ ${e.message}`);
    }
  });

  // OWNER MODE — publish channel post with AI cover
  bot.onText(/\/post(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    const topic = match[1] ? match[1].trim() : 'Новость дня';

    await withTyping(chatId, async () => {
      try {
        // [v9.9.19.6] люкс-пост через postBuilder: HTML без **, обложка, whitelist-ссылки, self-audit
        const { publishLuxuryPost } = await import('./postBuilder.js');
        const pub = await publishLuxuryPost({ topic, niche: 'general', tone: 'уверенный экспертный' });
        if (!pub?.success) throw new Error(pub?.error || 'Публикация не удалась');
        // [v9.9.19.2-v4] команда владельца приоритетнее автопоста — помечаем ручную публикацию
        import('./telegramChannelManager.js').then(m => m.markManualChannelPost()).catch(() => {});

        safeSendMessage(chatId,
          `✅ <b>Пост опубликован!</b>\n━━━━━━━━━━━━━━\n` +
          `📢 Канал: ${pub.channel}\n` +
          `📝 Тема: ${topic}\n` +
          `🖼 Медиа: ${pub.mediaType}\n` +
          (pub.appliedSkills?.length ? `🧠 Навыки: ${pub.appliedSkills.join(', ')}\n` : '') +
          (pub.url ? `🔗 <a href="${pub.url}">Открыть пост</a>\n` : `🔎 message_id: ${pub.messageId}\n`) +
          `⏰ ${new Date().toLocaleString('ru-RU')}\n━━━━━━━━━━━━━━\nOMEGA 🤖`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '✏️ Ещё пост', callback_data: 'owner:post' }, { text: '📊 Статус', callback_data: 'status' }]
              ]
            }
          }
        );
      } catch (e) {
        console.error('/post error:', e);
        safeSendMessage(chatId, `⚠️ ${e.message}`);
      }
    });
  });

  // [v9.9.19.3] скрытая диагностика канала в один клик
  // [v9.9.19.14] 5.4 end-to-end: права (getChatMember, force) → HTML → доставка; ответ — точная причина
  bot.onText(/\/posttest/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    safeSendMessage(chatId, '⏳ Тестирую связь с каналом...');
    try {
      const { checkChannelRights } = await import('./telegramChannelManager.js');
      const rights = await checkChannelRights(true);
      if (!rights.ok && rights.reason === 'no_rights') {
        safeSendMessage(chatId, `❌ <b>Нет прав на публикацию</b>\n━━━━━━━━━━━━━━\nБот не админ канала или нет права «Публикация сообщений».\nКанал → Управление → Администраторы → @${CLIENT_BOT_USERNAME} → включить «Публикация сообщений» ✅\nПосле включения напишите /posttest`);
        return;
      }
      if (!rights.ok && rights.reason === 'no_config') {
        safeSendMessage(chatId, '❌ <b>Канал не настроен</b>\n━━━━━━━━━━━━━━\nДобавьте telegram_bot и telegram_chat_id в Кабинет → API Ключи.');
        return;
      }
    } catch (e) {
      console.warn('/posttest rights check failed:', e.message);
    }
    const pub = await telegramPublish({ text: `✅ <b>Тест связи от OMEGA</b>\n\n⏰ ${new Date().toLocaleString('ru-RU')}\nЕсли вы видите этот пост в канале — публикация работает.` }, { skipRightsCheck: true });
    if (pub?.success) {
      safeSendMessage(chatId,
        `✅ <b>Пост доставлен!</b>\n━━━━━━━━━━━━━━\n📢 ${pub.channel}\n🔢 message_id: ${pub.messageId}` +
        (pub.url ? `\n🔗 <a href="${pub.url}">Открыть пост</a>` : ''));
    } else {
      safeSendMessage(chatId, `❌ <b>Публикация не удалась</b>\n━━━━━━━━━━━━━━\n${pub?.error || 'Неизвестная ошибка'}`);
    }
  });

  // [v9.9.19.2-v4-CHANNEL-AUTO] форсировать автопост вне расписания (как в слоте 08/14/20 MSK)
  bot.onText(/\/autoposttest/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    safeSendMessage(chatId, '⏳ OMEGA выбирает тему и собирает автопост...');
    try {
      const { autoPostNow } = await import('./telegramChannelManager.js');
      const r = await autoPostNow({ force: true });
      if (r?.success) {
        safeSendMessage(chatId,
          `✅ <b>Автопост опубликован</b>\n━━━━━━━━━━━━━━\n📝 Тема: ${r.topic}\n🎯 Источник: ${r.source}` +
          (r.url ? `\n🔗 <a href="${r.url}">Открыть пост</a>` : ''));
      } else {
        safeSendMessage(chatId, `⚠️ Автопост не удался: ${r?.error || r?.reason || 'unknown'}`);
      }
    } catch (e) {
      safeSendMessage(chatId, `⚠️ ${e.message}`);
    }
  });

  // [v9.9.19.2-v4-CHANNEL-AUTO] тестовое голосование в канале (native Telegram poll)
  bot.onText(/\/polltest/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    try {
      const { sendChannelPoll } = await import('./telegramChannelManager.js');
      const r = await sendChannelPoll({ force: true });
      if (r?.success) {
        safeSendMessage(chatId,
          `🗳 <b>Голосование опубликовано</b>\n━━━━━━━━━━━━━━\n${r.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\nЧерез 24ч OMEGA закроет опрос и опубликует пост-победитель.`);
      } else {
        safeSendMessage(chatId, `⚠️ Голосование не удалось: ${r?.error || r?.reason || 'unknown'}`);
      }
    } catch (e) {
      safeSendMessage(chatId, `⚠️ ${e.message}`);
    }
  });

  // [v9.9.19.2-v4-CHANNEL-AUTO] управление модерацией канала
  bot.onText(/\/moderation(?:\s+(\w+))?(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    const sub = (match[1] || '').toLowerCase();
    const arg = (match[2] || '').trim();
    try {
      const mod = await import('./moderationService.js');
      if (sub === 'add' && arg) {
        await mod.addBannedWord(arg);
        safeSendMessage(chatId, `✅ Слово «${arg.toLowerCase()}» добавлено в запрещённые.`);
        return;
      }
      if ((sub === 'del' || sub === 'remove') && arg) {
        await mod.removeBannedWord(arg);
        safeSendMessage(chatId, `✅ Слово «${arg.toLowerCase()}» удалено из запрещённых.`);
        return;
      }
      if (sub === 'threshold' && /^\d+$/.test(arg)) {
        const cfg = await mod.setBanThreshold(Number(arg));
        safeSendMessage(chatId, `✅ Бан теперь после ${cfg.banThreshold} нарушений.`);
        return;
      }
      if (sub === 'log') {
        const logs = await mod.getRecentLogs(20);
        const lines = logs.map(l => `• ${l.action === 'ban' ? '⛔' : '⚠️'} @${l.username || l.userId} — ${l.reason} (${new Date(l.createdAt).toLocaleString('ru-RU')})`);
        safeSendMessage(chatId, `🛡 <b>Журнал модерации (последние 20)</b>\n━━━━━━━━━━━━━━\n${lines.join('\n') || 'Нарушений пока нет.'}`);
        return;
      }
      const cfg = await mod.getModerationConfig();
      safeSendMessage(chatId,
        `🛡 <b>Модерация канала</b>\n━━━━━━━━━━━━━━\n` +
        `🚫 Запрещённые слова: ${cfg.bannedWords.join(', ') || '—'}\n` +
        `🔢 Бан после: ${cfg.banThreshold} нарушений\n` +
        `⏳ Мут: ${cfg.muteDurationHours}ч\n━━━━━━━━━━━━━━\n` +
        `<code>/moderation add слово</code> — добавить\n` +
        `<code>/moderation del слово</code> — удалить\n` +
        `<code>/moderation threshold 3</code> — порог бана\n` +
        `<code>/moderation log</code> — журнал (последние 20)`,
        { parse_mode: 'HTML' });
    } catch (e) {
      safeSendMessage(chatId, `⚠️ ${e.message}`);
    }
  });

  // [v9.9.20] Channel manager: /channel [type] [topic]
  bot.onText(/\/channel(?:\s+(\w+))?(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;
    const type = (match[1] || 'value').toLowerCase();
    const topic = match[2] ? match[2].trim() : 'Новость дня';

    safeSendMessage(chatId, `⏳ Собираю люкс-пост типа "${type}"...`);
    try {
      // [v9.9.19.6] через postBuilder: HTML, обложка, рабочие ссылки
      const { publishLuxuryPost } = await import('./postBuilder.js');
      const pub = await publishLuxuryPost({ topic, tone: type === 'promo' ? 'продающий' : 'уверенный экспертный' });
      if (!pub?.success) throw new Error(pub?.error || 'Не удалось опубликовать пост');
      // [v9.9.19.2-v4] ручная публикация приоритетнее автопоста
      import('./telegramChannelManager.js').then(m => m.markManualChannelPost()).catch(() => {});

      safeSendMessage(chatId,
        `✅ <b>Пост опубликован!</b>\n━━━━━━━━━━━━━━\n` +
        `📢 Канал: ${pub.channel || `@${CHANNEL_USERNAME}`}\n` +
        `📝 Тип: ${type}\n` +
        `📝 Тема: ${topic}\n` +
        (pub.url ? `🔗 <a href="${pub.url}">Открыть пост</a>\n` : '') +
        `⏰ ${new Date().toLocaleString('ru-RU')}\n━━━━━━━━━━━━━━\nOMEGA 🤖`
      );
    } catch (e) {
      console.error('/channel error:', e);
      safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}\nПроверь TELEGRAM_CHANNEL в env.`);
    }
  });

  // [v9.9.20] Weekly calendar: /calendar
  bot.onText(/\/calendar/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(chatId)) return;

    safeSendMessage(chatId, '⏳ Генерирую календарь на неделю...');
    try {
      const calendar = await generateWeeklyCalendar({ niche: 'general', language: 'ru' });
      let text = '📅 <b>Календарь контента на неделю</b>\n━━━━━━━━━━━━━━\n';
      calendar.forEach((day, i) => {
        text += `${i + 1}. ${day.date} · ${day.type.toUpperCase()}\n${day.title}\n\n`;
      });
      text += '━━━━━━━━━━━━━━\n<i>OMEGA 🤖</i>';
      safeSendMessage(chatId, text);
    } catch (e) {
      console.error('/calendar error:', e);
      safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`);
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

  // [v9.9.19.6] /commands — реальный журнал команд из OmegaCommand (MongoDB)
  bot.onText(/\/commands/, async (msg) => {
    const chatId = msg.chat.id; if (!isOwner(chatId)) return;
    try {
      const { cmds, total, done, rate } = await getCommandsLog(chatId, 20);
      if (!cmds.length) { safeSendMessage(chatId, '📜 <b>Журнал команд пуст</b>\nОтправьте любую команду — я выполню и запишу результат.'); return; }
      const statusEmoji = { queued: '⏳', running: '⚙️', done: '✅', failed: '❌' };
      let text = `📜 <b>Журнал команд</b> (последние ${cmds.length})\n━━━━━━━━━━━━━━\n`;
      cmds.forEach(c => {
        const t = new Date(c.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        text += `${statusEmoji[c.status] || '❔'} <i>${t}</i> — ${c.text.slice(0, 45)}${c.text.length > 45 ? '…' : ''}\n`;
        if (c.status === 'done' && c.verification) text += `   🔎 ${c.verification.slice(0, 70)}\n`;
        if (c.status === 'failed' && c.error) text += `   ⚠️ ${c.error.slice(0, 70)}\n`;
      });
      text += `━━━━━━━━━━━━━━\n📊 Всего: ${total} · Выполнено: ${done} (<b>${rate}%</b>)`;
      safeSendMessage(chatId, text, { parse_mode: 'HTML' });
    } catch (e) {
      safeSendMessage(chatId, `⚠️ Журнал временно недоступен: ${e.message}`);
    }
  });

  // [v9.9.19-MASTER-AUDIT] голосовые от владельца → Whisper STT → текстовый поток команд
  bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    try {
      try { await bot.sendChatAction(chatId, 'typing') } catch (e) {}
      const fileLink = await bot.getFileLink(msg.voice.file_id);
      const resp = await fetch(fileLink);
      const buffer = Buffer.from(await resp.arrayBuffer());
      const { transcribeAudio } = await import('./voiceService.js');
      const result = await transcribeAudio(buffer, 'voice.ogg', 'audio/ogg');
      if (!result.text) {
        safeSendMessage(chatId, result.needsKey
          ? '🎤 <b>Voice STT не настроен</b>\nДобавьте ключ Groq или OpenAI в Кабинет → API Ключи — голосовые заработают сразу (hot-reload).'
          : '⚠️ Не удалось распознать голосовое. Попробуйте ещё раз.');
        return;
      }
      safeSendMessage(chatId, `🎤 <i>Распознано:</i> «${result.text.slice(0, 200)}»`, { parse_mode: 'HTML' });
      bot.emit('message', { ...msg, text: result.text, voice: undefined });
    } catch (e) {
      console.error('[OWNER-BOT] voice error:', e.message);
      safeSendMessage(chatId, '⚠️ Ошибка обработки голосового.');
    }
  });

  // [25-TARIFF-GATES] price-change veto state per owner chat
  const pendingPriceChanges = global.pendingPriceChanges || new Map()
  global.pendingPriceChanges = pendingPriceChanges

  function formatPricingAnalysis(what, analysis) {
    const nameMap = {
      'tariff.free': 'Free', 'tariff.pro': 'Pro', 'tariff.agency': 'Agency',
      'ad.channel.cpm': 'CPM рекламы в канале', 'ad.channel.cpc': 'CPC рекламы в канале', 'ad.channel.cpa': 'CPA рекламы в канале',
      'ad.app.banner': 'Баннер в приложении',
    }
    const name = nameMap[what] || what
    let text = `📊 <b>Анализ цены: ${name}</b>\n━━━━━━━━━━━━━━\n`
    text += `Текущая цена: <b>${analysis.currentPrice}₽</b>\n`
    text += `Себестоимость: ${analysis.totalCost}₽ (AI ~${analysis.costPerUnit}₽ + комиссия ${analysis.commissionYookassa}₽ + налог ${analysis.taxNpd}₽)\n`
    text += `Маржа сейчас: <b>${analysis.marginNow}%</b>\n`
    text += `Продаж за 30 дней: ${analysis.sales30d}\n`
    text += `Конверсия Free→Paid: ${analysis.conversionFreeToPaid}%\n`
    if (analysis.competitorHint) text += `💡 Конкуренты: ${analysis.competitorHint}\n`
    text += `\nРекомендуемый коридор: ${analysis.recommendation.min}–${analysis.recommendation.max}₽\n`
    text += `Оптимально: <b>${analysis.recommendation.optimal}₽</b>`
    return text
  }

  async function handlePricingCommand(chatId, text) {
    const lower = text.toLowerCase()

    // [P1.6-PREP] "в тарифе pro поставь 300 генераций" — редактирование лимитов PlanConfig с подтверждением
    const quotaMatch = lower.match(/в тарифе\s+(free|pro|agency)\s+(?:поставь|установи|сделай)\s+(\d+)\s*(генераци\w*|загруз\w*|канал\w*|пост\w*|мб|мегабайт\w*|тег\w*)/i)
    if (quotaMatch) {
      const plan = quotaMatch[1]
      const value = Number(quotaMatch[2])
      const word = quotaMatch[3]
      const fieldMap = [
        [/генераци/, 'generationsPerDay', 'генераций/день'],
        [/загруз/, 'youtubeUploadsPerDay', 'YouTube-загрузок/день'],
        [/канал/, 'youtubeChannels', 'YouTube-каналов'],
        [/пост/, 'scheduledPostsMax', 'запланированных постов (0 = безлимит)'],
        [/мб|мегабайт/, 'mediaQueueMB', 'МБ медиа-очереди'],
        [/тег/, 'aiTagsPerDay', 'AI-тегов/день'],
      ]
      const hit = fieldMap.find(([re]) => re.test(word))
      if (!hit) return false
      const [, field, label] = hit
      try {
        const planDoc = await PlanConfig.findOne({ plan })
        if (!planDoc) { safeSendMessage(chatId, `⚠️ Тариф ${plan} не найден`); return true }
        const oldValue = Number(planDoc.quotas?.[field] ?? 0)
        safeSendMessage(chatId,
          `🛠 <b>Изменение лимита</b>\n━━━━━━━━━━━━━━\nТариф: <b>${plan}</b>\n${label}: <b>${oldValue}</b> → <b>${value}</b>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: `✅ Применить ${value}`, callback_data: `quota:apply:${plan}:${field}:${value}` }],
                [{ text: '❌ Отмена', callback_data: 'price:cancel' }],
              ],
            },
          })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`)
      }
      return true
    }

    // [PLANCONFIG-ADMIN] "проанализируй тарифы" — AI-советчик по реальным данным (только совет)
    if (/проанализируй тарифы|анализ тарифов|советчик тарифов/.test(lower)) {
      try {
        safeSendMessage(chatId, '🤖 Собираю данные и анализирую тарифы, это займёт до минуты…')
        const { getAdvisorReport } = await import('./planAdvisorService.js')
        const report = await getAdvisorReport()
        const d = report.data
        const head = `📊 <b>AI-советчик тарифов</b> ${report.aiUsed ? '(OMEGA)' : '(эвристика, AI недоступен)'}\n` +
          `MRR: ${d.mrr?.mrr ?? '—'}₽ · платящих: ${d.mrr?.paying ?? '—'}\n` +
          `Пользователи: ${Object.entries(d.planDistribution || {}).map(([p, c]) => `${p}: ${c}`).join(', ')}\n` +
          `Founding: ${d.founding ? `${d.founding.used}/${d.founding.total} слотов, −${d.founding.discountPercent}%` : '—'}\n` +
          `Оплаты 30д: ${(d.payments30d || []).map(p => `${p.plan}: ${p.count} (${p.revenueRub}₽)`).join(', ') || 'нет'}\n\n`
        const full = head + report.recommendations
        // Telegram лимит 4096 — режем на части
        for (let i = 0; i < full.length; i += 3900) {
          safeSendMessage(chatId, full.slice(i, i + 3900), { parse_mode: 'HTML' })
        }
      } catch (e) {
        safeSendMessage(chatId, `⚠️ AI-советчик недоступен: ${e.message}`)
      }
      return true
    }

    // "проанализируй цены" / "проанализируй цену pro"
    if (/проанализируй|анализ цен|анализ цены/.test(lower)) {
      const targets = ['tariff.pro', 'tariff.agency', 'ad.channel.cpm']
      for (const what of targets) {
        try {
          const analysis = await analyzePricing(what)
          safeSendMessage(chatId, formatPricingAnalysis(what, analysis), { parse_mode: 'HTML' })
        } catch (e) {
          safeSendMessage(chatId, `⚠️ Не удалось проанализировать ${what}: ${e.message}`)
        }
      }
      return true
    }

    // "подними pro до 1290" / "подними cpm до 300" / "цена pro 1290"
    const priceMatch = lower.match(/(?:подними|повысь|установи|поставь|сделай)?\s*(?:цену\s+)?(?:на\s+)?(pro|agency|cpm|cpc|cpa|баннер|banner)\s+(?:до\s+)?(\d+)/i)
    if (priceMatch) {
      const targetWord = priceMatch[1].toLowerCase()
      const newPrice = Number(priceMatch[2])
      let what = null
      if (targetWord === 'pro') what = 'tariff.pro'
      else if (targetWord === 'agency') what = 'tariff.agency'
      else if (targetWord === 'cpm') what = 'ad.channel.cpm'
      else if (targetWord === 'cpc') what = 'ad.channel.cpc'
      else if (targetWord === 'cpa') what = 'ad.channel.cpa'
      else if (targetWord === 'banner' || targetWord === 'баннер') what = 'ad.app.banner'
      if (!what) return false

      try {
        const analysis = await marginAfter(what, newPrice)
        const analysisText = formatPricingAnalysis(what, analysis)
        const text = `${analysisText}\n\nПосле изменения на <b>${newPrice}₽</b>: маржа <b>${analysis.marginAfter}%</b>`
        pendingPriceChanges.set(chatId, { what, newPrice, analysis })
        safeSendMessage(chatId, text, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `✅ Применить ${newPrice}₽`, callback_data: `price:apply:${what}:${newPrice}` }],
              [{ text: '✏️ Ввести свою сумму', callback_data: `price:custom:${what}` }],
              [{ text: '❌ Отмена', callback_data: 'price:cancel' }],
            ],
          },
        })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка анализа: ${e.message}`)
      }
      return true
    }

    // "цена рекламы в канале" / "сколько стоит cpm"
    if (/цена рекламы|сколько стоит|цена cpm|цена cpc|цена cpa/.test(lower)) {
      const pricing = await AdPricing.findOne().lean() || { cpm: 0, cpc: 0, cpa: 0 }
      let text = '💰 <b>Текущие цены рекламы</b>\n━━━━━━━━━━━━━━\n'
      text += `CPM: ${pricing.cpm}₽\nCPC: ${pricing.cpc}₽\nCPA: ${pricing.cpa}₽\nФикс/мес: ${pricing.fixedMonth || 0}₽`
      safeSendMessage(chatId, text, { parse_mode: 'HTML' })
      return true
    }

    return false
  }

  // OWNER MODE — smart reply
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const ownerId = await getOwnerMongoId();
    const text = msg.text || '';
    if (text.startsWith('/')) return;

    // [OWNER-REMOTE-CONTROL] «мой id» — отвечаем ЛЮБОМУ: нужно для первичной привязки TG владельца
    if (/^(мой id|мой айди|my id|chat id)[\s!?.]*$/i.test(text.trim())) {
      safeSendMessage(chatId, `🆔 Ваш chat_id: <code>${chatId}</code>\n\nВпишите его в кабинете владельца: Настройки → Telegram владельца.`, { parse_mode: 'HTML' });
      return;
    }

    const context = await getOwnerContext(chatId);

    // Not owner → simple menu
    if (!context?.isOwner) {
      bot.sendMessage(chatId, '👋 <b>AI Viral Studio</b>\n\nСвяжитесь с владельцем через сайт:', {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '🌐 aiviral-studio.ru', url: 'https://aiviral-studio.ru' }]] }
      });
      return;
    }

    // [P2.1 TAKEOVER] активный ручной диалог: текст владельца уходит клиенту в OMEGA-бот
    const takeoverTicketId = global.ownerTakeovers?.get(String(chatId))
    if (takeoverTicketId) {
      try {
        const ticket = await SupportTicket.findById(takeoverTicketId)
        if (!ticket || ticket.status !== 'in_progress' || !ticket.takeoverBy) {
          global.ownerTakeovers.delete(String(chatId))
          safeSendMessage(chatId, 'ℹ️ Ручной диалог уже завершён (тикет закрыт или возвращён боту).')
        } else {
          const { replyToTicket } = await import('./supportService.js')
          await replyToTicket(takeoverTicketId, 'owner', text.slice(0, 2000), { role: 'owner' })
        }
      } catch (e) {
        console.error('[OWNER-BOT] takeover relay failed:', e.message)
        safeSendMessage(chatId, `⚠️ Не удалось отправить клиенту: ${e.message}`)
      }
      return
    }

    // [TG-REPORT-HOOK] текст владельца после ❌ Отклонить = причина отклонения батча
    if (handleBatchRejectReason({ chatId, text, safeSendMessage })) return

    // [TG-ASK-OWNER] свободный текст = ответ на pending-вопрос кодера (только режим «ответь текстом»)
    if (await handleAskFreeText({ chatId, text, safeSendMessage })) return

    // [P2.1] owner правит базу знаний прямо из TG: «добавь в FAQ: вопрос | ответ | ключ1,ключ2»
    if (/^добавь в faq\s*:/i.test(text.trim())) {
      const raw = text.replace(/^добавь в faq\s*:\s*/i, '')
      try {
        const { addFaqFromOwner } = await import('./faqService.js')
        const r = await addFaqFromOwner(raw)
        safeSendMessage(chatId, r.ok
          ? `✅ <b>Добавлено в FAQ:</b>\n${r.article.question}\nКлючи: ${r.article.keywords.join(', ')}`
          : '⚠️ Формат: <code>добавь в FAQ: вопрос | ответ | ключ1,ключ2</code> (ключи необязательны)', { parse_mode: 'HTML' })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка добавления в FAQ: ${e.message}`)
      }
      return
    }
    if (/^(список faq|faq список|покажи faq)$/i.test(text.trim())) {
      try {
        const { listFaq } = await import('./faqService.js')
        const items = await listFaq(30)
        safeSendMessage(chatId, items.length
          ? `📚 <b>FAQ (${items.length}):</b>\n` + items.map((a, i) => `${i + 1}. ${a.question}`).join('\n')
          : '📚 FAQ пока пуст.', { parse_mode: 'HTML' })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка чтения FAQ: ${e.message}`)
      }
      return
    }

    // [v9.9.5-TELEGRAM-UNIFIED] owner manual channel post
    if (String(global.ownerPostState) === String(chatId)) {
      // [v9.9.19.3] через единый публикатор: hot-reload токена, проверка результата, ссылка-доказательство
      const pub = await telegramPublish({ text });
      global.ownerPostState = null;
      if (pub?.success) {
        safeSendMessage(chatId,
          `✅ <b>Опубликовано в ${pub.channel || 'канал'}</b>` +
          (pub.url ? `\n🔗 <a href="${pub.url}">Открыть пост</a>` : `\n🔎 message_id: ${pub.messageId}`),
          { parse_mode: 'HTML' });
      } else {
        safeSendMessage(chatId, `⚠️ Публикация не удалась\n━━━━━━━━━━━━━━\n${pub?.error || 'Неизвестная ошибка'}`);
      }
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

    // [25-TARIFF-GATES] custom price input after "Ввести свою сумму"
    const pendingCustom = global.pendingPriceChanges?.get(chatId)
    if (pendingCustom?.custom) {
      const newPrice = Number(text.trim())
      if (Number.isNaN(newPrice) || newPrice < 0) {
        safeSendMessage(chatId, '⚠️ Введи корректную сумму числом.')
        return
      }
      try {
        const analysis = await marginAfter(pendingCustom.what, newPrice)
        const analysisText = formatPricingAnalysis(pendingCustom.what, analysis)
        const textOut = `${analysisText}\n\nПосле изменения на <b>${newPrice}₽</b>: маржа <b>${analysis.marginAfter}%</b>`
        global.pendingPriceChanges.set(chatId, { what: pendingCustom.what, newPrice, analysis })
        safeSendMessage(chatId, textOut, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `✅ Применить ${newPrice}₽`, callback_data: `price:apply:${pendingCustom.what}:${newPrice}` }],
              [{ text: '❌ Отмена', callback_data: 'price:cancel' }],
            ],
          },
        })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка анализа: ${e.message}`)
      }
      return
    }

    // [OWNER-REMOTE-CONTROL] «статус» — карточка состояния (не-владельцы отсечены гейтом isOwner выше)
    if (/^(статус|status)[\s!?.]*$/i.test(text.trim())) {
      try {
        const { getStatusData, formatStatusCard } = await import('./ownerActionsService.js')
        safeSendMessage(chatId, formatStatusCard(await getStatusData()), { parse_mode: 'HTML' })
      } catch (e) {
        console.warn('[OWNER-BOT] status card failed:', e.message)
        safeSendMessage(chatId, '⚠️ Не удалось собрать статус. Попробуйте позже.')
      }
      return
    }

    // [OWNER-REMOTE-CONTROL] рубильник техработ: «техработы on/off»
    const maintMatch = text.trim().match(/^техработы\s+(on|off|вкл|выкл)[\s!?.]*$/i)
    if (maintMatch) {
      const on = /^(on|вкл)$/i.test(maintMatch[1])
      try {
        const { setMaintenance } = await import('./ownerActionsService.js')
        await setMaintenance(on)
        safeSendMessage(chatId, on
          ? '🛠 <b>Техработы ON</b>\nКлиенты видят заглушку, API отдаёт 503. Владельцу и админу всё работает.'
          : '✅ <b>Техработы OFF</b>\nСервис снова доступен клиентам.', { parse_mode: 'HTML' })
      } catch (e) { safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`) }
      return
    }

    // [OWNER-REMOTE-CONTROL] рубильник регистрации: «регистрация on/off»
    const regMatch = text.trim().match(/^регистрация\s+(on|off|вкл|выкл)[\s!?.]*$/i)
    if (regMatch) {
      const on = /^(on|вкл)$/i.test(regMatch[1])
      try {
        const { setRegistration } = await import('./ownerActionsService.js')
        await setRegistration(on)
        safeSendMessage(chatId, on
          ? '✅ <b>Регистрация ON</b>\nНовые пользователи могут регистрироваться.'
          : '🚧 <b>Регистрация OFF</b>\nSignup возвращает дружелюбный отказ (403, не 500).', { parse_mode: 'HTML' })
      } catch (e) { safeSendMessage(chatId, `⚠️ Ошибка: ${e.message}`) }
      return
    }

    // [OWNER-REMOTE-CONTROL] «верни платёж <email|paymentId>» → карточка подтверждения
    const refundMatch = text.trim().match(/^(?:верни плат[её]ж|вернуть плат[её]ж|возврат платежа|refund)\s+(\S+)$/i)
    if (refundMatch) {
      try {
        const { findRefundablePayment } = await import('./ownerActionsService.js')
        const payment = await findRefundablePayment(refundMatch[1])
        if (!payment) {
          safeSendMessage(chatId, `🔍 Платёж «${refundMatch[1]}» не найден. Укажите email клиента или id платежа ЮKassa.`)
          return
        }
        if (payment.status === 'refunded') {
          safeSendMessage(chatId, 'ℹ️ Этот платёж уже возвращён. Повторный возврат не выполняется.')
          return
        }
        const card = [
          '💳 <b>Возврат платежа</b>',
          '━━━━━━━━━━━━━━',
          `Клиент: ${payment.customerEmail || '—'}`,
          `Тариф: ${payment.planId || '—'}`,
          `Сумма: ${Number(payment.amount || 0).toLocaleString('ru-RU')} ₽`,
          `Дата: ${payment.paidAt ? new Date(payment.paidAt).toLocaleString('ru-RU') : '—'}`,
          `ID: <code>${payment.yookassaPaymentId}</code>`,
        ].join('\n')
        safeSendMessage(chatId, card, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '↩️ Вернуть', callback_data: `refund:yes:${payment.yookassaPaymentId}` },
              { text: '❌ Отмена', callback_data: 'refund:no' },
            ]],
          },
        })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка поиска платежа: ${e.message}`)
      }
      return
    }

    // [OWNER-OMEGA] «продли email@x.com на N дней» → карточка с тарифом/окончанием + подтверждение ✅/❌
    const extendMatch = text.trim().match(/^(?:продли|продлить|extend)\s+(\S+@\S+)\s+(?:на\s+)?(\d{1,4})\s*(?:дн(?:я|ей)?|д|days?)?[.\s!]*$/i)
    if (extendMatch) {
      try {
        const { findClientSubscription } = await import('./ownerActionsService.js')
        const found = await findClientSubscription(extendMatch[1])
        if (!found) {
          safeSendMessage(chatId, `🔍 Клиент «${extendMatch[1]}» не найден. Проверьте email.`)
          return
        }
        const { user, sub } = found
        const curEnd = sub?.currentPeriodEnd || sub?.endDate
        const card = [
          '⏳ <b>Продление подписки</b>',
          '━━━━━━━━━━━━━━',
          `Клиент: ${user.email}`,
          `Тариф: <b>${sub?.plan || user.subscription || 'free'}</b>`,
          `Текущее окончание: ${curEnd ? new Date(curEnd).toLocaleDateString('ru-RU') : '— (подписки нет, будет создана)'}`,
          `Продлить на: <b>${extendMatch[2]} дн.</b>`,
        ].join('\n')
        safeSendMessage(chatId, card, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Продлить', callback_data: `extend:yes:${user._id}:${extendMatch[2]}` },
              { text: '❌ Отмена', callback_data: 'extend:no' },
            ]],
          },
        })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка поиска клиента: ${e.message}`)
      }
      return
    }

    // [P1.5-METRICS] «метрики» / «воронка» — карточка воронки 7д/30д + MRR.
    // Только владелец: не-владельцы отсечены проверкой context.isOwner выше.
    if (/^(метрики|воронка|metrics|funnel)[\s!?.]*$/i.test(text.trim())) {
      try {
        const { buildMetricsCard } = await import('./metricsService.js')
        const card = await buildMetricsCard()
        safeSendMessage(chatId, card, { parse_mode: 'HTML' })
      } catch (e) {
        console.warn('[OWNER-BOT] metrics card failed:', e.message)
        safeSendMessage(chatId, '⚠️ Метрики временно недоступны.')
      }
      return
    }

    // [25-TARIFF-GATES] price management commands (owner-only, before AI queue)
    const handled = await handlePricingCommand(chatId, text).catch(() => false)
    if (handled) return

    // [v9.9.19.6] ЛЮБОЕ сообщение владельца → очередь команд: мгновенный акцепт → выполнение → отчёт с verification.
    // В CHAT без попытки выполнения — никогда (универсальный исполнитель разбирает любой запрос).
    try {
      await submitOwnerCommand({ chatId, text, bot });
    } catch (e) {
      console.error('[OWNER-BOT] command submit error:', e.message);
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

    // [v9.9.19.3] сразу гасим спиннер кнопки в Telegram-клиенте
    bot.answerCallbackQuery(q.id).catch(() => {});

    // [TG-REPORT-HOOK] кнопки батч-отчёта: ✅ approve (CI→merge) / ❌ reject (причина)
    if (data === 'breport:approve' || data === 'breport:reject') {
      await handleBatchCallback({ q, chatId, safeSendMessage })
      return
    }

    // [TG-ASK-OWNER] кнопки вопросов кодера (bask:<qid>:<idx>): ответ → Mongo, скрипт ask-owner.mjs поллит
    if (data.startsWith('bask:')) {
      await handleAskCallback({ q, chatId, safeSendMessage })
      return
    }

    // [P2.1 TAKEOVER] взять диалог: AI молчит по клиенту, владелец пишет ему через этот чат
    if (data.startsWith('ticket:takeover:')) {
      const ticketId = data.slice('ticket:takeover:'.length)
      try {
        const ticket = await SupportTicket.findById(ticketId)
        if (!ticket) { safeSendMessage(chatId, '⚠️ Тикет не найден'); return }
        if (!ticket.telegramChatId) { safeSendMessage(chatId, '⚠️ У тикета нет TG-чата клиента — отвечайте через Dashboard.'); return }
        ticket.status = 'in_progress'
        ticket.takeoverBy = String(chatId)
        ticket.takeoverAt = new Date()
        ticket.updatedAt = new Date()
        if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date()
        await ticket.save()
        global.ownerTakeovers = global.ownerTakeovers || new Map()
        global.ownerTakeovers.set(String(chatId), ticketId)
        const { invalidateTakeoverCache, sendClientMessage } = await import('./omegaBot.js')
        const { addMessage } = await import('./supportService.js')
        await addMessage(ticketId, 'system', '👤 Специалист подключился к диалогу. AI-ассистент пока молчит.')
        invalidateTakeoverCache(ticket.telegramChatId)
        await sendClientMessage(ticket.telegramChatId, `👤 <b>Специалист подключился к диалогу</b>\nПишите здесь — я читаю и отвечаю лично. AI-ассистент пока молчит.`, { parse_mode: 'HTML' })
        safeSendMessage(chatId, `💬 <b>Вы ведёте диалог по тикету #${ticketId.slice(-6)}</b>\nВсё, что напишете сюда, уйдёт клиенту в OMEGA-бот.\n\nКогда закончите:`, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [
            [{ text: '🤖 Вернуть боту', callback_data: `ticket:bot:${ticketId}` }, { text: '✅ Закрыть', callback_data: `ticket:close:${ticketId}` }]
          ] }
        })
      } catch (e) {
        console.error('[OWNER-BOT] takeover failed:', e.message)
        safeSendMessage(chatId, `⚠️ Ошибка takeover: ${e.message}`)
      }
      return
    }

    // [P2.1] вернуть диалог боту: AI продолжает с сохранённым контекстом
    if (data.startsWith('ticket:bot:')) {
      const ticketId = data.slice('ticket:bot:'.length)
      try {
        const ticket = await SupportTicket.findById(ticketId)
        if (ticket) {
          ticket.takeoverBy = null
          ticket.takeoverAt = null
          ticket.status = 'open'
          ticket.updatedAt = new Date()
          await ticket.save()
          const { invalidateTakeoverCache, sendClientMessage } = await import('./omegaBot.js')
          const { addMessage } = await import('./supportService.js')
          await addMessage(ticketId, 'system', '🤖 Диалог возвращён OMEGA. AI продолжает с сохранённым контекстом.')
          invalidateTakeoverCache(ticket.telegramChatId)
          if (ticket.telegramChatId) {
            await sendClientMessage(ticket.telegramChatId, `🤖 <b>Снова на связи OMEGA!</b>\nЯ помню наш разговор — продолжим с того же места. Чем помочь дальше?`, { parse_mode: 'HTML' })
          }
        }
        global.ownerTakeovers?.delete(String(chatId))
        safeSendMessage(chatId, `🤖 Диалог по тикету #${ticketId.slice(-6)} возвращён боту (контекст сохранён).`)
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка возврата боту: ${e.message}`)
      }
      return
    }

    // [P2.1] закрыть тикет из TG + CSAT клиенту
    if (data.startsWith('ticket:close:')) {
      const ticketId = data.slice('ticket:close:'.length)
      try {
        const ticket = await SupportTicket.findById(ticketId)
        if (!ticket) { safeSendMessage(chatId, '⚠️ Тикет не найден'); return }
        ticket.status = 'resolved'
        ticket.closedAt = new Date()
        ticket.takeoverBy = null
        ticket.takeoverAt = null
        ticket.updatedAt = new Date()
        await ticket.save()
        global.ownerTakeovers?.delete(String(chatId))
        const { invalidateTakeoverCache, sendClientMessage } = await import('./omegaBot.js')
        const { addMessage } = await import('./supportService.js')
        await addMessage(ticketId, 'system', `✅ Обращение #${ticketId.slice(-6)} закрыто.`)
        invalidateTakeoverCache(ticket.telegramChatId)
        safeSendMessage(chatId, `✅ Тикет #${ticketId.slice(-6)} закрыт.`)
        if (ticket.telegramChatId) {
          await sendClientMessage(ticket.telegramChatId, `✅ <b>Обращение #${ticketId.slice(-6)} закрыто</b>\nСпасибо за обращение!`, { parse_mode: 'HTML' })
          await sendClientMessage(ticket.telegramChatId, 'Оцените, пожалуйста, помощь (1–5):', {
            reply_markup: { inline_keyboard: [[1, 2, 3, 4, 5].map(n => ({ text: String(n), callback_data: `csat:${ticketId}:${n}` }))] }
          })
        }
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка закрытия: ${e.message}`)
      }
      return
    }

    // [P2.1] эскалация из TG (раньше кнопка была мёртвой)
    if (data.startsWith('ticket:escalate:')) {
      const ticketId = data.slice('ticket:escalate:'.length)
      try {
        const { escalateToOwner } = await import('./supportService.js')
        await escalateToOwner(ticketId, 'эскалация владельцем из TG')
        safeSendMessage(chatId, `⬆️ Тикет #${ticketId.slice(-6)} эскалирован (приоритет: срочный).`)
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка эскалации: ${e.message}`)
      }
      return
    }

    // [OWNER-OMEGA] кнопка «↩️ Возврат…» из проактивного алерта об оплате → карточка подтверждения
    if (data.startsWith('refund:ask:')) {
      const paymentId = data.slice('refund:ask:'.length)
      try {
        const { findRefundablePayment } = await import('./ownerActionsService.js')
        const payment = await findRefundablePayment(paymentId)
        if (!payment) { safeSendMessage(chatId, '🔍 Платёж не найден.'); return }
        if (payment.status === 'refunded') { safeSendMessage(chatId, 'ℹ️ Этот платёж уже возвращён.'); return }
        const card = [
          '💳 <b>Возврат платежа</b>',
          '━━━━━━━━━━━━━━',
          `Клиент: ${payment.customerEmail || '—'}`,
          `Тариф: ${payment.planId || '—'}`,
          `Сумма: ${Number(payment.amount || 0).toLocaleString('ru-RU')} ₽`,
          `ID: <code>${payment.yookassaPaymentId}</code>`,
        ].join('\n')
        safeSendMessage(chatId, card, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '↩️ Вернуть', callback_data: `refund:yes:${payment.yookassaPaymentId}` },
              { text: '❌ Отмена', callback_data: 'refund:no' },
            ]],
          },
        })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка поиска платежа: ${e.message}`)
      }
      return
    }

    // [OWNER-REMOTE-CONTROL] подтверждение возврата из TG (идемпотентность — в ownerActionsService: in-flight lock + проверка статусов)
    if (data === 'refund:no') {
      safeSendMessage(chatId, '❌ Возврат отменён.')
      return
    }
    if (data.startsWith('refund:yes:')) {
      const paymentId = data.slice('refund:yes:'.length)
      safeSendMessage(chatId, '⏳ Выполняю возврат через ЮKassa...')
      try {
        const { refundByPaymentId } = await import('./ownerActionsService.js')
        const r = await refundByPaymentId(paymentId)
        safeSendMessage(chatId, r.ok ? `✅ ${r.message}` : `⚠️ ${r.message}`)
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка возврата: ${e.message}`)
      }
      return
    }

    // [OWNER-OMEGA] подтверждение продления подписки из TG (обёртка общая с кабинетом)
    if (data === 'extend:no') {
      safeSendMessage(chatId, '❌ Продление отменено.')
      return
    }
    if (data.startsWith('extend:yes:')) {
      const [, , userId, days] = data.split(':')
      safeSendMessage(chatId, '⏳ Продлеваю подписку...')
      try {
        const { extendSubscriptionDays } = await import('./ownerActionsService.js')
        const r = await extendSubscriptionDays(userId, days)
        safeSendMessage(chatId, r.ok
          ? `✅ Подписка продлена: ${r.email}\nТариф: <b>${r.plan}</b>\nНовая дата окончания: <b>${new Date(r.newEnd).toLocaleDateString('ru-RU')}</b>\nКлиент уведомлён.`
          : `⚠️ ${r.message}`, { parse_mode: 'HTML' })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка продления: ${e.message}`)
      }
      return
    }

    // [P1.6-PREP] подтверждение изменения лимита тарифа (PlanConfig quotas)
    if (data.startsWith('quota:apply:')) {
      const [, , plan, field, raw] = data.split(':')
      const value = Number(raw)
      try {
        const planDoc = await PlanConfig.findOne({ plan })
        if (!planDoc) { safeSendMessage(chatId, '⚠️ Тариф не найден'); return }
        const oldValue = Number(planDoc.quotas?.[field] ?? 0)
        planDoc.quotas[field] = value
        await planDoc.save()
        const { invalidatePlanCache } = await import('../middleware/enforceQuota.js')
        invalidatePlanCache()
        await PriceChangeLog.create({
          what: `tariff.${plan}.${field}`,
          oldPrice: oldValue,
          newPrice: value,
          source: 'telegram',
          reason: 'quota via TG',
          changedBy: await getOwnerMongoId(),
        })
        const { logOwnerAction } = await import('./ownerActionsService.js')
        await logOwnerAction('owner.plan.quota', { plan, field, old: oldValue, new: value }, 'ok', 'owner-telegram')
        safeSendMessage(chatId, `✅ Тариф <b>${plan}</b>: ${field} = <b>${value}</b> (было ${oldValue})`, { parse_mode: 'HTML' })
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка применения лимита: ${e.message}`)
      }
      return
    }

    // [25-TARIFF-GATES] price change confirmations
    if (data.startsWith('price:apply:')) {
      const parts = data.split(':')
      const what = parts[2]
      const newPrice = Number(parts[3])
      const pending = global.pendingPriceChanges?.get(chatId)
      if (!pending || pending.what !== what || pending.newPrice !== newPrice) {
        safeSendMessage(chatId, '⚠️ Запрос устарел. Начни заново.')
        return
      }

      try {
        const [type, target, field] = what.split('.')
        let oldPrice = 0
        if (type === 'tariff') {
          const plan = await PlanConfig.findOne({ plan: target })
          oldPrice = plan?.price || 0
          if (plan) { plan.price = newPrice; await plan.save() }
          // [PLANCONFIG-ADMIN] fix: после смены цены тарифа сбрасываем кэши (раньше цена залипала до TTL)
          try {
            const { invalidatePlanCache } = await import('../middleware/enforceQuota.js')
            invalidatePlanCache()
            const { invalidatePlanDisplayCache } = await import('./planDisplayService.js')
            invalidatePlanDisplayCache?.()
          } catch { /* best-effort */ }
        } else if (type === 'ad' && target === 'channel') {
          const pricing = await AdPricing.findOne()
          oldPrice = pricing?.[field] || 0
          if (pricing) { pricing[field] = newPrice; await pricing.save() }
          else { await AdPricing.create({ ownerId: await getOwnerMongoId(), [field]: newPrice }) }
        }

        await PriceChangeLog.create({
          what,
          oldPrice,
          newPrice,
          source: 'telegram',
          analysisSnapshot: pending.analysis,
          changedBy: await getOwnerMongoId(),
        })
        global.pendingPriceChanges.delete(chatId)
        safeSendMessage(chatId, `✅ Цена обновлена: ${what} = ${newPrice}₽`)
      } catch (e) {
        safeSendMessage(chatId, `⚠️ Ошибка применения цены: ${e.message}`)
      }
      return
    }

    if (data.startsWith('price:custom:')) {
      const what = data.split(':')[2]
      safeSendMessage(chatId, `Введи новую цену для ${what} одним числом (например, 1290):`)
      global.pendingPriceChanges.set(chatId, { what, custom: true })
      return
    }

    if (data === 'price:cancel') {
      global.pendingPriceChanges?.delete(chatId)
      safeSendMessage(chatId, '❌ Изменение цены отменено.')
      return
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
      // [v9.9.19.3] реальные данные вместо заглушки
      try {
        const stats = await getTgChannelStats();
        const openTickets = await SupportTicket.countDocuments({ status: { $in: ['open', 'needs_owner', 'in_progress'] } }).catch(() => 0);
        const pendingOrders = await AdOrder.countDocuments({ status: 'pending' }).catch(() => 0);
        safeSendMessage(chatId,
          `📊 <b>Статистика</b>\n━━━━━━━━━━━━━━\n` +
          `📢 Канал: ${stats.channel || `@${CHANNEL_USERNAME}`}\n` +
          `👥 Подписчики: ${stats.mock ? 'нет данных (проверьте telegram-ключи)' : stats.subscribers}\n` +
          `🎫 Открытые тикеты: ${openTickets}\n` +
          `🛒 Заявки на рекламу: ${pendingOrders}\n` +
          `━━━━━━━━━━━━━━\nПолная статистика в Dashboard.`);
      } catch (e) {
        safeSendMessage(chatId, '📊 <b>Статистика</b>\n━━━━━━━━━━━━━━\n⚠️ Не удалось загрузить. Проверьте Dashboard.');
      }
      return;
    }
    if (data === 'owner:post') {
      safeSendMessage(chatId, `📢 <b>Публикация</b>\n━━━━━━━━━━━━━━\nНапишите текст поста ответным сообщением.\nOMEGA опубликует в @${CHANNEL_USERNAME}.`);
      global.ownerPostState = chatId;
      return;
    }
    if (data === 'owner:toggle') {
      // [v9.9.19.3] реальное состояние + рабочий toggle
      const { getEmergencyStop, setEmergencyStop } = await import('../routes/admin.js');
      const current = getEmergencyStop();
      setEmergencyStop(!current);
      safeSendMessage(chatId, !current
        ? '🛑 <b>AI остановлена</b>\n━━━━━━━━━━━━━━\nВсе AI-операции приостановлены.\nВозобновить: /resume или кнопка ещё раз.'
        : '▶️ <b>AI активна</b>\n━━━━━━━━━━━━━━\nВсе системы работают.');
      return;
    }

    // Owner luxury menu callbacks (v9.9.13)
    if (data === 'owner:content' || data === 'action:content' || data === 'quick:content') {
      bot.emit('message', { chat: { id: chatId }, text: '/post', from: { id: chatId } });
      return;
    }
    if (data === 'owner:analytics' || data === 'action:analytics' || data === 'quick:analytics') {
      bot.emit('message', { chat: { id: chatId }, text: '/report', from: { id: chatId } });
      return;
    }
    if (data === 'owner:factory' || data === 'action:factory') {
      bot.emit('message', { chat: { id: chatId }, text: '/improve', from: { id: chatId } });
      return;
    }
    if (data === 'owner:predictions' || data === 'action:prediction' || data === 'quick:prediction') {
      safeSendMessage(chatId, `🔮 <b>Прогнозы</b>\nDashboard: https://aiviral-studio.ru/owner?tab=prediction`);
      return;
    }
    if (data === 'owner:report' || data === 'quick:report') {
      bot.emit('message', { chat: { id: chatId }, text: '/report', from: { id: chatId } });
      return;
    }
    if (data === 'owner:more' || data === 'quick:more' || data === 'action:command') {
      safeSendMessage(chatId, `⚡ <b>Команды</b>\n/status — статус\n/improve — улучшить\n/post [тема] — пост\n/report — отчёт\n/menu — меню`);
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
    else if (data === 'improve_apply') safeSendMessage(chatId, '✅ <b>Улучшение принято.</b>\n\nOMEGA применит его при следующем цикле self-improvement (cron каждые 6 часов).', { parse_mode: 'HTML' })
    else if (data === 'improve_reject') safeSendMessage(chatId, '❌ Улучшение отклонено.', { parse_mode: 'HTML' })
    else if (data === 'improve_retry') safeSendMessage(chatId, '🔄 Напишите <code>/improve</code> для другого варианта.', { parse_mode: 'HTML' })
  })

  bot.on('webhook_error', (err) => {
    console.error('[OWNER-BOT] webhook error:', err?.message || err)
  })

  // [WEBHOOK-2026-08-05] set webhook instead of polling to avoid 409 conflicts
  // [TG-ASK-OWNER ЗАДАЧА 0] локальный запуск webhook НЕ трогает: иначе перезапись без
  // secret_token → прод отклоняет команды владельца (403). Только прод-хост управляет webhook.
  if (isProdWebhookHost()) {
  const WEBHOOK_URL = getBotBaseUrl() + '/webhook/owner'
  bot.deleteWebhook({ drop_pending_updates: true }).catch(() => {}).then(() => {
    // [security-hardening Б5-З2.1] secret_token — чужие запросы отсекаются на приёме (403)
    const secret = getTgWebhookSecret()
    return bot.setWebhook(WEBHOOK_URL, secret ? { secret_token: secret } : {})
  }).then(() => {
    console.log('[OWNER-BOT] Webhook set to', WEBHOOK_URL)
  }).catch(e => {
    console.error('[OWNER-BOT] Webhook failed, falling back to polling:', e.message)
    bot.stopPolling?.()
    bot.startPolling?.()
  })
  } else {
    console.log('[OWNER-BOT] не прод-хост (RENDER_EXTERNAL_URL ≠ PROD_BACKEND_URL) — webhook не трогаю, polling не включаю: бот живёт на проде')
  }
  })().catch(e => {
    console.error('[OWNER-BOT] init error:', e.message)
  })
  global.ownerBotInitPromise = initPromise
  return initPromise
}

const isOwner = (chatId) => String(chatId) === String(getOwnerChatIdSync())
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

const sendStats = async (chatId) => {
  // [v9.9.19.3] реальные цифры вместо хардкод-моков
  try {
    const users = await User.countDocuments({}).catch(() => 0)
    const tickets = await SupportTicket.countDocuments({ status: { $in: ['open', 'needs_owner'] } }).catch(() => 0)
    const orders = await AdOrder.countDocuments({}).catch(() => 0)
    safeSendMessage(chatId, `<b>💎 Analytics</b>\n\n👥 Пользователей: ${users}\n🎫 Открытые тикеты: ${tickets}\n🛒 Заказы рекламы: ${orders}\n\n<i>Полная аналитика — в Dashboard</i>`, { parse_mode: 'HTML' })
  } catch (e) {
    safeSendMessage(chatId, '<b>💎 Analytics</b>\n\n⚠️ Данные временно недоступны — смотрите Dashboard.', { parse_mode: 'HTML' })
  }
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

export const sendOwnerAlert = async (message, typeOrOptions = 'info', options = {}) => {
  // [SUBSCRIPTION-CHECKOUT-FIX] поддерживаем старый вызов (message, type) и новый (message, options)
  let type = 'info'
  if (typeof typeOrOptions === 'string') {
    type = typeOrOptions
  } else if (typeOrOptions && typeof typeOrOptions === 'object') {
    options = typeOrOptions
    type = options.type || 'info'
  }

  const ownerChatId = await getOwnerChatId()
  if (!bot || !ownerChatId) return
  // [SUPPORT-PUSH-FIX] push о тикете — без cooldown, иначе повторные обращения не дойдут
  if (type !== 'ticket' && !shouldSendAlert(type)) return
  let text
  if (type === 'ticket') {
    text = message
  } else {
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '🚨', payment: '💰', newuser: '👤' }
    text = `${icons[type] || 'ℹ️'} <b>AI Viral Studio Alert</b>\n\n${message}\n\n<i>${new Date().toLocaleString('ru-RU')}</i>`
  }
  try { await safeSendMessage(ownerChatId, text, { parse_mode: 'HTML', ...options }) } catch (e) {}
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

const ownerBot = null
export { ownerBot }
export default { initOwnerBot, getOwnerBot, sendOwnerAlert, alertOwner, alertNewUser, alertPayment, alertError }
