import { alertOwner } from './alertService.js';
import { getFeedbackStats } from './feedbackService.js';

export async function sendDailyReport() {
  const stats = await getFeedbackStats(1);
  const mongoose = (await import('mongoose')).default;
  const { User, Ticket } = await import('../models/index.js');
  const usersToday = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } });
  const ticketsOpen = await Ticket.countDocuments({ status: 'open' });

  const report = `📊 <b>Утренний репорт OMEGA</b>
🗓 ${new Date().toLocaleDateString('ru-RU')}

👤 Новых клиентов за 24ч: ${usersToday}
💬 Feedback: ${stats.thumbsUp} 👍 / ${stats.thumbsDown} 👎 (удовлетворённость: ${stats.satisfaction}%)
🎫 Открытых тикетов: ${ticketsOpen}
🤖 Статус: 🟢 Активна
⏰ ${new Date().toLocaleString('ru-RU')}`;

  await alertOwner(report);
}
