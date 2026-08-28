// [STAFF-DOP] Пересъёмка Staff Panel после фиксов: /staff × 360/428/768/1280/1920 × RU/EN.
// Запуск: backend :18080 + preview :4173 + node scripts/staff-dop-reshoot.mjs
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
const OUT = path.resolve('reports/staff-dop-audit')
fs.mkdirSync(OUT, { recursive: true })

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const imp = (p) => import(pathToFileURL(path.resolve('backend', p)).href)
const { default: User } = await imp('models/User.js')

const owner = await User.findOne({ role: 'owner' })
const token = owner.generateToken()
const profile = { id: String(owner._id), _id: String(owner._id), email: owner.email, name: owner.name, role: 'owner', subscription: 'agency' }

async function proxyApi(context) {
    await context.route(`${API_ORIGIN}/**`, async (route) => {
        const req = route.request()
        const url = req.url().replace(API_ORIGIN, LOCAL_API)
        try {
            const headers = { ...req.headers() }
            delete headers.host; delete headers.origin; delete headers.referer
            const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
            const body = await resp.body()
            await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body })
        } catch (e) {
            await route.fulfill({ status: 502, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: String(e) }) })
        }
  })
}

const errors = []
const browser = await chromium.launch()
for (const lang of ['ru', 'en']) {
  for (const w  of [360, 428, 768, 1280, 1920]) {
    const context = await browser.newContext({ viewport: { width: w, height: 900 }, locale: lang === 'ru' ? 'ru-RU' : 'en-US' })
    await proxyApi(context)
    await context.addInitScript(([t, p, l]) => {
        localStorage.setItem('token', t)
        localStorage.setItem('user_profile', JSON.stringify(p))
        localStorage.setItem('i18nextLng', l)
    }, [token, profile, lang])
    const page = await context.newPage()
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${lang}/${w}: ${m.text().slice(0, 200)}`) })
    page.on('pageerror', (e) => errors.push(`${lang}/${w} PAGEERROR: ${String(e).slice(0, 200)}`))
    await page.goto(`${BASE}/staff`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(2500)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (overflow > 1) errors.push(`${lang}/${w} H-SCROLL +${overflow}px`)
    await page.screenshot({ path: path.join(OUT, `staff_staff_${w}_${lang}.png`) })
    console.log(`📸 staff_staff_${w}_${lang}.png${overflow > 1 ? ` ⚠️ h-scroll ${overflow}px` : ''}`)
    await context.close()
  }
}
await browser.close()
await mongoose.disconnect()
console.log(errors.length ? `❌ проблемы:\n${errors.join('\n')}` : '✅ пересъёмка чистая: 0 скроллов, 0 console errors')
process.exit(errors.length ? 1 : 0)
