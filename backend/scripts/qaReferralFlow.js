// [CLIENT-JOURNEY-QA] Шаг 5a: реферальная цепочка e2e —
// реферер получает код → новый юзер регистрируется по коду (API) → связка в БД →
// первая оплата (markReferralPaid, тот же вызов что в yookassaController) → баланс реферера →
// идемпотентность повторной оплаты → защита от self-referral.
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API = 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { Referral } = await import('../models/index.js')
const { getOrCreateReferral, markReferralPaid } = await import('../services/referralService.js')

const step = (name, ok, detail = '') => console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
const stamp = Date.now()

// 0. Реферер (создаём напрямую, как в qaSupportFlow)
let referrer = await User.findOne({ email: 'qa.referrer@test.dev' })
if (!referrer) {
  referrer = await User.create({
    name: 'QA Referrer', email: 'qa.referrer@test.dev', password: 'QaRef12345',
    role: 'creator', subscription: 'free', isActive: true, isVerified: true,
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
  })
}
// чистим хвосты прошлых прогонов
await Referral.deleteMany({ userId: referrer._id })
const stale = await User.find({ email: /qa\.(referred|dbg)/ }, '_id').lean()
await Referral.deleteMany({ userId: { $in: stale.map(u => u._id) } })
await User.deleteMany({ email: /qa\.(referred|dbg)/ })

const refDoc = await getOrCreateReferral(referrer._id)
step('реферер: код получен', !!refDoc.referralCode, refDoc.referralCode)

// 1. Регистрация по реф-коду через публичный API (как с лендинга ?ref=)
const regEmail = `qa.referred.${stamp}@test.dev`
const reg = await (await fetch(`${API}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA Referred', email: regEmail, password: 'QaRef12345',
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
    referralCode: refDoc.referralCode, // ← то, что теперь шлёт AuthContext из localStorage
  }),
})).json()
const newUserId = reg?.user?.id || reg?.user?._id || reg?.data?._id || reg?.userId
step('регистрация по реф-коду (API)', !!newUserId, regEmail)

// 2. Связка в БД: referredBy + счётчик реферера
const childRef = await Referral.findOne({ userId: newUserId }).lean()
const parentRef = await Referral.findOne({ userId: referrer._id }).lean()
step('связка referredBy в БД', String(childRef?.referredBy) === String(referrer._id))
step('счётчик реферера +1', parentRef?.referralCount === 1, `count=${parentRef?.referralCount}`)
step('бонус рефереру за 1-го реферала ($10 кредитов)', parentRef?.creditBalance >= 10, `credit=${parentRef?.creditBalance}`)

// 3. Оплата: тот же вызов, что делает yookassaController.recordPaymentAndReceipt
await markReferralPaid(newUserId)
const afterPay = await Referral.findOne({ userId: referrer._id }).lean()
step('markReferralPaid: paidCount=1', afterPay?.paidReferralCount === 1)
step('markReferralPaid: earnings += $4 (фикс)', afterPay?.referralEarnings === 4, `earnings=${afterPay?.referralEarnings}`)

// 4. Идемпотентность: повторная «оплата» не должна платить дважды
await markReferralPaid(newUserId)
const afterSecond = await Referral.findOne({ userId: referrer._id }).lean()
step('идемпотентность: повторная оплата не удваивает', afterSecond?.referralEarnings === 4 && afterSecond?.paidReferralCount === 1)

// 5. Self-referral защита: регистрация с собственным кодом
const selfEmail = `qa.referred.self.${stamp}@test.dev`
const selfReg = await (await fetch(`${API}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA Self', email: selfEmail, password: 'QaRef12345',
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
    referralCode: refDoc.referralCode,
  }),
})).json()
// referrer сам регистрироваться не может (email занят), поэтому проверяем сервис напрямую:
const selfGuard = await markReferralPaid(referrer._id) // у реферера нет referredBy → null
step('self/без referredBy → markReferralPaid no-op', selfGuard === null)

// 6. Видимость у реферера через API кабинета (тот, что читает ReferralsTab)
const referrerToken = referrer.generateToken()
const dash = await (await fetch(`${API}/api/analytics/referrals`, {
  headers: { Authorization: `Bearer ${referrerToken}` },
})).json()
const d = dash?.data || {}
step('кабинет: paidCount=1, earnings=4', d.paidCount === 1 && d.earnings === 4, JSON.stringify({ paidCount: d.paidCount, earnings: d.earnings, count: d.count }))
step('кабинет: реферал в списке со статусом «оплатил»', (d.referredUsers || []).some(u => u.status === 'оплатил'))

await mongoose.disconnect()
