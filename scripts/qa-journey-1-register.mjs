// [CLIENT-JOURNEY-QA] Шаг 1: регистрация через UI → онбординг → первый чип OMEGA.
// API прода проксируется на локальный бэкенд (localhost:18080) — живые данные, реальная БД.
// Запуск: node scripts/qa-journey-1-register.mjs
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

export async function proxyApiToLocal(context) {
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

export function watchConsole(page, errors) {
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 300)) })
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 300)))
  page.on('response', (resp) => { if (resp.status() >= 400) errors.push(`HTTP ${resp.status()} ${resp.url().slice(-80)}`) })
}

const email = `qa.journey.${Date.now()}@test.dev`
const password = 'QaJourney123!'
const errors = []
const result = { email, steps: [], errors }

function step(name, ok, detail = '') {
  result.steps.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ru-RU' })
await proxyApiToLocal(context)
const page = await context.newPage()
watchConsole(page, errors)

// 1. Открыть /register → модалка регистрации
await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
// [CLIENT-JOURNEY-QA] вечная модалка «Доступно обновление» (починена semver-фиксом в App.jsx) —
// если вдруг ещё появилась, гасим крестиком и фиксируем как баг
const updateClose = page.locator('button:has(svg.lucide-x)').first()
const updateVisible = await page.locator('text=Доступно обновление').isVisible().catch(() => false)
if (updateVisible) {
  step('модалка обновления НЕ поверх регистрации', false, 'semver-фикс не сработал')
  await updateClose.click().catch(() => {})
} else {
  step('модалка обновления НЕ поверх регистрации', true)
}
// cookie-баннер перекрывает низ формы — принимаем
const cookieAccept = page.locator('button', { hasText: 'Принять' }).first()
if (await cookieAccept.isVisible().catch(() => false)) await cookieAccept.click()
await page.screenshot({ path: `${OUT}/01-register-modal.png` })
const modal = page.locator('div.fixed.inset-0.z-50')
const nameInput = modal.locator('input[placeholder="Ваше имя"]')
step('модалка регистрации открылась', await nameInput.isVisible().catch(() => false))

// 2. Заполнить форму
await nameInput.fill('QA Journey')
await modal.locator('input[placeholder="your@email.com"]').fill(email)
await modal.locator('input[placeholder="Минимум 6 символов"]').fill(password)
await modal.locator('input[placeholder="Повторите пароль"]').fill(password)
const cbs = modal.locator('input[type="checkbox"]')
const cbCount = await cbs.count()
for (let i = 0; i < cbCount; i++) {
  await cbs.nth(i).evaluate(el => el.click())
}
step('чекбоксы согласий', cbCount >= 4, `прокликано ${cbCount}`)

// 3. Submit
await modal.locator('button[type="submit"]').first().click()
await page.waitForTimeout(4000)
await page.screenshot({ path: `${OUT}/02-after-register.png` })
// [CLIENT-JOURNEY-QA] email-верификация: в QA-окружении письма нет — идём по «Продолжить без подтверждения»
const continueLink = page.locator('text=Продолжить без подтверждения')
const emailGate = await continueLink.isVisible().catch(() => false)
step('экран «Письмо отправлено» с обходом верификации', emailGate)
if (emailGate) {
  await continueLink.click()
  await page.waitForTimeout(4000)
}
const url = page.url()
step('после регистрации не остались на /register', !url.includes('/register'), url)

// 4. Токен в localStorage и роль creator
const token = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('auth_token') || '')
step('токен сохранён', !!token)
if (token) {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
  step('роль creator (не owner)', payload.role === 'creator', payload.role)
}

// 5. Онбординг: визард «Шаг 1 из 5»
await page.waitForTimeout(2000)
await page.screenshot({ path: `${OUT}/03-onboarding.png` })
const wizardVisible = await page.locator('text=Шаг 1 из').isVisible().catch(() => false)
step('onboarding-визард открылся (шаг 1 из 5)', wizardVisible)
if (wizardVisible) {
  // шаг 1: ниша — выбираем готовый вариант
  await page.locator('button', { hasText: 'IT-стартап' }).first().click().catch(() => {})
  await page.locator('button', { hasText: 'Далее' }).first().click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/03b-onboarding-step2.png` })
  // шаги 2-5: выбираем первую карточку/вариант и жмём «Далее» (на последнем может быть «Начать»)
  for (let s = 2; s <= 5; s++) {
    const stepMark = await page.locator(`text=Шаг ${s} из`).isVisible().catch(() => false)
    if (!stepMark) break
    // выбрать первый доступный вариант-кнопку (не Далее/Назад/Пропустить)
    const option = page.locator('button:not(:has-text("Далее")):not(:has-text("Назад")):not(:has-text("Пропустить")):not(:has-text("Начать"))').first()
    await option.click().catch(() => {})
    const next = page.locator('button', { hasText: /Далее|Начать|Готово|Завершить/ }).first()
    await next.click().catch(() => {})
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${OUT}/03c-onboarding-step${s}.png` })
  }
  await page.waitForTimeout(3000)
  step('визард пройден, вышли в приложение', !page.url().includes('/onboarding'), page.url())
}

// 6. Чипы OMEGA welcome — живут в /creative-hub/chat
await page.goto(`${BASE}/creative-hub/chat`, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(3000)
// [CLIENT-JOURNEY-QA] тур driver.js для новичка — проходим до конца (это и есть «тур под Ω OMEGA»)
const tourVisible = await page.locator('.driver-popover').isVisible().catch(() => false)
step('онboarding-тур (driver.js) показан новичку', tourVisible)
if (tourVisible) {
  await page.screenshot({ path: `${OUT}/05-tour.png` })
  for (let i = 0; i < 10; i++) {
    const nextBtn = page.locator('.driver-popover-next-btn')
    if (!(await nextBtn.isVisible().catch(() => false))) break
    await nextBtn.click()
    await page.waitForTimeout(600)
  }
  await page.waitForTimeout(800)
  step('тур пройден до конца', !(await page.locator('.driver-popover').isVisible().catch(() => false)))
}
const chip = page.locator('button', { hasText: 'Придумай вирусный хук' }).first()
const chipVisible = await chip.isVisible().catch(() => false)
step('welcome-чипы OMEGA видны', chipVisible)
if (chipVisible) {
  const chipText = await chip.innerText()
  await chip.click()
  // ждём ответ OMEGA (реальный AI; в CI без прямых AI-ключей ответ медленнее — до 120с)
  const before = await page.evaluate(() => document.body.innerText.length)
  let answered = false
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000)
    const now = await page.evaluate(() => document.body.innerText.length)
    if (now > before + 80) { answered = true; break }
  }
  await page.screenshot({ path: `${OUT}/04-omega-first-answer.png` })
  step(`чип «${chipText.trim().slice(0, 30)}» → ответ OMEGA`, answered)
}

result.finishedAt = new Date().toISOString()
fs.writeFileSync(`${OUT}/journey-1-register.json`, JSON.stringify(result, null, 1))
console.log('\nCONSOLE ERRORS:', errors.length)
errors.slice(0, 10).forEach(e => console.log('  -', e))
await browser.close()
