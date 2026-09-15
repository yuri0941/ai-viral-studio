// [YT-DATA-FIX] Пруф-гейт баг-фикса 15.09: YouTube-ссылка в чате → карточка с РЕАЛЬНЫМИ цифрами
// (watch + shorts с si-параметром), несуществующее видео → честный отказ с причиной (без шаблона
// «нет данных», ✦ не списывается — покрыто qaOmegaVideo2 §8), кабинет: «Проверить» youtube-ключа
// с битым ключом → человеческая причина (маппинг Google-ошибок).
// Запуск: backend :18080 + preview :4173 (127.0.0.1) + node scripts/yt-data-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/yt-data-fix')
fs.mkdirSync(OUT, { recursive: true })

const OWNER = { email: 'owner.test@aiviral-studio.ru', password: 'TestOwner123!' }

let failures = 0
function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`)
}

async function proxyApi(context) {
  await context.route(`${API_ORIGIN}/**`, async (route) => {
    const req = route.request()
    const url = req.url().replace(API_ORIGIN, LOCAL_API)
    try {
      const headers = { ...req.headers() }
      delete headers.host; delete headers.origin; delete headers.referer
      const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined, timeout: 120000 })
      const body = await resp.body()
      if (url.includes('/omega/chat')) console.log(`[proxy] chat → ${resp.status()}: ${body.toString().slice(0, 200)}`)
      if (url.includes('/api-keys/test')) console.log(`[proxy] api-keys/test → ${resp.status()}: ${body.toString().slice(0, 200)}`)
      await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body })
    } catch (e) {
      await route.fulfill({ status: 502, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: String(e) }) })
    }
  })
}

async function loginToken(acc) {
  const resp = await fetch(`${LOCAL_API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(acc),
  })
  const data = await resp.json()
  return data?.data?.token || data?.token || null
}

const consoleErrors = []
async function withPage(browser, { token, theme = 'dark', vw = 1280, vh = 900 }, fn) {
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, locale: 'ru-RU' })
  context.setDefaultTimeout(30000)
  await proxyApi(context)
  const page = await context.newPage()
  page.on('pageerror', (err) => consoleErrors.push(`[${vw} ${theme}] pageerror: ${String(err).slice(0, 200)}`))
  await page.addInitScript(([tk, th]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th)
    localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('lang', 'ru')
    localStorage.setItem('i18n-lang', 'ru')
    localStorage.setItem('app_language', 'ru')
    localStorage.setItem('cookie_consent', 'accepted')
  }, [token, theme])
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

async function sendMessage(page, text) {
  const input = page.locator('[data-tour="omega-input"]')
  await input.waitFor({ state: 'visible', timeout: 30000 })
  await input.fill(text)
  await input.press('Enter')
}

// ждём карточку анализа конкретного видео и возвращаем её локатор
async function waitCard(page, videoId, timeoutMs = 120000) {
  const card = page.locator(`img[src*="/vi/${videoId}/"]`).first()
  await card.waitFor({ state: 'visible', timeout: timeoutMs })
  return page.locator('div.rounded-2xl.overflow-hidden', { has: page.locator(`img[src*="/vi/${videoId}/"]`) }).first()
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`📸 ${name}.png`)
}

const browser = await chromium.launch()

// ── 1. watch-ссылка → карточка с РЕАЛЬНЫМИ цифрами (dark 1280) ──
const ownerToken = await loginToken(OWNER)
check('вход owner', !!ownerToken)

await withPage(browser, { token: ownerToken, theme: 'dark' }, async (page) => {
  await gotoChat(page)
  await sendMessage(page, 'разбор https://www.youtube.com/watch?v=887uCBMcnIM')
  const cardOk = await waitCard(page, '887uCBMcnIM').then(() => true).catch(() => false)
  check('watch: карточка анализа появилась', cardOk)
  if (!cardOk) { await shot(page, 'watch-card-FAIL'); return }
  const card = page.locator('div.rounded-2xl.overflow-hidden', { has: page.locator('img[src*="/vi/887uCBMcnIM/"]') }).first()
  const badge = await card.locator('text=Реальные данные').isVisible().catch(() => false)
  check('watch: бейдж «✅ Реальные данные»', badge)
  const viewsText = await card.locator('text=Просмотры').first().isVisible().catch(() => false)
  await page.waitForTimeout(2500) // useCountUp: число досчитывается до факта
  const cardText = await card.innerText().catch(() => '')
  const viewsM = /просмотры\s*\n\s*([\d\s\u00a0\u202f]+)/i.exec(cardText)
  const viewsNum = viewsM ? Number(viewsM[1].replace(/[\s\u00a0\u202f]/g, '')) : 0
  check('watch: реальные цифры (просмотры из API, факт > 1 млн)', viewsText && viewsNum > 1000000, `views=${viewsNum || cardText.slice(0, 60)}`)
  await card.evaluate(el => el.scrollIntoView({ block: 'start' })).catch(() => {})
  await page.waitForTimeout(800)
  await shot(page, 'watch-real-stats-dark-1280')
})

// ── 2. shorts-ссылка с si-параметром → карточка с реальными цифрами (390, mobile) ──
await withPage(browser, { token: ownerToken, theme: 'dark', vw: 390, vh: 844 }, async (page) => {
  await gotoChat(page)
  await sendMessage(page, 'https://youtube.com/shorts/lWZpOOIAz8o?si=x7k2m')
  const cardOk = await waitCard(page, 'lWZpOOIAz8o').then(() => true).catch(() => false)
  check('shorts+si: карточка анализа появилась', cardOk)
  if (!cardOk) { await shot(page, 'shorts-card-FAIL'); return }
  const card = page.locator('div.rounded-2xl.overflow-hidden', { has: page.locator('img[src*="/vi/lWZpOOIAz8o/"]') }).first()
  const badge = await card.locator('text=Реальные данные').isVisible().catch(() => false)
  await page.waitForTimeout(2500) // useCountUp
  const cardText = await card.innerText().catch(() => '')
  const viewsM = /просмотры\s*\n\s*([\d\s\u00a0\u202f]+)/i.exec(cardText)
  const viewsNum = viewsM ? Number(viewsM[1].replace(/[\s\u00a0\u202f]/g, '')) : 0
  check('shorts+si: реальные цифры (просмотры из API, факт > 1 млн)', badge && viewsNum > 1000000, `views=${viewsNum || cardText.slice(0, 60)}`)
  await card.evaluate(el => el.scrollIntoView({ block: 'start' })).catch(() => {})
  await page.waitForTimeout(800)
  await shot(page, 'shorts-real-stats-dark-390')
})

// ── 3. честный отказ: несуществующее видео → причина в карточке + текст без выдумок ──
await withPage(browser, { token: ownerToken, theme: 'dark' }, async (page) => {
  await gotoChat(page)
  await sendMessage(page, 'разбор https://youtu.be/AAAAAAAAAAZ')
  const honest = page.locator('text=Не удалось получить данные YouTube').first()
  const okHonest = await honest.waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false)
  check('честный отказ: «Не удалось получить данные YouTube: <причина>»', okHonest)
  const reason = await page.locator('text=Видео не найдено или удалено').first().isVisible().catch(() => false)
  check('честный отказ: причина в карточке (amber-блок)', reason)
  await honest.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {})
  await page.waitForTimeout(600)
  await shot(page, 'honest-refusal-dark-1280')
})

// ── 4. кабинет: «Проверить» youtube-ключа с битым ключом → человеческая причина ──
await withPage(browser, { token: ownerToken, theme: 'dark' }, async (page) => {
  await page.goto(`${BASE}/owner?tab=apiKeys`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(3500)
  // карточка провайдера «YouTube Data API» → «Подключить»/«Обновить» → модалка с «Проверить»
  const card = page.locator('div.glass-luxury', { has: page.locator('h3', { hasText: 'YouTube Data API' }) }).first()
  await card.scrollIntoViewIfNeeded().catch(() => {})
  const openBtn = card.locator('button', { hasText: /Подключить|Обновить/ }).first()
  const cardOk = await openBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)
  check('кабинет: карточка YouTube Data API найдена', cardOk)
  if (!cardOk) { await shot(page, 'apikeys-modal-FAIL'); return }
  await openBtn.click()
  const modal = page.locator('div.fixed.inset-0')
  const modalOk = await modal.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)
  check('кабинет: модалка ключа YouTube открылась', modalOk)
  if (!modalOk) { await shot(page, 'apikeys-modal-FAIL'); return }
  await modal.locator('input').first().fill('AIzaSyINVALID-DEMO-KEY-12345')
  await modal.locator('button', { hasText: 'Проверить' }).first().click()
  // toast с человеческой причиной от Google-маппинга (недействителен / проверьте в Google Cloud)
  const toastBad = page.locator('text=/недействителен|не удалась|Ошибка проверки/i').first()
  const resOk = await toastBad.waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false)
  check('кабинет: «Проверить» битого ключа → человеческая причина', resOk)
  await page.waitForTimeout(500)
  await shot(page, 'apikeys-youtube-check-dark-1280')
})

await browser.close()

const realErrors = consoleErrors.filter(e => !/favicon|net::|Failed to load resource/i.test(e))
check('нет pageerror на экранах', realErrors.length === 0, realErrors[0] || '')
if (realErrors.length) console.log(realErrors.slice(0, 5).join('\n'))

console.log(failures === 0 ? '\n✅ yt-data-shots: все проверки зелёные' : `\n❌ yt-data-shots: ${failures} провал(ов)`)
process.exit(failures === 0 ? 0 : 1)
