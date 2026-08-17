import { alertOwner } from './ownerBot.js';
import ClientDialogue from '../models/ClientDialogue.js';
import { CLIENT_BOT_TOKEN } from '../config/bots.js';

// Проверить inactive клиентов (не писали 3+ дня)
export async function checkInactiveClients() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const inactive = await ClientDialogue.find({
    updatedAt: { $lt: threeDaysAgo },
    outcome: { $in: ['pending', 'converted'] }
  }).limit(50);

  for (const d of inactive) {
    // Отправляем через omegaBot (импортировать динамически чтобы избежать цикла)
    try {
      const { default: TelegramBot } = await import('node-telegram-bot-api');
      const bot = new TelegramBot(CLIENT_BOT_TOKEN, { polling: false });
      await bot.sendMessage(d.telegramChatId, `👋 Привет! Пропустили тренд? 🔥\n\nВ вашей нише сейчас вирусит новый формат. Хотите, я покажу?\n\nOMEGA 🤖`, {
        reply_markup: { inline_keyboard: [[{ text: '🔥 Покажи тренд', callback_data: 'content:trend' }], [{ text: '📋 Меню', callback_data: 'menu:main' }]] }
      });
    } catch (e) { console.error('Retention message failed:', e.message); }
  }
}

// Проверить 80% квоты (нужен User model с generationsUsed)
export async function checkQuotaAlerts() {
  // Заглушка — реализовать когда будет UsageQuota модель
  console.log('Quota check: placeholder');
}

// Проверить 7 дней после регистрации
export async function checkNewUserFollowUp() {
  // Заглушка — реализовать когда будет поле registrationDate
  console.log('New user follow-up: placeholder');
}
