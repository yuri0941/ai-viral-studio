import { chatWithAI } from './aiService.js';
import { createNode } from './cognitiveMesh.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_OMEGA_BOT_TOKEN || process.env.OMEGA_BOT_TOKEN || process.env.OWNER_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL || process.env.TELEGRAM_CHANNEL_ID;
const HAS_TELEGRAM = !!TELEGRAM_BOT_TOKEN && !!CHANNEL_ID;

export async function generateChannelPost(params = {}) {
  const config = typeof params === 'string' ? { topic: params, tone: 'expert', length: 'medium' } : params;
  const topic = config.topic || config.niche || 'AI trends';
  const tone = config.tone || config.style || 'expert';
  const length = config.length || 'medium';
  const language = config.language || 'ru';
  const prompt = `Write a Telegram post about ${topic} for AI Viral Studio channel. Tone: ${tone}. Length: ${length} (short=100 words, medium=250, long=500). Include 3-5 relevant hashtags. Add call-to-action: link to aiviral-studio.ru. Return JSON: { title, text, hashtags, cta, suggestedTime }`;
  const response = await chatWithAI(prompt, [], language, { system: 'Return ONLY valid JSON.', maxTokens: 1500, temperature: 0.7 });
  try { return JSON.parse(response); } catch(e) { return { title: 'AI Update', text: response.slice(0, 1000), hashtags: ['#AI', '#Viral'], cta: 'Check out aiviral-studio.ru', suggestedTime: '09:00', mock: true }; }
}

export async function publishToChannel(post, options = {}) {
  if (!HAS_TELEGRAM) return { success: false, mock: true, message: 'TELEGRAM_CHANNEL_ID или OMEGA_BOT_TOKEN не настроены. Добавьте в .env' };
  const { pin = false, disableNotification = false } = options;
  const title = post.title || '';
  const body = post.text || post.caption || '';
  const hashtags = post.hashtags?.join(' ') || '';
  const cta = post.cta || '';
  const text = title
    ? `${title}\n\n${body}\n\n${hashtags}\n\n${cta}`
    : `${body}${cta ? '\n\n' + cta : ''}`.trim();
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHANNEL_ID, text, parse_mode: 'HTML', disable_notification: disableNotification })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description);
    const messageId = data.result.message_id;
    if (pin) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/pinChatMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHANNEL_ID, message_id: messageId })
      });
    }
    await createNode({ type: 'content', content: `Telegram post published: ${title || body.slice(0, 50)}`, confidence: 0.9, source: 'telegram_auto', metadata: { messageId, channelId: CHANNEL_ID, post, type: 'telegram_post' } });
    return { success: true, messageId, mock: false };
  } catch(e) { return { success: false, error: e.message, mock: false }; }
}

export async function getChannelStats() {
  if (!HAS_TELEGRAM) return { subscribers: 0, mock: true };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMemberCount?chat_id=${CHANNEL_ID}`);
    const data = await res.json();
    return { subscribers: data.result || 0, mock: false };
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
