// [STAFF-DOP] e2e: кабинет сотрудника от и до против localhost:18080 —
// создание staff-аккаунта из owner-API + вход по временному паролю,
// тикеты: staff видит все, ответ, takeover, эскалация, анти-IDOR,
// бан/разбан клиента (isActive реально режет логин), продление/сокращение тарифа ±дни.
// Запуск: сервер на :18080 + node scripts/qa-staff-dop-e2e.mjs
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('backend/package.json'))
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve('backend/.env') })
const mongoose = require('mongoose')

const API = process.env.QA_API_URL || 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const imp = (p) => import(pathToFileURL(path.resolve('backend', p)).href)
const { default: User } = await imp('models/User.js')
const { default: Subscription } = await imp('models/Subscription.js')
const { default: SupportTicket } = await imp('models/SupportTicket.js')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 100) : ''}`)
  if (!ok) failed++
}
const H = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` })
async function req(method, p, token, body) {
  const r = await fetch(`${API}${p}`, {
    method,
    headers: token ? H(token) : { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// --- тестовые пользователи (свои, с уникальным суффиксом; owner — из БД) ---
const stamp = Date.now()
const PW = 'QaDop12345!'
const mkUser = (email, name) => User.create({
  name, email, password: PW,
  role: 'creator', subscription: 'free', isActive: true, isVerified: true,
  acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
})
const clientA = await mkUser(`qa.dop.a.${stamp}@test.dev`, 'QA Dop Client A')
const clientB = await mkUser(`qa.dop.b.${stamp}@test.dev`, 'QA Dop Client B')
const owner = await User.findOne({ role: 'owner' })
if (!owner) { console.error('❌ Нет owner в БД'); process.exit(1) }
const ot = owner.generateToken()

// ============ 1. Создание staff-аккаунта из owner-кабинета ============
const staffEmail = `qa.dop.staff.${stamp}@test.dev`
const rCreate = await req('POST', '/api/owner/staff', ot, { email: staffEmail, name: 'QA Dop Staff', role: 'staff' })
check('owner создаёт staff → 201 + tempPassword', rCreate.status === 201 && !!rCreate.json?.tempPassword, rCreate.status)
const tempPassword = rCreate.json?.tempPassword
// вход по временному паролю — реальный логин, не generateToken
const rLogin = await req('POST', '/api/auth/login', null, { email: staffEmail, password: tempPassword })
check('staff входит по временному паролю → 200 + token + role staff',
  rLogin.status === 200 && !!rLogin.json?.token && rLogin.json?.user?.role === 'staff', rLogin.status)
const st = rLogin.json?.token || ''

// ============ 2. Тикеты: staff видит все, ответ, takeover, эскалация ============
const rTicket = await req('POST', '/api/support', clientA.generateToken(), { subject: 'QA DOP тикет', description: 'проверка e2e' })
check('клиент создаёт тикет → 201', rTicket.status === 201 && !!rTicket.json?.data?._id, rTicket.status)
const ticketId = rTicket.json?.data?._id
// takeover активируется только у тикетов с telegramChatId (web-тикетам нечего перехватывать у бота)
await SupportTicket.findByIdAndUpdate(ticketId, { telegramChatId: String(900000000 + (stamp % 100000)) })

const rList = await req('GET', '/api/support', st)
const staffSees = Array.isArray(rList.json?.data) && rList.json.data.some((t) => String(t._id) === String(ticketId))
check('staff GET /api/support видит тикет клиента', rList.status === 200 && staffSees, rList.status)

const rReply = await req('POST', `/api/support/${ticketId}/messages`, st, { text: 'Ответ сотрудника' })
check('staff отвечает в тикет → 200', rReply.status === 200, rReply.status)

const rTake = await req('PATCH', `/api/support/${ticketId}/status`, st, { status: 'in_progress' })
check('staff takeover: PATCH status=in_progress → 200 + takeoverBy',
  rTake.status === 200 && !!rTake.json?.data?.takeoverBy, rTake.status)

const rEsc = await req('POST', `/api/support/${ticketId}/escalate`, st, { reason: 'qa' })
check('staff эскалация владельцу → 200 + needs_owner',
  rEsc.status === 200 && rEsc.json?.data?.status === 'needs_owner', rEsc.status)

const rOwnerTake = await req('PATCH', `/api/support/${ticketId}/status`, ot, { status: 'in_progress' })
check('owner перехватывает диалог в любой момент → 200 + takeoverBy',
  rOwnerTake.status === 200 && !!rOwnerTake.json?.data?.takeoverBy, rOwnerTake.status)

// анти-IDOR: чужой клиент не может писать в тикет clientA
const rIdor = await req('POST', `/api/support/${ticketId}/messages`, clientB.generateToken(), { text: 'hack' })
check('анти-IDOR: чужой клиент POST messages → 403', rIdor.status === 403, rIdor.status)
const rOwn = await req('POST', `/api/support/${ticketId}/messages`, clientA.generateToken(), { text: 'свой ответ' })
check('свой клиент POST messages → 200', rOwn.status === 200, rOwn.status)

// ============ 3. Бан/разбан клиента (isActive реально режет логин и токен) ============
const at = clientA.generateToken()
const rBlock = await req('POST', `/api/admin/users/${clientA._id}/block`, ot, { reason: 'qa' })
check('owner банит клиента → 200', rBlock.status === 200, rBlock.status)
const blocked = await User.findById(clientA._id).lean()
check('в БД status=blocked и isActive=false', blocked?.status === 'blocked' && blocked?.isActive === false,
  `${blocked?.status}/${blocked?.isActive}`)
const rLoginBlocked = await req('POST', '/api/auth/login', null, { email: clientA.email, password: PW })
check('забаненный не может войти → 401', rLoginBlocked.status === 401, rLoginBlocked.status)
const rMeBlocked = await req('GET', '/api/users/me', at)
check('старый токен забаненного мёртв → 401', rMeBlocked.status === 401, rMeBlocked.status)

const rUnblock = await req('POST', `/api/admin/users/${clientA._id}/unblock`, ot, {})
check('owner разбанивает клиента → 200', rUnblock.status === 200, rUnblock.status)
const rLoginBack = await req('POST', '/api/auth/login', null, { email: clientA.email, password: PW })
check('после разбана логин снова работает → 200', rLoginBack.status === 200, rLoginBack.status)

// ============ 4. Продление/сокращение тарифа ±дни (owner, из кабинета) ============
const rExt = await req('POST', '/api/owner/control/extend-subscription', ot, { userId: String(clientA._id), days: 7 })
check('продление +7 дней → 200 + newEnd', rExt.status === 200 && !!rExt.json?.result?.newEnd, rExt.status)
const endAfterPlus = new Date(rExt.json?.result?.newEnd || 0).getTime()
const rCut = await req('POST', '/api/owner/control/extend-subscription', ot, { userId: String(clientA._id), days: -7 })
check('сокращение -7 дней → 200', rCut.status === 200, rCut.status)
const endAfterMinus = new Date(rCut.json?.result?.newEnd || 0).getTime()
check('после ±7 дней дата вернулась (±1 мин)',
  Math.abs(endAfterPlus - endAfterMinus - 7 * 864e5) < 60e3 && endAfterMinus > Date.now() - 60e3,
  `${endAfterPlus} → ${endAfterMinus}`)
const rZero = await req('POST', '/api/owner/control/extend-subscription', ot, { userId: String(clientA._id), days: 0 })
check('days=0 отклоняется → 400', rZero.status === 400, rZero.status)
// staff не может продлевать (только owner/admin)
const rStaffExt = await req('POST', '/api/owner/control/extend-subscription', st, { userId: String(clientA._id), days: 7 })
check('staff продлевать НЕ может → 403', rStaffExt.status === 403, rStaffExt.status)

// ============ cleanup ============
await SupportTicket.deleteMany({ userId: { $in: [clientA._id, clientB._id] } })
await Subscription.deleteMany({ userId: { $in: [clientA._id, clientB._id] } })
await User.deleteMany({ email: new RegExp(`qa\\.dop\\..*${stamp}@test\\.dev`) })
console.log('🧹 cleanup: тестовые пользователи, тикеты и подписки удалены')

console.log(`\n${failed === 0 ? '✅ qa-staff-dop-e2e: ВСЁ ЗЕЛЁНОЕ' : `❌ qa-staff-dop-e2e: ${failed} провалов`}`)
await mongoose.disconnect()
process.exit(failed === 0 ? 0 : 1)
