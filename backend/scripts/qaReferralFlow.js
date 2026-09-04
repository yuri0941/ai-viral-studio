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
const { getOrCreateReferral, markReferralPaid, markReferralRefund } = await import('../services/referralService.js')

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
step('markReferralPaid: 12% от 693₽ = ceil(83.16) = +84', afterPay?.referralEarnings === 84, `earnings=${afterPay?.referralEarnings}`)

// 4. Идемпотентность: повторная «оплата» (дубль webhook) не должна платить дважды
await markReferralPaid(newUserId, 693)
const afterSecond = await Referral.findOne({ userId: referrer._id }).lean()
step('идемпотентность: повторный webhook не дублирует начисление', afterSecond?.referralEarnings === 84 && afterSecond?.paidReferralCount === 1)

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
step('markReferralPaid: 12% от 3493₽ = ceil(419.16) = +420 (итого 504)', afterAgency?.referralEarnings === 504 && afterAgency?.paidReferralCount === 2, `earnings=${afterAgency?.referralEarnings}, paidCount=${afterAgency?.paidReferralCount}`)

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
step('без суммы: начисление пропущено, paidCount+1', afterNoAmount?.referralEarnings === 504 && afterNoAmount?.paidReferralCount === 3, `earnings=${afterNoAmount?.referralEarnings}, paidCount=${afterNoAmount?.paidReferralCount}`)

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
step('кабинет: paidCount=3, earnings=504', d.paidCount === 3 && d.earnings === 504, JSON.stringify({ paidCount: d.paidCount, earnings: d.earnings, count: d.count }))
step('кабинет: реферал в списке со статусом «оплатил»', (d.referredUsers || []).some(u => u.status === 'оплатил'))
step('кабинет: referralPercent из настроек (дефолт 12)', d.referralPercent === 12, `pct=${d.referralPercent}`)
step('кабинет: текст partner-тира «12% комиссии»', /12%/.test(d.nextReward || ''), d.nextReward)

// 7. Оплата 990₽ при 12% → +119 (ceil 118.8)
const reg4Email = `qa.referred.d.${stamp}@test.dev`
const reg4 = await (await fetch(`${API}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA Referred D', email: reg4Email, password: 'QaRef12345',
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
    referralCode: refDoc.referralCode,
  }),
})).json()
const user4Id = reg4?.user?.id || reg4?.user?._id || reg4?.data?._id || reg4?.userId
step('четвёртый реферал зарегистрирован (API)', !!user4Id, reg4Email)
await markReferralPaid(user4Id, 990)
const after990 = await Referral.findOne({ userId: referrer._id }).lean()
step('990₽ при 12% → +119 (итого 623)', after990?.referralEarnings === 623, `earnings=${after990?.referralEarnings}`)

// 7b. Оплата 4990₽ при 12% → +599 (ceil 598.8)
const reg5Email = `qa.referred.e.${stamp}@test.dev`
const reg5 = await (await fetch(`${API}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA Referred E', email: reg5Email, password: 'QaRef12345',
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
    referralCode: refDoc.referralCode,
  }),
})).json()
const user5Id = reg5?.user?.id || reg5?.user?._id || reg5?.data?._id || reg5?.userId
await markReferralPaid(user5Id, 4990)
const after4990 = await Referral.findOne({ userId: referrer._id }).lean()
step('4990₽ при 12% → +599 (итого 1222)', after4990?.referralEarnings === 1222, `earnings=${after4990?.referralEarnings}`)

// 8. Возврат 990₽ → −119; повторный отзыв идемпотентен (refundMarked)
await markReferralRefund(user4Id, 990)
const afterRefund = await Referral.findOne({ userId: referrer._id }).lean()
step('возврат 990₽ → −119 (итого 1103)', afterRefund?.referralEarnings === 1103, `earnings=${afterRefund?.referralEarnings}`)
await markReferralRefund(user4Id, 990) // дубль webhook возврата
const afterRefund2 = await Referral.findOne({ userId: referrer._id }).lean()
step('дубль refund webhook → без повторного списания', afterRefund2?.referralEarnings === 1103, `earnings=${afterRefund2?.referralEarnings}`)

// 9. [REFERRAL-PCT] смена процента из кабинета владельца: 12 → 15 (только owner; client/admin → 403)
const ownerUser = await User.findOne({ role: 'owner' })
const ownerToken = ownerUser.generateToken()
const putAs = async (token, body) => (await fetch(`${API}/api/owner/control/flags`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
}))
step('client → PUT referralPercent → 403', (await putAs(referrerToken, { referralPercent: 20 })).status === 403)
let adminUser = await User.findOne({ email: 'qa.refadmin@test.dev' })
if (!adminUser) {
  adminUser = await User.create({
    name: 'QA Ref Admin', email: 'qa.refadmin@test.dev', password: 'QaRef12345',
    role: 'admin', subscription: 'free', isActive: true, isVerified: true,
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
  })
}
step('admin → PUT referralPercent → 403', (await putAs(adminUser.generateToken(), { referralPercent: 20 })).status === 403)
const setRes = await putAs(ownerToken, { referralPercent: 15 })
const setJson = await setRes.json()
step('owner → PUT referralPercent=15 → 200', setRes.status === 200 && setJson?.flags?.referralPercent === 15, JSON.stringify(setJson?.flags))

// 9b. Новая оплата 990₽ при 15% → +149 (ceil 148.5); старые начисления не пересчитаны
const reg6Email = `qa.referred.f.${stamp}@test.dev`
const reg6 = await (await fetch(`${API}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA Referred F', email: reg6Email, password: 'QaRef12345',
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
    referralCode: refDoc.referralCode,
  }),
})).json()
const user6Id = reg6?.user?.id || reg6?.user?._id || reg6?.data?._id || reg6?.userId
await markReferralPaid(user6Id, 990)
const after15 = await Referral.findOne({ userId: referrer._id }).lean()
step('990₽ при 15% → +149 (итого 1252), старые не тронуты', after15?.referralEarnings === 1252, `earnings=${after15?.referralEarnings}`)

// 9c. Текст тира стал «15% комиссии» (обещание = механика)
const dash2 = await (await fetch(`${API}/api/analytics/referrals`, {
  headers: { Authorization: `Bearer ${referrerToken}` },
})).json()
step('кабинет: текст partner-тира «15% комиссии»', /15%/.test(dash2?.data?.nextReward || ''), dash2?.data?.nextReward)

// 9d. Возврат процента к 12 (дефолт для следующих прогонов)
await putAs(ownerToken, { referralPercent: 12 })

await mongoose.disconnect()
