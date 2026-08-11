// [v9.9.19.6] Command Executor — ЛЮБАЯ команда владельца выполняется с отчётом.
// Мгновенный акцепт "⚡ Взяла в работу" → очередь OmegaCommand (MongoDB) → выполнение
// → "✅ Сделано + verification-факт" или "❌ Не смогла: причина / Нужно от вас / Могу вместо".
// Ни одно сообщение не остаётся без ответа и действия.
import OmegaCommand from '../models/OmegaCommand.js';
import SkillNode from '../models/SkillNode.js';
import { detectIntent, extractTopic } from '../ai/omega/intentEngine.js';
import { executeAction } from '../ai/omega/actionEngine.js';
import { recordOutcome } from '../ai/omega/learningEngine.js';
import { learnTopic } from './skillService.js';
import { chatWithAI, extractText } from './aiService.js';
import { getWhitelistPrompt, markdownToHtml } from './linkGuard.js';

// In-memory — только кэш воркера; сама очередь живёт в MongoDB (OmegaCommand).
const botByChatId = new Map();
let workerRunning = false;

const KNOWN_ACTIONS = ['post', 'status', 'improve', 'report', 'ticket', 'menu'];

// --- Планировщик для неизвестных команд: AI разбивает на шаги из доступных инструментов ---
const UNIVERSAL_TOOLS = `Доступные инструменты (только они):
- ai_text {"prompt": "..."} — сгенерировать/ответить текстом (анализ, идеи, тексты, перевод, план)
- web_search {"query": "..."} — найти актуальную информацию в интернете
- publish_post {"topic": "..."} — опубликовать люкс-пост в Telegram-канал владельца
- learn_topic {"name": "..."} — изучить тему и сохранить навык
- db_stats {} — реальные цифры проекта из базы (пользователи, тикеты, заказы)`;

async function planUniversal(text) {
  const prompt = `Ты OMEGA — автономный исполнитель команд владельца AI Viral Studio.
Команда владельца: "${text}"

${UNIVERSAL_TOOLS}

Разбей команду на план выполнения. Верни ТОЛЬКО JSON:
{ "possible": true/false,
  "rephrased": "команда своими словами, 1 строка",
  "steps": [ {"tool": "ai_text|web_search|publish_post|learn_topic|db_stats", "args": {...}, "note": "что делаем"} ],
  "reason": "если possible=false — почему сама не можешь",
  "needFromOwner": "если possible=false — что конкретно нужно от владельца",
  "alternative": "если possible=false — что можешь сделать вместо прямо сейчас" }
Правила: максимум 3 шага. possible=false ТОЛЬКО для невозможного (зарегистрировать бота, оплатить, действия в чужих сервисах, физический мир). Обычный вопрос/просьба текста — possible=true с шагом ai_text.`;
  const ai = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 900, temperature: 0.4 });
  const raw = extractText(ai).replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* fallback */ }
  return { possible: true, rephrased: text, steps: [{ tool: 'ai_text', args: { prompt: text }, note: 'Отвечаю на запрос' }] };
}

async function runStep(step, context) {
  const tool = step?.tool;
  const args = step?.args || {};
  switch (tool) {
    case 'ai_text': {
      const p = `${args.prompt || context.text}\n\nКонтекст предыдущих шагов: ${context.notes.slice(-2).join(' | ') || '—'}\nОтветь по-русски, кратко и по делу. Без markdown-звёздочек. Ссылки — только из: ${getWhitelistPrompt()}.`;
      const ai = await chatWithAI(p, [], 'ru', { maxTokens: 700, temperature: 0.6 });
      const out = extractText(ai).replace(/\*\*/g, '').trim();
      return { ok: !!out, output: out.slice(0, 1500) || 'Пустой ответ AI' };
    }
    case 'web_search': {
      const { searchWithFallback } = await import('../ai/omega/webSearch.js');
      const res = await searchWithFallback(String(args.query || context.text).slice(0, 200));
      const lines = (res?.sources || []).slice(0, 4).map(s => `• ${s.title}${s.snippet ? ' — ' + s.snippet.slice(0, 140) : ''}`);
      return { ok: lines.length > 0, output: lines.join('\n') || 'Ничего не найдено' };
    }
    case 'publish_post': {
      const { publishLuxuryPost } = await import('./postBuilder.js');
      const pub = await publishLuxuryPost({ topic: args.topic || context.text });
      if (!pub?.success) return { ok: false, output: pub?.error || 'Публикация не удалась' };
      return { ok: true, output: `Пост опубликован: ${pub.url || `messageId ${pub.messageId}`}`, verification: pub.url || `messageId:${pub.messageId}` };
    }
    case 'learn_topic': {
      const r = await learnTopic(args.name || context.text);
      const total = await SkillNode.countDocuments();
      return {
        ok: true,
        output: r.already ? `Тема уже изучена ранее (${r.skill.learnedAt?.toLocaleDateString?.('ru-RU')})` : `Изучено: ${r.skill.facts.length} фактов`,
        verification: `SkillNode ${r.skill._id}, всего навыков: ${total}`,
      };
    }
    case 'db_stats': {
      const { default: User } = await import('../models/User.js');
      const { default: SupportTicket } = await import('../models/SupportTicket.js');
      const [users, tickets, commands, skills] = await Promise.all([
        User.countDocuments(), SupportTicket.countDocuments({ status: { $in: ['open', 'needs_owner'] } }),
        OmegaCommand.countDocuments(), SkillNode.countDocuments(),
      ]);
      return { ok: true, output: `Пользователей: ${users}, открытых тикетов: ${tickets}, команд всего: ${commands}, навыков: ${skills}`, verification: `MongoDB: users=${users} tickets=${tickets}` };
    }
    default:
      return { ok: false, output: `Неизвестный инструмент: ${tool}` };
  }
}

// Универсальный исполнитель неизвестных команд
async function runUniversal(cmd, ctx) {
  const plan = await planUniversal(cmd.text);
  if (plan.possible === false) {
    return {
      success: false,
      impossible: true,
      reason: plan.reason || 'действие вне моих полномочий',
      needFromOwner: plan.needFromOwner || 'уточнение',
      alternative: plan.alternative || 'могу подготовить материалы для этого',
    };
  }
  const steps = Array.isArray(plan.steps) && plan.steps.length ? plan.steps.slice(0, 3) : [{ tool: 'ai_text', args: { prompt: cmd.text } }];
  const context = { text: cmd.text, notes: [] };
  const outputs = [];
  let verification = '';
  let okCount = 0;
  for (const step of steps) {
    try {
      const r = await runStep(step, context);
      if (r.ok) okCount++;
      if (r.verification) verification = r.verification;
      if (r.output) { outputs.push(r.output); context.notes.push(`${step.tool}: ${r.output.slice(0, 200)}`); }
    } catch (e) {
      outputs.push(`⚠️ Шаг ${step.tool}: ${e.message}`);
    }
  }
  if (!okCount && !outputs.length) {
    return { success: false, impossible: false, error: 'Все шаги завершились без результата' };
  }
  return {
    success: true,
    result: outputs.join('\n\n').slice(0, 1800),
    verification: verification || `выполнено шагов: ${okCount}/${steps.length}`,
  };
}

// Команда «изучи X» — через Skill Service
async function runLearn(cmd) {
  const force = /обнови|переизучи|заново/i.test(cmd.text);
  const topic = extractTopic(cmd.text, {}).replace(/обнови|переизучи|заново/gi, '').trim();
  const r = await learnTopic(topic, { force });
  const total = await SkillNode.countDocuments();
  if (r.already) {
    const top = r.skill.facts.slice(0, 3).map(f => `• ${f}`).join('\n');
    return {
      success: true,
      result: `🧠 <b>Уже знаю «${r.skill.name}»</b> (изучено ${new Date(r.skill.learnedAt).toLocaleDateString('ru-RU')}):\n${top}\n\n<i>Хотите обновить — напишите «обнови ${r.skill.name}».</i>`,
      verification: `SkillNode ${r.skill._id} (existing), всего навыков: ${total}`,
    };
  }
  const top = r.skill.facts.slice(0, 3).map(f => `• ${f}`).join('\n');
  return {
    success: true,
    result: `🧠 <b>Изучила «${r.skill.name}»</b>\n${top}\n\nВсего навыков: <b>${total}</b>. Применю в постах и ответах.`,
    verification: `SkillNode ${r.skill._id}, facts=${r.skill.facts.length}, total=${total}`,
  };
}

// --- Исполнение одной команды из очереди ---
async function runCommand(cmd) {
  const bot = botByChatId.get(String(cmd.chatId));
  const send = (msg) => bot ? bot.sendMessage(cmd.chatId, msg, { parse_mode: 'HTML', disable_web_page_preview: true }).catch(() => {}) : Promise.resolve();

  await OmegaCommand.updateOne({ _id: cmd._id }, { status: 'running', startedAt: new Date() });
  const intent = { intent: cmd.intent, action: cmd.action, confidence: cmd.confidence || 0.6 };
  let outcome;

  try {
    if (cmd.action === 'learn') {
      outcome = await runLearn(cmd);
    } else if (KNOWN_ACTIONS.includes(cmd.action)) {
      // Известные intent'ы — свои исполнители (actionEngine шлёт сообщения сам)
      const result = await executeAction({ intent, text: cmd.text, chatId: cmd.chatId, userRole: 'owner', bot });
      outcome = result?.success
        ? { success: true, result: result.url || result.topic || result.action, verification: result.url || result.ticketId || `${result.action} OK`, silent: true }
        : { success: false, error: result?.error || 'Исполнитель вернул ошибку', silent: true };
    } else {
      outcome = await runUniversal(cmd, { bot });
    }
  } catch (e) {
    outcome = { success: false, error: e.message };
  }

  const finished = {
    finishedAt: new Date(),
    status: outcome.success ? 'done' : 'failed',
    result: String(outcome.result || outcome.error || outcome.reason || '').slice(0, 2000),
    verification: String(outcome.verification || '').slice(0, 500),
    error: outcome.success ? '' : String(outcome.error || outcome.reason || '').slice(0, 500),
  };
  await OmegaCommand.updateOne({ _id: cmd._id }, finished);

  // Финальный ответ (для KNOWN_ACTIONS actionEngine уже ответил — не дублируем)
  if (!outcome.silent) {
    if (outcome.success) {
      await send(`✅ <b>Сделано</b>: ${cmd.rephrased || cmd.text.slice(0, 100)}\n━━━━━━━━━━━━━━\n${markdownToHtml(outcome.result || 'Выполнено.')}\n\n🔎 <i>Проверка: ${finished.verification || 'результат выше'}</i>`);
    } else if (outcome.impossible) {
      await send(`❌ <b>Сама не могу</b>: ${outcome.reason}.\n\n🙏 <b>Нужно от вас</b>: ${outcome.needFromOwner}.\n\n✅ <b>Могу прямо сейчас</b>: ${outcome.alternative} — делаю?`);
    } else {
      await send(`❌ <b>Не смогла выполнить</b>: ${cmd.text.slice(0, 80)}\nПричина: ${finished.error || 'неизвестная'}\n\n<i>Переформулируйте или уточните — попробую снова.</i>`);
    }
  }

  await recordOutcome({ userId: cmd.chatId, intent: cmd.intent, action: cmd.action, success: outcome.success, error: finished.error, metadata: { commandId: cmd._id } }).catch(() => {});
  return outcome;
}

// Воркер: последовательно разбирает очередь queued-команд (все чаты, FIFO).
async function processQueue() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    for (;;) {
      const cmd = await OmegaCommand.findOne({ status: 'queued' }).sort({ createdAt: 1 });
      if (!cmd) break;
      if (!botByChatId.get(String(cmd.chatId))) {
        await OmegaCommand.updateOne({ _id: cmd._id }, { status: 'failed', error: 'bot unavailable (restart)', finishedAt: new Date() });
        continue;
      }
      await runCommand(cmd).catch(e => console.error('[commandExecutor] runCommand failed:', e.message));
    }
  } finally {
    workerRunning = false;
  }
}

// Точка входа: команда владельца → запись в журнал → мгновенный акцепт → выполнение.
export async function submitOwnerCommand({ chatId, text, bot }) {
  botByChatId.set(String(chatId), bot);
  const intent = detectIntent(text) || { intent: 'CHAT', action: 'chat', confidence: 0.5 };
  const cmd = await OmegaCommand.create({
    chatId: String(chatId), text: String(text).slice(0, 500),
    intent: intent.intent, action: intent.action, confidence: intent.confidence,
    status: 'queued',
  });

  // Мгновенный акцепт — владелец сразу видит, что услышан
  const actionLabel = intent.action === 'chat' ? 'разбираю запрос' : `команда «${intent.intent}»`;
  bot.sendMessage(chatId, `⚡ <b>Взяла в работу</b>: «${String(text).slice(0, 120)}»\n<i>${actionLabel} · в очереди #${String(cmd._id).slice(-4)}</i>`, { parse_mode: 'HTML' }).catch(() => {});

  processQueue().catch(e => console.error('[commandExecutor] queue failed:', e.message));
  return cmd;
}

// /commands — реальный журнал из MongoDB. Проценты — только из этой модели.
export async function getCommandsLog(chatId, limit = 20) {
  const cmds = await OmegaCommand.find({ chatId: String(chatId) }).sort({ createdAt: -1 }).limit(limit).lean();
  const total = await OmegaCommand.countDocuments({ chatId: String(chatId) });
  const done = await OmegaCommand.countDocuments({ chatId: String(chatId), status: 'done' });
  return { cmds, total, done, rate: total ? Math.round((done / total) * 100) : 0 };
}

// Восстановление при старте: зависшие running → failed (процесс умер), queued → выполнить.
export async function recoverCommandsOnBoot() {
  try {
    const stale = await OmegaCommand.updateMany(
      { status: 'running' },
      { status: 'failed', error: 'interrupted by restart', finishedAt: new Date() }
    );
    const queued = await OmegaCommand.countDocuments({ status: 'queued' });
    const total = await OmegaCommand.countDocuments();
    if (stale.modifiedCount) console.log(`[OMEGA] ${stale.modifiedCount} interrupted commands marked failed`);
    return { queued, total };
  } catch (e) {
    console.warn('[OMEGA] command recovery failed:', e.message);
    return { queued: 0, total: 0 };
  }
}
