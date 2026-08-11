import { alertOwner } from './alertService.js';
import { getFeedbackStats } from './feedbackService.js';

export async function sendDailyReport() {
  const stats = await getFeedbackStats(1);
  const mongoose = (await import('mongoose')).default;
  const { User, Ticket } = await import('../models/index.js');
  const usersToday = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } });
  const ticketsOpen = await Ticket.countDocuments({ status: 'open' });

  // [v9.9.19.2-v4-CHANNEL-AUTO] секция канала: подписчики (рост/падение), модерация, голосования
  let channelSection = '';
  try {
    const { default: ChannelStats } = await import('../models/ChannelStats.js');
    const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10); // MSK
    const st = await ChannelStats.findOne({ date: today }).lean();
    if (st) {
      channelSection = `\n📢 Канал: ${st.subscribers} подписчиков (${st.delta >= 0 ? '+' : ''}${st.delta})`;
      channelSection += `\n🛡 Модерация: ${st.violations} нарушений, ${st.bans} банов`;
      if (st.pollWinner?.topic) channelSection += `\n🗳 Голосование: «${st.pollWinner.topic}» — ${st.pollWinner.votes} голосов`;
    }
  } catch (e) { console.warn('[dailyReport] channel stats failed:', e.message); }

  const report = `📊 <b>Утренний репорт OMEGA</b>
🗓 ${new Date().toLocaleDateString('ru-RU')}

👤 Новых клиентов за 24ч: ${usersToday}
💬 Feedback: ${stats.thumbsUp} 👍 / ${stats.thumbsDown} 👎 (удовлетворённость: ${stats.satisfaction}%)
🎫 Открытых тикетов: ${ticketsOpen}${channelSection}
🤖 Статус: 🟢 Активна
⏰ ${new Date().toLocaleString('ru-RU')}`;

  await alertOwner(report);
}
