import { chatWithAI, extractText } from './aiService.js';
import User from '../models/User.js';

const MOCK_PROSPECTS = [
  { id: 'bd-1', company: 'ООО "Вирус Маркетинг"', contact: 'Анна С.', email: 'anna@viral.example', niche: 'b2b', location: 'Москва', score: 87 },
  { id: 'bd-2', company: 'ИП КреативПро', contact: 'Максим К.', email: 'max@creative.example', niche: 'fashion', location: 'СПб', score: 72 },
  { id: 'bd-3', company: 'StartupX', contact: 'Иван П.', email: 'ivan@startupx.example', niche: 'tech', location: 'Казань', score: 65 }
];

export async function findProspects(niche = 'general', location = '', limit = 20) {
  // Placeholder: in real life this would scan open data / LinkedIn / databases
  return MOCK_PROSPECTS
    .filter(p => !niche || niche === 'general' || p.niche === niche)
    .filter(p => !location || p.location.toLowerCase().includes(location.toLowerCase()))
    .slice(0, limit);
}

export async function generateColdEmail(prospect, niche = 'general') {
  const prompt = `
Напиши короткое холодное письмо потенциальному клиенту.
Компания: ${prospect.company}. Контакт: ${prospect.contact}. Ниша: ${niche}.
Продукт: AI Viral Studio — AI-платформа для вирусного SMM.
Тон: уважительный, цепляющий, без спама. CTA: 15-минутная демонстрация.
`;
  const body = extractText(await chatWithAI(prompt, [], 'ru', { role: 'business' }));
  return {
    subject: `AI для роста ${prospect.niche || 'вашего бизнеса'} — демо за 15 минут`,
    body: body || ''
  };
}

export async function scheduleFollowUp(prospectId, step = 1) {
  const delays = [3, 7, 14]; // days
  const delay = delays[step - 1] || 7;
  const scheduledAt = new Date(Date.now() + delay * 24 * 60 * 60 * 1000);
  return { prospectId, step, delay, scheduledAt };
}

export async function getBusinessDevStats() {
  const users = await User.countDocuments();
  return {
    prospects: MOCK_PROSPECTS.length,
    emailsSent: Math.floor(users * 0.2),
    responses: Math.floor(users * 0.05),
    meetings: Math.floor(users * 0.01)
  };
}
