// [ONBOARDING-EMPTY-STATE] e2e: новый клиент → тур показан 1 раз → «Пропустить» видна с 1-го шага →
// весь кабинет доступен, empty-state inline → reload без тура → «другое устройство»
// (чистый localStorage, флаг tourDone с сервера) — тур не всплывает.
// Запуск: node scripts/qa-onboarding-tour.mjs (нужны preview :4173 и backend :18080)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://localhost:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/onboarding-empty-state')
fs.mkdirSync(OUT, { recursive: true })

const results = []
function step(name, ok, detail = '') {
    results.push({ name, ok, detail })
    console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

// 0. Регистрация нового клиента напрямую через локальный API
const email = `qa.tour.${Date.now()}@test.dev`
const password = 'QaTour123!'
const regResp = await fetch(`${LOCAL_API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'QA Tour', email, password,
        acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
    }),
})
const regJson = await regResp.json().catch(() => ({}))
const token = regJson.token || regJson.data?.token || regJson.accessToken
step('register via local API', regResp.ok && !!token, `status=${regResp.status}`)

async function proxyApiToLocal(context) {
    await context.route(`${API_ORIGIN}/**`, async (route) => {
        const req = route.request()
        const url = req.url().replace(API_ORIGIN, LOCAL_API)
        try {
            const headers = { ...req.headers() }
            delete headers.host; delete headers.origin; delete headers.referer
            const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
            const body = await resp.body()
            await route.fulfill({
                status: resp.status(),
                headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' },
                body,
            })
        } catch (e) {
            await route.fulfill({ status: 502, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: String(e) }) })
        }
    })
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const serverTourDone = async () => {
    const r = await fetch(`${LOCAL_API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    const j = await r.json().catch(() => ({}))
    return j?.user?.preferences?.onboarding?.tourDone === true
}

const browser = await chromium.launch()

// === УСТРОЙСТВО 1: новый клиент ===
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ru-RU' })
await ctxA.addInitScript(([t]) => { localStorage.setItem('token', t) }, [token])
await proxyApiToLocal(ctxA)
const pageA = await ctxA.newPage()

await pageA.goto(`${BASE}/creative-hub/chat`, { waitUntil: 'domcontentloaded' })
let tourShown = true
try {
    await pageA.waitForSelector('.driver-popover', { timeout: 10000 })
} catch { tourShown = false }
step('tour shown once for new client', tourShown)

if (tourShown) {
    const skipVisible = await pageA.locator('.omega-tour-skip').first().isVisible().catch(() => false)
    const skipText = skipVisible ? await pageA.locator('.omega-tour-skip').first().textContent() : ''
    step('«Пропустить» visible on first step', skipVisible, skipText?.trim())
    await pageA.screenshot({ path: path.join(OUT, 'tour-step1-with-skip.png') })
    await pageA.locator('.omega-tour-skip').first().click()
    await sleep(500)
    const popoverGone = (await pageA.locator('.driver-popover').count()) === 0
    step('tour closed after skip', popoverGone)
    const lsFlag = await pageA.evaluate(() => localStorage.getItem('omega_onboarding_tour_done'))
    step('localStorage flag saved', lsFlag === 'true', String(lsFlag))
    await sleep(1200) // PATCH на сервер
    step('server profile flag saved', await serverTourDone())

    // кабинет доступен: empty-state inline на /dashboard, навигация работает
    await pageA.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await pageA.waitForSelector('text=Постов пока нет', { timeout: 10000 }).catch(() => {})
    const emptyVisible = await pageA.locator('text=Постов пока нет').first().isVisible().catch(() => false)
    const hasBackdrop = await pageA.evaluate(() => {
        const el = [...document.querySelectorAll('div')].find(d => d.textContent?.includes('Постов пока нет') && d.className.includes('fixed'))
        return !!el
    })
    step('empty-state inline (no fixed overlay)', emptyVisible && !hasBackdrop)
    // переход по меню: sidebar ведёт в OMEGA
    await pageA.goto(`${BASE}/analytics`, { waitUntil: 'domcontentloaded' })
    await sleep(800)
    step('menu navigation free (analytics)', pageA.url().includes('/analytics'), pageA.url())
    await pageA.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await pageA.screenshot({ path: path.join(OUT, 'dashboard-empty-1280-ru.png'), fullPage: false })

    // reload → тур не всплывает
    await pageA.goto(`${BASE}/creative-hub/chat`, { waitUntil: 'domcontentloaded' })
    await sleep(3500)
    const popoverAfterReload = (await pageA.locator('.driver-popover').count()) > 0
    step('no tour after reload', !popoverAfterReload)
}
await ctxA.close()

// === УСТРОЙСТВО 2: чистый localStorage, флаг только на сервере ===
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ru-RU' })
await ctxB.addInitScript(([t]) => { localStorage.setItem('token', t) }, [token])
await proxyApiToLocal(ctxB)
const pageB = await ctxB.newPage()
await pageB.goto(`${BASE}/creative-hub/chat`, { waitUntil: 'domcontentloaded' })
await sleep(4000)
const popoverDevice2 = (await pageB.locator('.driver-popover').count()) > 0
step('no tour on second device (server flag)', !popoverDevice2)
await pageB.screenshot({ path: path.join(OUT, 'tour-second-device-none.png') })
await ctxB.close()

await browser.close()

const failed = results.filter(r => !r.ok)
fs.writeFileSync(path.join(OUT, 'qa-onboarding-tour.json'), JSON.stringify({ email, results }, null, 2))
console.log(failed.length === 0 ? '\nE2E TOUR: ALL OK' : `\nE2E TOUR: ${failed.length} FAILED`)
process.exit(failed.length === 0 ? 0 : 1)
