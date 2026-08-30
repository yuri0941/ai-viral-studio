// [ADMIN-BUTTONS-POLISH] разовый снимок quick-actions на 360/ru: mock-auth admin, скролл к блоку кнопок.
// Запуск: node scripts/admin-buttons-360-shot.mjs <out.png>  (preview на :4173)
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const OUT = process.argv[2] || 'reports/admin-buttons-polish/after/admin_admin_360_ru_actions.png'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'

const user = {
    _id: 'audit-admin', id: 'audit-admin', email: 'audit.admin@test.com', name: 'Audit admin',
    role: 'admin', trialTokens: 10,
    preferences: { language: 'ru', timezone: 'Europe/Moscow' },
}
const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type,x-requested-with',
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 360, height: 900 }, isMobile: true, hasTouch: true })
await context.addInitScript(() => {
    localStorage.setItem('token', 'mock')
    localStorage.removeItem('user_profile')
    localStorage.setItem('app_language', 'ru')
    localStorage.setItem('i18n-lang', 'ru')
    localStorage.setItem('omega_onboarding_tour_done', 'true')
    localStorage.setItem('cookie_consent', 'accepted')
})
await context.route(`${API_ORIGIN}/**`, (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const u = new URL(req.url())
    const json = (obj, status = 200) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(obj) })
    if (u.pathname === '/api/auth/me') return json({ success: true, user })
    if (u.pathname === '/api/users/me' && req.method() === 'GET') return json({ success: true, user, data: user })
    if (u.pathname === '/api/users/me/quota') return json({ status: 'success', data: { trialTokens: 10 } })
    return json({ status: 'success', success: true, data: {} })
})
const page = await context.newPage()
await page.goto('http://localhost:4173/admin', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(4000)
// гасим возможные оверлеи
for (let i = 0; i < 10; i++) {
    const overlay = page.locator('div.fixed.inset-0[class*="z-["]').first()
    if (await overlay.isVisible().catch(() => false)) {
        await overlay.locator('button').first().click().catch(() => {})
        await page.waitForTimeout(500)
    } else break
}
await page.locator('button:has-text("Модерация")').first().scrollIntoViewIfNeeded()
await page.waitForTimeout(600)
await page.screenshot({ path: OUT })
await browser.close()
console.log('saved:', OUT)
