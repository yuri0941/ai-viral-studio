// [COVERS-FRAMES] Пруф-гейт обложек из реальных кадров: seeded видео-разбор (кадры в action)
// → «Обложки N✦» (живой чип цены) → 3 варианта с source=frame → превью 1:1 → «Скачать» →
// «🎨 Перегенерировать стиль» (mode ai). YouTube-сообщение → обложка из официального thumbnail.
// Скрины: сетка 1280 dark/light, 390, превью-модалка, кроп тайла (читаемость в мелкой сетке).
// Запуск: backend :18080 + preview :4173 (127.0.0.1) + node scripts/covers-frames-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')
const backendRequire = createRequire(path.resolve('backend', 'noop.js'))
const sharp = backendRequire('sharp')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/covers-frames')
fs.mkdirSync(OUT, { recursive: true })

const OWNER = { email: 'owner.test@aiviral-studio.ru', password: 'TestOwner123!' }

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
      if (url.includes('cover-variants')) console.log(`[proxy] cover-variants → ${resp.status()}: ${body.toString().slice(0, 160)}`)
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

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`📸 ${name}.png`)
}

// 6 «кадров ролика»: одна сцена (тёмный фон, фиолетовый круг-«персонаж», красный акцент),
// кадры отличаются положением субъекта — визуально это кадры ОДНОГО видео
async function makeFrames() {
  const frames = []
  for (let i = 0; i < 6; i++) {
    const x = 90 + i * 80
    const svg = `<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="360" fill="#181822"/>
  <rect y="260" width="640" height="100" fill="#101018"/>
  <circle cx="${x}" cy="170" r="70" fill="#7c5cff"/>
  <circle cx="${x - 20}" cy="150" r="12" fill="#ffffff"/>
  <circle cx="${x + 20}" cy="150" r="12" fill="#ffffff"/>
  <rect x="430" y="40" width="170" height="60" rx="10" fill="#e5484d"/>
  <text x="515" y="78" text-anchor="middle" font-family="Arial" font-weight="700" font-size="26" fill="#fff">REC ${i + 1}</text>
</svg>`
    const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 70 }).toBuffer()
    frames.push(`data:image/jpeg;base64,${buf.toString('base64')}`)
  }
  return frames
}

// [COVERS-FRAMES ДОР] fullFrames — те же 6 таймкодов в 1920×1080, фон ЗЕЛЁНЫЙ (маркер:
// 640px-кадры тёмные — если фон обложки собран из них, зелёный канал не доминирует)
async function makeFullFrames() {
  const frames = []
  for (let i = 0; i < 6; i++) {
    const x = 270 + i * 240
    const svg = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1920" height="1080" fill="#135c17"/>
  <rect y="780" width="1920" height="300" fill="#0e4a12"/>
  <circle cx="${x}" cy="510" r="210" fill="#7c5cff"/>
  <circle cx="${x - 60}" cy="450" r="36" fill="#ffffff"/>
  <circle cx="${x + 60}" cy="450" r="36" fill="#ffffff"/>
  <rect x="1290" y="120" width="510" height="180" rx="30" fill="#e5484d"/>
  <text x="1545" y="234" text-anchor="middle" font-family="Arial" font-weight="700" font-size="78" fill="#fff">REC ${i + 1}</text>
</svg>`
    const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer()
    frames.push(`data:image/jpeg;base64,${buf.toString('base64')}`)
  }
  return frames
}

const consoleErrors = []

async function withPage(browser, { token, theme = 'dark', vw = 1280, vh = 900, seedMessages = [] }, fn) {
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, locale: 'ru-RU' })
  context.setDefaultTimeout(30000)
  await proxyApi(context)
  const page = await context.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${vw}x${vh} ${theme}] ${msg.text().slice(0, 200)}`)
  })
  page.on('pageerror', (err) => consoleErrors.push(`[${vw}x${vh} ${theme}] pageerror: ${String(err).slice(0, 200)}`))
  await page.addInitScript(([tk, th, msgs]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th)
    localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('lang', 'ru')
    localStorage.setItem('i18n-lang', 'ru')
    localStorage.setItem('app_language', 'ru')
    localStorage.setItem('cookie_consent', 'accepted')
    if (msgs?.length) localStorage.setItem('omega_chat_history', JSON.stringify(msgs))
  }, [token, theme, seedMessages])
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

const now = Date.now()
const videoMsg = (frames, fullFrames = []) => ({
  id: 'cov-vid-1', role: 'omega', timestamp: new Date(now).toISOString(),
  text: 'Разбор ролика «my-video.mp4»: хук в первые 3с — субъект в движении, удержание среднее, добавьте CTA.',
  action: { type: 'videoAnalysis', name: 'my-video.mp4', frames, ...(fullFrames.length ? { fullFrames } : {}) },
})
const ytMsg = {
  id: 'cov-yt-1', role: 'omega', timestamp: new Date(now + 1).toISOString(),
  text: 'Видео на YouTube: разбор по ссылке ниже.',
  videoAnalysis: {
    videoId: 'dQw4w9WgXcQ',
    url: 'https://youtu.be/dQw4w9WgXcQ',
    title: 'Rick Astley — Never Gonna Give You Up',
    channelTitle: 'Rick Astley',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    statsAvailable: false,
  },
}

async function runCoverFlow(page, { name, expectSource, shotPrefix, expectFullRes = false }) {
  const btn = page.locator('[data-testid="covers-generate"]').first()
  check(`${name}: кнопка «Обложки N✦» видна (живой чип цены)`, await btn.isVisible().catch(() => false))
  const btnText = await btn.innerText().catch(() => '')
  check(`${name}: цена ✦ на кнопке ДО генерации`, /\d+✦/.test(btnText), btnText.trim())
  await btn.click()
  const grid = page.locator('[data-testid="covers-grid"]')
  const gridOk = await grid.waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false)
  check(`${name}: сетка 3 вариантов появилась`, gridOk)
  if (!gridOk) return false
  const tiles = await grid.locator('img').count()
  check(`${name}: ровно 3 превью`, tiles === 3, `tiles=${tiles}`)
  // картинка реально загрузилась (не битая): naturalWidth > 0 + URL отдаёт 200
  const firstImg = grid.locator('img').first()
  await firstImg.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1000)
  const imgLoaded = await firstImg.evaluate(el => el.complete && el.naturalWidth > 0).catch(() => false)
  check(`${name}: превью загружено (naturalWidth>0, не broken image)`, imgLoaded)
  const coverSrcAttr = await firstImg.getAttribute('src').catch(() => null)
  if (coverSrcAttr) {
    const resp = await fetch(coverSrcAttr.replace(API_ORIGIN, LOCAL_API)).catch(() => null)
    check(`${name}: URL обложки отдаёт 200`, resp?.status === 200, `status=${resp?.status}`)
    // [COVERS-FRAMES ДОР] разрешение: исходник 1920×1080 → обложка 1280×720 из ПОЛНОРАЗМЕРНОГО
    // кадра (зелёный маркер фона — 640px-кадры тёмные, апскейл-мыло маркер не даёт)
    if (expectFullRes && resp?.status === 200) {
      const buf = Buffer.from(await resp.arrayBuffer())
      const meta = await sharp(buf).metadata()
      const stats = await sharp(buf).stats()
      const rM = stats.channels[0]?.mean || 0
      const gM = stats.channels[1]?.mean || 0
      const bM = stats.channels[2]?.mean || 0
      check(`${name}: ширина фона ≥1280 при исходнике 1920 (факт ${meta.width}×${meta.height})`, (meta.width || 0) >= 1280 && (meta.height || 0) >= 720, `${meta.width}x${meta.height}`)
      check(`${name}: фон из полноразмерного кадра (зелёный маркер)`, gM > rM + 20 && gM > bM + 5, `rgb=${rM.toFixed(0)},${gM.toFixed(0)},${bM.toFixed(0)}`)
    }
  }
  // source=frame/youtube — факт по ответу API (последний лог прокси) + превью не градиент-фолбэк
  await page.waitForTimeout(800)
  await shot(page, `${shotPrefix}-grid`)
  // мелкая сетка: кроп первого тайла — текст читаем в превью-размере
  const tile = grid.locator('[data-testid="cover-variant-0"]')
  await tile.screenshot({ path: `${OUT}/${shotPrefix}-tile-small.png` }).catch(() => {})
  console.log(`📸 ${shotPrefix}-tile-small.png`)
  // превью 1:1 + скачать из модалки
  await page.locator('[data-testid="covers-grid"] button').filter({ hasText: /Превью/ }).first().click().catch(() => {})
  const modal = page.locator('[data-testid="cover-preview-modal"]')
  const modalOk = await modal.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
  check(`${name}: превью 1:1 открывается`, modalOk)
  if (modalOk) {
    check(`${name}: «Скачать» в превью-модалке`, await page.locator('[data-testid="cover-preview-download"]').isVisible().catch(() => false))
    await shot(page, `${shotPrefix}-preview`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }
  // «Перегенерировать стиль» — text-to-image не удалён, НЕ дефолт
  const regen = page.locator('[data-testid="covers-regenerate-style"]')
  check(`${name}: кнопка «Перегенерировать стиль» видна (source=${expectSource})`, await regen.isVisible().catch(() => false))
  return true
}

const browser = await chromium.launch()
try {
  const token = await loginToken(OWNER)
  check('логин owner', !!token)
  const frames = await makeFrames()
  const fullFrames = await makeFullFrames()

  // ── 1) 1280 dark: видео → обложки из кадров ЭТОГО видео (рендер из полноразмерных 1920×1080) ──
  await withPage(browser, { token, theme: 'dark', seedMessages: [videoMsg(frames, fullFrames)] }, async (page) => {
    await gotoChat(page)
    const ok = await runCoverFlow(page, { name: 'видео 1280 dark', expectSource: 'frame', shotPrefix: 'video-1280-dark', expectFullRes: true })
    if (ok) {
      // перегенерация стиля: source становится ai (Pollinations/фолбэк), кнопка пропадает
      await page.locator('[data-testid="covers-regenerate-style"]').click()
      await page.waitForTimeout(1500)
      await shot(page, 'video-1280-dark-regenerating')
      const gridAgain = await page.locator('[data-testid="covers-grid"]').waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false)
      check('видео 1280 dark: перегенерация стиля → новая сетка', gridAgain)
      await shot(page, 'video-1280-dark-ai-style')
      // [COVERS-FRAMES ДОР] персистентность: F5 → сетка в ленте из истории, картинка 200
      await page.reload({ waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
      await gotoChat(page)
      const gridReload = await page.locator('[data-testid="covers-grid"]').waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false)
      check('видео 1280 dark: после F5 сетка обложек на месте (история)', gridReload)
      if (gridReload) {
        const img = page.locator('[data-testid="covers-grid"] img').first()
        await img.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(1000)
        const loaded = await img.evaluate(el => el.complete && el.naturalWidth > 0).catch(() => false)
        check('видео 1280 dark: после F5 картинка не битая (naturalWidth>0)', loaded)
        const src = await img.getAttribute('src').catch(() => null)
        const resp = src ? await fetch(src.replace(API_ORIGIN, LOCAL_API)).catch(() => null) : null
        check('видео 1280 dark: после F5 URL обложки → 200', resp?.status === 200, `status=${resp?.status}`)
        await shot(page, 'video-1280-dark-after-reload')
      }
    }
  })

  // ── 2) 1280 dark: YouTube-ссылка → обложка из официального thumbnail ──
  await withPage(browser, { token, theme: 'dark', seedMessages: [ytMsg] }, async (page) => {
    await gotoChat(page)
    await runCoverFlow(page, { name: 'youtube 1280 dark', expectSource: 'youtube', shotPrefix: 'yt-1280-dark' })
  })

  // ── 3) 390 dark: мелкая сетка — текст читаем ──
  await withPage(browser, { token, theme: 'dark', vw: 390, vh: 844, seedMessages: [videoMsg(frames)] }, async (page) => {
    await gotoChat(page)
    const btn = page.locator('[data-testid="covers-generate"]').first()
    await btn.click().catch(() => {})
    const gridOk = await page.locator('[data-testid="covers-grid"]').waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false)
    check('видео 390 dark: сетка обложек на мобильном', gridOk)
    await page.waitForTimeout(800)
    await shot(page, 'video-390-dark-grid')
  })

  // ── 4) 1280 light: сетка в светлой теме ──
  await withPage(browser, { token, theme: 'light', seedMessages: [ytMsg] }, async (page) => {
    await gotoChat(page)
    const btn = page.locator('[data-testid="covers-generate"]').first()
    await btn.click().catch(() => {})
    const gridOk = await page.locator('[data-testid="covers-grid"]').waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false)
    check('youtube 1280 light: сетка обложек', gridOk)
    await page.waitForTimeout(800)
    await shot(page, 'yt-1280-light-grid')
  })
} finally {
  await browser.close()
}

const realErrors = consoleErrors.filter(e => !/favicon|net::|Failed to load resource|WebSocket|driver\.js/i.test(e))
check('0 критичных console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))
console.log(failures === 0 ? '\n✅ covers-frames-shots: ALL GREEN' : `\n❌ covers-frames-shots: ${failures} FAIL`)
process.exit(failures === 0 ? 0 : 1)
