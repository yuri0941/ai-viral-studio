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
// [REF-12PCT] 12% от суммы платежа (было фикс $4 — решение владельца 27.08)
await markReferralPaid(newUserId, 693) // founding-оплата Pro 693₽
const afterPay = await Referral.findOne({ userId: referrer._id }).lean()
step('markReferralPaid: paidCount=1', afterPay?.paidReferralCount === 1)
step('markReferralPaid: 12% от 693₽ = +83', afterPay?.referralEarnings === 83, `earnings=${afterPay?.referralEarnings}`)

// 4. Идемпотентность: повторная «оплата» (дубль webhook) не должна платить дважды
await markReferralPaid(newUserId, 693)
const afterSecond = await Referral.findOne({ userId: referrer._id }).lean()
step('идемпотентность: повторный webhook не дублирует начисление', afterSecond?.referralEarnings === 83 && afterSecond?.paidReferralCount === 1)

// 4b. Второй реферал: founding-оплата Agency 3493₽ → +419 (12%), сумма накапливается
const reg2Email = `qa.referred.b.${stamp}@test.dev`
const reg2 = await (await fetch(`${API}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA Referred B', email: reg2Email, password: 'QaRef12345',
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
    referralCode: refDoc.referralCode,
  }),
})).json()
const user2Id = reg2?.user?.id || reg2?.user?._id || reg2?.data?._id || reg2?.userId
step('второй реферал зарегистрирован (API)', !!user2Id, reg2Email)
await markReferralPaid(user2Id, 3493)
const afterAgency = await Referral.findOne({ userId: referrer._id }).lean()
step('markReferralPaid: 12% от 3493₽ = +419 (итого 502)', afterAgency?.referralEarnings === 502 && afterAgency?.paidReferralCount === 2, `earnings=${afterAgency?.referralEarnings}, paidCount=${afterAgency?.paidReferralCount}`)

// 4c. Оплата без суммы: лог + БЕЗ начисления, но факт оплаты фиксируется
const reg3Email = `qa.referred.c.${stamp}@test.dev`
const reg3 = await (await fetch(`${API}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA Referred C', email: reg3Email, password: 'QaRef12345',
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
    referralCode: refDoc.referralCode,
  }),
})).json()
const user3Id = reg3?.user?.id || reg3?.user?._id || reg3?.data?._id || reg3?.userId
step('третий реферал зарегистрирован (API)', !!user3Id, reg3Email)
await markReferralPaid(user3Id) // amount не передан
const afterNoAmount = await Referral.findOne({ userId: referrer._id }).lean()
step('без суммы: начисление пропущено, paidCount+1', afterNoAmount?.referralEarnings === 502 && afterNoAmount?.paidReferralCount === 3, `earnings=${afterNoAmount?.referralEarnings}, paidCount=${afterNoAmount?.paidReferralCount}`)

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
step('кабинет: paidCount=3, earnings=502', d.paidCount === 3 && d.earnings === 502, JSON.stringify({ paidCount: d.paidCount, earnings: d.earnings, count: d.count }))
step('кабинет: реферал в списке со статусом «оплатил»', (d.referredUsers || []).some(u => u.status === 'оплатил'))

await mongoose.disconnect()
