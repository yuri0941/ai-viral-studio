// [OMEGA-VIDEO ДОП-З1] Гейт drag&drop видео в чат: drop 360/390/1280 × обе темы → чип с именем/весом/✕,
// цена 1✦ ДО анализа, прогресс %, отмена (✕), файл >лимита → «Лимит N МБ, файл M МБ», после загрузки —
// разбор Омегой (📹 в ленте; при недоступных AI-провайдерах — честная ошибка, НЕ мок-шаблон), 0 console errors.
// Запуск: backend :18080 + preview :4173 (127.0.0.1) + node scripts/omega-video-upload-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/omega-video-upload')
fs.mkdirSync(OUT, { recursive: true })

const ACCOUNTS = {
  client: { email: 'client.test@aiviral-studio.ru', password: 'TestClient123!' },
  owner: { email: 'owner.test@aiviral-studio.ru', password: 'TestOwner123!' },
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
    const t0 = Date.now()
    try {
      const headers = { ...req.headers() }
      delete headers.host; delete headers.origin; delete headers.referer
      const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
      const body = await resp.body()
      if (url.includes('analyze-video')) console.log(`[proxy] analyze-video → ${resp.status()} за ${Date.now() - t0}мс: ${body.toString().slice(0, 140)}`)
      await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body })
    } catch (e) {
      if (url.includes('analyze-video')) console.log(`[proxy] analyze-video FAIL за ${Date.now() - t0}мс: ${String(e).slice(0, 140)}`)
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

const consoleErrors = []

async function withPage(browser, { token, theme = 'dark', lang = 'ru', vw = 1280, vh = 900 }, fn) {
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
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${vw}x${vh} ${theme}] ${msg.text().slice(0, 200)}`)
  })
  page.on('pageerror', (err) => consoleErrors.push(`[${vw}x${vh} ${theme}] pageerror: ${String(err).slice(0, 200)}`))
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

function makeDataTransfer(page, sizeBytes, name, type) {
  return page.evaluateHandle(({ size, name, type }) => {
    const dt = new DataTransfer()
    dt.items.add(new File([new Uint8Array(size)], name, { type }))
    return dt
  }, { size: sizeBytes, name, type })
}

const DROP_TARGET = '.chat-pro-embed'

// drop видео на экран чата; ожидаем чип. Возвращает true если чип появился.
async function dropVideo(page, { sizeMb = 1.5, name = 'clip.mp4', type = 'video/mp4', wantOverlayShot = null }) {
  const dt = await makeDataTransfer(page, Math.round(sizeMb * 1024 * 1024), name, type)
  await page.dispatchEvent(DROP_TARGET, 'dragenter', { dataTransfer: dt })
  await page.waitForTimeout(300)
  const overlayVisible = await page.locator('text=Отпустите файл').first().isVisible().catch(() => false)
  if (wantOverlayShot && overlayVisible) await shot(page, wantOverlayShot)
  await page.dispatchEvent(DROP_TARGET, 'drop', { dataTransfer: dt })
  // [OMEGA-VIDEO ДОП-2] chip появляется после XHR-open — на нагруженной локали (живой Pollinations)
  // 800мс не хватает: ждём до 6с
  return page.locator('[data-testid="video-upload-chip"]').waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)
}

const browser = await chromium.launch()
try {
  const tokens = {}
  for (const acc of Object.keys(ACCOUNTS)) {
    tokens[acc] = await loginToken(acc)
    check(`логин ${acc}`, !!tokens[acc])
  }

  // ── 1) iPhone 390 dark: полный цикл drop → чип → цена → загрузка → разбор/честная ошибка ──
  await withPage(browser, { token: tokens.client, theme: 'dark', vw: 390, vh: 844 }, async (page) => {
    await gotoChat(page)
    const chipShown = await dropVideo(page, { wantOverlayShot: 'drop-390-dark-overlay' })
    check('390 dark: drop видео → чип виден', chipShown)
    check('390 dark: цена 1✦ на чипе ДО анализа', await page.locator('[data-testid="video-upload-price"]:has-text("1✦")').isVisible().catch(() => false))
    await shot(page, 'drop-390-dark-chip')
    // загрузка 1.5МБ на loopback быстрая → сразу разбор: 📹 в ленте
    await page.waitForTimeout(3000)
    check('390 dark: после загрузки — 📹 сообщение в ленте', await page.locator('text=📹 clip.mp4').first().isVisible().catch(() => false))
    // ждём ответ Омеги: живой разбор ИЛИ честная ошибка (локально провайдеры то мёртвые, то живые
    // через Pollinations) — ключевое: НЕ мок-шаблон приветствия и лента выросла ответом Омеги
    // ждём ответ Омеги как НОВОЕ AI-сообщение в ленте (data-msg-id^="a-"/"err-"), а не по ключевым
    // словам — «хук»/«анализ» есть в статике чипов и давали ложнозелёное (факт из прогонов 3–5)
    const replySel = '[data-msg-id^="a-"], [data-msg-id^="err-"]'
    const beforeCount = await page.locator(replySel).count()
    let replyText = ''
    let replyArrived = false
    for (let i = 0; i < 30; i++) { // до 150с: vision кадров + синтез у провайдеров с таймаутами
      await page.waitForTimeout(5000)
      const count = await page.locator(replySel).count()
      if (count > beforeCount) {
        replyText = await page.locator(replySel).last().innerText().catch(() => '')
        if (replyText.trim().length > 20) { replyArrived = true; break }
      }
    }
    const feedText = await page.locator(DROP_TARGET).innerText().catch(() => '')
    const hasMockGreeting = feedText.includes('Чем помочь?') && !feedText.includes('📹')
    check('390 dark: ответ Омеги без мок-шаблона приветствия', !hasMockGreeting)
    check('390 dark: разбор ИЛИ честная ошибка в ленте', replyArrived, replyText.slice(0, 120).replace(/\n/g, ' | ') || 'ответ не пришёл за 150с')
    await shot(page, 'drop-390-dark-result')
  })

  // ── 2) 390 light: drop → чип ──
  await withPage(browser, { token: tokens.client, theme: 'light', vw: 390, vh: 844 }, async (page) => {
    await gotoChat(page)
    check('390 light: drop видео → чип виден', await dropVideo(page, { name: 'light.mp4' }))
    await shot(page, 'drop-390-light-chip')
  })

  // ── 3) 1280 dark: drop → чип + прогресс ──
  await withPage(browser, { token: tokens.client, theme: 'dark', vw: 1280, vh: 900 }, async (page) => {
    await gotoChat(page)
    const dt = await makeDataTransfer(page, 90 * 1024 * 1024, 'big.mp4', 'video/mp4')
    await page.dispatchEvent(DROP_TARGET, 'drop', { dataTransfer: dt })
    await page.waitForTimeout(400)
    check('1280 dark: чип виден', await page.locator('[data-testid="video-upload-chip"]').isVisible().catch(() => false))
    const progress = await page.locator('[data-testid="video-upload-progress"]').innerText().catch(() => '')
    check('1280 dark: прогресс % идёт', /\d+%/.test(progress), progress)
    await shot(page, 'drop-1280-dark-progress')
    // отмена: ✕ → чип исчезает, файл не «зависает» в ленте
    await page.locator('[data-testid="video-upload-chip"] button[aria-label]').last().click()
    await page.waitForTimeout(600)
    check('1280 dark: отмена → чип скрыт', !(await page.locator('[data-testid="video-upload-chip"]').isVisible().catch(() => false)))
    check('1280 dark: отмена → нет 📹 в ленте', !(await page.locator('text=📹 big.mp4').first().isVisible().catch(() => false)))
    await shot(page, 'drop-1280-dark-cancelled')
  })

  // ── 4) 1280 light: drop → чип ──
  await withPage(browser, { token: tokens.client, theme: 'light', vw: 1280, vh: 900 }, async (page) => {
    await gotoChat(page)
    check('1280 light: drop видео → чип виден', await dropVideo(page, { name: 'desk-light.mp4' }))
    await shot(page, 'drop-1280-light-chip')
    // подождём завершения, чтобы анализ не висел на следующий тест
    await page.waitForTimeout(3000)
  })

  // ── 5) лимит из кабинета: owner ставит 1 МБ → клиент получает понятный текст → owner возвращает 250 ──
  const setLimit = (mb) => fetch(`${LOCAL_API}/api/owner/media-limit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.owner}` },
    body: JSON.stringify({ maxMb: mb }),
  }).then(r => r.json())
  const setRes = await setLimit(1)
  check('owner API: лимит 1 МБ сохранён', setRes?.success && setRes?.mediaUploadLimitMb === 1, JSON.stringify(setRes))
  await withPage(browser, { token: tokens.client, theme: 'dark', vw: 390, vh: 844 }, async (page) => {
    await gotoChat(page)
    // [OMEGA-VIDEO ДОП-2] не через dropVideo (он ждёт чип 6с — тост живёт 5с и пропадает):
    // drop → сразу ждём тост
    const dt = await makeDataTransfer(page, Math.round(2.5 * 1024 * 1024), 'too-big.mp4', 'video/mp4')
    await page.dispatchEvent(DROP_TARGET, 'drop', { dataTransfer: dt })
    const toastVisible = await page.locator('text=Лимит 1 МБ').first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)
    check('390 dark: файл >лимита → «Лимит 1 МБ, файл 2.5 МБ»', toastVisible)
    check('390 dark: файл >лимита → чип НЕ завис', !(await page.locator('[data-testid="video-upload-chip"]').isVisible().catch(() => false)))
    await shot(page, 'drop-390-dark-oversize-toast')
  })
  const restoreRes = await setLimit(250)
  check('owner API: лимит 250 МБ восстановлен', restoreRes?.success && restoreRes?.mediaUploadLimitMb === 250, JSON.stringify(restoreRes))
  const limitsNow = await fetch(`${LOCAL_API}/api/upload/limits`, { headers: { Authorization: `Bearer ${tokens.client}` } }).then(r => r.json())
  check('клиент видит лимит 250 без деплоя (hot-reload)', limitsNow?.maxMb === 250, JSON.stringify(limitsNow))

  // ── 6) кабинет владельца: карточка лимита в Подписках ──
  await withPage(browser, { token: tokens.owner, theme: 'dark', vw: 1280, vh: 900 }, async (page) => {
    await page.goto(`${BASE}/owner?tab=subscriptions`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(5000)
    const card = page.locator('text=Лимит загрузки медиа').first()
    check('кабинет: карточка «Лимит загрузки медиа» видна', await card.isVisible().catch(() => false))
    // [OMEGA-VIDEO ДОП-2] карточка цен ✦ + TTL в Подписках
    const pricing = page.locator('[data-testid="video-pricing-card"]')
    check('кабинет: карточка «OMEGA-видео: цены и хранение» видна', await pricing.isVisible().catch(() => false))
    await pricing.scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(400)
    await shot(page, 'owner-media-limit-1280-dark')
    await shot(page, 'owner-video-pricing-1280-dark')
  })

  // ── 6б) [OMEGA-VIDEO ДОП-2 З2] живая цена на чипе: owner ставит 3✦ → клиент видит 3✦ без деплоя ──
  const setPrice = (n) => fetch(`${LOCAL_API}/api/owner/video-settings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.owner}` },
    body: JSON.stringify({ videoAnalysisCostCredits: n }),
  }).then(r => r.json())
  const priceRes = await setPrice(3)
  check('owner API: цена разбора 3✦ сохранена', priceRes?.success && priceRes?.videoAnalysisCostCredits === 3, JSON.stringify(priceRes))
  await withPage(browser, { token: tokens.client, theme: 'dark', vw: 390, vh: 844 }, async (page) => {
    await gotoChat(page)
    const chipShown = await dropVideo(page, { name: 'price3.mp4' })
    check('390 dark: чип виден для проверки цены', chipShown)
    check('390 dark: цена 3✦ на чипе ДО анализа (hot-reload из кабинета)', await page.locator('[data-testid="video-upload-price"]:has-text("3✦")').isVisible().catch(() => false))
    await shot(page, 'drop-390-dark-price-3credits')
    await page.locator('[data-testid="video-upload-chip"] button[aria-label]').last().click().catch(() => {})
    await page.waitForTimeout(500)
  })
  const priceBack = await setPrice(1)
  check('owner API: цена разбора 1✦ восстановлена', priceBack?.success && priceBack?.videoAnalysisCostCredits === 1, JSON.stringify(priceBack))

  // ── 7) console errors ──
  check('0 console errors на всех экранах', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' || '))
} finally {
  await browser.close()
}

console.log(failures === 0 ? '\nOMEGA-VIDEO-UPLOAD GATE: ALL GREEN' : `\nOMEGA-VIDEO-UPLOAD GATE: ${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
