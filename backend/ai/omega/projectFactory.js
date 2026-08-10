// OMEGA Project Factory — генерация приложений/сайтов/компонентов
import { chatWithAI, extractText } from '../../services/aiService.js';
import JSZip from 'jszip';

const TYPE_HINTS = {
  react: 'React 18 + Vite + Tailwind CSS',
  html: 'HTML5 + Tailwind CSS (CDN)',
  'telegram-bot': 'Node.js + node-telegram-bot-api',
  landing: 'Landing page HTML',
  api: 'Express.js API',
};

export async function generateProject({ description = '', type = 'auto', stack, ownerId }) {
  const resolvedType = type === 'auto' ? detectType(description) : type;
  const resolvedStack = stack || TYPE_HINTS[resolvedType] || 'Vite+React+Node';

  const analysis = await chatWithAI(
    `Проанализируй запрос и определи: тип проекта, стек, сложность, файлы. Запрос: ${description}`,
    [], 'ru', { userRole: 'owner', context: 'project_factory' }
  );

  const variants = [];
  for (let i = 0; i < 3; i++) {
    const code = await chatWithAI(
      `Сгенерируй ${resolvedType} (${resolvedStack}) для: ${description}. Вариант ${i+1}. Разбей код на файлы с комментариями "// File: путь". Только код, без лишнего markdown.`,
      [], 'ru', { userRole: 'owner', context: 'project_factory' }
    );
    const files = parseFiles(extractText(code));
    variants.push({
      id: `variant-${i+1}`,
      name: `Вариант ${i+1}`,
      files,
      preview: await generatePreview(files, resolvedType)
    });
  }

  return { variants, analysis: extractText(analysis) };
}

function detectType(description) {
  const d = (description || '').toLowerCase();
  if (d.includes('бот') || d.includes('bot') || d.includes('telegram')) return 'telegram-bot';
  if (d.includes('landing') || d.includes('лендинг') || d.includes('сайт-визитка')) return 'landing';
  if (d.includes('api') || d.includes('сервер') || d.includes('backend')) return 'api';
  if (d.includes('react') || d.includes('dashboard') || d.includes('приложение')) return 'react';
  return 'html';
}

export async function generatePreview(files, type) {
  if (type === 'react' || type === 'landing' || type === 'html') {
    const htmlFile = files.find(f => f.path.endsWith('.html'));
    if (htmlFile) return wrapHtmlPreview(htmlFile.content, files);
    const jsFile = files.find(f => f.path.endsWith('.jsx') || f.path.endsWith('.js'));
    return wrapHtmlPreview(jsFile ? `<pre>${jsFile.content}</pre>` : '<p>No preview</p>', files);
  }
  if (type === 'telegram-bot') {
    return wrapBotPreview(files);
  }
  return `<html><body><h1>Project Preview</h1><pre>${files.map(f => f.path).join('\n')}</pre></body></html>`;
}

function wrapHtmlPreview(mainHtml, files) {
  const css = files.filter(f => f.path.endsWith('.css')).map(f => f.content).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${css}</style></head><body>${mainHtml}</body></html>`;
}

function wrapBotPreview(files) {
  const mainFile = files.find(f => f.path.includes('index') || f.path.includes('bot')) || files[0];
  return `<html><body><h1>Telegram Bot Preview</h1><pre>${mainFile?.content?.slice(0, 2000) || 'No code'}</pre></body></html>`;
}

export async function exportProject(variant, format = 'zip') {
  if (typeof variant === 'string') {
    return null;
  }
  if (format === 'zip') {
    const zip = new JSZip();
    (variant.files || []).forEach(file => zip.file(file.path, file.content));
    return await zip.generateAsync({ type: 'nodebuffer' });
  }
  if (format === 'files') return variant.files;
  return null;
}

export function parseFiles(code) {
  const files = [];
  const regex = /\/\/\s*File:\s*(.+?)\n([\s\S]*?)(?=\/\/\s*File:|$)/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    files.push({ path: match[1].trim(), content: match[2].trim() });
  }
  if (files.length === 0) {
    // fallback: if code looks like HTML, save as index.html, else as index.js
    const path = code.trim().startsWith('<') || code.includes('<!DOCTYPE') ? 'index.html' : 'index.js';
    files.push({ path, content: code.trim() });
  }
  return files;
}
