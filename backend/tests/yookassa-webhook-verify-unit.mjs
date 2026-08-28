/**
 * YooKassa webhook verification — unit test [security-hardening Б5-З2.2]
 * Поддельный webhook → платёж НЕ засчитывается (verifyWebhookNotification → ok:false).
 * fetch заглушен, ключи — тестовые env; MongoDB не используется (bufferCommands=false).
 */
import mongoose from 'mongoose'
mongoose.set('bufferCommands', false)

process.env.YOOKASSA_SHOP_ID = '999999'
process.env.YOOKASSA_SECRET_KEY = 'test_security_unit'

const { verifyWebhookNotification, handleWebhook } = await import('../services/yookassaService.js')

const results = []
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`)
  results.push(`PASS: ${msg}`)
}

// Реальный платёж в ЮKassa (то, что вернёт GET /payments/{id})
let apiPayment = null
global.fetch = async () => ({
  ok: true,
  json: async () => apiPayment,
})

const REAL = { id: 'pay_real_1', status: 'succeeded', paid: true, metadata: { userId: 'u_victim', subscriptionId: 'sub_1' } }

// 1. Подделка: атакующий подменил userId в metadata → сверка с API НЕ сходится
apiPayment = REAL
let v = await verifyWebhookNotification({ action: 'mark_paid', paymentId: 'pay_real_1', metadata: { userId: 'u_attacker', subscriptionId: 'sub_1' } })
assert(v.ok === false && v.metaOk === false, 'подмена metadata.userId → ok=false (платёж НЕ засчитан)')

// 2. Подделка: несуществующий paymentId (API вернул бы 404) → fetch кидает
apiPayment = null
global.fetch = async () => ({ ok: false, status: 404, json: async () => ({ description: 'Not found' }) })
let threw = false
try {
  await verifyWebhookNotification({ action: 'mark_paid', paymentId: 'pay_fake', metadata: {} })
} catch { threw = true }
assert(threw, 'несуществующий paymentId → ошибка верификации (fail-closed, контроллер НЕ засчитывает)')

// 3. Легитимный webhook: статус succeeded + metadata совпадает → ok=true
global.fetch = async () => ({ ok: true, json: async () => apiPayment })
apiPayment = REAL
v = await verifyWebhookNotification({ action: 'mark_paid', paymentId: 'pay_real_1', metadata: { userId: 'u_victim', subscriptionId: 'sub_1' } })
assert(v.ok === true, 'легитимный payment.succeeded → ok=true (флоу оплаты не сломан)')

// 4. Статус не succeeded (pending) → отказ
apiPayment = { ...REAL, status: 'pending', paid: false }
v = await verifyWebhookNotification({ action: 'mark_paid', paymentId: 'pay_real_1', metadata: { userId: 'u_victim', subscriptionId: 'sub_1' } })
assert(v.ok === false && v.statusOk === false, 'payment pending → ok=false')

// 5. refund.succeeded: verifyId берётся из object.payment_id (refund id ≠ payment id)
apiPayment = REAL
v = await verifyWebhookNotification({ action: 'mark_refunded', paymentId: 'refund_9', payload: { object: { id: 'refund_9', payment_id: 'pay_real_1' } }, metadata: {} })
assert(v.ok === true && v.verifyId === 'pay_real_1', 'refund: верифицируется платёж из payment_id, а не id возврата')

// 6. handleWebhook парсинг не сломан (регрессия)
const parsed = handleWebhook({ event: 'payment.succeeded', object: { id: 'p1', status: 'succeeded', metadata: {} } })
assert(parsed.action === 'mark_paid' && parsed.paymentId === 'p1', 'handleWebhook: payment.succeeded → mark_paid (регрессия)')

console.log(results.join('\n'))
console.log(`\n✅ yookassa-webhook-verify-unit: ${results.length}/6 PASS`)
process.exit(0)
