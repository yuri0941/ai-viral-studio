import { queryMesh } from './cognitiveMesh.js';

const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID;

export function isOwner(chatId) {
  return chatId.toString() === OWNER_CHAT_ID?.toString();
}

export async function getOwnerContext(chatId) {
  if (!isOwner(chatId)) return null;
  const rawDecisions = await queryMesh(`decision owner:${OWNER_CHAT_ID}`, 5, 0.7);
  const rawProjects = await queryMesh(`project owner:${OWNER_CHAT_ID}`, 5, 0.7);
  const personality = await queryMesh(`personality_profile owner:${OWNER_CHAT_ID}`, 1, 0.9);

  const recentDecisions = rawDecisions
    .map(d => d.content.slice(0, 80))
    .filter(d => d && d.length > 10 && !/Owners?:\s*\*\*Привет|OMEGA:\s*\*\*Актуально|test|mock/i.test(d))
    .slice(0, 3);

  const activeProjects = rawProjects
    .map(p => p.content.slice(0, 80))
    .filter(p => p && p.length > 5 && !/Owners?:\s*\*\*Привет|OMEGA:/i.test(p))
    .slice(0, 3);

  return {
    isOwner: true,
    name: 'Юрий',
    recentDecisions,
    activeProjects,
    style: personality[0]?.metadata?.profile || {},
    lastInteraction: new Date()
  };
}

export async function getSmartGreeting(context) {
  if (!context || !context.isOwner) {
    return {
      text: '👋 Добро пожаловать в AI Viral Studio!\n\nЗдесь вы можете узнать о наших услугах или связаться с владельцем.',
      buttons: [
        [{ text: '🌐 Перейти на сайт', url: 'https://aiviral-studio.ru' }],
        [{ text: '💬 Написать владельцу', url: 'https://t.me/owner_username' }]
      ]
    };
  }
  const hour = new Date().getHours();
  let greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const style = context.style?.tone || 'casual';
  if (style === 'energetic') greeting += ' 🔥';
  if (style === 'calm') greeting += ' ☕';

  let text = `👑 <b>${greeting}, Юрий!</b>\n\n`;
  text += `🤖 OMEGA готова к работе. `;
  if (context.activeProjects?.length > 0) {
    text += `Активных проектов: ${context.activeProjects.length}. `;
  }
  if (context.recentDecisions?.length > 0) {
    text += `Ждут решения: ${context.recentDecisions.length}. `;
  }
  text += `\n\n💡 <b>Чем займёмся?</b>`;

  const buttons = [
    [{ text: '🎬 Создать контент', callback_data: 'action:content' }, { text: '📊 Аналитика', callback_data: 'action:analytics' }],
    [{ text: '🏭 Project Factory', callback_data: 'action:factory' }, { text: '🔮 Прогнозы', callback_data: 'action:prediction' }],
    [{ text: '📱 Пост в канал', callback_data: 'action:channel_post' }, { text: '🛠 Улучшить бота', callback_data: 'action:improve' }],
    [{ text: '⚡ Быстрая команда', callback_data: 'action:command' }]
  ];
  return { text, buttons, parse_mode: 'HTML' };
}
