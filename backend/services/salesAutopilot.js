import mongoose from 'mongoose';
import { chatWithAI } from './aiService.js';
import User from '../models/User.js';
import DripLog from '../models/DripLog.js';

const DRIP_SEQUENCE = [
  { step: 1, delayDays: 0, type: 'welcome', name: 'Приветствие' },
  { step: 2, delayDays: 1, type: 'value', name: 'Ценность' },
  { step: 3, delayDays: 3, type: 'social_proof', name: 'Социальное доказательство' },
  { step: 4, delayDays: 5, type: 'demo', name: 'Демо' },
  { step: 5, delayDays: 7, type: 'urgency', name: 'Срочность' },
  { step: 6, delayDays: 10, type: 'case', name: 'Кейс' },
  { step: 7, delayDays: 14, type: 'last_chance', name: 'Последний шанс' }
];

const UPSELL_TRIGGERS = {
  posts: { threshold: 5, message: 'Вы уже создали 5 постов — пора автоматизировать публикацию с Pro.' },
  generations: { threshold: 8, message: '8 генераций — лимит free скоро закончится. Переходи на Pro.' },
  daysInactive: { threshold: 3, message: '3 дня без активности. Возвращайся — скидка 30% на Pro.' }
};

function canSendTo(user) {
  return user && user.subscription === 'free' && user.role !== 'owner';
}

async function buildMessage(type, user, options = {}) {
  const prompts = {
    welcome: `Напиши короткое дружелюбное приветственное письмо пользователю ${user.name || ''}, который только зарегистрировался в AI Viral Studio. Объясни, что OMEGA поможет с контентом. CTA: посмотреть демо.`,
    value: `Напиши полезный совет по SMM для ${user.niche || 'бизнеса'}. Закончи CTA: попробовать AI-генерацию хуков.`,
    social_proof: `Напиши короткий пост-кейс: пользователь AI Viral Studio увеличил охваты. CTA: посмотреть отзывы.`,
    demo: `Пригласи пользователя на короткое демо AI Viral Studio. CTA: записаться на 15-минутный созвон.`,
    urgency: `Напиши письмо о срочном предложении: скидка 30% на первый месяц Pro. CTA: активировать сейчас.`,
    case: `Расскажи конкретный кейс роста канала с AI Viral Studio. CTA: повторить успех.`,
    last_chance: `Напиши "последний шанс" письмо: скидка 30% заканчивается. CTA: оформить Pro.`
  };
  const text = await chatWithAI(prompts[type] || prompts.value, [], user.preferences?.language || 'ru', { role: 'business' });
  return { type, text, ...options };
}

export async function startDripCampaign(userId) {
  const user = await User.findById(userId);
  if (!canSendTo(user)) return { skipped: true, reason: 'not free or owner' };

  const existing = await DripLog.find({ userId, converted: true }).limit(1);
  if (existing.length) return { skipped: true, reason: 'already converted' };

  const results = [];
  for (const step of DRIP_SEQUENCE) {
    const already = await DripLog.findOne({ userId, step: step.step });
    if (already) continue;

    const scheduledAt = new Date(Date.now() + step.delayDays * 24 * 60 * 60 * 1000);
    const message = await buildMessage(step.type, user, { step: step.step, scheduledAt });
    const log = await DripLog.create({
      userId,
      step: step.step,
      type: step.type,
      name: step.name,
      message: message.text,
      scheduledAt,
      sent: false,
      opened: false,
      converted: false
    });
    results.push(log);
  }
  return { started: true, steps: results.length };
}

export async function checkUpsellTriggers(userId, metrics = {}) {
  const user = await User.findById(userId);
  if (!canSendTo(user)) return { triggered: false };

  const triggered = [];
  for (const [key, cfg] of Object.entries(UPSELL_TRIGGERS)) {
    if ((metrics[key] || 0) >= cfg.threshold) {
      triggered.push({ key, message: cfg.message });
    }
  }
  return { triggered: triggered.length > 0, triggers: triggered };
}

export async function activateFOMO(userId) {
  const user = await User.findById(userId);
  if (!canSendTo(user)) return { skipped: true };
  const text = await chatWithAI('Напиши короткое FOMO-сообщение: предложение ограничено, осталось мало мест. CTA: перейти на Pro.', [], user.preferences?.language || 'ru', { role: 'business' });
  return { fomo: true, message: text };
}

export async function getDripStats() {
  const total = await DripLog.countDocuments();
  const sent = await DripLog.countDocuments({ sent: true });
  const opened = await DripLog.countDocuments({ opened: true });
  const converted = await DripLog.countDocuments({ converted: true });
  return { total, sent, opened, converted, rate: total ? Math.round((converted / total) * 100) : 0 };
}

export { DRIP_SEQUENCE, UPSELL_TRIGGERS };
