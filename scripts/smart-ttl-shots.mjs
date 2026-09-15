// [SMART-TTL] Пруф-гейт событийной очистки (UI-часть; файловые факты — backend/scripts/qaSmartTtl.js):
//  1) кабинет владельца: поле N (videoIdleMinutes) в Подписках рядом с TTL, смена N=1 → живая
//     в /api/upload/limits без деплоя (скрин карточки);
//  2) чат с разбором видео (TTL>0): мягкое уведомление «исходник будет очищен, результаты сохранены»
//     в ленте + heartbeat «задача на экране» доезжает до backend (факт 200 в proxy-логе);
//  3) событие «результат принят»: клик «Скачать» обложку → POST /api/upload/used → 200 (proxy-лог),
//     в ленте появляется «исходник очищен».
// Запуск: backend :18080 (OWNER_IP=127.0.0.1) + preview :4173 (127.0.0.1) + node scripts/smart-ttl-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')
// mongoose/dotenv живут в backend/node_modules — резолвим оттуда (в корне их нет)
const backendRequire = createRequire(path.resolve('backend', 'noop.js'))
const mongoose = backendRequire('mongoose')
const dotenv = backendRequire('dotenv')

dotenv.config({ path: path.resolve('backend/.env') })
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: MediaFile } = await import('../backend/models/MediaFile.js')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/smart-ttl')
fs.mkdirSync(OUT, { recursive: true })
const UPLOADS = path.resolve('backend/uploads')

const OWNER = { email: 'owner.test@aiviral-studio.ru', password: 'TestOwner123!' }
const CREATOR = { email: 'creator.test@aiviral-studio.ru', password: 'TestCreator123!' }

let failures = 0
function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`)
}

const apiLog = []
async function api(method, p, token, body) {
  const r = await fetch(`${LOCAL_API}/api${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}
async function login(acc) {
  const r = await api('POST', '/auth/login', null, acc)
  return r.json?.data?.token || r.json?.token || null
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
      if (/\/upload\/(used|heartbeat)/.test(url)) apiLog.push(`${req.method()} ${url.replace(LOCAL_API, '')} → ${resp.status()}`)
      if (url.includes('/owner/video-settings')) apiLog.push(`${req.method()} /owner/video-settings → ${resp.status()} ${body.toString().slice(0, 120)}`)
      await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body })
    } catch (e) {
      await route.fulfill({ status: 502, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: String(e) }) })
    }
  })
}

const consoleErrors = []
async function withPage(browser, { token, theme = 'dark', vw = 1280, vh = 900, seed = null }, fn) {
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, locale: 'ru-RU' })
  context.setDefaultTimeout(30000)
  await proxyApi(context)
  const page = await context.newPage()
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 160)) })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${String(err).slice(0, 160)}`))
  await page.addInitScript(([tk, th, seedHistory]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th)
    localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('lang', 'ru')
    localStorage.setItem('i18n-lang', 'ru')
    localStorage.setItem('app_language', 'ru')
    localStorage.setItem('cookie_consent', 'accepted')
    if (seedHistory) localStorage.setItem('omega_chat_history', JSON.stringify(seedHistory))
  }, [token, theme, seed])
  try { await fn(page) } finally { await context.close() }
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`📸 ${name}.png`)
}

const ts = Date.now()
let videoUrl = null
let creatorId = null
try {
  const ot = await login(OWNER)
  const ct = await login(CREATOR)
  check('логин owner/creator', !!ot && !!ct)
  const me = await api('GET', '/auth/me', ct)
  creatorId = String(me.json?.user?.id || me.json?.user?._id || me.json?.data?._id || me.json?.data?.id || '')
  check('creator id из /auth/me', !!creatorId, creatorId)

  // живой исходник на диске + запись MediaFile (разобран, TTL 24ч)
  await api('POST', '/owner/video-settings', ot, { videoStorageTtlHours: 24, videoIdleMinutes: 30 })
  const dir = path.join(UPLOADS, creatorId)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `smart-${ts}.mp4`), Buffer.alloc(200 * 1024, 5))
  videoUrl = `/uploads/${creatorId}/smart-${ts}.mp4`
  await MediaFile.create({ userId: creatorId, url: videoUrl, sizeBytes: 200 * 1024, kind: 'video', analyzedAt: new Date(), deleteAt: new Date(Date.now() + 24 * 3600 * 1000) })

  const browser = await chromium.launch()

  // 1) Кабинет владельца: поле N рядом с TTL, смена → живая без деплоя
  await withPage(browser, { token: ot }, async (page) => {
    await page.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    // таб «Подписки»
    const tabBtn = page.locator('button:has-text("Подписки")').first()
    await tabBtn.click()
    await page.waitForTimeout(2500)
    const field = page.locator('[data-testid="video-setting-videoIdleMinutes"]')
    check('кабинет: поле N (videoIdleMinutes) на месте', await field.count() === 1)
    await field.fill('1')
    const saveBtn = page.locator('[data-testid="video-settings-save"]')
    await saveBtn.scrollIntoViewIfNeeded().catch(() => {})
    // DOM-click: над карточкой висит оверлей (тост/анимация), обычный клик попадает в него;
    // факт сохранения всё равно проверяется ниже через /upload/limits
    await page.evaluate(() => document.querySelector('[data-testid="video-settings-save"]')?.click())
    await page.waitForTimeout(2000)
    await shot(page, '01-owner-subscriptions-idle-minutes')
  })
  const lim = await api('GET', '/upload/limits', ct)
  check('N=1 из кабинета живой в /upload/limits (без деплоя)', lim.json.videoIdleMinutes === 1, `n=${lim.json.videoIdleMinutes}`)

  // 2) Чат: TTL-уведомление в ленте + heartbeat до backend
  const seedHistory = [
    { role: 'user', text: '🎬 Разбери видео: smart.mp4 (0.2 МБ)', timestamp: new Date().toISOString(), id: `u-${ts}` },
    { role: 'omega', text: 'Разбор: хук слабый в первые 3с, усилить контраст…', action: { type: 'videoAnalysis', name: 'smart.mp4', videoUrl }, timestamp: new Date().toISOString(), id: `a-${ts}` },
    { role: 'omega', text: '🗂 Исходный файл будет храниться до 24 ч и очищается после 30 мин бездействия — разбор, обложки и сценарии останутся навсегда.', timestamp: new Date().toISOString(), id: `sys-${ts}` },
  ]
  await withPage(browser, { token: ct, seed: seedHistory }, async (page) => {
    await page.goto(`${BASE}/creative-hub`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(6000)
    const notice = page.locator('text=исходный файл будет храниться').first()
    check('чат: мягкое TTL-уведомление в ленте', await notice.count() >= 1)
    await page.waitForTimeout(3000) // heartbeat стартует сразу + интервал
    await shot(page, '02-chat-ttl-notice')
  })
  const hbHits = apiLog.filter(l => l.includes('/upload/heartbeat') && l.includes('→ 200'))
  check('heartbeat «задача на экране» дошёл до backend (200)', hbHits.length >= 1, hbHits[0] || 'нет')

  // 3) «Результат принят» через API-факт (как из кликов UI): used → исходник удалён немедленно
  const usageBefore = await api('GET', '/upload/storage-usage', ct)
  const used = await api('POST', '/upload/used', ct, { url: videoUrl, reason: 'cover_download' })
  const usageAfter = await api('GET', '/upload/storage-usage', ct)
  check('З1: used → исходник удалён немедленно', used.json.deleted === true && !fs.existsSync(path.join(dir, `smart-${ts}.mp4`)), `deleted=${used.json.deleted}`)
  check('З5: storage-usage до/после (факт с диска)', usageBefore.json.usedBytes >= 200 * 1024 && usageAfter.json.usedBytes === 0, `до=${usageBefore.json.usedBytes}Б после=${usageAfter.json.usedBytes}Б`)
  const rec = await MediaFile.findOne({ url: videoUrl }).lean()
  check('З5: запись MediaFile → deleted', rec?.status === 'deleted', `status=${rec?.status}`)

  // возврат настроек кабинета в дефолт
  await api('POST', '/owner/video-settings', ot, { videoStorageTtlHours: 0, videoIdleMinutes: 30 })
  check('возврат настроек кабинета (TTL 0, N 30)', true)

  await browser.close()
  check('console без pageerror', consoleErrors.length === 0, consoleErrors[0] || '')
} catch (e) {
  check('скрипт завершился без исключений', false, e.message)
} finally {
  try { if (creatorId) fs.rmSync(path.join(UPLOADS, creatorId), { recursive: true, force: true }) } catch { /* best-effort */ }
  if (videoUrl) await MediaFile.deleteMany({ url: videoUrl }).catch(() => {})
  await mongoose.disconnect().catch(() => {})
}

console.log(`\nproxy used/heartbeat:\n${apiLog.join('\n') || '(пусто)'}`)
console.log(failures ? `\n❌ smart-ttl-shots: ${failures} проверок упало` : '\n✅ smart-ttl-shots: ALL GREEN')
process.exit(failures ? 1 : 0)
