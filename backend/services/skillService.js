// [v9.9.19.6] Skill Service — живое обучение OMEGA.
// "Изучи X" → исследование (SerpAPI/DuckDuckGo через searchWithFallback; нет ключа — чистый AI)
// → конспект 5–10 фактов → SkillNode в MongoDB → факты применяются в постах и ответах (appliedCount++).
import SkillNode from '../models/SkillNode.js';
import { chatWithAI, extractText } from './aiService.js';
import { createNode } from './cognitiveMesh.js';

const MAX_FACTS = 10;

function normalizeKey(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 120);
}

async function researchTopic(name) {
  // SerpAPI (через getProviderKey внутри) → DuckDuckGo fallback; без сети — пусто, сработает AI
  try {
    const { searchWithFallback } = await import('../ai/omega/webSearch.js');
    const res = await searchWithFallback(`${name} — практическое руководство, лучшие практики 2026`);
    return (res?.sources || []).slice(0, 5);
  } catch (e) {
    console.warn('[skillService] research failed:', e.message);
    return [];
  }
}

async function distillFacts(name, sources) {
  const srcBlock = sources.length
    ? sources.map((s, i) => `${i + 1}. ${s.title} — ${s.snippet || s.link}`).join('\n')
    : 'Внешние источники недоступны — используй свою экспертную базу знаний.';
  const prompt = `Ты OMEGA — AI-директор AI Viral Studio (SMM/Telegram/AI-контент).
Изучи тему: "${name}".
Источники:
${srcBlock}

Составь практический конспект. Верни ТОЛЬКО JSON:
{ "summary": "суть темы в 1-2 предложениях",
  "facts": ["факт/приём 1", "факт 2", ...] }
Требования: 5-10 фактов, каждый — конкретный применимый приём (не вода), до 120 символов, на русском.`;
  const ai = await chatWithAI(prompt, [], 'ru', { system: 'Return ONLY valid JSON.', maxTokens: 1200, temperature: 0.5 });
  const raw = extractText(ai).replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
    const facts = (Array.isArray(parsed.facts) ? parsed.facts : [])
      .map(f => String(f).trim()).filter(Boolean).slice(0, MAX_FACTS);
    if (facts.length) return { summary: String(parsed.summary || '').slice(0, 300), facts };
  } catch { /* fallback ниже */ }
  return {
    summary: raw.slice(0, 300) || `Материалы по теме "${name}" изучены.`,
    facts: raw.split('\n').map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(l => l.length > 15).slice(0, MAX_FACTS),
  };
}

// Главная точка: изучить тему. Без дублей — существующий узел возвращается с already:true.
export async function learnTopic(rawName, { force = false, source = 'command' } = {}) {
  const name = String(rawName || '').trim().slice(0, 120);
  if (!name) throw new Error('Не указана тема для изучения');
  const nameKey = normalizeKey(name);

  const existing = await SkillNode.findOne({ nameKey });
  if (existing && !force) return { already: true, skill: existing };

  const sources = await researchTopic(name);
  const { summary, facts } = await distillFacts(name, sources);
  if (!facts.length) throw new Error('Не удалось составить конспект — попробуйте переформулировать тему');

  const realSource = sources.length ? 'web' : 'ai';
  const skill = await SkillNode.findOneAndUpdate(
    { nameKey },
    { name, summary, facts, source: source === 'dream_mode' ? 'dream_mode' : realSource, learnedAt: new Date(), $inc: existing ? {} : { appliedCount: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Зеркало в Cognitive Mesh — навык виден в нейрографе и общем контексте
  try {
    await createNode({
      type: 'skill',
      content: `Навык изучен: ${name}. ${summary}`,
      confidence: 0.9,
      source: 'skill_service',
      metadata: { skillNodeId: skill._id, factsCount: facts.length, source: skill.source },
    });
  } catch (e) { console.warn('[skillService] cognitive mirror failed:', e.message); }

  // [v9.9.19.14] write-through в procedural-слой (навыки переживают рестарт)
  import('./memoryLayerService.js')
    .then(m => m.addMemoryEntry('procedural', { type: 'skill', content: `Навык: ${name} — ${facts.length} фактов. ${summary}`.slice(0, 500), tags: ['skill', skill.source] }))
    .catch(() => {});

  return { already: false, skill };
}

// Факты из изученных навыков для подмешивания в промпты (посты, ответы). appliedCount++ реально.
export async function getSkillFactsForContext(limit = 3) {
  const skills = await SkillNode.find({ 'facts.0': { $exists: true } })
    .sort({ appliedCount: 1, learnedAt: -1 }).limit(5).lean();
  if (!skills.length) return [];
  const picked = [];
  for (const s of skills) {
    const fact = s.facts[Math.floor(Math.random() * s.facts.length)];
    if (fact) picked.push({ skillId: s._id, name: s.name, fact });
    if (picked.length >= limit) break;
  }
  // Применение засчитывается фактом использования в генерации
  await SkillNode.updateMany(
    { _id: { $in: picked.map(p => p.skillId) } },
    { $inc: { appliedCount: 1 }, $set: { lastAppliedAt: new Date() } }
  ).catch(() => {});
  return picked;
}

export async function listSkills(limit = 100) {
  return SkillNode.find().sort({ learnedAt: -1 }).limit(limit).lean();
}

export async function countSkills() {
  return SkillNode.countDocuments();
}
