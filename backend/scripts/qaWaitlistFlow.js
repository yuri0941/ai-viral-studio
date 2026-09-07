// [HOTFIX-FINAL-2 З4] waitlist лендинга: заявка → запись в MongoDB (не in-memory),
// дедуп по email (повтор = alreadyRegistered, без дубля), owner-only доступ к списку.
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API = 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: Waitlist } = await import('../models/Waitlist.js')

let failed = 0
const step = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`) }

const email = `qa.waitlist.${Date.now()}@test.dev`
try {
  // 1. Новая заявка с лендинга → success + позиция
  const r1 = await (await fetch(`${API}/api/public/waitlist`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'qa' }),
  })).json()
  step('заявка принята (success + position)', r1?.success === true && Number.isFinite(r1?.position), JSON.stringify(r1).slice(0, 80))

  // 2. Запись реально в MongoDB (переживёт рестарт)
  const doc = await Waitlist.findOne({ email }).lean()
  step('запись в MongoDB', !!doc && doc.source === 'qa', doc ? `pos=${doc.position}` : 'not found')

  // 3. Дедуп: повторная заявка → alreadyRegistered, дубля нет
  const r2 = await (await fetch(`${API}/api/public/waitlist`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'qa' }),
  })).json()
  const count = await Waitlist.countDocuments({ email })
  step('дедуп: alreadyRegistered, одна запись', r2?.alreadyRegistered === true && count === 1, `count=${count}`)

  // 4. Невалидный email → 5xx/4xx с ошибкой, записи нет
  const bad = await fetch(`${API}/api/public/waitlist`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' }),
  })
  const badDoc = await Waitlist.findOne({ email: 'not-an-email' }).lean()
  step('невалидный email отклонён', bad.status >= 400 && !badDoc, `status=${bad.status}`)

  // 5. Список заявок — owner-only: клиентский токен → 403.
  // (без токена локально срабатывает dev-bypass protect (NODE_ENV=development) — проверяем роль, а не 401)
  const { default: User } = await import('../models/User.js')
  const tmpClient = await User.create({
    name: 'QA Waitlist Client', email: `qa.waitlist.client.${Date.now()}@test.dev`, password: 'QaClient123!',
    role: 'creator', isActive: true, isVerified: true,
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
  })
  const clientToken = tmpClient.generateToken()
  const asClient = await fetch(`${API}/api/public/waitlist/all`, { headers: { Authorization: `Bearer ${clientToken}` } })
  step('waitlist/all клиенту → 403', asClient.status === 403, `status=${asClient.status}`)
  await User.deleteOne({ _id: tmpClient._id })
} finally {
  await Waitlist.deleteMany({ email: { $in: [email, 'not-an-email'] } })
  await mongoose.disconnect()
}

console.log(failed ? `\n❌ qaWaitlistFlow: ${failed} шаг(ов) упало` : '\n✅ qaWaitlistFlow: все шаги зелёные')
process.exit(failed ? 1 : 0)
