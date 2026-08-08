import { queryMesh } from './cognitiveMesh.js';

const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID;

export function isOwner(chatId) {
  return chatId.toString() === OWNER_CHAT_ID?.toString();
}

export async function getOwnerContext(chatId) {
  if (!isOwner(chatId)) return null;
  const decisions = await queryMesh(`decision owner:${OWNER_CHAT_ID}`, 5, 0.7);
  const projects = await queryMesh(`project owner:${OWNER_CHAT_ID}`, 5, 0.7);
  const personality = await queryMesh(`personality_profile owner:${OWNER_CHAT_ID}`, 1, 0.9);
  return {
    isOwner: true,
    name: 'Юрий',
    recentDecisions: decisions.map(d => d.content.slice(0, 80)),
    activeProjects: projects.map(p => p.content.slice(0, 80)),
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
  text += `🤖 OMEGA готова к работе. Вот что у нас сегодня:\n`;
  if (context.activeProjects?.length > 0) {
    text += `\n📁 <b>Активные проекты:</b> ${context.activeProjects.length}\n`;
    context.activeProjects.slice(0, 3).forEach((p, i) => {
      text += `  ${i + 1}. ${p}\n`;
    });
  }
  if (context.recentDecisions?.length > 0) {
    text += `\n⏳ <b>Ожидают решения:</b> ${context.recentDecisions.length}\n`;
  }
  text += `\n💡 <b>Чем займёмся?</b>`;

  const buttons = [
    [{ text: '🎬 Создать контент', callback_data: 'action:content' }, { text: '📊 Аналитика', callback_data: 'action:analytics' }],
    [{ text: '🏭 Project Factory', callback_data: 'action:factory' }, { text: '🔮 Прогнозы', callback_data: 'action:prediction' }],
    [{ text: '📱 Пост в канал', callback_data: 'action:channel_post' }, { text: '🛠 Улучшить бота', callback_data: 'action:improve' }],
    [{ text: '⚡ Быстрая команда', callback_data: 'action:command' }]
  ];
  return { text, buttons, parse_mode: 'HTML' };
}
