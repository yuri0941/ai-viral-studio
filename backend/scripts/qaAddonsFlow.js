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

// 7. [ADDONS-MARKETPLACE-RESTORE] Гард редактирования: строго owner.
// Клиент → 403, admin → 403, owner → 200; цикл выкл→витрина пуста→вкл обратно.
const { default: Addon } = await import('../models/Addon.js')
const editBody = JSON.stringify({ price: 291, name: 'AI Дизайнер QA', description: 'QA описание', includes: ['Пункт 1', 'Пункт 2'], isActive: true })

const r8 = await fetch(`${API}/api/subscriptions/addons/ai-designer/price`, { method: 'PATCH', headers: H(ct), body: editBody })
step('клиент: PATCH /addons/:id/price → 403', r8.status === 403, String(r8.status))

// временный admin-пользователь для негативного теста
const adminEmail = `qa.addon.admin.${Date.now()}@test.dev`
const admin = await User.create({ name: 'QA Addon Admin', email: adminEmail, password: 'qa-password-123', role: 'admin' })
const at = admin.generateToken()
const r9 = await fetch(`${API}/api/subscriptions/addons/ai-designer/price`, { method: 'PATCH', headers: H(at), body: editBody })
step('admin: PATCH /addons/:id/price → 403 (строго owner)', r9.status === 403, String(r9.status))
const r9b = await fetch(`${API}/api/subscriptions/addons/pricing-config`, { headers: H(at) })
step('admin: GET pricing-config → 403', r9b.status === 403, String(r9b.status))
await User.deleteOne({ _id: admin._id })

const r10 = await fetch(`${API}/api/subscriptions/addons/ai-designer/price`, { method: 'PATCH', headers: H(ot), body: editBody })
const j10 = await r10.json().catch(() => ({}))
step('owner: PATCH /addons/:id/price → 200, поля сохранены', r10.status === 200 && j10.addon?.price === 291 && j10.addon?.name === 'AI Дизайнер QA' && j10.addon?.includes?.length === 2, String(r10.status))

// AuditLog записан
const { default: AuditLog } = await import('../models/AuditLog.js')
const auditEntry = await AuditLog.findOne({ action: 'owner.addon_update', 'metadata.addonId': 'ai-designer' }).sort({ timestamp: -1 }).lean()
step('AuditLog: owner.addon_update записан', !!auditEntry, auditEntry?.user || 'нет записи')

// выкл → витрина (публичная) не отдаёт, купленные у клиентов не сломались
const r11 = await fetch(`${API}/api/subscriptions/addons/ai-designer/price`, { method: 'PATCH', headers: H(ot), body: JSON.stringify({ isActive: false }) })
const r12 = await fetch(`${API}/api/subscriptions/addons`)
const j12 = await r12.json()
step('owner: выкл аддона → на витрине нет', r11.status === 200 && !j12.addons?.some(a => a.id === 'ai-designer'), String(j12.addons?.length))
const ownerStillHas = await UserAddon.findOne({ userId: owner._id, addonId: 'ai-designer', status: 'active' }).lean()
step('купленный аддон у клиента/owner НЕ сломался при выкл', !!ownerStillHas, ownerStillHas?.status || 'нет записи')

// вкл → снова на витрине; откат цены/имени к исходным
const r13 = await fetch(`${API}/api/subscriptions/addons/ai-designer/price`, { method: 'PATCH', headers: H(ot), body: JSON.stringify({ isActive: true, price: 290, name: 'AI Дизайнер', description: 'Генерация обложек, баннеров, логотипов.', includes: [] }) })
const r14 = await fetch(`${API}/api/subscriptions/addons`)
const j14 = await r14.json()
const restored = j14.addons?.find(a => a.id === 'ai-designer')
step('owner: вкл аддона → снова на витрине, цена откачена', r13.status === 200 && restored?.price === 290, String(restored?.price))

await mongoose.disconnect()
