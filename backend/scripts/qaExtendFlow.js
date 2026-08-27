// [OWNER-OMEGA] QA: продление подписки через ownerActionsService (общая обёртка TG-бота и кабинета).
// Сценарий: qa-клиент → findClientSubscription → extendSubscriptionDays(+3) → дата сдвинулась,
// user.subscription синхронизирован, повторное продление наращивает от НОВОЙ даты, мусорные days отклонены.
// Запуск: node backend/scripts/qaExtendFlow.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { default: Subscription } = await import('../models/Subscription.js')
const { findClientSubscription, extendSubscriptionDays } = await import('../services/ownerActionsService.js')
const { reloadBotToken } = await import('../services/botReloader.js')
const { logAiUsage, getExpensesSummary } = await import('../services/expenseTracker.js')

const step = (n, ok, d = '') => console.log(`${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`)
let failed = 0
const check = (n, ok, d = '') => { step(n, ok, d); if (!ok) failed++ }

// --- подготовка qa-клиента ---
const EMAIL = 'qa.extend@test.dev'
let user = await User.findOne({ email: EMAIL })
if (!user) {
    user = await User.create({ email: EMAIL, name: 'QA Extend', password: 'qa-password-hash', subscription: 'pro' })
}
await Subscription.deleteMany({ userId: user._id })

// 1. поиск клиента по email (case-insensitive)
const found = await findClientSubscription('QA.Extend@Test.dev')
check('findClientSubscription: клиент найден по email без учёта регистра', found?.user?.email === EMAIL)
check('findClientSubscription: подписки нет → sub null', found && found.sub === null)

// 2. продление без подписки → создаётся manual pro, срок +30д от сейчас
const r1 = await extendSubscriptionDays(user._id, 30, 'qa-script')
check('extend: ok без существующей подписки (создана manual)', r1.ok === true && r1.plan === 'pro')
const firstEnd = new Date(r1.newEnd).getTime()
check('extend: срок ~+30 дней от текущего момента', Math.abs(firstEnd - Date.now() - 30 * 864e5) < 120e3)

// 3. повторное продление наращивает от текущего окончания
const r2 = await extendSubscriptionDays(user._id, 3, 'qa-script')
check('extend: повторное продление ok', r2.ok === true)
check('extend: +3 дня к предыдущей дате (не от now)', Math.abs(new Date(r2.newEnd).getTime() - firstEnd - 3 * 864e5) < 120e3)

// 4. user.subscription синхронизирован с планом подписки
const userAfter = await User.findById(user._id).lean()
check('extend: user.subscription синхронизирован', userAfter.subscription === 'pro', userAfter.subscription)

// 5. защита от мусорных значений
const rBad = await extendSubscriptionDays(user._id, 0, 'qa-script')
const rBad2 = await extendSubscriptionDays(user._id, 99999, 'qa-script')
check('extend: 0 дней отклонено', rBad.ok === false && rBad.reason === 'bad_days')
check('extend: 99999 дней отклонено', rBad2.ok === false && rBad2.reason === 'bad_days')

// 6. несуществующий клиент
check('findClientSubscription: неизвестный email → null', (await findClientSubscription('qa.nobody@test.dev')) === null)

// 7. botReloader: формат/невалидный токен не роняют и не переключают бота
const rb1 = await reloadBotToken('telegram_bot', 'garbage')
check('botReload: мусорный токен → bad_format', rb1.ok === false && rb1.reason === 'bad_format')
const rb2 = await reloadBotToken('telegram_bot', '123456:INVALID_TOKEN_FOR_QA')
check('botReload: невалидный токен → invalid_token (или bot_not_running локально)', rb2.ok === false && ['invalid_token', 'bot_not_running'].includes(rb2.reason), rb2.reason)

// 8. expenseTracker: лог + сводка
logAiUsage('groq', 'a'.repeat(400), 'b'.repeat(800))
await new Promise(r => setTimeout(r, 500))
const sum = await getExpensesSummary()
check('expenses: summary содержит диапазоны day/week/month', !!(sum?.ai?.day && sum?.ai?.week && sum?.ai?.month))
check('expenses: groq-вызов попал в дневную сводку', sum.ai.day.byProvider.some(p => p.provider === 'groq'))

// --- очистка qa-данных ---
await Subscription.deleteMany({ userId: user._id })
await mongoose.disconnect()

console.log(failed === 0 ? '\nQA EXTEND FLOW: ALL GREEN' : `\nQA EXTEND FLOW: ${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
