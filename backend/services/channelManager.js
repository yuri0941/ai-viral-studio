import { chatWithAI } from './aiService.js';
import { publishToChannel as telegramPublishToChannel, getChannelStats, generateWeeklyContentPlan } from './telegramChannelManager.js';

const POST_TYPES = {
  value: 'Полезный пост: дай практический совет, кейс или инсайт. Без продажного тона. Закончи призывом к комментарию.',
  promo: 'Промо-пост: расскажи о функции AI Viral Studio / OMEGA. Мягко продай ценность. CTA — попробовать бесплатно.',
  case: 'Кейс: конкретный результат пользователя (например, +подписчики, вирусный пост). Цифры, скриншоты, эмоции.',
  viral: 'Вирусный пост: хук, интрига, мем или провокационный вопрос. Затриггерь обсуждение в комментариях.',
  poll: 'Опрос: задай 1 короткий вопрос с вариантами ответа. Побуждай голосовать и комментировать.'
};

export async function generateChannelPost({ type = 'value', topic, niche = 'SMM', style = 'expert', length = 'medium', language = 'ru' } = {}) {
  const promptBase = POST_TYPES[type] || POST_TYPES.value;
  const prompt = topic
    ? `${promptBase}\n\nТема: ${topic}. Ниша: ${niche}. Стиль: ${style}. Длина: ${length}.`
    : `${promptBase}\n\nНиша: ${niche}. Стиль: ${style}. Длина: ${length}.`;
  const text = await chatWithAI(prompt, [], language, { role: 'owner' });
  return { type, text: text || '', niche, style, length, generatedAt: new Date() };
}

export async function publishToChannel(content, scheduledTime = null) {
  const post = {
    text: typeof content === 'string' ? content : content.text,
    imageUrl: content.imageUrl || null,
    caption: content.caption || null
  };
  if (scheduledTime && new Date(scheduledTime) > new Date()) {
    // TODO: schedule via cron/queue
    return { scheduled: true, scheduledTime, post };
  }
  return telegramPublishToChannel(post, { pin: false });
}

export async function generateWeeklyCalendar({ niche = 'SMM', language = 'ru' } = {}) {
  const days = [];
  const types = ['value', 'viral', 'case', 'promo', 'poll', 'value', 'case'];
  for (let i = 0; i < 7; i++) {
    const post = await generateChannelPost({ type: types[i], niche, length: 'medium', language });
    days.push({
      day: i + 1,
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      type: types[i],
      title: post.text.split('\n')[0].slice(0, 80),
      text: post.text,
      published: false
    });
  }
  return days;
}

export async function analyzeChannelGrowth() {
  try {
    const stats = await getChannelStats();
    return {
      ...stats,
      growthRate: stats.subscribers ? (stats.views / stats.subscribers) : 0,
      recommendation: 'Публикуйте value + viral в соотношении 2:1, активно отвечайте в комментариях.'
    };
  } catch (e) {
    return {
      subscribers: 0,
      views: 0,
      posts: 0,
      growthRate: 0,
      recommendation: 'Нет данных — подключите Telegram-канал.',
      error: e.message
    };
  }
}
