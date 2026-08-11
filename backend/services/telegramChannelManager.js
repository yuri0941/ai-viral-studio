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
