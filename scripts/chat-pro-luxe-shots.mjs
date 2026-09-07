// [CHAT-PRO-REWORK З4] Дизайн-гейт «Люкс-хаба» 1:1 по утверждённому эталону (выбор владельца qid 4c57e59643ed):
//  НА экране: люкс-шапка (пилюля ✦, поиск, меню), чистая лента, справа кольцо баланса + «В этом месяце».
//  НЕТ на экране: панелей «Сессии»/«Режимы»/«Инсайты» (они — в шторке по кнопке-меню, Esc закрывает).
//  Плюс З3: черновик переживает reload, поиск с empty-state, house-ads ≤34px (спека Р3), без h-scroll,
//  светлая тема = белые карточки (эталон). Роли: business (клиент) полный прогон, admin/creator — сверка.
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

const ACCOUNTS = {
  client: { email: 'client.test@aiviral-studio.ru', password: 'TestClient123!' },     // business
  admin: { email: 'admin.test@aiviral-studio.ru', password: 'TestAdmin123!' },
  creator: { email: 'creator.test@aiviral-studio.ru', password: 'TestCreator123!' },
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

async function withPage(browser, { token, theme = 'dark', lang = 'ru', vw = 1280, vh = 900 }, fn) {
  // тема из префов юзера в БД сильнее localStorage (DashboardShell sync) — ставим через API, мерджим с текущими
  if (token) {
    const me = await fetch(`${LOCAL_API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null)
    const prefs = { ...(me?.data?.preferences || me?.preferences || {}), theme }
    await fetch(`${LOCAL_API}/api/users/me`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ preferences: prefs }),
    }).catch(() => {})
  }
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
  for (let i = 0; i < 10; i++) {
    const nextBtn = page.locator('.driver-popover-next-btn')
    if (!(await nextBtn.isVisible().catch(() => false))) break
    await nextBtn.click(); await page.waitForTimeout(400)
  }
}

const noHScroll = async (page) => !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1))

// эталон: панелей НЕТ на экране
async function checkNoPanels(page, tag) {
  check(`${tag}: панель «Сессии» НЕ на экране`, !(await page.locator('h3:text-is("Сессии")').first().isVisible().catch(() => false)))
  check(`${tag}: панель «Режимы» НЕ на экране`, !(await page.locator('h3:text-is("Режимы")').first().isVisible().catch(() => false)))
  check(`${tag}: панель «Инсайты» НЕ на экране`, !(await page.locator('h3:text-is("Инсайты")').first().isVisible().catch(() => false)))
}

const browser = await chromium.launch()
try {
  const tokens = {}
  for (const acc of Object.keys(ACCOUNTS)) {
    tokens[acc] = await loginToken(acc)
    check(`логин ${acc} (qa)`, !!tokens[acc])
  }

  // ── Клиент: полный прогон (dark) ──
  await withPage(browser, { token: tokens.client }, async (page) => {
    await gotoChat(page)
    check('люкс-шапка: OMEGA Studio', await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
    check('люкс-шапка: «люкс-режим»', await page.locator('text=люкс-режим').first().isVisible().catch(() => false))
    await checkNoPanels(page, '1280 dark')

    // кольцо баланса + «В этом месяце» — видны с 821px (эталон: одна правая колонка)
    check('1280: кольцо баланса видно', await page.locator('text=Баланс генераций').first().isVisible().catch(() => false))
    check('1280: «В этом месяце» видно', await page.locator('text=В этом месяце').first().isVisible().catch(() => false))
    check('1280: «Постов» в статистике', await page.locator('text=Постов').first().isVisible().catch(() => false))

    // пилюля → модалка → Esc (WCAG)
    const pill = page.locator('[data-tour="token-counter"]').first()
    check('пилюля квоты видна', await pill.isVisible().catch(() => false))
    await pill.click().catch(() => {})
    await page.waitForTimeout(600)
    check('пилюля → модалка «Баланс генераций»', await page.locator('[role="dialog"]').first().isVisible().catch(() => false))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    check('Esc закрывает модалку', !(await page.locator('[role="dialog"]').first().isVisible().catch(() => false)))

    // шторка: меню → Сессии/Режимы/Инсайты доступны → Esc закрывает (инвентарь З2)
    await page.locator('button[aria-label="Меню чата"]').first().click()
    await page.waitForTimeout(600)
    check('шторка: открылась (dialog)', await page.locator('[role="dialog"]').first().isVisible().catch(() => false))
    check('шторка: «Сессии» внутри', await page.locator('[role="dialog"] h3:text-is("Сессии")').isVisible().catch(() => false))
    check('шторка: «Режимы» внутри', await page.locator('[role="dialog"] h3:text-is("Режимы")').isVisible().catch(() => false))
    check('шторка: «Инсайты» внутри', await page.locator('[role="dialog"] h3:text-is("Инсайты")').isVisible().catch(() => false))
    await shot(page, 'luxehub-drawer-1280-dark')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    check('шторка: Esc закрывает', !(await page.locator('[role="dialog"]').first().isVisible().catch(() => false)))

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
    const h = await page.evaluate(() => {
      const el = [...document.querySelectorAll('div,aside')].find(e => e.textContent.includes('Реклама') && e.getBoundingClientRect().height < 60 && e.getBoundingClientRect().height > 10)
      return el ? el.getBoundingClientRect().height : 0
    })
    if (h > 0) check('house-ads баннер ≤34px', h <= 34.5, `h=${h}px`)
    else console.log('ℹ️ house-ads баннер скрыт («Скрыть на день»/ротация) — высоту не меряем')

    check('1280 dark: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-1280-dark')
  })

  // ── Клиент: светлая тема (эталон шага 0) ──
  await withPage(browser, { token: tokens.client, theme: 'light' }, async (page) => {
    await gotoChat(page)
    const pageBg = await page.evaluate(() => getComputedStyle(document.querySelector('.chat-pro-page') || document.body).backgroundColor)
    check('light: фон страницы светлый', pageBg === 'rgb(245, 245, 247)', pageBg)
    const feedBg = await page.evaluate(() => {
      const el = document.querySelector('.chat-pro-embed')
      return el ? getComputedStyle(el).backgroundColor : ''
    })
    check('light: лента — белая карточка', feedBg === 'rgb(255, 255, 255)', feedBg)
    await checkNoPanels(page, '1280 light')
    check('1280 light: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-1280-light')
  })

  // ── EN (i18n) ──
  await withPage(browser, { token: tokens.client, lang: 'en' }, async (page) => {
    await gotoChat(page)
    check('EN: «luxe mode» в шапке', await page.locator('text=luxe mode').first().isVisible().catch(() => false))
    await shot(page, 'luxehub-1280-dark-en')
  })

  // ── 360 (iPhone-first по гейту) и 768 ──
  await withPage(browser, { token: tokens.client, vw: 360, vh: 800 }, async (page) => {
    await gotoChat(page)
    check('360: люкс-шапка видна', await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
    check('360: пилюля квоты видна', await page.locator('[data-tour="token-counter"]').first().isVisible().catch(() => false))
    // одна колонка <821px: кольцо скрыто с экрана (эталон), баланс доступен через пилюлю.
    // Не через aside: левый шелл-навигатор на мобиле — тоже <aside> (translate-x-full, isVisible его не ловит).
    check('360: правая колонка скрыта (1 колонка)', !(await page.locator('text=Баланс генераций').first().isVisible().catch(() => false)))
    const searchBtn = page.locator('button[aria-label*="Поиск"]').first()
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click()
      await page.waitForTimeout(400)
      check('360: поиск раскрывается кнопкой', await page.locator('input[type="search"]:visible').first().isVisible().catch(() => false))
      await searchBtn.click().catch(() => {})
      await page.waitForTimeout(300)
    }
    await checkNoPanels(page, '360 dark')
    check('360: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-360-dark')
  })

  await withPage(browser, { token: tokens.client, vw: 360, vh: 800, theme: 'light' }, async (page) => {
    await gotoChat(page)
    check('360 light: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-360-light')
  })

  await withPage(browser, { token: tokens.client, vw: 768, vh: 900 }, async (page) => {
    await gotoChat(page)
    await checkNoPanels(page, '768 dark')
    check('768: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-768-dark')
  })

  await withPage(browser, { token: tokens.client, vw: 768, vh: 900, theme: 'light' }, async (page) => {
    await gotoChat(page)
    check('768 light: без горизонтального скролла', await noHScroll(page))
    await shot(page, 'luxehub-768-light')
  })

  // ── 3 роли: сверка компоновки 1280 dark/light ──
  for (const acc of ['admin', 'creator']) {
    for (const theme of ['dark', 'light']) {
      await withPage(browser, { token: tokens[acc], theme }, async (page) => {
        await gotoChat(page)
        check(`${acc} ${theme}: люкс-шапка`, await page.locator('text=OMEGA Studio').first().isVisible().catch(() => false))
        await checkNoPanels(page, `${acc} ${theme}`)
        // у admin/creator есть режимы → переключатель в шапке (md+)
        check(`${acc} ${theme}: переключатель режимов в шапке`, await page.locator('[role="tablist"]').first().isVisible().catch(() => false))
        check(`${acc} ${theme}: без горизонтального скролла`, await noHScroll(page))
        await shot(page, `luxehub-1280-${theme}-${acc}`)
      })
    }
  }
} finally {
  await browser.close()
}
console.log(failures ? `\nИТОГ: ❌ ${failures} провалов` : '\nИТОГ: ✅ все проверки зелёные')
process.exit(failures ? 1 : 0)
