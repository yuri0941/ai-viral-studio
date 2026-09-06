// [HOTFIX-FINAL-2] Скрины для отчёта: house-ads слоты (З6) × обе темы × 360/768/1280(+1440),
// error-state auth с retry (З2), first screen на 3G-эмуляции (З7.2).
// Локально: preview :4173 + backend :18080 (prod-API проксируется на локальный).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/hotfix-final-2/shots')
fs.mkdirSync(OUT, { recursive: true })

let failures = 0
const check = (name, ok, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}
const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(`📸 ${name}.png`)
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

async function login(email, password) {
  const r = await fetch(`${LOCAL_API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const j = await r.json().catch(() => ({}))
  return j?.data?.token || j?.token || null
}

async function withPage(browser, { token, theme = 'dark', width = 1280, height = 900 }, fn) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'ru-RU' })
  context.setDefaultTimeout(45000)
  await proxyApi(context)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.addInitScript(([tk, th]) => {
    if (tk) {
      localStorage.setItem('token', tk)
      // кэш профиля — чтобы auth не уходил в error-state при прокси
    }
    localStorage.setItem('theme', th)
    localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('cookie_consent', 'accepted')
  }, [token, theme])
  try { await fn(page, errors) } finally { await context.close() }
}

async function main() {
  const clientToken = await login('creator.test@aiviral-studio.ru', 'TestCreator123!')
  check('вход клиента', !!clientToken)

  const browser = await chromium.launch()
  try {
    // ── З6: house-ads — чат (топ-баннер) × темы × ширины ──
    for (const [theme, width] of [['dark', 1280], ['light', 1280], ['dark', 768], ['light', 768], ['dark', 360], ['light', 360]]) {
      await withPage(browser, { token: clientToken, theme, width, height: width === 360 ? 800 : 900 }, async (page, errors) => {
        await page.goto(BASE + '/creative-hub/chat', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(5000)
        const text = await page.evaluate(() => document.body?.innerText || '')
        check(`чат: house-ad баннер виден (${theme}/${width})`, /Реклама/.test(text), `chars=${text.length}`)
        const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
        check(`чат: без h-scroll (${theme}/${width})`, !hScroll)
        await shot(page, `housead-chat-${theme}-${width}`)
        check(`чат: без pageerror (${theme}/${width})`, errors.length === 0, errors[0] || '')
      })
    }

    // ── З6: дашборд — нижняя плашка (360), пилюля (768), сайдбар-карточка (1440) ──
    for (const [theme, width, expectName] of [['dark', 360, 'bottombar'], ['light', 360, 'bottombar'], ['dark', 768, 'pill'], ['light', 768, 'pill'], ['dark', 1440, 'sidebar'], ['light', 1440, 'sidebar']]) {
      await withPage(browser, { token: clientToken, theme, width, height: 900 }, async (page, errors) => {
        await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(5000)
        const text = await page.evaluate(() => document.body?.innerText || '')
        check(`дашборд: house-ad ${expectName} (${theme}/${width})`, /Реклама/.test(text), `chars=${text.length}`)
        const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
        check(`дашборд: без h-scroll (${theme}/${width})`, !hScroll)
        await shot(page, `housead-dash-${expectName}-${theme}-${width}`)
        check(`дашборд: без pageerror (${theme}/${width})`, errors.length === 0, errors[0] || '')
      })
    }

    // ── З2: error-state auth с retry (сеть /auth/me оборвана, кэша профиля нет) ──
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ru-RU' })
      context.setDefaultTimeout(30000)
      await context.route('**/api/auth/me', route => route.abort())
      const page = await context.newPage()
      await page.addInitScript(() => {
        localStorage.setItem('token', 'qa.fake-token-no-cache')
        localStorage.setItem('cookie_consent', 'accepted')
      })
      await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(12000) // таймаут auth 10с + запас
      const text = await page.evaluate(() => document.body?.innerText || '')
      check('З2: error-state с «Повторить» вместо вечного спиннера', /Повторить/.test(text), `chars=${text.length}`)
      await shot(page, 'auth-error-state-retry-mobile')
      await context.close()
    }

    // ── З7.2: first screen на 3G-эмуляции (<2с цель) ──
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ru-RU' })
      await proxyApi(context)
      const page = await context.newPage()
      const cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')
      // 3G-эмуляция: ~1.6Mbps down / 750Kbps up, RTT 300ms (Chrome preset "Regular 3G")
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 1600 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 })
      const t0 = Date.now()
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => document.body && document.body.innerText.length > 200, null, { timeout: 30000 }).catch(() => {})
      const firstScreenMs = Date.now() - t0
      check('З7.2: first screen <2с на 3G', firstScreenMs < 2000, `${firstScreenMs}мс`)
      await shot(page, 'first-screen-3g')
      await context.close()
    }
  } finally {
    await browser.close()
  }
  console.log(`\nИТОГ: ${failures === 0 ? '✅ всё зелёное' : `❌ провалов: ${failures}`}`)
  process.exit(failures === 0 ? 0 : 1)
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
