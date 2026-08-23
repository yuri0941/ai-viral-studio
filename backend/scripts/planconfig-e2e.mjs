// [PLANCONFIG-ADMIN] E2E-доказательство: правка тарифа через owner API → hot-reload без деплоя
// во всех потребителях (plan-config API, бот, письмо верификации, founding, квоты) + откат значений.
// Запуск: MONGODB_URI=mongodb://127.0.0.1:27017/planconfig_e2e node scripts/planconfig-e2e.mjs
process.env.NODE_ENV = 'development' // protect: dev-bypass owner без Authorization
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/planconfig_e2e'

import mongoose from 'mongoose'
import express from 'express'

const results = []
const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail })
    console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

await mongoose.connect(process.env.MONGODB_URI)
console.log('[e2e] mongo connected:', process.env.MONGODB_URI)

// чистый тестовый контур
const db = mongoose.connection.db
for (const c of ['planconfigs', 'foundingconfigs', 'foundingslots', 'usagequotas', 'users', 'pricechangelogs', 'payments', 'subscriptions']) {
    await db.collection(c).deleteMany({}).catch(() => {})
}

const PlanConfig = (await import('../models/PlanConfig.js')).default
const UsageQuota = (await import('../models/UsageQuota.js')).default
const User = (await import('../models/User.js')).default
const { refreshPlanCache, getPlanSync } = await import('../services/planConfigCache.js')
const { getCachedPlansForBot } = await import('../services/planDisplayService.js')
const { consumeGeneration, refundGeneration, checkQuota } = await import('../services/usageQuotaService.js')

await PlanConfig.seedIfEmpty()

// реальные роуты, как в server.js
const app = express()
app.use(express.json())
app.use('/api/plan-config', (await import('../routes/planConfig.js')).default)
app.use('/api/launch', (await import('../routes/launch.js')).default)
app.use('/api/subscriptions', (await import('../routes/subscriptions.js')).default)
app.use('/api/testimonials', (await import('../routes/testimonials.js')).default)
const server = await new Promise(r => { const s = app.listen(0, () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const get = async (p) => (await fetch(base + p)).json()
const put = async (p, body) => (await fetch(base + p, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()
const post = async (p, body) => (await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()

try {
    // ①② Лендинг и страница Подписки читают GET /api/plan-config — фиксируем исходные значения
    const before = await get('/api/plan-config')
    const priceOf = (r, id) => r.plans.find(p => p.plan === id)?.price
    check('исходные цены 0/990/4990', priceOf(before, 'free') === 0 && priceOf(before, 'pro') === 990 && priceOf(before, 'agency') === 4990,
        JSON.stringify(before.plans.map(p => `${p.plan}:${p.price}`)))
    check('исходный free-лимит 20 генераций/день', before.plans.find(p => p.plan === 'free')?.quotas?.generationsPerDay === 20)
    check('founding из FoundingConfig (30%, 50 слотов)', before.founding?.discountPercent === 30 && before.founding?.totalSlots === 50, JSON.stringify(before.founding))

    // ⑦ /subscriptions/config включает ЮKassa на бэкенде
    const cfg = await get('/api/subscriptions/config')
    const yk = (cfg.paymentMethods || []).find(m => m.id === 'yookassa')
    check('⑦ /subscriptions/config отдаёт ЮKassa', !!yk, yk ? `enabled=${yk.enabled} (без ключей — false, метод виден)` : 'нет в списке')

    // ⑧ Отзывы: источник — БД Testimonial; пусто → лендинг скрывает секцию (код LandingPage: testimonials.length > 0)
    const tst = await get('/api/testimonials')
    check('⑧ отзывы из БД, сейчас пусто → секция скрыта', Array.isArray(tst.testimonials || tst.data || tst) && (tst.testimonials || tst.data || tst).length === 0)

    // ⑨ Счётчик слотов: формула = countDocuments(FoundingSlot), слот = первая успешная оплата
    const slots = await get('/api/launch/beta/slots')
    check('⑨ счётчик слотов из FoundingSlot', slots.data?.total === 50 && slots.data?.used === 0 && slots.data?.discountPercent === 30, JSON.stringify(slots.data))

    // === ИЗМЕНЕНИЕ ЧЕРЕЗ КАБИНЕТ (owner API) ===
    const upd = await put('/api/plan-config/pro', { price: 1290, quotas: { generationsPerDay: 222 }, featureList: { ru: ['Тестовая фича Pro'], en: ['Pro test feature'] } })
    check('PUT /plan-config/pro (цена+квота+featureList)', upd.success && upd.changed === 3, `changed=${upd.changed}`)

    await refreshPlanCache() // то, что делает invalidatePlanCache() (async refresh)
    const after = await get('/api/plan-config')
    check('①② лендинг/подписка видят новую цену БЕЗ ребилда', priceOf(after, 'pro') === 1290, `pro=${priceOf(after, 'pro')}`)
    check('featureList RU/EN в публичном API', after.plans.find(p => p.plan === 'pro')?.featureList?.ru?.[0] === 'Тестовая фича Pro')
    check('синхронный кэш (canUse/usageQuota) видит новый лимит', getPlanSync('pro').quotas.generationsPerDay === 222)

    // ③ клиентский бот «💎 Тарифы» — planDisplayService (кэш инвалидирован роутом)
    const botText = await getCachedPlansForBot()
    check('③ ответ бота содержит новую цену 1290₽', /1[\s ]?290/.test(botText), botText.split('\n').find(l => /pro/i.test(l)))

    // ⑤ письмо верификации — число генераций из PlanConfig
    await put('/api/plan-config/free', { quotas: { generationsPerDay: 25 } })
    const testUser = await User.create({ email: 'e2e-planconfig@test.local', name: 'E2E', password: 'x'.repeat(60), role: 'creator' })
    const emails = []
    const origInfo = console.info
    console.info = (...a) => { emails.push(a.join(' ')); origInfo(...a) }
    const mailRes = await (await import('../services/emailService.js')).resendVerificationEmail(testUser._id)
    console.info = origInfo
    const mockLine = emails.find(l => l.includes('[EMAIL MOCK]')) || ''
    check('⑤ письмо верификации: актуальное число генераций (25)', mockLine.includes('25 бесплатных генераций'), mailRes.provider === 'none' ? 'mock-провайдер, текст захвачен' : '')

    // ⑩ честное списание: ошибка генерации → квота возвращается
    await UsageQuota.create({ userId: testUser._id, plan: 'pro', generationsUsed: 5, generationsLimit: 222 })
    const c1 = await checkQuota(testUser._id)
    await refundGeneration(testUser._id)
    const c2 = await checkQuota(testUser._id)
    check('⑩ возврат квоты после ошибки генерации', c1.used === 5 && c2.used === 4, `used ${c1.used} → ${c2.used}`)

    // ⑥ Stripe: без ключей бросает ДО создания сессии; цена берётся из PlanConfig (код)
    const { createStripeSession } = await import('../services/stripeService.js')
    let stripeErr = ''
    try { await createStripeSession({ planId: 'pro', userId: 'x', email: 'x@x' }) } catch (e) { stripeErr = e.message }
    check('⑥ Stripe без ключей не создаёт оплату', /not configured/i.test(stripeErr), stripeErr)

    // Откат через history/rollback API
    const hist = await get('/api/plan-config/history?plan=pro&limit=5')
    const priceLog = hist.history.find(h => h.what === 'tariff.pro.price')
    const rb = await post('/api/plan-config/pro/rollback', { logId: priceLog._id })
    check('rollback записи истории (1290 → 990)', rb.success && rb.plan.price === 990)

    // === ОТКАТ К ИСХОДНЫМ ЗНАЧЕНИЯМ ===
    await put('/api/plan-config/free', { quotas: { generationsPerDay: 20 } })
    await refreshPlanCache()
    const restored = await get('/api/plan-config')
    check('ОТКАТ: текущие значения не изменились (0/990/4990, free 20)', priceOf(restored, 'pro') === 990 && restored.plans.find(p => p.plan === 'free')?.quotas?.generationsPerDay === 20)
    const freeList = restored.plans.find(p => p.plan === 'pro')?.featureList
    if (freeList?.ru?.length) await put('/api/plan-config/pro', { featureList: { ru: [], en: [] } })
} catch (err) {
    check('E2E run', false, err.message)
    console.error(err)
} finally {
    server.close()
    await mongoose.connection.dropDatabase().catch(() => {})
    await mongoose.disconnect()
}

const failed = results.filter(r => !r.ok)
console.log(`\n===== E2E: ${results.length - failed.length}/${results.length} passed =====`)
process.exit(failed.length ? 1 : 0)
