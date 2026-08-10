import { chatWithAI, extractText } from './aiService.js';
import { publishToChannel } from './channelPublisher.js';

export async function generateVideoScript(topic, niche, duration = 30) {
  const prompt = `Ты — viral-продюсер TikTok/Reels. Тема: "${topic}" для ниши "${niche}". Создай сценарий ${duration}-секундного видео: 1. Хук (первые 3 сек) 2. Основная часть (3-4 смены кадра) 3. CTA — призыв перейти в приложение AI Viral Studio. Верни JSON: {hook,scenes:[{time,text,visual}],cta,suggestedAudio:"trending"|"motivational"|"calm"}`;
  const ai = await chatWithAI(prompt, [], 'ru', { maxTokens: 600 });
  try {
    return JSON.parse(extractText(ai) || '{}');
  } catch (e) {
    return {
      hook: `Как ${niche} заработал 300K за месяц?`,
      scenes: [{ time: '0-3', text: 'Хук', visual: 'текст на экране' }],
      cta: 'Ссылка в профиле',
      suggestedAudio: 'trending'
    };
  }
}

export function generateVideoThumbnail(topic) {
  const prompt = `Cinematic vertical video thumbnail, ${topic}, neon green accents, dark background, text overlay style, TikTok viral aesthetic, high energy`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=720&height=1280&nologo=true&seed=${Date.now()}`;
}

export async function publishVideoPromo(configId, topic, niche) {
  const script = await generateVideoScript(topic, niche);
  const thumb = generateVideoThumbnail(topic);
  const caption = `🎬 <b>${script.hook}</b>\n━━━━━━━━━━━━━━\n${script.scenes?.map(s => `⏱ ${s.time} — ${s.text}`).join('\n') || ''}\n\n🎵 Аудио: ${script.suggestedAudio}\n\n👇 Создай такое же видео в 1 клик:\nhttps://aiviral-studio.ru/video-creator?niche=${encodeURIComponent(niche)}\n\n<i>AI Viral Studio | OMEGA 🤖</i>`;
  return await publishToChannel(configId, 'entertaining', caption, thumb);
}
