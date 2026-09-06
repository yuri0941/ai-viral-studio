// [DESIGN-LAB-APPLY] Пруфы и скрины «стало» после применения дизайнов в прод:
//  0.5: клиент/аноним → /preview/chat → лаборатория НЕ открывается (роутов нет, редирект на лендинг)
//  скрины: кабинет рекламодателя «Командный центр» (вариант Б), чат (пилюля квоты + модалка),
//  профиль (кольцо баланса) — dark/light × desktop/iPhone.
// Запуск: backend :18080 + preview :4173 (127.0.0.1) + node scripts/design-lab-apply-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/design-lab-apply')
fs.mkdirSync(OUT, { recursive: true })

const ACCOUNTS = {
  client: { email: 'client.test@aiviral-studio.ru', password: 'TestClient123!' },
  advertiser: { email: 'advertiser.test@aiviral-studio.ru', password: 'TestAdvertiser123!' },
}

let failures = 0
function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
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
      await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body })
    } catch (e) {
      await route.fulfill({ status: 502, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: String(e) }) })
    }
  })
}

async function loginToken(acc) {
  const resp = await fetch(`${LOCAL_API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ACCOUNTS[acc]),
  })
  const data = await resp.json()
  return data?.data?.token || data?.token || null
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`📸 ${name}.png`)
}

async function withPage(browser, { token, theme = 'dark', mobile = false }, fn) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    locale: 'ru-RU',
  })
  context.setDefaultTimeout(30000)
  await proxyApi(context)
  const page = await context.newPage()
  await page.addInitScript(([tk, th]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th)
    localStorage.setItem('cookie_consent', 'accepted')
  }, [token, theme])
  try {
    await fn(page)
  } finally {
    await context.close()
  }
}

const browser = await chromium.launch()
try {
  // ── 0.5 ПРУФ: /preview/* недоступен ──
  const clientToken = await loginToken('client')
  check('логин клиента (qa)', !!clientToken)
  await withPage(browser, { token: clientToken }, async (page) => {
    await page.goto(`${BASE}/preview/chat`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(4000)
    const url = page.url()
    const hasLab = await page.locator('text=Дизайн-лаборатория').isVisible().catch(() => false)
    check('0.5 клиент → /preview/chat: лаборатория не открывается', !url.includes('/preview') && !hasLab, url)
    await shot(page, 'proof-preview-blocked-client')
  })
  await withPage(browser, { token: null }, async (page) => {
    await page.goto(`${BASE}/preview/studio`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(4000)
    const url = page.url()
    const hasLab = await page.locator('text=Дизайн-лаборатория').isVisible().catch(() => false)
    check('0.5 аноним → /preview/studio: лаборатория не открывается', !url.includes('/preview') && !hasLab, url)
  })

  // ── Кабинет рекламодателя: «Командный центр» (вариант Б) ──
  const advToken = await loginToken('advertiser')
  check('логин рекламодателя (qa)', !!advToken)
  for (const [theme, mobile, tag] of [['dark', false, 'desktop-dark'], ['light', false, 'desktop-light'], ['dark', true, 'iphone-dark']]) {
    await withPage(browser, { token: advToken, theme, mobile }, async (page) => {
      await page.goto(`${BASE}/advertiser`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
      await page.waitForTimeout(4000)
      const ccVisible = await page.locator('text=Командный центр').first().isVisible().catch(() => false)
      check(`кабинет: вкладка «Командный центр» (${tag})`, ccVisible)
      const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      check(`кабинет: без горизонтального скролла (${tag})`, !hasHScroll)
      await shot(page, `advertiser-command-${tag}`)
    })
  }

  // ── Чат: пилюля квоты → модалка ──
  await withPage(browser, { token: clientToken }, async (page) => {
    await page.goto(`${BASE}/creative-hub/chat`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(4000)
    // закрыть driver.js тур если есть
    for (let i = 0; i < 10; i++) {
      const nextBtn = page.locator('.driver-popover-next-btn')
      if (!(await nextBtn.isVisible().catch(() => false))) break
      await nextBtn.click(); await page.waitForTimeout(400)
    }
    const pill = page.locator('[data-tour="token-counter"]')
    check('чат: пилюля квоты видна', await pill.isVisible().catch(() => false))
    await pill.click().catch(() => {})
    await page.waitForTimeout(800)
    const modalVisible = await page.locator('text=Баланс генераций').isVisible().catch(() => false)
    check('чат: клик по пилюле → модалка детализации', modalVisible)
    await shot(page, 'chat-quota-modal-desktop-dark')
    await page.keyboard.press('Escape')
    const hint = await page.locator('text=1 сообщение = 1✦').isVisible().catch(() => false)
    check('чат: цена действия до отправки (1✦)', hint)
  })

  // ── Профиль: кольцо баланса ──
  for (const [theme, tag] of [['dark', 'desktop-dark'], ['light', 'desktop-light']]) {
    await withPage(browser, { token: clientToken, theme }, async (page) => {
      await page.goto(`${BASE}/settings?tab=profile`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
      await page.waitForTimeout(4500)
      const ring = await page.locator(`text=Баланс генераций`).first().isVisible().catch(() => false)
      check(`профиль: кольцо баланса (${tag})`, ring)
      await shot(page, `profile-luxehub-${tag}`)
    })
  }
} finally {
  await browser.close()
}
console.log(failures ? `\nИТОГ: ❌ ${failures} провалов` : '\nИТОГ: ✅ все проверки зелёные')
process.exit(failures ? 1 : 0)
