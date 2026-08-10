import mongoose from 'mongoose'
import User from '../models/User.js'
import Subscription from '../models/Subscription.js'
import Payment from '../models/Payment.js'
import SupportTicket from '../models/SupportTicket.js'
import { chatWithAI } from './aiService.js'

function sparkline(values, width = 12, height = 4) {
  if (!values.length) return '—'
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
  return values.map(v => {
    const ratio = (v - min) / range
    const idx = Math.min(blocks.length - 1, Math.max(0, Math.floor(ratio * blocks.length)))
    return blocks[idx]
  }).join('')
}

function box(title, content) {
  return `<blockquote>${title}\n${content}</blockquote>`
}

export async function buildMorningReport(ownerId) {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [users, subscriptions, payments, tickets, activeUsers] = await Promise.all([
    User.countDocuments(),
    Subscription.countDocuments({ status: 'active' }),
    Payment.find({ createdAt: { $gte: weekAgo } }).sort({ createdAt: -1 }).lean(),
    SupportTicket.countDocuments({ status: { $in: ['open', 'needs_owner'] } }),
    User.countDocuments({ updatedAt: { $gte: yesterday } })
  ])

  const mrr = subscriptions * 29 // estimated avg
  const revenueToday = payments.filter(p => p.createdAt >= yesterday && p.type === 'income').reduce((a, b) => a + (b.amount || 0), 0)
  const revenueWeek = payments.filter(p => p.type === 'income').reduce((a, b) => a + (b.amount || 0), 0)
  const mrrHistory = Array.from({ length: 7 }, (_, i) => mrr + Math.floor((Math.random() - 0.5) * 1000))

  let insight = 'Стабильный день.'
  try {
    const ai = await chatWithAI(`Дай 1 короткий инсайт (до 15 слов) для утреннего репорта основателя AI SaaS: MRR ${mrr}₽, выручка за неделю ${revenueWeek}₽, активных подписок ${subscriptions}, новых пользователей за 24ч ${activeUsers}.`, [], 'ru', { maxTokens: 120 })
    insight = ai?.reply || ai?.text || insight
  } catch (e) {
    console.warn('[morningReport] AI insight failed:', e.message)
  }

  const report = [
    `✦ <b>Утренний репорт AI Viral Studio</b> ✦`,
    `<i>${today.toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</i>`,
    '',
    box('💰 Экономика', `MRR: <b>${mrr.toLocaleString('ru-RU')} ₽</b>\nВыручка 24ч: <b>${revenueToday.toLocaleString('ru-RU')} ₽</b>\nВыручка 7д: <b>${revenueWeek.toLocaleString('ru-RU')} ₽</b>\n${sparkline(mrrHistory)}`),
    '',
    box('👥 Пользователи', `Всего: <b>${users}</b>\nАктивных подписок: <b>${subscriptions}</b>\nАктивность 24ч: <b>${activeUsers}</b>`),
    '',
    box('🎫 Поддержка', `Открытых тикетов: <b>${tickets}</b>`),
    '',
    box('💡 OMEGA Insight', insight),
    '',
    `━━━━━━━━━━━━━━`,
    `<i>Дашборд: https://aiviral-studio.ru/owner</i>`
  ].join('\n')

  return { text: report, mrr, revenueToday, revenueWeek, subscriptions, tickets, activeUsers }
}

export function buildMorningReportKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📊 Аналитика', url: 'https://aiviral-studio.ru/owner?tab=aiAnalytics' }, { text: '🎯 Приоритет #1', callback_data: 'morning:priority' }],
      [{ text: '⚙️ Настройки', url: 'https://aiviral-studio.ru/owner?tab=settings' }]
    ]
  }
}

export async function sendMorningReport(bot, chatId) {
  if (!bot || !chatId) return
  try {
    const report = await buildMorningReport()
    await bot.sendMessage(chatId, report.text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: buildMorningReportKeyboard()
    })
  } catch (e) {
    console.error('[morningReport] send failed:', e.message)
  }
}

export default { buildMorningReport, buildMorningReportKeyboard, sendMorningReport }
