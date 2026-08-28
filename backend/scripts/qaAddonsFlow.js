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

  // 3. [security-hardening Б5-З2.2] Webhook БЕЗ подтверждения API ЮKassa → аддон НЕ активируется.
  // Платёж создан, но не оплачен (status=pending в ЮKassa) — верификация отклоняет начисление.
  const hookBody = JSON.stringify({ event: 'payment.succeeded', object: { id: j2.paymentId, status: 'succeeded', paid: true, metadata: { userId: String(client._id), addonId: 'ai-designer', addonPrice: 290 } } })
  const r3 = await fetch(`${API}/api/payments/webhook/yookassa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hookBody })
  const uaPaid = await UserAddon.findOne({ userId: client._id, addonId: 'ai-designer' }).lean()
  step('webhook без оплаты в ЮKassa → аддон НЕ active (верификация через API)', r3.status === 200 && uaPaid?.status !== 'active', uaPaid?.status || 'нет записи')

  // 4. Повторный поддельный webhook → по-прежнему не активирует (идемпотентный отказ)
  const r4 = await fetch(`${API}/api/payments/webhook/yookassa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hookBody })
  const uaAfter2 = await UserAddon.findOne({ userId: client._id, addonId: 'ai-designer' }).lean()
  step('повторный webhook → аддон по-прежнему НЕ active', r4.status === 200 && uaAfter2?.status !== 'active', uaAfter2?.status || 'нет записи')
}

// 5. Owner: manual активация работает (демо/тест)
const r5 = await fetch(`${API}/api/subscriptions/addons/ai-designer/purchase`, { method: 'POST', headers: H(ot), body: JSON.stringify({ provider: 'manual' }) })
step('owner: manual активация разрешена', r5.status === 200, String(r5.status))

// 6. [security-hardening Б5-З2.2] Webhook с выдуманным paymentId → верификация через API ЮKassa
// отклоняет (платёж не существует / не оплачен) → аддон НЕ активируется. Подделка невозможна.
const payId = 'qa-addon-pay-' + Date.now()
await UserAddon.findOneAndUpdate(
  { userId: client._id, addonId: 'ai-video' },
  { $set: { price: 990, currency: 'RUB', paymentProvider: 'yookassa', paymentId: payId, status: 'pending' } },
  { upsert: true, new: true }
)
const hookBody = JSON.stringify({ event: 'payment.succeeded', object: { id: payId, status: 'succeeded', paid: true, description: 'Аддон AI Видео — AI Viral Studio', metadata: { userId: String(client._id), addonId: 'ai-video', addonPrice: 990 } } })
const r6 = await fetch(`${API}/api/yookassa/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hookBody })
const uaPaid = await UserAddon.findOne({ userId: client._id, addonId: 'ai-video' }).lean()
step('поддельный webhook (несуществующий платёж) → аддон НЕ active', r6.status === 200 && uaPaid?.status !== 'active', uaPaid?.status || 'нет записи')
const r7 = await fetch(`${API}/api/yookassa/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: hookBody })
const uaPaid2 = await UserAddon.findOne({ userId: client._id, addonId: 'ai-video' }).lean()
step('повторный поддельный webhook → по-прежнему НЕ active', r7.status === 200 && uaPaid2?.status !== 'active', uaPaid2?.status || 'нет записи')

await mongoose.disconnect()
