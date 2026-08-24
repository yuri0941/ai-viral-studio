// [CLIENT-JOURNEY-QA] Шаг 2: FREE-тариф — исчерпание квоты → 402 → UpsellModal с живой ценой.
// trialTokens выставляем в 0 прямо в БД (эмуляция исчерпания), затем клик по чипу в чате.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:15173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/client-journey-qa')
fs.mkdirSync(OUT, { recursive: true })

const { email, token } = JSON.parse(fs.readFileSync('.tmp-ui-polish/qa-free-user.json', 'utf8'))
const errors = []
const result = { email, steps: [], errors }
const step = (name, ok, detail = '') => { result.steps.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`) }

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ru-RU' })
await context.route(`${API_ORIGIN}/**`, async (route) => {
  const req = route.request()
  const url = req.url().replace(API_ORIGIN, LOCAL_API)
  try {
    const headers = { ...req.headers() }
    delete headers.host; delete headers.origin; delete headers.referer
    const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
    await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body: await resp.body() })
  } catch (e) {
    await route.fulfill({ status: 502, body: JSON.stringify({ error: String(e) }) })
  }
})
await context.addInitScript((t) => {
  localStorage.setItem('token', t)
  localStorage.setItem('omega_onboarding_tour_done', 'true')
  localStorage.setItem('cookie_consent', 'accepted')
  localStorage.setItem('onboarding_completed', 'true')
  localStorage.setItem('omega_onboarding_completed', 'true')
}, token)
const page = await context.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)))

await page.goto(`${BASE}/creative-hub/chat`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const chip = page.locator('button', { hasText: 'Придумай вирусный хук' }).first()
step('чип доступен после исчерпания квоты', await chip.isVisible().catch(() => false))
await chip.click()
await page.waitForTimeout(6000)
await page.screenshot({ path: `${OUT}/06-free-quota-exhausted.png` })
const bodyText = await page.evaluate(() => document.body.innerText)
// UpsellModal или честное сообщение о лимите (не 500, не тишина)
const hasUpsell = /тариф|PRO|990|лимит|исчерпан|пакет|upgrade/i.test(bodyText)
step('при исчерпании квоты показан upsell/лимит (не 500)', hasUpsell)
const mentionsPrice = /990|₽/.test(bodyText)
step('упоминается живая цена/₽', mentionsPrice)
const has500 = /500|Internal Server Error/i.test(bodyText)
step('нет 500/Internal Server Error', !has500)

result.finishedAt = new Date().toISOString()
fs.writeFileSync(`${OUT}/journey-2-free-quota.json`, JSON.stringify(result, null, 1))
console.log('\nCONSOLE ERRORS:', errors.length)
errors.slice(0, 8).forEach(e => console.log('  -', e))
await browser.close()
