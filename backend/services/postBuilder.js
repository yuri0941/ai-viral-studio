// [v9.9.19.6] Post Builder — люксовые посты канала.
// HTML-форматирование (НЕ сырой markdown), обложка Pollinations (тёмный неон, минимализм),
// видео при активном Replicate-ключе, только whitelist-ссылки, CTA, фирменная подпись,
// Self-Audit перед отправкой (≤900 символов, без **, есть ссылка, есть медиа → иначе 1 перегенерация).
import { chatWithAI, extractText, getProviderKey } from './aiService.js';
import { resolveTelegramTarget } from './telegramChannelManager.js';
import { createNode } from './cognitiveMesh.js';
import { getWhitelist, getWhitelistPrompt, sanitizeLinks, escapeHtml } from './linkGuard.js';
import { getSkillFactsForContext } from './skillService.js';
import { validateTelegramHTML, stripHtml } from '../utils/telegramHtml.js';

const CHANNEL_SIGNATURE = '⚡️ <a href="https://t.me/aiviralstudio">@aiviralstudio</a> · <a href="https://aiviral-studio.ru">aiviral-studio.ru</a>';
const MAX_POST_LEN = 900;

function buildPrompt(topic, tone, skillFacts, extraRules = '') {
  const factsBlock = skillFacts.length
    ? `\nПримени изученные приёмы OMEGA (вплети естественно, без упоминания что это "навык"):\n${skillFacts.map(f => `- ${f.fact}`).join('\n')}\n`
    : '';
  return `Ты OMEGA — автор люксового Telegram-канала AI Viral Studio об AI, SMM и виральном контенте.
Напиши пост на тему: "${topic}". Тон: ${tone || 'уверенный экспертный'}.
${factsBlock}
Верни ТОЛЬКО JSON:
{ "hook": "заголовок-крючок, 1 строка, без эмодзи в начале",
  "paragraphs": ["абзац 1", "абзац 2", "абзац 3"],
  "insight": "ключевая польза/цифра/инсайт — ядро поста, 1 строка",
  "cta": "призыв к действию, 1 строка" }
ЖЁСТКИЕ ПРАВИЛА:
- 2-4 абзаца, каждый 1-2 короткие строки. Никаких простыней текста.
- Эмодзи умеренно: максимум 1 на абзац.
- НИКАКОГО markdown: запрещены **, *, _, \`, заголовки #. Только чистый текст.
- НЕ вставляй URL — ссылки добавит система. Разрешённые ссылки (только они): ${getWhitelistPrompt()}.
- Русский язык, живой стиль, конкретика вместо воды.${extraRules}`;
}

function assemblePost({ hook, paragraphs, insight, cta }, ctaUrl) {
  const parts = [];
  parts.push(`<b>${escapeHtml(hook)}</b>`);
  for (const p of (paragraphs || []).slice(0, 4)) {
    const clean = String(p).trim();
    if (clean) parts.push(escapeHtml(clean));
  }
  if (insight) parts.push(`💡 ${escapeHtml(insight)}`);
  const ctaText = escapeHtml(cta || 'Попробуйте OMEGA бесплатно');
  parts.push(`👉 ${ctaText} — <a href="${ctaUrl}">${ctaUrl.replace('https://', '')}</a>`);
  parts.push(CHANNEL_SIGNATURE);
  return parts.join('\n\n');
}

// Self-Audit: длина, отсутствие **, наличие ссылки. Возвращает список нарушений.
function auditPost(html) {
  const issues = [];
  if (html.length > MAX_POST_LEN) issues.push(`length ${html.length} > ${MAX_POST_LEN}`);
  if (html.includes('**')) issues.push('raw markdown **');
  if (!getWhitelist().some(u => html.includes(u))) issues.push('no whitelist link');
  return issues;
}

function pickCtaUrl(topic) {
  // По смыслу: про бота — бот, иначе сайт
  return /бот|bot|omega|попробуй|начать/i.test(topic) ? 'https://t.me/aiviral_omega_bot' : 'https://aiviral-studio.ru';
}

export async function buildLuxuryPost({ topic, niche = 'general', tone, language = 'ru' } = {}) {
  const safeTopic = String(topic || 'AI-новости дня').trim().slice(0, 200);
  const skillFacts = await getSkillFactsForContext(2).catch(() => []);
  const ctaUrl = pickCtaUrl(safeTopic);

  let html = '';
  let lastIssues = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const extraRules = attempt > 0 && lastIssues.length
      ? `\nПРЕДЫДУЩАЯ ВЕРСИЯ ОТКЛОНЕНА: ${lastIssues.join('; ')}. Сделай короче и строже по правилам.`
      : '';
    const ai = await chatWithAI(buildPrompt(safeTopic, tone, skillFacts, extraRules), [], language, {
      system: 'Return ONLY valid JSON.', maxTokens: 1100, temperature: 0.75,
    });
    const raw = extractText(ai).replace(/```json|```/g, '').trim();
    let parsed = null;
    try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = null; }
    if (!parsed?.hook) {
      // Fallback: сырой текст режем на абзацы
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      parsed = { hook: safeTopic, paragraphs: lines.slice(0, 3), insight: '', cta: '' };
    }
    html = assemblePost(parsed, ctaUrl);
    html = html.replace(/\*\*/g, ''); // гарантия: ни одной звёздочки
    html = await sanitizeLinks(html);
    lastIssues = auditPost(html);
    if (!lastIssues.length) break;
    if (parsed && lastIssues.every(i => i.startsWith('length'))) {
      // Только длина — режем без перегенерации
      html = html.slice(0, MAX_POST_LEN - 1).replace(/<[^>]*$/, '') + '…';
      lastIssues = auditPost(html);
      if (!lastIssues.length) break;
    }
  }

  return { text: html, topic: safeTopic, ctaUrl, appliedSkills: skillFacts.map(f => f.name), auditIssues: lastIssues };
}

// Обложка: видео (Replicate активен) → иначе фото Pollinations в стиле канала.
async function buildCover(topic) {
  const style = 'dark luxury minimalist poster, deep black background, glowing white neon lines, premium tech aesthetic, no text';
  const prompt = encodeURIComponent(`${style}, theme: ${String(topic).slice(0, 120)}`);
  const replicateKey = await getProviderKey('replicate').catch(() => null);
  if (replicateKey) {
    try {
      const { startReplicateVideo, getReplicateStatus } = await import('./aiVideoService.js');
      const prediction = await startReplicateVideo(`cinematic dark neon loop about ${String(topic).slice(0, 80)}, luxury minimal`, 5);
      const predictionId = prediction?.id || prediction?.predictionId;
      if (predictionId) {
        const deadline = Date.now() + 90000;
        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 6000));
          const st = await getReplicateStatus(predictionId);
          const videoUrl = Array.isArray(st?.output) ? st.output[0] : st?.output;
          if (st?.status === 'succeeded' && videoUrl) return { type: 'video', url: videoUrl };
          if (st?.status === 'failed' || st?.status === 'canceled') break;
        }
      }
    } catch (e) { console.warn('[postBuilder] video cover failed, fallback to photo:', e.message); }
  }
  return { type: 'photo', url: `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true&seed=${Date.now() % 100000}` };
}

async function tgApi(token, method, payload) {
  // [v9.9.19.14] валидация HTML (text и caption) + plain-text fallback на 400 parse
  const body = { ...payload };
  if (body.parse_mode === 'HTML') {
    for (const field of ['text', 'caption']) {
      if (typeof body[field] === 'string') {
        const v = validateTelegramHTML(body[field]);
        body[field] = v.fixed;
        if (!v.ok) console.warn(`[TG-HTML] postBuilder ${method}.${field} auto-fixed (${v.errors.join('; ')})`);
      }
    }
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok && body.parse_mode && /can't parse entities/i.test(data.description || '')) {
    console.warn(`[TG-HTML] postBuilder ${method}: 400 parse after fix → plain text fallback`);
    const plain = { ...body };
    delete plain.parse_mode;
    for (const field of ['text', 'caption']) {
      if (typeof plain[field] === 'string') plain[field] = stripHtml(plain[field]);
    }
    const res2 = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plain),
    });
    const data2 = await res2.json();
    if (!data2.ok) throw new Error(data2.description || `Telegram ${method} failed`);
    return data2.result;
  }
  if (!data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result;
}

// Публикация люкс-поста: генерация → обложка → sendPhoto/sendVideo (caption HTML) → fallback sendMessage.
export async function publishLuxuryPost(params = {}) {
  const post = params.text ? { text: params.text, topic: params.topic || 'post' } : await buildLuxuryPost(params);
  const { token, channel } = await resolveTelegramTarget();
  if (!token || !channel) {
    return { success: false, needsKey: 'telegram_bot', error: 'Telegram не настроен: добавьте telegram_bot и telegram_chat_id в Кабинет → API Ключи' };
  }

  const caption = post.text.length > 1024 ? post.text.slice(0, 1023) + '…' : post.text;
  let result = null;
  let mediaType = 'none';
  try {
    const cover = await buildCover(post.topic);
    if (cover.type === 'video') {
      result = await tgApi(token, 'sendVideo', { chat_id: channel, video: cover.url, caption, parse_mode: 'HTML' });
    } else {
      result = await tgApi(token, 'sendPhoto', { chat_id: channel, photo: cover.url, caption, parse_mode: 'HTML' });
    }
    mediaType = cover.type;
  } catch (e) {
    console.warn('[postBuilder] media send failed, text-only fallback:', e.message);
    try {
      result = await tgApi(token, 'sendMessage', { chat_id: channel, text: post.text, parse_mode: 'HTML' });
    } catch (e2) {
      return { success: false, error: friendlyError(e2.message), rawError: e2.message };
    }
  }

  const messageId = result.message_id;
  const slug = String(channel).replace('@', '');
  const url = /^@?[a-zA-Z][\w]{3,}$/.test(String(channel)) ? `https://t.me/${slug}/${messageId}` : null;
  try {
    await createNode({
      type: 'content', content: `Luxury post published: ${post.topic}`, confidence: 0.95,
      source: 'post_builder', metadata: { messageId, channelId: channel, url, mediaType, appliedSkills: post.appliedSkills },
    });
  } catch { /* не критично */ }
  return { success: true, messageId, url, channel, mediaType, text: post.text, appliedSkills: post.appliedSkills || [] };
}

function friendlyError(desc = '') {
  const d = String(desc).toLowerCase();
  if (d.includes('not a member') || d.includes('administrator') || d.includes('kicked')) return 'Бот не админ канала — добавьте бота в администраторы с правом публикации.';
  if (d.includes('chat not found') || d.includes('chat_id is empty')) return 'Канал не найден — проверьте TELEGRAM_CHANNEL в ApiKeysTab/env.';
  if (d.includes('unauthorized') || d.includes('401')) return 'Токен бота невалиден — обновите telegram_bot в Кабинет → API Ключи.';
  return `Ошибка Telegram: ${desc}`;
}

export default { buildLuxuryPost, publishLuxuryPost };
