import { chatWithAI } from './aiService.js';
import { findNiche } from '../data/niches.js';

const TEMPLATES = {
  educational: [
    'ТОП-5 ошибок в нише {niche}',
    'Разбор: почему этот пост взлетел в {niche}',
    'Чек-лист перед публикацией в {niche}',
    'Мифы о {niche}',
    'Как AI помогает в {niche}: кейс 24ч'
  ],
  entertaining: [
    'Мем дня про {niche} 😂',
    'Если бы {niche} был человеком',
    'Закулисье {niche}',
    'Интерактив: угадайте, что это за {niche}?',
    'Быстрый опрос: как вы относитесь к {niche}?'
  ],
  promotional: [
    '⚡️ Новая фича OMEGA для {niche}',
    'Результат клиента: +300% охвата в {niche}',
    'Сравнение: руками vs OMEGA в {niche}',
    'Спецпредложение для подписчиков {niche}',
    'Отзыв: "OMEGA изменила мой подход к {niche}"'
  ],
  engagement: [
    'Вопрос дня: ваша главная боль в {niche}?',
    'Голосование: что важнее в {niche}?',
    'Признайтесь: сколько часов на {niche}?',
    'Бросьте вызов: сделайте пост с OMEGA',
    'Лайфхак от подписчика по {niche}'
  ]
};

function weightedRandom(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    if (r < weights[i]) return items[i];
    r -= weights[i];
  }
  return items[0];
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generatePost(config, forcedType = null) {
  const nicheData = findNiche(config.niche);
  const niche = nicheData?.names[0] || config.niche;
  const types = ['educational', 'entertaining', 'promotional', 'engagement'];
  const type = forcedType || weightedRandom(types, [
    config.contentMix.educational,
    config.contentMix.entertaining,
    config.contentMix.promotional,
    config.contentMix.engagement
  ]);
  const template = randomPick(TEMPLATES[type]).replace(/{niche}/g, niche);
  const prompt = `Ты — SMM-эксперт Telegram-канала о ${niche}. Стиль: ${config.tone}. Язык: ${config.language}. Задача: напиши пост по теме "${template}". Формат JSON: { title (цепляющий, с эмодзи), body (3-5 коротких абзацев), cta (призыв к действию), hashtags (3-5 штук), emotion (motivational/curiosity/urgency/fun), suggestedMedia (image/video/carousel/poll) }`;
  const ai = await chatWithAI(prompt, [], config.language, { maxTokens: 900, temperature: 0.8 });
  let post;
  try {
    post = JSON.parse(ai?.reply || ai?.text || '{}');
  } catch (e) {
    post = {
      title: template,
      body: ai?.reply || 'Контент готовится...',
      cta: 'Подпишись на канал',
      hashtags: `#${niche} #AI`,
      emotion: 'curiosity',
      suggestedMedia: 'image'
    };
  }
  return { ...post, type, niche, generatedAt: new Date() };
}
