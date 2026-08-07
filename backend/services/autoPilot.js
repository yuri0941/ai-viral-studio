import Subscription from '../models/Subscription.js'
import { chatWithAI } from './aiService.js'
import { sendEmail } from './emailService.js'
import { alertOwner } from './ownerBot.js'

const REMINDER_DAYS_BEFORE = 3
const GRACE_PERIOD_DAYS = 7

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function checkExpiringSubscriptions() {
  const now = new Date()
  const reminderThreshold = addDays(now, REMINDER_DAYS_BEFORE)
  const expiring = await Subscription.find({
    status: 'active',
    currentPeriodEnd: { $lte: reminderThreshold, $gte: now }
  }).populate('userId', 'email name language')

  for (const sub of expiring) {
    const user = sub.userId
    if (!user?.email) continue

    const daysLeft = Math.ceil((sub.currentPeriodEnd - now) / (1000 * 60 * 60 * 24))
    const prompt = `Напиши короткое напоминание пользователю ${user.name || ''} на русском: подписка ${sub.plan} AI Viral Studio истекает через ${daysLeft} дней. Предложи продлить сейчас и получить скидку 10% по промокоду PROLONG10. Без лишней воды, дружелюбный тон.`

    try {
      const ai = await chatWithAI(prompt, [], user.language || 'ru', { userRole: 'user' })
      const text = ai?.reply || ai?.text || `Ваша подписка ${sub.plan} истекает через ${daysLeft} дней. Продлите сейчас и получите скидку 10%: PROLONG10`

      await sendEmail({
        to: user.email,
        subject: `⏳ Подписка AI Viral Studio истекает через ${daysLeft} дней`,
        text,
      })
      console.log(`[autoPilot] reminder sent to ${user.email}`)
    } catch (err) {
      console.error('[autoPilot] reminder failed:', err.message)
    }
  }
}

export async function checkPastDueSubscriptions() {
  const now = new Date()
  const pastDue = await Subscription.find({
    status: { $in: ['active', 'past_due'] },
    currentPeriodEnd: { $lt: now }
  }).populate('userId', 'email name language telegramId')

  for (const sub of pastDue) {
    const daysOverdue = Math.floor((now - sub.currentPeriodEnd) / (1000 * 60 * 60 * 24))
    const user = sub.userId

    if (daysOverdue > GRACE_PERIOD_DAYS) {
      sub.status = 'unpaid'
      sub.plan = 'free'
      await sub.save()
      console.log(`[autoPilot] downgraded user ${user?._id} to free after ${daysOverdue} days overdue`)
      continue
    }

    if (!user?.email) continue

    const prompt = `Напиши короткое письмо на русском: подписка AI Viral Studio приостановлена из-за неуплаты. Данные сохранены на ${GRACE_PERIOD_DAYS - daysOverdue} дней. Предложи восстановить доступ по ссылке /settings?tab=subscription.`
    try {
      const ai = await chatWithAI(prompt, [], user.language || 'ru', { userRole: 'user' })
      const text = ai?.reply || ai?.text || `Подписка приостановлена. Данные сохранены на ${GRACE_PERIOD_DAYS - daysOverdue} дней. Восстановите доступ: /settings?tab=subscription`

      await sendEmail({
        to: user.email,
        subject: '⚠️ Подписка приостановлена',
        text,
      })
      console.log(`[autoPilot] past-due notice sent to ${user.email}`)
    } catch (err) {
      console.error('[autoPilot] past-due notice failed:', err.message)
    }
  }
}

export async function runAutoPilot() {
  console.log('[autoPilot] daily run started')
  await checkExpiringSubscriptions()
  await checkPastDueSubscriptions()
  console.log('[autoPilot] daily run completed')
}

export function startAutopilot() {
  import('node-cron').then(({ default: cron }) => {
    cron.schedule('0 9 * * *', () => {
      runAutoPilot().catch(err => console.error('[autoPilot] cron error:', err.message))
    }, { timezone: 'Europe/Moscow' })
    console.log('[autoPilot] cron scheduled daily at 09:00 MSK')
  }).catch(err => {
    console.error('[autoPilot] failed to load node-cron:', err.message)
  })
}
