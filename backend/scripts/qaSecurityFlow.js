// [security-hardening Б5-З3] qaSecurityFlow — автотесты проникновения.
// Матрица:
//  A. неавторизованный (битый Bearer) → защищённые API → 401
//  B. client (creator) → owner/admin эндпоинты → 403
//  C. staff → owner-only эндпоинты (флаги, продление, changelog, apiKeys, PlanConfig, роль owner) → 403;
//     staff CAN: support-тикеты (белый список Б3)
//  D. IDOR: client с чужим userId → 403/404
//  E. protect кладёт _id (регрессия бага Б3): /api/users/me → свой id
// Запуск: сервер на :18080 + node backend/scripts/qaSecurityFlow.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API = process.env.QA_API_URL || 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { default: Payment } = await import('../models/Payment.js')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 80) : ''}`)
  if (!ok) failed++
}

const H = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` })
const BROKEN = { 'Content-Type': 'application/json', Authorization: 'Bearer invalid.token.here' }

async function req(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: token === 'broken' ? BROKEN : (token ? H(token) : { 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// --- пользователи ---
const client = await User.findOne({ email: 'creator.test@aiviral-studio.ru' })
const staff = await User.findOne({ email: 'staff.test@aiviral-studio.ru' })
const owner = await User.findOne({ role: 'owner' })
if (!client || !staff || !owner) {
  console.error('❌ Нет тестовых аккаунтов: запустите backend/scripts/createTestAccounts.js и нужен owner в БД')
  process.exit(1)
}
const ct = client.generateToken()
const st = staff.generateToken()
const ot = owner.generateToken()

// ============ A. Неавторизованный → 401 ============
// (битый токен, т.к. в development без Authorization-заголовка protect имеет dev-bypass для локальных smoke)
for (const [m, p] of [
  ['GET', '/api/owner/overview'],
  ['GET', '/api/owner/audit'],
  ['GET', '/api/owner/subscriptions'],
  ['GET', '/api/admin/users'],
  ['GET', '/api/api-keys'],
  ['PUT', '/api/plan-config/pro'],
  ['GET', '/api/users/me'],
]) {
  const r = await req(m, p, 'broken', m === 'PUT' ? { price: 1 } : undefined)
  check(`A: anon ${m} ${p} → 401`, r.status === 401, r.status)
}

// ============ B. client → owner/admin → 403 ============
for (const [m, p, body] of [
  ['GET', '/api/owner/overview'],
  ['GET', '/api/owner/finance'],
  ['GET', '/api/owner/audit'],
  ['GET', '/api/owner/subscriptions'],
  ['POST', '/api/owner/promos', { code: 'HACK', discount: 99 }],
  ['PUT', '/api/owner/control/flags', { maintenance: true }],
  ['POST', '/api/owner/control/extend-subscription', { email: 'x@x.x', days: 365 }],
  ['POST', '/api/owner/changelog', { version: '0.0.0-hack', text: 'x' }],
  ['GET', '/api/api-keys'],
  ['POST', '/api/api-keys', { provider: 'groq', key: 'gsk_fake' }],
  ['PUT', '/api/plan-config/pro', { price: 1 }],
  ['GET', '/api/admin/users'],
  ['POST', '/api/admin/emergency-stop'],
]) {
  const r = await req(m, p, ct, body)
  check(`B: client ${m} ${p} → 403`, r.status === 403, r.status)
}

// ============ C. staff → owner-only → 403; whitelist → не 403 ============
for (const [m, p, body] of [
  ['PUT', '/api/owner/control/flags', { maintenance: true }],
  ['POST', '/api/owner/control/extend-subscription', { email: 'x@x.x', days: 365 }],
  ['POST', '/api/owner/changelog', { version: '0.0.0-hack', text: 'x' }],
  ['POST', '/api/api-keys', { provider: 'groq', key: 'gsk_fake' }],
  ['PUT', '/api/plan-config/pro', { price: 1 }],
  ['PUT', '/api/admin/payment-providers', { provider: 'yookassa' }],
  ['POST', '/api/admin/emergency-stop'],
]) {
  const r = await req(m, p, st, body)
  check(`C: staff ${m} ${p} → 403`, r.status === 403, r.status)
}
// staff не может выдать/изменить роль owner (ни себе, ни через updateMe)
for (const role of ['owner', 'admin', 'staff']) {
  const r = await req('PUT', '/api/users/me', st, { role })
  check(`C: staff PUT /api/users/me {role:'${role}'} → 403`, r.status === 403, r.status)
}
// whitelist Б3: staff может работать с support-тикетами (несуществующий id → 404, но НЕ 403)
const fakeTicket = new mongoose.Types.ObjectId()
const rSup = await req('PATCH', `/api/support/${fakeTicket}/status`, st, { status: 'in_progress' })
check('C: staff PATCH /api/support/:id/status → не 403 (белый список)', rSup.status !== 403 && rSup.status !== 401, rSup.status)

// ============ C2. [STAFF-DOP] POST /api/owner/staff — создание сотрудника из кабинета ============
// staff не может создавать аккаунты сотрудников
const rStaffDeny = await req('POST', '/api/owner/staff', st, { email: `qa-deny-${Date.now()}@test.ru`, name: 'QA Deny' })
check('C2: staff POST /api/owner/staff → 403', rStaffDeny.status === 403, rStaffDeny.status)
// client — тоже
const rClientDeny = await req('POST', '/api/owner/staff', ct, { email: `qa-deny2-${Date.now()}@test.ru`, name: 'QA Deny' })
check('C2: client POST /api/owner/staff → 403', rClientDeny.status === 403, rClientDeny.status)
// owner может: 201 + временный пароль; дубль email → 409; role:'owner' отклоняется
const staffEmail = `qa-staff-${Date.now()}@test.ru`
const rCreate = await req('POST', '/api/owner/staff', ot, { email: staffEmail, name: 'QA Staff', role: 'staff' })
check('C2: owner POST /api/owner/staff → 201 + tempPassword', rCreate.status === 201 && !!rCreate.json?.tempPassword, rCreate.status)
const rDup = await req('POST', '/api/owner/staff', ot, { email: staffEmail, name: 'QA Staff 2' })
check('C2: дубль email → 409', rDup.status === 409, rDup.status)
const rOwnerRole = await req('POST', '/api/owner/staff', ot, { email: `qa-owner-${Date.now()}@test.ru`, name: 'QA Owner', role: 'owner' })
check('C2: role=owner отклоняется → 400', rOwnerRole.status === 400, rOwnerRole.status)
await User.deleteOne({ email: staffEmail })

// ============ D. IDOR ============
const rIdor1 = await req('GET', `/api/analytics/churn-risk/${owner._id}`, ct)
check('D: client → чужой churn-risk (owner) → 403', rIdor1.status === 403, rIdor1.status)
const rIdor2 = await req('GET', `/api/analytics/churn-risk/${client._id}`, ct)
check('D: client → свой churn-risk → не 403', rIdor2.status !== 403 && rIdor2.status !== 401, rIdor2.status)
// чужой платёж: создаём запись на владельца, клиент не должен её увидеть
const foreignPayment = await Payment.create({
  userId: owner._id, planId: 'pro', amount: 1, currency: 'RUB', status: 'pending',
  yookassaPaymentId: `qa-idor-${Date.now()}`,
})
const rIdor3 = await req('GET', `/api/payments/status?paymentId=${foreignPayment._id}`, ct)
check('D: client → чужой платёж → 404', rIdor3.status === 404, rIdor3.status)
const rIdor4 = await req('GET', `/api/payments/status?paymentId=${foreignPayment._id}`, ot)
check('D: owner → свой платёж → 200', rIdor4.status === 200, rIdor4.status)
await Payment.deleteOne({ _id: foreignPayment._id })

// ============ E. protect кладёт _id (регрессия корневого бага Б3) ============
for (const [label, tkn, expected] of [['client', ct, client._id], ['staff', st, staff._id], ['owner', ot, owner._id]]) {
  const r = await req('GET', '/api/users/me', tkn)
  const got = String(r.json?.user?.id || '')
  check(`E: /api/users/me (${label}) → свой _id`, r.status === 200 && got === String(expected), got)
}

console.log(`\n${failed === 0 ? '✅ qaSecurityFlow: ВСЯ МАТРИЦА ЗЕЛЁНАЯ' : `❌ qaSecurityFlow: ${failed} провалов`}`)

// [security-hardening Б5-З6] провал guard-теста в проде → TG-алерт владельцу (кулдаун 10 мин внутри)
if (failed > 0 && process.env.QA_ALERT === '1') {
  try {
    const { alertCritical } = await import('../services/securityAlerts.js')
    await alertCritical('guard_breach', `qaSecurityFlow: ${failed} провалов против ${API}`)
  } catch { /* алерт best-effort */ }
}

await mongoose.disconnect()
process.exit(failed === 0 ? 0 : 1)
