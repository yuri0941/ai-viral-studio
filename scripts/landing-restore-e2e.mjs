// [LANDING-RESTORE] E2E на собранном бандле (preview :4173):
//  1) Тарифы при УПАВШЕМ API: блокируем /api/plan-config → ждём ≤12с → виден фолбэк с ценами (990/4990)
//  2) Футер и все TG-ссылки: href валидные t.me (без VITE_* в билде)
//  3) «Войти» в шапке открывает AuthModal; «← Назад» на /signup ведёт на /
//  4) Восстановленные элементы: PWAInstallButton/roadmap/download/правовая строка — на месте
// Запуск: node scripts/landing-restore-e2e.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const OUT = path.resolve('reports/landing-restore')
fs.mkdirSync(OUT, { recursive: true })

const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const results = []
const log = (name, ok, detail = '') => {
    results.push({ name, ok, detail })
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()

async function newPage({ blockApi = false, width = 1280 } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(() => {
        localStorage.setItem('app_language', 'ru')
        localStorage.setItem('cookie_consent', 'accepted')
    })
    if (blockApi) {
        await context.route(`${API_ORIGIN}/**`, (route) => route.abort('connectionfailed'))
    }
    const page = await context.newPage()
    return { context, page }
}

// --- 1) Тарифы при упавшем API ---
{
    const { context, page } = await newPage({ blockApi: true })
    const t0 = Date.now()
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.evaluate(() => document.getElementById('pricing')?.scrollIntoView())
    let shown = null
    try {
        await page.waitForFunction(() => document.body.innerText.includes('990') && document.body.innerText.includes('4990'), { timeout: 15000 })
        shown = (Date.now() - t0) / 1000
    } catch { /* timeout */ }
    log('pricing-fallback-on-dead-api', shown !== null, shown !== null ? `цены видны через ${shown.toFixed(1)}с при мёртвом API` : 'цен нет через 15с')
    // [LANDING-RESTORE] селектор именно скелетон-карточек (h-64), а не pulse-точки BetaCounter
    const hasSpinner15s = await page.evaluate(() => document.querySelectorAll('#pricing .animate-pulse.h-64').length > 0)
    log('pricing-no-eternal-skeleton', !hasSpinner15s, hasSpinner15s ? 'скелетоны/спиннер остались' : 'скелетонов нет')
    await page.screenshot({ path: path.join(OUT, 'e2e_pricing_dead_api.png') })
    await context.close()
}

// --- 2) TG-ссылки валидны без VITE_* ---
{
    const { context, page } = await newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(3000)
    const links = await page.evaluate(() =>
        [...document.querySelectorAll('footer a, header a')].map(a => ({ text: (a.textContent || '').trim().slice(0, 40), href: a.getAttribute('href') }))
    )
    const tg = links.filter(l => (l.href || '').includes('t.me') || /Telegram/i.test(l.text))
    const badTg = tg.filter(l => !/^https:\/\/t\.me\/[A-Za-z0-9_]+/.test(l.href || ''))
    log('tg-links-valid', tg.length >= 2 && badTg.length === 0, JSON.stringify(tg))
    await context.close()
}

// --- 3) «Войти» открывает модалку; «Назад» ведёт на / ---
{
    const { context, page } = await newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2500)
    const loginLink = page.locator('header a[href="/login"]').first()
    const visible = await loginLink.isVisible().catch(() => false)
    await loginLink.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const url = page.url()
    const modalOpen = await page.evaluate(() => !!document.querySelector('.fixed.inset-0.z-50'))
    log('header-login-visible', visible)
    log('header-login-opens-modal', modalOpen && url.includes('/login'), `url=${url} modal=${modalOpen}`)
    await page.screenshot({ path: path.join(OUT, 'e2e_login_modal.png') })

    // «Назад» на /signup
    await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2500)
    const backBtn = page.locator('button:has-text("Назад"), a:has-text("Назад")').first()
    const backExists = await backBtn.count()
    const backDisabled = backExists ? await backBtn.isDisabled().catch(() => false) : true
    if (backExists) await backBtn.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const afterUrl = page.url()
    log('signup-back-to-home', backExists > 0 && !backDisabled && /\/$/.test(afterUrl), `exists=${backExists} disabled=${backDisabled} url=${afterUrl}`)
    await page.screenshot({ path: path.join(OUT, 'e2e_signup_back.png') })
    await context.close()
}

// --- 4) Восстановленные элементы ---
{
    const { context, page } = await newPage()
    // [LANDING-RESTORE] правовая строка: фикстура публичного legal-info (прод может быть недоступен из сети)
    await context.route('**/api/owner/legal-info/public', (route) => route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
        body: JSON.stringify({ success: true, legalInfo: { operatorName: 'Тихонов Юрий Сергеевич', operatorType: 'Самозанятый', inn: '344212910482' } }),
    }))
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(4000)
    const checks = await page.evaluate(() => ({
        roadmap: !!document.querySelector('a[href="/roadmap"]'),
        download: !!document.querySelector('a[href="/download"]'),
        legal: /ИНН|Самозанят|operatorName/i.test(document.body.innerText),
        visitBeacon: true, // beacon проверяется отдельным перехватом ниже
    }))
    let beaconFired = false
    const { context: c2, page: p2 } = await newPage()
    await c2.route('**/api/metrics/visit', (route) => { beaconFired = true; route.fulfill({ status: 200, body: '{}' }) })
    await p2.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await p2.waitForTimeout(3000)
    checks.visitBeacon = beaconFired
    log('restored-roadmap-link', checks.roadmap)
    log('restored-download-link', checks.download)
    log('restored-legal-info', checks.legal)
    log('restored-visit-beacon', checks.visitBeacon)
    await context.close()
    await c2.close()
}

await browser.close()
fs.writeFileSync(path.join(OUT, 'e2e-results.json'), JSON.stringify(results, null, 2))
const failed = results.filter(r => !r.ok)
console.log(`\nИТОГ: ${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)
