import { alertOwner } from './alertService.js';
import { getFeedbackStats } from './feedbackService.js';

export async function buildKeyDigest() {
  try {
    const { getProviderStatuses, AI_PROVIDER_URLS } = await import('./aiService.js');
    const statuses = await getProviderStatuses();
    const active = [];
    const invalid = [];
    const missing = [];
    statuses.forEach(s => {
      if (s.status === 'active' || s.status === 'ok') active.push(s.name);
      else if (s.status === 'invalid') invalid.push(`${s.name}: ${s.lastError || 'invalid'}`);
      else if (s.status === 'missing' && AI_PROVIDER_URLS[s.id]) missing.push(`${s.name} — ${AI_PROVIDER_URLS[s.id]}`);
    });

    let section = '\n🔑 Ключи ИИ:';
    if (active.length) section += `\n✅ Активны (${active.length}): ${active.join(', ')}`;
    if (invalid.length) section += `\n❌ Невалидны:\n${invalid.map(x => `• ${x}`).join('\n')}`;
    if (missing.length) section += `\n➕ Не добавлены (бесплатные):\n${missing.map(x => `• ${x}`).join('\n')}`;
    if (!active.length && !invalid.length && !missing.length) section += '\n✅ Все ключи на месте';
    if (missing.length || invalid.length) {
      section += '\n<em>Вставьте любой в Кабинет → API Ключи — включится автоматически.</em>';
    }
    return section;
  } catch (e) {
    console.warn('[dailyReport] key digest failed:', e.message);
    return '';
  }
}

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

  // [v9.9.19.14.4] ежедневная сводка по ключам
  const keySection = await buildKeyDigest();

  const report = `📊 <b>Утренний репорт OMEGA</b>
🗓 ${new Date().toLocaleDateString('ru-RU')}

👤 Новых клиентов за 24ч: ${usersToday}
💬 Feedback: ${stats.thumbsUp} 👍 / ${stats.thumbsDown} 👎 (удовлетворённость: ${stats.satisfaction}%)
🎫 Открытых тикетов: ${ticketsOpen}${channelSection}${keySection}
🤖 Статус: 🟢 Активна
⏰ ${new Date().toLocaleString('ru-RU')}`;

  await alertOwner(report);
}
