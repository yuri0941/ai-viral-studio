// [VIEW-AS-PERSIST] e2e: owner → каждая роль через header-switch → плашка «Ты смотришь как…»,
// reload в роли → режим держится, «Выйти» → назад в owner, консоль без 401/403/ошибок,
// гард не ослаблен (реальный creator на чужих роутах → /unauthorized).
// Бонус: матрица скринов плашки и вкладки «Клиенты» (UsersManager) × 5 ширин × RU/EN
// с проверкой горизонтального скролла.
// Запуск: backend + frontend preview :4173 + node scripts/qa-view-as.mjs
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
const LOCAL_API = process.env.QA_API_URL || 'http://localhost:5000'
const OUT = path.resolve('reports/view-as')
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
const stamp = Date.now()
const creator = await User.create({
    name: 'QA ViewAs Creator', email: `qa.viewas.${stamp}@test.dev`, password: 'QaViewAs12345!',
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
    console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 140) : ''}`)
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

async function newCtx(width, lang, { token, profile }) {
    const context = await browser.newContext({ viewport: { width, height: 800 } })
    await proxyApi(context)
    await context.addInitScript(([t, p, l]) => {
        localStorage.setItem('token', t)
        localStorage.setItem('user_profile', JSON.stringify(p))
        localStorage.setItem('i18n-lang', l)
        localStorage.setItem('cookie_consent', 'accepted')
    }, [token, profile, lang])
    return context
}

// мониторинг консоли и ответов API на странице
function watch(page, bag) {
    page.on('console', (m) => {
        if (m.type() === 'error') bag.consoleErrors.push(`${m.text().slice(0, 160)} @ ${m.location()?.url || ''}`.slice(0, 220))
    })
    page.on('response', (r) => {
        const s = r.status()
        if (!/\/api\//.test(r.url())) return
        const u = r.url().replace(LOCAL_API, '').replace(API_ORIGIN, '')
        if (s === 401 || s === 403) bag.apiErrors.push(`${s} ${u}`)
        else if (s >= 400) bag.apiWarns.push(`${s} ${u}`)
    })
}

const BANNER_RE = { ru: /Ты смотришь как/i, en: /You're viewing as/i }
const EXIT_RE = { ru: /^Выйти$/i, en: /^Exit$/i }
const SWITCH_LABEL = { ru: 'Сменить роль', en: 'Switch role' }
const DENIED_RE = /Доступ запрещён|Access denied|нет прав/i

const ROLES = [
    { role: 'admin', label: 'Admin', route: '/admin' },
    { role: 'staff', label: 'Staff', route: '/staff' },
    { role: 'advertiser', label: 'Advertiser', route: '/advertiser' },
    { role: 'creator', label: 'Creator', route: '/dashboard' },
    { role: 'business', label: 'Business', route: '/dashboard' },
]

// ============ 1. owner → каждая роль: плашка, persist после reload, без 401/403 ============
for (const { role, label, route } of ROLES) {
    const ctx = await newCtx(1280, 'ru', { token: ownerToken, profile: ownerProfile })
    const page = await ctx.newPage()
    const bag = { consoleErrors: [], apiErrors: [], apiWarns: [] }
    watch(page, bag)

    await page.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await page.getByLabel(SWITCH_LABEL.ru).click()
    await page.getByRole('button', { name: label, exact: true }).click()
    await page.waitForTimeout(3500)

    check(`owner→${role}: не /unauthorized`, !page.url().includes('/unauthorized'), page.url())
    check(`owner→${role}: маршрут ${route}`, page.url().includes(route), page.url())
    const banner = page.locator('[role="status"]')
    check(`owner→${role}: плашка видна`, await banner.isVisible().catch(() => false))
    const body1 = await page.locator('body').innerText().catch(() => '')
    check(`owner→${role}: без «Нет доступа»`, !DENIED_RE.test(body1))

    // 2–3 действия в роли: переходы по основным роутам роли
    const steps = role === 'admin' ? ['/admin'] : role === 'staff' ? ['/staff'] : role === 'advertiser' ? ['/advertiser'] : ['/dashboard', '/dashboard']
    for (const r of steps) {
        await page.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
    }
    check(`owner→${role}: навигация без /unauthorized`, !page.url().includes('/unauthorized'), page.url())

    // reload → режим держится
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    check(`owner→${role}: после reload плашка на месте`, await page.locator('[role="status"]').isVisible().catch(() => false))
    check(`owner→${role}: после reload не /unauthorized`, !page.url().includes('/unauthorized'), page.url())
    if (role === 'creator') {
        await page.screenshot({ path: path.join(OUT, 'persist-after-reload.png') })
        await page.setViewportSize({ width: 360, height: 800 })
        await page.waitForTimeout(800)
        await page.screenshot({ path: path.join(OUT, 'banner-360-ru.png') })
        await page.setViewportSize({ width: 1280, height: 800 })
        await page.waitForTimeout(500)
        await page.screenshot({ path: path.join(OUT, 'banner-1280-ru.png') })
    }

    // «Выйти» → назад в owner (проверяем один раз на каждой роли — дёшево)
    await page.locator('[role="status"]').getByRole('button', { name: EXIT_RE.ru }).click()
    await page.waitForTimeout(3000)
    check(`${role}→«Выйти»: маршрут /owner`, page.url().includes('/owner'), page.url())
    check(`${role}→«Выйти»: плашка скрыта`, !(await page.locator('[role="status"]').isVisible().catch(() => false)))

    check(`owner→${role}: консоль без error`, bag.consoleErrors.length === 0, bag.consoleErrors[0] || '')
    check(`owner→${role}: API без 401/403`, bag.apiErrors.length === 0, bag.apiErrors[0] || '')
    if (bag.apiWarns.length) console.log(`   ℹ️  ${role} API warns: ${bag.apiWarns.join(' | ')}`)
    await ctx.close()
}

// ============ 2. EN-плашка ============
{
    const ctx = await newCtx(1280, 'en', { token: ownerToken, profile: ownerProfile })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await page.getByLabel(SWITCH_LABEL.en).click()
    await page.getByRole('button', { name: 'Creator', exact: true }).click()
    await page.waitForTimeout(3500)
    const body = await page.locator('body').innerText().catch(() => '')
    check('EN: плашка «You\'re viewing as»', BANNER_RE.en.test(body))
    await page.screenshot({ path: path.join(OUT, 'banner-1280-en.png') })
    await ctx.close()
}

// ============ 3. гард не ослаблен: реальный creator на чужих роутах → /unauthorized ============
for (const r of ['/owner', '/admin', '/staff']) {
    const ctx = await newCtx(1280, 'ru', { token: creatorToken, profile: creatorProfile })
    const page = await ctx.newPage()
    await page.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    check(`creator на ${r} → /unauthorized (гард цел)`, page.url().includes('/unauthorized'), page.url())
    await ctx.close()
}

// ============ 4. матрица: плашка + вкладка «Клиенты» × 360/428/768/1280/1920 × RU/EN ============
for (const width of [360, 428, 768, 1280, 1920]) {
    for (const lang of ['ru', 'en']) {
        // 4a. плашка в режиме view-as (creator)
        const ctx = await newCtx(width, lang, { token: ownerToken, profile: ownerProfile })
        const page = await ctx.newPage()
        await page.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
        await page.getByLabel(SWITCH_LABEL[lang]).click()
        await page.getByRole('button', { name: 'Creator', exact: true }).click()
        await page.waitForTimeout(3000)
        const bannerVisible = await page.locator('[role="status"]').isVisible().catch(() => false)
        const scrollBanner = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        check(`плашка [${width}/${lang}]: видна, без горизонтального скролла`, bannerVisible && scrollBanner <= 1, `scrollX=${scrollBanner}`)
        await page.screenshot({ path: path.join(OUT, `banner-${width}-${lang}.png`) })
        await ctx.close()

        // 4b. owner → вкладка «Клиенты» (UsersManager) — таблица без горизонтального скролла страницы
        const ctx2 = await newCtx(width, lang, { token: ownerToken, profile: ownerProfile })
        const page2 = await ctx2.newPage()
        await page2.goto(`${BASE}/owner?tab=clients`, { waitUntil: 'domcontentloaded' })
        await page2.waitForTimeout(3500)
        const scrollClients = await page2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        const hasTable = await page2.locator('table, [class*="VirtualTable"], .glass').first().isVisible().catch(() => false)
        check(`клиенты [${width}/${lang}]: контент есть, scrollX ≤ 1`, hasTable && scrollClients <= 1, `scrollX=${scrollClients}`)
        await page2.screenshot({ path: path.join(OUT, `clients-${width}-${lang}.png`), fullPage: false })
        await ctx2.close()
    }
}

await browser.close()
await User.deleteOne({ _id: creator._id })
await mongoose.disconnect()
console.log(`\n${failed === 0 ? '✅ VIEW-AS-PERSIST: все проверки зелёные' : `❌ провалов: ${failed}`}`)
process.exit(failed ? 1 : 0)
