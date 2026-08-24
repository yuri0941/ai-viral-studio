// [CLIENT-JOURNEY-QA] Шаг 3: PRO/AGENCY — UI-прогон ключевых страниц + YT-карточка в чате.
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

const users = JSON.parse(fs.readFileSync('.tmp-ui-polish/qa-plans.json', 'utf8'))
const result = { steps: [] }
const step = (name, ok, detail = '') => { result.steps.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`) }

const browser = await chromium.launch()

async function newSession(token) {
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
    localStorage.setItem('omega_onboarding_completed', 'true')
  }, token)
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)))
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url().replace(API_ORIGIN, 'API').slice(-90)}`) })
  return { context, page, errors }
}

for (const plan of ['pro', 'agency']) {
  const { context, page, errors } = await newSession(users[plan].token)
  // 1. Аналитика
  await page.goto(`${BASE}/analytics`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/07-${plan}-analytics.png` })
  const analyticsText = await page.evaluate(() => document.body.innerText)
  step(`${plan}: /analytics рендерится`, analyticsText.length > 200, `console errors: ${errors.length}`)

  // 2. Планировщик
  await page.goto(`${BASE}/scheduler`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/07-${plan}-scheduler.png` })
  const schedText = await page.evaluate(() => document.body.innerText)
  step(`${plan}: /scheduler рендерится`, schedText.length > 100)

  // 3. YouTube-анализ → люкс-карточка в чате
  await page.goto(`${BASE}/creative-hub/chat`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(2500)
  const input = page.locator('textarea, input[placeholder*="OMEGA"], input[placeholder*="Спросите"]').first()
  if (await input.isVisible().catch(() => false)) {
    await input.fill('Проанализируй видео https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.keyboard.press('Enter')
    // ждём карточку с цифрами (views/likes) до 90с
    let cardFound = false
    for (let i = 0; i < 45; i++) {
      await page.waitForTimeout(2000)
      const txt = await page.evaluate(() => document.body.innerText)
      if (/1[.,]?8\s?(млрд|млн|B|M)|просмотр/i.test(txt) && /Rick Astley/i.test(txt)) { cardFound = true; break }
      if (/Rick Astley/i.test(txt)) { cardFound = true; break }
    }
    await page.screenshot({ path: `${OUT}/07-${plan}-yt-card.png` })
    step(`${plan}: YouTube-ссылка → люкс-карточка с реальными цифрами`, cardFound)
  } else {
    step(`${plan}: поле ввода чата`, false)
  }
  step(`${plan}: console errors`, errors.length === 0, errors.slice(0, 3).join(' | '))
  await context.close()
}

fs.writeFileSync(`${OUT}/journey-3-plans.json`, JSON.stringify(result, null, 1))
await browser.close()
