import { detectIntent, extractTopic } from './intentEngine.js';
import { generateChannelPost, publishToChannel } from '../../services/telegramChannelManager.js';
import { extractText } from '../../services/aiService.js';
import { createTicket } from '../../services/supportService.js';
import { analyzeDailyPerformance } from '../../services/selfReflection.js';
import { generateOptimizationReport } from '../../services/performanceMonitor.js';

export async function executeAction({ intent, text, chatId, userRole, bot }) {
  const safeSend = (msg, opts) => bot.sendMessage(chatId, msg, { parse_mode: 'HTML', ...opts });
  
  switch (intent.action) {
    case 'post': {
      const topic = extractTopic(text, intent);
      safeSend(`⏳ Генерирую пост: "${topic}"...`);
      try {
        const post = await generateChannelPost({ topic, niche: 'general', style: 'viral', language: 'ru' });
        const postText = extractText(post?.text);
        if (!postText) throw new Error('Генерация не удалась — попробуйте другую тему');
        // [v9.9.19.3] проверяем результат публикации + ссылка-доказательство
        const pub = await publishToChannel({ text: postText.slice(0, 900), imageUrl: post.imageUrl, caption: post.caption || postText.slice(0, 200) });
        if (!pub?.success) throw new Error(pub?.error || 'Публикация не удалась');
        safeSend(
          `✅ <b>Пост опубликован!</b>\n━━━━━━━━━━━━━━\n` +
          `📢 Канал: ${pub.channel || '@aiviralstudio'}\n📝 Тема: ${topic}\n⏰ ${new Date().toLocaleString('ru-RU')}` +
          (pub.url ? `\n\n🔗 <a href="${pub.url}">Открыть пост</a>` : `\n\n🔎 Проверьте канал — message_id: ${pub.messageId}`)
        );
        return { success: true, action: 'post', topic, messageId: pub.messageId, url: pub.url };
      } catch (e) {
        safeSend(`⚠️ ${e.message}`);
        return { success: false, action: 'post', error: e.message };
      }
    }
    case 'status': {
      const mongoose = (await import('mongoose')).default;
      const mongoStatus = mongoose.connection.readyState === 1 ? '🟢 OK' : '🔴 Нет связи';
      const uptimeMin = Math.floor(process.uptime() / 60);
      const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
      safeSend(`📊 <b>Статус OMEGA</b>\n🗄 MongoDB: ${mongoStatus}\n⏱ Uptime: ${uptimeMin} мин\n🧠 RAM: ${memMB} MB\n🤖 OMEGA: 🟢 Активна\n📢 Канал: @aiviralstudio`);
      return { success: true, action: 'status' };
    }
    case 'improve': {
      safeSend('⏳ Анализирую производительность...');
      try {
        const report = await analyzeDailyPerformance();
        safeSend(`🧠 <b>Self-Optimization</b>\n${report?.summary || 'Анализ выполнен. Параметры обновлены.'}`);
        return { success: true, action: 'improve' };
      } catch (e) {
        safeSend(`⚠️ ${e.message}`);
        return { success: false, action: 'improve', error: e.message };
      }
    }
    case 'report': {
      safeSend('⏳ Формирую отчёт...');
      try {
        const report = await generateOptimizationReport();
        // [v9.9.19.3] никакого сырого JSON в чат — только человекочитаемый текст
        const short = typeof report === 'string'
          ? report.slice(0, 800)
          : (report?.summary || report?.text || report?.message || '✅ Отчёт сформирован. Полная версия — в Dashboard → Аналитика.');
        safeSend(`📈 <b>Отчёт</b>\n${short}`);
        return { success: true, action: 'report' };
      } catch (e) {
        safeSend(`⚠️ ${e.message}`);
        return { success: false, action: 'report', error: e.message };
      }
    }
    case 'ticket': {
      try {
        const ticket = await createTicket({
          userEmail: `tg_${chatId}@aiviral-studio.ru`,
          subject: 'Запрос из Telegram (Action Engine)',
          description: text,
          telegramChatId: String(chatId)
        });
        safeSend(`🎫 <b>Тикет #${ticket._id.toString().slice(-6)} создан!</b>\nВладелец рассмотрит.`);
        return { success: true, action: 'ticket', ticketId: ticket._id };
      } catch (e) {
        safeSend(`⏳ Запрос передан владельцу.`);
        return { success: false, action: 'ticket', error: e.message };
      }
    }
    case 'menu': {
      return { success: true, action: 'menu' };
    }
    default: {
      return { success: false, action: 'chat' };
    }
  }
}
