// [CHAT-PRO З3/З4] Дизайн-гейт «Люкс-хаба» (вариант B, выбор владельца qid 4c57e59643ed):
//  люкс-шапка + пилюля квоты → модалка (Esc), поиск по ленте (фильтр + empty-state),
//  черновик инпута (переживает reload), кольцо баланса на широком экране,
//  house-ads баннер ≤34px не сломан, без горизонтального скролла, RU/EN, dark/light.
// Запуск: backend :18080 + preview :4173 (127.0.0.1) + node scripts/chat-pro-luxe-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/chat-pro-luxe')
fs.mkdirSync(OUT, { recursive: true })

const CLIENT = { email: 'client.test@aiviral-studio.ru', password: 'TestClient123!' }

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

async function loginToken() {
  const resp = await fetch(`${LOCAL_API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CLIENT),
  })
  const data = await resp.json()
  return data?.data?.token || data?.token || null
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`📸 ${name}.png`)
}

async function withPage(browser, { token, theme = 'dark', lang = 'ru', vw = 1280, vh = 900 }, fn) {
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, locale: lang === 'en' ? 'en-US' : 'ru-RU' })
  context.setDefaultTimeout(30000)
  await proxyApi(context)
  const page = await context.newPage()
  await page.addInitScript(([tk, th, lg]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th)
    localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('lang', lg)
    localStorage.setItem('i18n-lang', lg)
    localStorage.setItem('app_language', lg)
    localStorage.setItem('cookie_consent', 'accepted')
  }, [token, theme, lang])
  try {
    await fn(page)
  } finally {
    await context.close()
  }
}

async function gotoChat(page) {
  await page.goto(`${BASE}/creative-hub/chat`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(4000)
  // закрыть driver.js тур если есть
  for (let i = 0; i < 10; i++) {
    const nextBtn = page.locator('.driver-popover-next-btn')
    if (!(await nextBtn.isVisible().catch(() => false))) break
    await nextBtn.click(); await page.waitForTimeout(400)
  }
}

const noHScroll = async (page) => !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1))

const browser = await chromium.launch()
try {
  const token = await loginToken()
  check('логин клиента (qa)', !!token)

  // ── Функциональные проверки (desktop dark RU) ──
  await withPage(browser, { token }, async (page) => {
    await gotoChat(page)
    check('люкс-шапка: OMEGA Studio', await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
    check('люкс-шапка: «люкс-режим»', await page.locator('text=люкс-режим').first().isVisible().catch(() => false))

    // пилюля → модалка → Esc (WCAG)
    const pill = page.locator('[data-tour="token-counter"]').first()
    check('пилюля квоты видна', await pill.isVisible().catch(() => false))
    await pill.click().catch(() => {})
    await page.waitForTimeout(600)
    // «Баланс генераций» есть и в скрытом сайдбаре (xl-) — проверяем сам диалог
    check('пилюля → модалка «Баланс генераций»', await page.locator('[role="dialog"]').first().isVisible().catch(() => false))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    check('Esc закрывает модалку', !(await page.locator('text=Баланс генераций').first().isVisible().catch(() => false)))

    // поиск: фильтр + empty-state
    const search = page.locator('input[type="search"]').first()
    check('поле поиска видно (sm+)', await search.isVisible().catch(() => false))
    await search.fill('zzzнеттакогоzzz')
    await page.waitForTimeout(500)
    check('поиск: empty-state «Ничего не найдено»', await page.locator('text=Ничего не найдено').isVisible().catch(() => false))
    await search.fill('')
    await page.waitForTimeout(400)

    // черновик: набрать → reload → текст на месте
    const input = page.locator('[data-tour="omega-input"]')
    await input.fill('черновик-проба-123')
    await page.waitForTimeout(400)
    await page.reload({ waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(4000)
    check('черновик переживает reload', (await page.locator('[data-tour="omega-input"]').inputValue().catch(() => '')) === 'черновик-проба-123')
    await page.locator('[data-tour="omega-input"]').fill('')

    // house-ads баннер ≤34px (спека Р3) — у клиента виден
    const ad = page.locator('text=Реклама').first()
    if (await ad.isVisible().catch(() => false)) {
      const box = await ad.locator('xpath=ancestor::*[self::div or self::aside][1]').boundingBox().catch(() => null)
      const h = await page.evaluate(() => {
        const el = [...document.querySelectorAll('div,aside')].find(e => e.textContent.includes('Реклама') && e.getBoundingClientRect().height < 60 && e.getBoundingClientRect().height > 10)
        return el ? el.getBoundingClientRect().height : 0
      })
      check('house-ads баннер ≤34px', h > 0 && h <= 34.5, `h=${h}px`)
    } else {
      console.log('ℹ️ house-ads баннер скрыт («Скрыть на день»/ротация) — высоту не меряем')
    }

    check('1280 dark: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-1280-dark')
  })

  // ── EN (i18n) ──
  await withPage(browser, { token, lang: 'en' }, async (page) => {
    await gotoChat(page)
    check('EN: «luxe mode» в шапке', await page.locator('text=luxe mode').first().isVisible().catch(() => false))
    check('1280 en: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-1280-dark-en')
  })

  // ── Light ──
  await withPage(browser, { token, theme: 'light' }, async (page) => {
    await gotoChat(page)
    check('1280 light: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-1280-light')
  })

  // ── Широкий экран ≥1920: кольцо баланса + статистика месяца (сайдбар Люкс-хаба) ──
  await withPage(browser, { token, vw: 1920, vh: 1000 }, async (page) => {
    await gotoChat(page)
    check('1920: кольцо баланса видно', await page.locator('text=Баланс генераций').first().isVisible().catch(() => false))
    check('1920: «В этом месяце» видно', await page.locator('text=В этом месяце').first().isVisible().catch(() => false))
    check('1920 dark: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-1920-dark')
  })

  // ── iPhone 390 (первым по гейту — идёт последним только логом) ──
  await withPage(browser, { token, vw: 390, vh: 844 }, async (page) => {
    await gotoChat(page)
    check('390: люкс-шапка видна', await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
    check('390: пилюля квоты видна', await page.locator('[data-tour="token-counter"]').first().isVisible().catch(() => false))
    // мобильный поиск — через кнопку-лупу (десктопный input на 390 скрыт, берём видимый)
    const searchBtn = page.locator('button[aria-label*="Поиск"]').first()
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click()
      await page.waitForTimeout(400)
      check('390: поиск раскрывается кнопкой', await page.locator('input[type="search"]:visible').first().isVisible().catch(() => false))
    }
    check('390: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-390-dark')
  })

  // ── 768 ──
  await withPage(browser, { token, vw: 768, vh: 900 }, async (page) => {
    await gotoChat(page)
    check('768: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-768-dark')
  })
} finally {
  await browser.close()
}
console.log(failures ? `\nИТОГ: ❌ ${failures} провалов` : '\nИТОГ: ✅ все проверки зелёные')
process.exit(failures ? 1 : 0)
