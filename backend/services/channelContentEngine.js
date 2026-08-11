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
  // [v9.9.19.6] люкс-пост через postBuilder: HTML без ** и простыней, whitelist-ссылки,
  // факты изученных навыков подмешиваются автоматически (appliedCount++)
  const { buildLuxuryPost } = await import('./postBuilder.js');
  const built = await buildLuxuryPost({ topic: template, tone: config.tone, language: config.language });
  return {
    title: built.topic,
    body: built.text,
    cta: '',
    hashtags: '',
    html: built.text,
    emotion: 'curiosity',
    suggestedMedia: 'image',
    type,
    niche,
    generatedAt: new Date()
  };
}
