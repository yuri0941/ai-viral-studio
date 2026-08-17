// [v9.9.19.6] Link Guard + Telegram HTML санитайзер.
// Только рабочие ссылки: whitelist проекта или HEAD-проверка (200). Остальные → сайт проекта.
// Убирает сырой markdown (**звёздочки**) из текстов канала — parse_mode HTML везде.

import { CLIENT_BOT_USERNAME, CHANNEL_USERNAME } from '../config/bots.js';

const FALLBACK_URL = 'https://aiviral-studio.ru';

export function getWhitelist() {
  const list = [
    'https://aiviral-studio.ru',
    'https://www.aiviral-studio.ru',
    `https://t.me/${CHANNEL_USERNAME}`,
    `https://t.me/${CLIENT_BOT_USERNAME}`,
  ];
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
  const channel = process.env.TELEGRAM_CHANNEL || process.env.TELEGRAM_CHANNEL_ID || '';
  if (/^@[a-zA-Z][\w]{3,}$/.test(channel)) list.push(`https://t.me/${channel.slice(1)}`);
  return list;
}

export function getWhitelistPrompt() {
  return getWhitelist().join(', ');
}

function isWhitelisted(url) {
  return getWhitelist().some(w => url === w || url.startsWith(w + '/') || url.startsWith(w + '?'));
}

// HEAD-проверка с таймаутом; не 2xx/3xx → false. Некоторые сайты не дают HEAD → GET fallback.
async function checkUrl(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { method, redirect: 'follow', signal: controller.signal });
      clearTimeout(timer);
      if (res.status >= 200 && res.status < 400) return true;
      if (method === 'HEAD' && res.status === 405) continue; // HEAD не поддержан → пробуем GET
      return false;
    } catch {
      if (method === 'GET') return false;
    }
  }
  return false;
}

export function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Markdown → Telegram HTML. Порядок важен: сначала escape, потом конверсия.
export function markdownToHtml(text) {
  if (!text) return '';
  let t = escapeHtml(text);
  t = t
    .replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>')
    .replace(/__(.*?)__/gs, '<u>$1</u>')
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*(.*?)\*/gs, '<i>$1</i>');
  // Гарантия: никаких оставшихся пар звёздочек
  t = t.replace(/\*\*/g, '');
  return t;
}

// Заменяет все URL в тексте: whitelist остаётся, чужие проверяются, мёртвые → сайт проекта.
export async function sanitizeLinks(text) {
  const urls = String(text || '').match(/https?:\/\/[^\s<>"')]+/g) || [];
  let result = String(text || '');
  for (const url of [...new Set(urls)]) {
    if (isWhitelisted(url)) continue;
    const ok = await checkUrl(url);
    if (!ok) result = result.split(url).join(FALLBACK_URL);
  }
  return result;
}

// Полный пайплайн для текста канала: markdown → HTML, ссылки проверены, длина ограничена.
export async function prepareChannelText(text, maxLen = 1024) {
  let t = markdownToHtml(text);
  t = await sanitizeLinks(t);
  if (t.length > maxLen) t = t.slice(0, maxLen - 1).replace(/<[^>]*$/, '') + '…';
  return t;
}
