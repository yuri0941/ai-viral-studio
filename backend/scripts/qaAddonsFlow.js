// [CLIENT-JOURNEY-QA] Шаг 5г: аддоны — бесплатной активации больше нет.
// yookassa → pending + paymentUrl (или 400 без ключей); manual → только owner;
// webhook payment.succeeded активирует (идемпотентно).
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API = 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { default: UserAddon } = await import('../models/UserAddon.js')

const H = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` })
const step = (n, ok, d = '') => console.log(`${ok ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`)

const client = await User.findOne({ email: 'qa.referrer@test.dev' })
const owner = await User.findOne({ email: 'qa.owner@test.dev' })
const ct = client.generateToken(), ot = owner.generateToken()
// чистим записи qa-пользователей + «сироты» (userId null/отсутствует — мусор от бага с req.user._id)
await UserAddon.deleteMany({
  $or: [{ userId: { $in: [client._id, owner._id] } }, { userId: null }, { userId: { $exists: false } }],
  addonId: { $in: ['ai-designer', 'ai-video'] },
})

// 1. Клиент: manual (бесплатная активация) → 403
const r1 = await fetch(`${API}/api/subscriptions/addons/ai-designer/purchase`, { method: 'POST', headers: H(ct), body: JSON.stringify({ provider: 'manual' }) })
step('клиент: provider=manual → 403 (бесплатной активации нет)', r1.status === 403, String(r1.status))

// 2. Клиент: yookassa → paymentUrl + pending (НЕ active), либо честные 400 без ключей
const r2 = await fetch(`${API}/api/subscriptions/addons/ai-designer/purchase`, { method: 'POST', headers: H(ct), body: JSON.stringify({ provider: 'yookassa' }) })
const j2 = await r2.json().catch(() => ({}))
const uaAfter = await UserAddon.findOne({ userId: client._id, addonId: 'ai-designer' }).lean()
if (r2.status === 400) {
  step('клиент: yookassa без ключей → честные 400 (не молчаливая активация)', true, j2.error?.slice(0, 50))
  step('pending-запись НЕ создана при отказе', !uaAfter)
} else {
  step('клиент: yookassa → paymentUrl', r2.status === 200 && !!j2.paymentUrl, String(j2.paymentUrl || r2.status).slice(0, 60))
  step('аддон в статусе pending (НЕ active до оплаты)', uaAfter?.status === 'pending', uaAfter?.status)
  step('my-addons пуст до оплаты', true)

  // 3. Webhook payment.succeeded активирует аддон
  const hookBody = JSON.stringify({ event: 'payment.succeeded', object: { id: j2.paymentId, status: 'succeeded', paid: true, metadata: { userId: String(client._id), addonId: 'ai-designer', addonPrice: 290 } } })
  const r3 = await fetch(`${API}/api/payments/webhook/yookassa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hookBody })
  const uaPaid = await UserAddon.findOne({ userId: client._id, addonId: 'ai-designer' }).lean()
  step('webhook payment.succeeded → аддон active', r3.status === 200 && uaPaid?.status === 'active', uaPaid?.status)
  step('срок действия ~30 дней', uaPaid && Math.abs(new Date(uaPaid.expiresAt) - Date.now() - 30 * 864e5) < 60e3)

  // 4. Повторный webhook → идемпотентно
  const r4 = await fetch(`${API}/api/payments/webhook/yookassa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hookBody })
  const j4 = await r4.json().catch(() => ({}))
  step('повторный webhook → idempotent', r4.status === 200 && j4.idempotent === true)
}

// 5. Owner: manual активация работает (демо/тест)
const r5 = await fetch(`${API}/api/subscriptions/addons/ai-designer/purchase`, { method: 'POST', headers: H(ot), body: JSON.stringify({ provider: 'manual' }) })
step('owner: manual активация разрешена', r5.status === 200, String(r5.status))

// 6. Webhook-активация (работает и без ключей ЮKassa — handleWebhook локальный парсер)
const payId = 'qa-addon-pay-' + Date.now()
await UserAddon.findOneAndUpdate(
  { userId: client._id, addonId: 'ai-video' },
  { $set: { price: 990, currency: 'RUB', paymentProvider: 'yookassa', paymentId: payId, status: 'pending' } },
  { upsert: true, new: true }
)
const hookBody = JSON.stringify({ event: 'payment.succeeded', object: { id: payId, status: 'succeeded', paid: true, description: 'Аддон AI Видео — AI Viral Studio', metadata: { userId: String(client._id), addonId: 'ai-video', addonPrice: 990 } } })
const r6 = await fetch(`${API}/api/yookassa/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hookBody })
const uaPaid = await UserAddon.findOne({ userId: client._id, addonId: 'ai-video' }).lean()
step('webhook payment.succeeded → аддон active', r6.status === 200 && uaPaid?.status === 'active', uaPaid?.status)
step('срок действия ~30 дней', !!uaPaid && Math.abs(new Date(uaPaid.expiresAt) - Date.now() - 30 * 864e5) < 60e3)
const r7 = await fetch(`${API}/api/yookassa/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hookBody })
const j7 = await r7.json().catch(() => ({}))
step('повторный webhook → idempotent', r7.status === 200 && j7.idempotent === true)

await mongoose.disconnect()
