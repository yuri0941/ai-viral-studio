import { chatWithAI } from './aiService.js';

const FORMATS = {
  post: 'Пост в Telegram-канале @aiviralstudio',
  story: 'Сторис с тегом',
  banner: 'Баннер в приложении',
  newsletter: 'Email-рассылка',
  video: 'Видео-интеграция'
};

export async function generateAdProposal({ budget = 50000, niche = 'general', goal = 'awareness', format = 'post' }) {
  const prompt = `
Напиши короткое коммерческое предложение (КП) для рекламодателя, который хочет разместить рекламу в AI Viral Studio.
Бюджет: ${budget} ₽. Ниша: ${niche}. Цель: ${goal}. Формат: ${FORMATS[format] || format}.
Включи: аудиторию, охват, CTR, примерный ROI, сроки, контакты. Тон: деловой, уверенный, с цифрами.
`;
  const proposal = await chatWithAI(prompt, [], 'ru', { role: 'business' });
  return { proposal, budget, niche, goal, format };
}

export async function generateAdCreatives(niche = 'general', format = 'post') {
  const prompt = `
Придумай 3 варианта рекламного креатива для AI Viral Studio. Ниша: ${niche}. Формат: ${FORMATS[format] || format}.
Каждый вариант: заголовок (до 80 символов), основной текст (до 250 символов), CTA.
`;
  const text = await chatWithAI(prompt, [], 'ru', { role: 'business' });
  const creatives = [];
  const blocks = text.split(/\n*Вариант \d[:.)]?\n*/i).filter(Boolean);
  blocks.forEach((block, i) => {
    const lines = block.split('\n').filter(Boolean);
    creatives.push({
      id: i + 1,
      headline: lines[0] || `Вариант ${i + 1}`,
      body: lines.slice(1).join(' ') || block.slice(0, 200),
      cta: 'Узнать больше'
    });
  });
  if (!creatives.length) {
    creatives.push({ id: 1, headline: 'Хотите вирусный контент?', body: text.slice(0, 250), cta: 'Написать' });
  }
  return creatives;
}

export function calculateAdMetrics(budget, format = 'post') {
  const cpm = { post: 150, story: 200, banner: 100, newsletter: 120, video: 300 }[format] || 150;
  const ctr = { post: 3.5, story: 2.0, banner: 1.5, newsletter: 4.0, video: 5.0 }[format] || 3;
  const reach = Math.round(budget / cpm * 1000);
  const clicks = Math.round(reach * ctr / 100);
  const conversions = Math.round(clicks * 0.08);
  const roi = Math.round((conversions * 500 - budget) / budget * 100);
  return { budget, format, cpm, reach, ctr, clicks, conversions, roi };
}
