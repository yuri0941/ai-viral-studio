import { chatWithAI, extractText, getProviderKey } from './aiService.js';
import { createNode } from './cognitiveMesh.js';
import { prepareChannelText, getWhitelistPrompt } from './linkGuard.js';

// [v9.9.19.3] hot-reload: токен/канал резолвятся в момент вызова (env → cache → MongoDB)
export async function resolveTelegramTarget() {
  const token = await getProviderKey('telegram_bot')
    || process.env.TELEGRAM_OMEGA_BOT_TOKEN || process.env.OMEGA_BOT_TOKEN || process.env.OWNER_BOT_TOKEN || null;
  const channel = process.env.TELEGRAM_CHANNEL || process.env.TELEGRAM_CHANNEL_ID
    || await getProviderKey('telegram_chat_id') || null;
  return { token, channel };
}

// [v9.9.19.3] понятные ошибки вместо технических текстов Telegram API
function friendlyTelegramError(desc = '') {
  const d = String(desc).toLowerCase();
  if (d.includes('not a member') || d.includes('not enough rights') || d.includes('administrator') || d.includes('kicked')) {
    return 'Бот не админ канала — добавьте бота в администраторы @aiviralstudio с правом публикации.';
  }
  if (d.includes('chat not found') || d.includes('chat_id is empty')) {
    return 'Канал не найден — проверьте TELEGRAM_CHANNEL (например @aiviralstudio) в ApiKeysTab/env.';
  }
  if (d.includes('unauthorized') || d.includes('401')) {
    return 'Токен бота невалиден — обновите telegram_bot в Кабинет → API Ключи.';
  }
  return `Ошибка Telegram: ${desc}`;
}

export async function generateChannelPost(params = {}) {
  const config = typeof params === 'string' ? { topic: params, tone: 'expert', length: 'medium' } : params;
  const topic = config.topic || config.niche || 'AI trends';
  const tone = config.tone || config.style || 'expert';
  const length = config.length || 'medium';
  const language = config.language || 'ru';
  const prompt = `Write a Telegram post about ${topic} for AI Viral Studio channel. Tone: ${tone}. Length: ${length} (short=100 words, medium=250, long=500). Include 3-5 relevant hashtags. Add call-to-action: link to aiviral-studio.ru. NO markdown (no **, no *, no _) — plain text only. Use ONLY these links, others are forbidden: ${getWhitelistPrompt()}. Return JSON: { title, text, hashtags, cta, suggestedTime }`;
  const response = await chatWithAI(prompt, [], language, { system: 'Return ONLY valid JSON.', maxTokens: 1500, temperature: 0.7 });
  // [v9.9.19.3] FIX: response — объект {reply, provider}; сначала extractText, иначе JSON.parse/slice падали
  const raw = extractText(response).replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch(e) { /* fallback ниже */ }
  return { title: 'AI Update', text: raw.slice(0, 1000) || 'Контент готовится...', hashtags: ['#AI', '#Viral'], cta: 'Check out aiviral-studio.ru', suggestedTime: '09:00', mock: true };
}

export async function publishToChannel(post, options = {}) {
  const { token, channel } = await resolveTelegramTarget();
  if (!token || !channel) {
    return { success: false, mock: true, needsKey: 'telegram_bot', error: 'Telegram не настроен: добавьте telegram_bot и telegram_chat_id (или TELEGRAM_CHANNEL) в Кабинет → API Ключи' };
  }
  const { pin = false, disableNotification = false } = options;
  const title = extractText(post.title || '');
  const body = extractText(post.text || post.caption || '');
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags.join(' ') : extractText(post.hashtags || '');
  const cta = extractText(post.cta || '');
  const rawText = (title
    ? `${title}\n\n${body}\n\n${hashtags}\n\n${cta}`
    : `${body}${cta ? '\n\n' + cta : ''}`).trim();
  // [v9.9.19.6] markdown → HTML + проверка ссылок: никаких ** и мёртвых URL в канале
  const text = await prepareChannelText(rawText, 4000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channel, text, parse_mode: 'HTML', disable_notification: disableNotification })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description);
    const messageId = data.result.message_id;
    if (pin) {
      await fetch(`https://api.telegram.org/bot${token}/pinChatMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channel, message_id: messageId })
      });
    }
    // [v9.9.19.3] ссылка-доказательство на опубликованный пост
    const channelSlug = String(channel).replace('@', '');
    const url = /^@?[a-zA-Z][\w]{3,}$/.test(String(channel)) ? `https://t.me/${channelSlug}/${messageId}` : null;
    await createNode({ type: 'content', content: `Telegram post published: ${title || body.slice(0, 50)}`, confidence: 0.9, source: 'telegram_auto', metadata: { messageId, channelId: channel, url, type: 'telegram_post' } });
    return { success: true, messageId, url, channel, mock: false };
  } catch(e) {
    return { success: false, error: friendlyTelegramError(e.message), rawError: e.message, mock: false };
  }
}

export async function getChannelStats() {
  const { token, channel } = await resolveTelegramTarget();
  if (!token || !channel) return { subscribers: 0, mock: true };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${channel}`);
    const data = await res.json();
    return { subscribers: data.result || 0, channel, mock: false };
  } catch(e) { return { subscribers: 0, error: e.message, mock: false }; }
}

export async function generateWeeklyContentPlan(ownerId) {
  const topics = ['AI tools update', 'Viral marketing case', 'SMM strategy', 'Content creation tips', 'Product update', 'Industry news', 'Behind the scenes'];
  const plan = [];
  for (let i = 0; i < 7; i++) {
    const post = await generateChannelPost(topics[i % topics.length]);
    plan.push({ day: i + 1, topic: topics[i % topics.length], ...post, scheduledTime: post.suggestedTime || '09:00' });
  }
  await createNode({ type: 'content', content: `Weekly Telegram plan generated: ${plan.length} posts`, confidence: 0.9, source: 'telegram_auto', metadata: { ownerId, plan, type: 'telegram_plan' } });
  return plan;
}

// =====================================================================
// [v9.9.19.2-v4-CHANNEL-AUTO] OMEGA ВЕДЁТ КАНАЛ САМА:
// автопосты 08:00/14:00/20:00 MSK, темы из Learning Graph / SerpAPI / ротации рубрик,
// голосования раз в 3 дня + пост-победитель через 24ч, ежедневная статистика подписчиков.
// =====================================================================
import ChannelState from '../models/ChannelState.js';

const RUBRICS = ['кейс', 'факт', 'опрос', 'лайфхак', 'тренд'];
const POST_HOURS_MSK = [8, 14, 20];

// MSK = UTC+3 (без DST). Работаем через UTC-геттеры смещённого Date.
function mskNow() { return new Date(Date.now() + 3 * 3600 * 1000); }
function mskDateStr(d = mskNow()) { return d.toISOString().slice(0, 10); }

async function getChannelState() {
  return ChannelState.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// 8.1.1: команда владельца «пост про X» приоритетнее — автопост сдвигается на 2 часа
export async function markManualChannelPost() {
  try {
    const state = await getChannelState();
    state.lastManualPostAt = new Date();
    await state.save();
  } catch (e) { console.warn('[CHANNEL-AUTO] markManual failed:', e.message); }
}

// Ротация рубрик: не повторять одну рубрику 2 дня подряд
function pickRubric(state) {
  const recent = (state.rubricHistory || []).slice(-2).map(r => r.rubric);
  const candidates = RUBRICS.filter(r => !recent.includes(r));
  const pool = candidates.length ? candidates : RUBRICS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 8.1.2 выбор темы: Learning Graph → SerpAPI тренды → ротация рубрик + AI-генерация
async function pickAutoTopic(state) {
  // Источник 1: Learning Graph — применить уже изученный навык (берём наименее применённый)
  try {
    const { default: SkillNode } = await import('../models/SkillNode.js');
    const skills = await SkillNode.find({}).sort({ appliedCount: 1, learnedAt: -1 }).limit(5).lean();
    if (skills.length) {
      return { topic: `${skills[0].name}: практический разбор с примерами`, source: 'learning_graph', rubric: 'кейс' };
    }
  } catch (e) { console.warn('[CHANNEL-AUTO] skill topics failed:', e.message); }

  // Источник 2: SerpAPI — тренды ниши (через getProviderKey; нет ключа → дальше)
  try {
    const serpKey = await getProviderKey('serpapi');
    if (serpKey) {
      const { getTrendingTopics } = await import('./webSearch.js');
      const trends = await getTrendingTopics('AI SMM продвижение', 5);
      if (Array.isArray(trends) && trends.length) {
        return { topic: String(trends[0]).slice(0, 120), source: 'trends', rubric: 'тренд' };
      }
    }
  } catch (e) { console.warn('[CHANNEL-AUTO] trends failed:', e.message); }

  // Источник 3: ротация рубрик — тему сгенерирует AI
  return { topic: null, source: 'rubric', rubric: pickRubric(state) };
}

// 8.1.3-8.1.4 автопост: тема → postBuilder (HTML, обложка Pollinations, видео при активном Replicate)
export async function autoPostNow({ force = false } = {}) {
  const state = await getChannelState();
  if (!force && state.lastManualPostAt && (Date.now() - new Date(state.lastManualPostAt).getTime()) < 2 * 3600 * 1000) {
    console.log('[CHANNEL-AUTO] skipped: owner posted manually <2h ago (команда владельца приоритетнее)');
    return { success: false, skipped: true, reason: 'owner_recent' };
  }
  const picked = await pickAutoTopic(state);
  let topic = picked.topic;
  if (!topic) {
    const ai = await chatWithAI(
      `Придумай одну конкретную тему поста для Telegram-канала об AI, SMM и виральном контенте. Рубрика: ${picked.rubric}. Верни ТОЛЬКО тему — до 10 слов, без кавычек и пояснений.`,
      [], 'ru', { maxTokens: 60 }
    );
    topic = extractText(ai).trim().replace(/^["«]|["»]$/g, '').slice(0, 120) || `Рубрика ${picked.rubric}: AI и SMM`;
  }
  const { publishLuxuryPost } = await import('./postBuilder.js');
  const pub = await publishLuxuryPost({ topic, niche: 'aiviral', tone: 'уверенный экспертный' });
  if (pub?.success) {
    state.lastAutoPostAt = new Date();
    state.rubricHistory = [...(state.rubricHistory || []).slice(-6), { rubric: picked.rubric || 'тема', date: mskDateStr() }];
    await state.save();
    console.log(`[CHANNEL-AUTO] to=channel result=ok id=${pub.messageId} topic="${topic}" source=${picked.source}`);
  } else {
    console.warn(`[CHANNEL-AUTO] to=channel result=fail: ${pub?.error}`);
  }
  return { ...pub, topic, source: picked.source };
}

// 8.2.1 голосование: 4 варианта из Learning Graph / трендов, native Telegram poll
export async function sendChannelPoll({ force = false } = {}) {
  const { token, channel } = await resolveTelegramTarget();
  if (!token || !channel) {
    return { success: false, needsKey: 'telegram_bot', error: 'Telegram не настроен: telegram_bot + telegram_chat_id в Кабинет → API Ключи' };
  }
  const state = await getChannelState();
  if (!force && state.activePoll?.messageId && !state.activePoll.done) {
    return { success: false, skipped: true, reason: 'active_poll_exists' };
  }
  const options = [];
  try {
    const { default: SkillNode } = await import('../models/SkillNode.js');
    const skills = await SkillNode.find({}).sort({ learnedAt: -1 }).limit(4).lean();
    skills.forEach(s => options.push(s.name));
  } catch { /* не критично */ }
  if (options.length < 4) {
    try {
      const { getTrendingTopics } = await import('./webSearch.js');
      const trends = await getTrendingTopics('AI SMM', 6);
      (trends || []).forEach(t => { if (options.length < 4) options.push(String(t).slice(0, 60)); });
    } catch { /* не критично */ }
  }
  const defaults = ['Кейс: продвижение канала с нуля', 'Разбор AI-инструмента недели', 'Лайфхаки контент-плана', 'Тренды вирального контента'];
  for (const d of defaults) { if (options.length < 4) options.push(d); }
  const finalOptions = options.slice(0, 4).map(o => String(o).slice(0, 100));
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPoll`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channel, question: 'Какую тему разберём завтра? 🗳', options: finalOptions, is_anonymous: true })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description);
    state.activePoll = { messageId: data.result.message_id, options: finalOptions, createdAt: new Date(), done: false };
    state.lastPollDate = mskDateStr();
    await state.save();
    console.log(`[CHANNEL-AUTO] poll sent id=${data.result.message_id} options=${finalOptions.length}`);
    return { success: true, messageId: data.result.message_id, options: finalOptions };
  } catch (e) {
    return { success: false, error: friendlyTelegramError(e.message), rawError: e.message };
  }
}

// 8.2.2 через 24 часа: stopPoll → пост-победитель с конспектом темы
export async function finalizeChannelPoll() {
  const state = await getChannelState();
  const poll = state.activePoll;
  if (!poll?.messageId || poll.done) return { success: false, skipped: true };
  if (Date.now() - new Date(poll.createdAt).getTime() < 24 * 3600 * 1000) return { success: false, skipped: true, reason: 'too_early' };
  const { token, channel } = await resolveTelegramTarget();
  if (!token || !channel) return { success: false, error: 'Telegram не настроен' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/stopPoll`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channel, message_id: poll.messageId })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description);
    const results = (data.result.options || []).slice().sort((a, b) => (b.voter_count || 0) - (a.voter_count || 0));
    const winner = results[0];
    if (!winner || !winner.voter_count) {
      state.activePoll.done = true;
      await state.save();
      console.log('[CHANNEL-AUTO] poll closed: no votes');
      return { success: false, reason: 'no_votes' };
    }
    const total = results.reduce((a, o) => a + (o.voter_count || 0), 0);
    const { publishLuxuryPost } = await import('./postBuilder.js');
    const pub = await publishLuxuryPost({ topic: `По итогам голосования подписчиков: ${winner.text}`, niche: 'aiviral', tone: 'уверенный экспертный' });
    state.activePoll.done = true;
    state.lastPollWinner = { topic: winner.text, votes: winner.voter_count, date: mskDateStr() };
    await state.save();
    console.log(`[CHANNEL-AUTO] poll winner="${winner.text}" votes=${winner.voter_count}/${total} post=${pub?.success ? 'ok' : 'fail'}`);
    return { success: !!pub?.success, winner: winner.text, votes: winner.voter_count, total, url: pub?.url };
  } catch (e) {
    console.warn('[CHANNEL-AUTO] finalize poll failed:', e.message);
    return { success: false, error: e.message };
  }
}

// 8.6.1 ежедневная статистика: подписчики + модерация + голосования → ChannelStats (для Daily Report)
export async function recordChannelStats() {
  const state = await getChannelState();
  const today = mskDateStr();
  if (state.lastSubsDate === today) return { skipped: true };
  const stats = await getChannelStats();
  if (stats.mock || stats.error) return { skipped: true, reason: stats.error || 'mock' };
  const delta = state.lastSubscribers ? stats.subscribers - state.lastSubscribers : 0;
  try {
    const { default: ChannelStats } = await import('../models/ChannelStats.js');
    const { default: ModerationLog } = await import('../models/ModerationLog.js');
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const violations = await ModerationLog.countDocuments({ createdAt: { $gte: since } });
    const bans = await ModerationLog.countDocuments({ createdAt: { $gte: since }, action: 'ban' });
    await ChannelStats.findOneAndUpdate(
      { date: today },
      { date: today, subscribers: stats.subscribers, delta, violations, bans, pollWinner: state.lastPollWinner?.date === today ? state.lastPollWinner : undefined },
      { upsert: true, new: true }
    );
    state.lastSubscribers = stats.subscribers;
    state.lastSubsDate = today;
    await state.save();
    console.log(`[CHANNEL-AUTO] stats: subs=${stats.subscribers} delta=${delta} violations=${violations} bans=${bans}`);
    return { success: true, subscribers: stats.subscribers, delta, violations, bans };
  } catch (e) {
    console.warn('[CHANNEL-AUTO] stats failed:', e.message);
    return { success: false, error: e.message };
  }
}

// Тик автономии: раз в минуту сверяем MSK-слоты (независимо от TZ сервера)
export function startChannelAutonomy() {
  if (global.channelAutonomyStarted) return;
  global.channelAutonomyStarted = true;
  setInterval(async () => {
    try {
      const now = mskNow();
      const hh = now.getUTCHours();
      const state = await getChannelState();

      // 8.1.1 автопосты в 08:00 / 14:00 / 20:00 MSK
      if (POST_HOURS_MSK.includes(hh)) {
        const slot = `${mskDateStr(now)}-${hh}`;
        if (state.lastAutoPostSlot !== slot) {
          state.lastAutoPostSlot = slot;
          await state.save();
          await autoPostNow();
        }
      }

      // 8.2.1 голосование раз в 3 дня (слот 13:xx MSK)
      if (hh === 13 && state.activePoll?.done !== false) {
        const last = state.lastPollDate;
        const diffDays = last ? Math.floor((new Date(mskDateStr(now)) - new Date(last)) / 86400000) : 99;
        if (diffDays >= 3) await sendChannelPoll();
      }

      // 8.2.2 результаты голосования через 24ч
      if (state.activePoll?.messageId && !state.activePoll.done) {
        await finalizeChannelPoll();
      }

      // 8.6.1 подписчики раз в день (слот 08:xx MSK, внутри dedupe по дате)
      if (hh === 8) await recordChannelStats();
    } catch (e) {
      console.warn('[CHANNEL-AUTO] tick failed:', e.message);
    }
  }, 60000);
  console.log('[CHANNEL-AUTO] OMEGA channel autonomy started (posts 08/14/20 MSK, poll every 3d, stats daily)');
}
