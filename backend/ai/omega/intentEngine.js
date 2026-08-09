// Intent Engine — распознаёт команды из свободного текста
const INTENTS = {
  POST: { patterns: [/опубликуй/i, /выложи/i, /пост про/i, /сделай пост/i, /напиши пост/i], action: 'post' },
  STATUS: { patterns: [/статус/i, /как дела/i, /что с сервером/i, /проверь систему/i], action: 'status' },
  IMPROVE: { patterns: [/улучши/i, /оптимизируй/i, /self-improve/i, /self optimize/i], action: 'improve' },
  REPORT: { patterns: [/отчёт/i, /отчет/i, /report/i, /дай отчёт/i], action: 'report' },
  TICKET: { patterns: [/поддержка/i, /тикет/i, /баг/i, /ошибка/i, /не работает/i], action: 'ticket' },
  MENU: { patterns: [/меню/i, /команды/i, /что умеешь/i, /help/i], action: 'menu' },
  VIDEO: { patterns: [/видео/i, /шортс/i, /shorts/i, /reels/i], action: 'video' },
  IMAGE: { patterns: [/картинка/i, /фото/i, /обложка/i, /генерируй изображение/i], action: 'image' },
  ANALYSIS: { patterns: [/анализ/i, /проанализируй/i, /сканируй/i], action: 'analysis' },
  LEARN: { patterns: [/запомни/i, /изучи/i, /сохрани/i, /анализируй/i, /оцени/i], action: 'learn' },
};

export function detectIntent(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [key, config] of Object.entries(INTENTS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(lower)) return { intent: key, action: config.action, confidence: 0.95 };
    }
  }
  if (/сделай|создай|генерируй|покажи|дай|выложи|опубликуй|найди/i.test(lower)) {
    return { intent: 'UNKNOWN_ACTION', action: 'unknown', confidence: 0.6, text: lower };
  }
  return { intent: 'CHAT', action: 'chat', confidence: 0.99 };
}

export function extractTopic(text, intent) {
  let topic = text
    .replace(/опубликуй|выложи|пост про|сделай пост|напиши пост|видео|шортс|картинка|фото|обложка|анализ|проанализируй|запомни|изучи|сохрани/gi, '')
    .trim();
  return topic || 'Новость дня';
}
