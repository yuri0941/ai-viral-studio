// [ROLE-SWITCH-FLASH] e2e: owner → смена роли на staff (и обратно) без мигания «Нет доступа»;
// гард НЕ ослаблен: реальный creator на /owner по-прежнему получает /unauthorized.
// Запуск: backend на :18080 + frontend preview на :4173 + node scripts/qa-role-switch-flash.mjs
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('backend/package.json'))
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve('backend/.env') })
const mongoose = require('mongoose')
const { chromium } = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API_URL || 'http://localhost:18080'
const OUT = path.resolve('reports/role-switch-flash')
fs.mkdirSync(OUT, { recursive: true })

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const imp = (p) => import(pathToFileURL(path.resolve('backend', p)).href)
const { default: User } = await imp('models/User.js')

const owner = await User.findOne({ role: 'owner' })
if (!owner) { console.error('❌ Нет owner в БД'); process.exit(1) }
const ownerToken = owner.generateToken()
const ownerProfile = {
    id: String(owner._id), _id: String(owner._id), email: owner.email,
    name: owner.name, role: 'owner', subscription: owner.subscription || 'agency',
}
// реальный клиент (creator) — контроль, что гард не ослаблен
const stamp = Date.now()
const creator = await User.create({
    name: 'QA RoleSwitch Creator', email: `qa.rswitch.${stamp}@test.dev`, password: 'QaSwitch12345!',
    role: 'creator', subscription: 'free', isActive: true, isVerified: true,
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
})
const creatorToken = creator.generateToken()
const creatorProfile = {
    id: String(creator._id), _id: String(creator._id), email: creator.email,
    name: creator.name, role: 'creator', subscription: 'free',
}

let failed = 0
const check = (name, ok, detail = '') => {
    console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`)
    if (!ok) failed++
}

async function proxyApi(context) {
    await context.route(`${API_ORIGIN}/**`, async (route) => {
        const req = route.request()
        const url = req.url().replace(API_ORIGIN, LOCAL_API)
        try {
            const headers = { ...req.headers() }
            delete headers.host; delete headers.origin; delete headers.referer
            const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
            const body = await resp.body()
            await route.fulfill({ status: resp.status(), headers: resp.headers(), body })
        } catch (e) {
            await route.fulfill({ status: 502, body: String(e.message) })
        }
    })
}

const browser = await chromium.launch()

// seed: токен + профиль (с возможностью подменить роль в кэше и поставить маркер смены)
async function newCtx(width, lang, { token, profile, staleRole = null, switchMarker = false }) {
    const context = await browser.newContext({ viewport: { width, height: 800 } })
    await proxyApi(context)
    const prof = staleRole ? { ...profile, role: staleRole } : profile
    await context.addInitScript(([t, p, l, m]) => {
        localStorage.setItem('token', t)
        localStorage.setItem('user_profile', JSON.stringify(p))
        localStorage.setItem('i18n-lang', l)
        if (m) localStorage.setItem('role_switch_at', String(Date.now()))
    }, [token, prof, lang, switchMarker])
    return context
}

const DENIED_RE = /Доступ запрещён|Access denied|нет прав/i

async function assertNotDenied(page, name, shot) {
    await page.waitForTimeout(2500)
    const url = page.url()
    const body = await page.locator('body').innerText().catch(() => '')
    check(`${name}: не /unauthorized`, !url.includes('/unauthorized'), url)
    check(`${name}: нет текста «Нет доступа»`, !DENIED_RE.test(body))
    if (shot) await page.screenshot({ path: path.join(OUT, shot) })
}

// ============ 1. owner → switch staff → обратно (×360/1280, RU/EN) ============
for (const width of [360, 1280]) {
    for (const lang of ['ru', 'en']) {
        const tag = `${width}-${lang}`
        const ctx = await newCtx(width, lang, { token: ownerToken, profile: ownerProfile })
        const page = await ctx.newPage()
        await page.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)

        // owner → staff
        await page.getByLabel(lang === 'ru' ? 'Сменить роль' : 'Switch role').click()
        await page.getByRole('button', { name: 'Staff', exact: true }).click()
        await page.waitForURL('**/staff**', { timeout: 15000 })
        await assertNotDenied(page, `owner→staff [${tag}]`, `staff-${tag}.png`)

        // обратно на owner: [VIEW-AS-PERSIST] view_as держится отдельно от реальной роли,
        // поэтому прямой переход на /owner в режиме staff теперь корректно → /unauthorized
        // (гард НЕ ослаблен). Выход — кнопка «Выйти» в плашке view-as, затем /owner доступен.
        const exitBtn = page.locator('[data-testid="view-as-banner"]').getByRole('button', { name: lang === 'ru' ? /^Выйти$/i : /^Exit$/i })
        await exitBtn.click()
        await page.waitForURL('**/owner**', { timeout: 15000 })
        await assertNotDenied(page, `staff→owner [${tag}]`, `owner-back-${tag}.png`)
        await ctx.close()
    }
}

// ============ 2. гонка: протухший кэш (role=creator) + свежий маркер → спиннер, НЕ unauthorized ============
{
    const ctx = await newCtx(1280, 'ru', { token: ownerToken, profile: ownerProfile, staleRole: 'creator', switchMarker: true })
    const page = await ctx.newPage()
    let hitUnauthorized = false
    page.on('framenavigated', (f) => { if (f === page.mainFrame() && f.url().includes('/unauthorized')) hitUnauthorized = true })
    await page.goto(`${BASE}/staff`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    check('гонка: stale-кэш + маркер → ни разу не /unauthorized', !hitUnauthorized && !page.url().includes('/unauthorized'), page.url())
    check('гонка: в итоге открыт /staff', page.url().includes('/staff'), page.url())
    await page.screenshot({ path: path.join(OUT, 'race-stale-cache.png') })
    await ctx.close()
}

// ============ 3. гард не ослаблен: реальный creator на /owner → /unauthorized ============
{
    const ctx = await newCtx(1280, 'ru', { token: creatorToken, profile: creatorProfile })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    check('creator на /owner → /unauthorized (гард цел)', page.url().includes('/unauthorized'), page.url())
    await page.screenshot({ path: path.join(OUT, 'creator-owner-denied.png') })
    await ctx.close()
    // и с свежим маркером creator НЕ должен пройти после подтверждения роли
    const ctx2 = await newCtx(1280, 'ru', { token: creatorToken, profile: creatorProfile, switchMarker: true })
    const page2 = await ctx2.newPage()
    await page2.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded' })
    await page2.waitForTimeout(4000)
    check('creator + маркер на /owner → всё равно /unauthorized', page2.url().includes('/unauthorized'), page2.url())
    await ctx2.close()
}

await browser.close()
await User.deleteOne({ _id: creator._id })
await mongoose.disconnect()
console.log(`\n${failed === 0 ? '✅ ROLE-SWITCH-FLASH: все проверки зелёные' : `❌ провалов: ${failed}`}`)
process.exit(failed ? 1 : 0)
