// [HOTFIX-FINAL] qaCreditsFlow — контур витрины пакетов кредитов.
// Матрица: публичная витрина (4 пакета по умолчанию), guard (anon 401 / client 403),
// маржинальный пол (below_cost 400, below_floor 409, allowLowMargin → 200 + откат),
// webhook-подделка → ignored (начисления нет), creditGenerations начисляет фактом.
// Ключи ЮKassa НЕ нужны (реальное создание платежа не вызывается) — CI-safe.
// Запуск: сервер на :18080 + node backend/scripts/qaCreditsFlow.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API = process.env.QA_API_URL || 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { default: CreditPack } = await import('../models/CreditPack.js')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 90) : ''}`)
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

const client = await User.findOne({ email: 'creator.test@aiviral-studio.ru' })
const owner = await User.findOne({ role: 'owner' })
if (!client || !owner) {
  console.error('❌ Нет тестовых аккаунтов: запустите backend/scripts/createTestAccounts.js')
  process.exit(1)
}
const ct = client.generateToken()
const ot = owner.generateToken()

// 1. публичная витрина
const packs = await req('GET', '/api/credits/packs')
check('GET /credits/packs публично → 200 + ≥4 пакета', packs.status === 200 && packs.json.packs?.length >= 4, `status=${packs.status} n=${packs.json.packs?.length}`)
const p100 = packs.json.packs?.find(p => p.packId === 'pack_100')
check('pack_100: 100 кр за 99₽ по умолчанию', p100 && p100.credits === 100 && p100.priceRub === 99, JSON.stringify(p100 || {}))

// 2. guard-матрица (anon = битый Bearer: в development protect пропускает запросы БЕЗ заголовка — dev-bypass)
const anon = await req('POST', '/api/credits/purchase', 'broken.token.here', { packId: 'pack_100' })
check('anon purchase → 401', anon.status === 401, anon.status)
const notFound = await req('POST', '/api/credits/purchase', ct, { packId: 'pack_999' })
check('client purchase несуществующего пакета → 404', notFound.status === 404, notFound.status)
const clientPut = await req('PUT', '/api/credits/packs/pack_100', ct, { priceRub: 100 })
check('client PUT pack → 403', clientPut.status === 403, clientPut.status)

// 3. маржинальный пол
const orig = await CreditPack.findOne({ packId: 'pack_100' }).lean()
const loss = await req('PUT', '/api/credits/packs/pack_100', ot, { priceRub: 1 })
check('owner цена 1₽ → 400 below_cost', loss.status === 400 && loss.json.error === 'below_cost', `${loss.status} ${loss.json.error}`)
const low = await req('PUT', '/api/credits/packs/pack_100', ot, { priceRub: 50 })
check('owner цена 50₽ (маржа <70%) → 409 below_margin_floor', low.status === 409 && low.json.error === 'below_margin_floor', `${low.status} ${low.json.error}`)
const lowOk = await req('PUT', '/api/credits/packs/pack_100', ot, { priceRub: 50, allowLowMargin: true })
check('owner 50₽ + allowLowMargin → 200', lowOk.status === 200, lowOk.status)
const restore = await req('PUT', '/api/credits/packs/pack_100', ot, { priceRub: orig?.priceRub ?? 99, reason: 'qa restore' })
check('откат цены pack_100', restore.status === 200, restore.status)

// 4. webhook-подделка: верификация через API ЮKassa не пройдёт → ignored, начисления нет
const fake = await req('POST', '/api/payments/webhook', null, {
  event: 'payment.succeeded',
  object: { id: `fake-${Date.now()}`, status: 'succeeded', amount: { value: '99.00' }, metadata: { packId: 'pack_100', credits: '100', userId: String(client._id) } },
})
check('поддельный webhook → ignored (без начисления)', fake.status === 200 && fake.json.ignored === true, JSON.stringify(fake.json).slice(0, 80))

// 5. начисление фактом (unit через сервис, без ЮKassa)
const { creditGenerations, checkQuota } = await import('../services/usageQuotaService.js')
const before = await checkQuota(client._id)
const credited = await creditGenerations(client._id, 100)
const after = await checkQuota(client._id)
check('creditGenerations +100 → лимит вырос на 100', credited.credited === true && (after.limit - before.limit) === 100, `limit ${before.limit}→${after.limit}`)

console.log(failed ? `\n❌ qaCreditsFlow: ${failed} провалов` : '\n✅ qaCreditsFlow: всё зелёное')
await mongoose.disconnect()
process.exit(failed ? 1 : 0)
