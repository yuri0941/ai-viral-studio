import ClientDialogue from '../models/ClientDialogue.js';
import { addToVectorMemory, searchVectorMemory } from './vectorStore.js';

// Сохранить диалог для обучения
export async function saveDialogue(telegramChatId, messages, outcome = 'pending', niche = 'general') {
  try {
    const dialogue = await ClientDialogue.create({
      telegramChatId,
      messages: messages.map(m => ({ role: m.role, content: m.content, intent: m.intent || 'other' })),
      outcome,
      niche,
    });
    // Сохраняем в Vector Store для RAG
    const summary = messages.map(m => `${m.role}: ${m.content}`).join('\n').slice(0, 2000);
    await addToVectorMemory({
      id: `dialogue_${dialogue._id}`,
      text: summary,
      metadata: { type: 'dialogue', telegramChatId, outcome, niche, date: new Date() },
      userId: telegramChatId || 'global'
    });
    return dialogue;
  } catch (e) {
    console.error('Save dialogue error:', e.message);
    return null;
  }
}

// Найти похожие успешные диалоги
export async function findSimilarSuccess(query, niche = 'general', limit = 3) {
  try {
    const res = await searchVectorMemory({ query, userId: 'global', limit });
    const results = Array.isArray(res) ? res : (res?.results || []);
    return results.filter(r => r.metadata?.type === 'dialogue' && r.metadata?.outcome === 'converted');
  } catch (e) {
    return [];
  }
}

// Определить тон клиента
export function detectClientTone(text) {
  const lower = text.toLowerCase();
  if (/здравствуйте|прошу|благодарю|вопрос|уточнить/i.test(lower)) return 'formal';
  if (/привет|круто|класс|спасибо|супер|🔥|😂/i.test(lower)) return 'casual';
  if (/серьёзно|ну да|очевидно|конечно|ясно/i.test(lower)) return 'ironic';
  if (/api|интеграция|endpoint|json|backend|frontend/i.test(lower)) return 'technical';
  if (/срочно|помогите|беда|ужас|кошмар|😭/i.test(lower)) return 'emotional';
  return 'casual';
}

// Определить intent
export function detectIntent(text) {
  const lower = text.toLowerCase();
  if (/привет|здравствуй|хай|hey/i.test(lower)) return 'greeting';
  if (/цена|стоимость|тариф|сколько|плат|деньг|руб|usd/i.test(lower)) return 'pricing';
  if (/помощ|поддержк|не работает|баг|ошибк|сбой|упал/i.test(lower)) return 'support';
  if (/купить|оформить|заказать|приобрести|подписаться|пробный|триал/i.test(lower)) return 'sales';
  if (/пост|контент|видео|reels|тикток|хук|вирус/i.test(lower)) return 'content';
  if (/удалить|отменить|отписаться|не нужен|перестать|возврат/i.test(lower)) return 'churn';
  return 'other';
}

// Обновить исход диалога
export async function updateDialogueOutcome(telegramChatId, outcome) {
  try {
    await ClientDialogue.findOneAndUpdate(
      { telegramChatId },
      { outcome, updatedAt: new Date() },
      { sort: { createdAt: -1 } }
    );
  } catch (e) { console.error('Update outcome error:', e.message); }
}
