// [KEYS-UNIVERSAL] Пруф-гейт универсального слота «Свой провайдер» + кнопки «🔄 Проверить».
// Сценарий: пустая секция → модалка → создание слота против ЖИВОГО локального stub
// (OpenAI-совместимый /models + /chat/completions) → карточка «✅ Работает» без деплоя →
// реальный ответ функции через сохранённый ключ (callCustomProvider фактом из БД) →
// мёртвый ключ (stub 401) → статус 🔴 + isActive=false в БД (TG-алерт — в логе бэкенда) →
// удаление слота из UI. Скрины dark/light + 390px.
// Запуск: backend :18080 + preview :4173 (127.0.0.1) + node scripts/keys-universal-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')
// MONGO_URI из backend/.env (пруф «реальный результат» идёт через те же модели/БД, что и сервер)
createRequire(path.resolve('backend', 'noop.js'))('dotenv').config({ path: path.resolve('backend', '.env') })

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/keys-universal')
fs.mkdirSync(OUT, { recursive: true })

const OWNER = { email: 'owner.test@aiviral-studio.ru', password: 'TestOwner123!' }

let failures = 0
function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`)
}

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

// живой OpenAI-совместимый stub
let stubMode = 'ok'
const stub = http.createServer((rq, rs) => {
  if (rq.url === '/models') { rs.writeHead(200, { 'Content-Type': 'application/json' }); rs.end(JSON.stringify({ data: [{ id: 'qa-ui-model' }] })); return }
  if (rq.url === '/chat/completions') {
    if (stubMode === 'dead') { rs.writeHead(401, { 'Content-Type': 'application/json' }); rs.end(JSON.stringify({ error: { message: 'Invalid API key' } })); return }
    rs.writeHead(200, { 'Content-Type': 'application/json' }); rs.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'Слот «QA UI Slot» отвечает реальным текстом' } }] })); return
  }
  rs.writeHead(404).end()
})
await new Promise(r => stub.listen(0, '127.0.0.1', r))
const stubBase = `http://127.0.0.1:${stub.address().port}`

async function proxyApi(context) {
  await context.route(`${API_ORIGIN}/**`, async (route) => {
    const req = route.request()
    const url = req.url().replace(API_ORIGIN, LOCAL_API)
    try {
      const headers = { ...req.headers() }
      delete headers.host; delete headers.origin; delete headers.referer
      const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
      const body = await resp.body()
      if (url.includes('/custom-providers')) console.log(`[proxy] ${req.method()} custom-providers → ${resp.status()}`)
      await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body })
    } catch (e) {
      await route.fulfill({ status: 502, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: String(e) }) })
    }
  })
}

const consoleErrors = []
async function withPage(browser, { token, theme = 'dark', vw = 1280, vh = 900 }, fn) {
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, locale: 'ru-RU' })
  context.setDefaultTimeout(30000)
  await proxyApi(context)
  const page = await context.newPage()
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 160)) })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${String(err).slice(0, 160)}`))
  await page.addInitScript(([tk, th]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th)
    localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('lang', 'ru')
    localStorage.setItem('i18n-lang', 'ru')
    localStorage.setItem('app_language', 'ru')
    localStorage.setItem('cookie_consent', 'accepted')
  }, [token, theme])
  try { await fn(page) } finally { await context.close() }
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`📸 ${name}.png`)
}

const SLOT_NAME = 'QA UI Slot'
const browser = await chromium.launch()
try {
  const ot = await login(OWNER)
  check('логин owner', !!ot)

  // чистим хвосты прошлых прогонов
  const existing = await api('GET', '/custom-providers', ot)
  for (const p of existing.json?.providers || []) {
    if (p.name === SLOT_NAME) await api('DELETE', `/custom-providers/${p.id}`, ot)
  }

  // ── UI: создание слота через модалку (вставил → работает) ──
  await withPage(browser, { token: ot }, async (page) => {
    await page.goto(`${BASE}/owner?tab=apiKeys`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(5000)
    const section = page.locator(`h3:has-text("Свои провайдеры")`)
    check('UI: секция «Свои провайдеры» видна', await section.isVisible().catch(() => false))
    await section.scrollIntoViewIfNeeded().catch(() => {})
    await shot(page, '01-section-empty')

    await page.locator('button:has-text("Добавить провайдера")').click()
    await page.waitForTimeout(600)
    const nameInput = page.locator('input[placeholder="Kling"]')
    check('UI: модалка слота открылась', await nameInput.isVisible().catch(() => false))
    await nameInput.fill(SLOT_NAME)
    await page.locator('input[placeholder="https://api.example.com/v1"]').fill(stubBase)
    await page.locator('input[placeholder="sk-..."]').fill('qa-ui-key-12345678')
    await page.locator('input[placeholder="gpt-4o-mini"]').fill('qa-ui-model')
    await shot(page, '02-modal-filled')

    const t0 = Date.now()
    await page.locator('button:has-text("Сохранить и применить")').last().click()
    await page.waitForTimeout(3000)
    const card = page.locator(`h4:has-text("${SLOT_NAME}")`)
    check('UI: карточка слота появилась после «Сохранить и применить»', await card.isVisible().catch(() => false))
    const cardBox = page.locator(`div.glass-luxury:has(h4:has-text("${SLOT_NAME}"))`).first()
    const cardText = await cardBox.innerText().catch(() => '')
    check('UI: статус «✅ Работает» (живая проверка прошла)', cardText.includes('Работает'), cardText.slice(0, 80).replace(/\n/g, ' | '))
    console.log(`[proof] save → работает: ${Date.now() - t0}ms (лимит 60000)`)
    check('З4: hot-reload ≤60с фактом', Date.now() - t0 < 60000)
    check('UI: ключ на карточке замаскирован', !cardText.includes('qa-ui-key-12345678') && cardText.includes('••••'), '')
    await cardBox.scrollIntoViewIfNeeded().catch(() => {})
    await shot(page, '03-slot-created-dark')
  })

  // ── API-факт: функция отдала реальный результат через сохранённый ключ ──
  const list = await api('GET', '/custom-providers', ot)
  const slot = (list.json?.providers || []).find(p => p.name === SLOT_NAME)
  check('API: слот сохранён (id есть)', !!slot?.id)
  {
    const mongoose = (await import('mongoose')).default
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
    const { default: CustomProvider } = await import('../backend/models/CustomProvider.js')
    const { callCustomProvider, getCustomChatProviders, invalidateCustomProviderCache } = await import('../backend/services/customProviderService.js')
    invalidateCustomProviderCache()
    const rotation = await getCustomChatProviders()
    check('З4: слот в ротации чата сразу после сохранения', rotation.some(p => String(p._id) === String(slot.id)))
    const doc = await CustomProvider.findById(slot.id).lean()
    const reply = await callCustomProvider(doc, 'привет, это пруф')
    check('З4 ПРУФ: функция отдала реальный результат через вставленный ключ', reply === 'Слот «QA UI Slot» отвечает реальным текстом', reply)

    // ── З5: мёртвый ключ — stub 401 → авто-отключение фактом ──
    stubMode = 'dead'
    let deadErr = null
    try { await callCustomProvider(doc, 'ping') } catch (e) { deadErr = e }
    const after = await CustomProvider.findById(slot.id).lean()
    check('З5: 401 → isActive=false + status=invalid в БД', deadErr?.response?.status === 401 && after.isActive === false && after.status === 'invalid', `isActive=${after.isActive}`)
    stubMode = 'ok'
    await mongoose.disconnect()
  }

  // ── UI: карточка показала 🔴 после мёртвого ключа + кнопка «🔄 Проверить» на обычной карте ──
  await withPage(browser, { token: ot }, async (page) => {
    await page.goto(`${BASE}/owner?tab=apiKeys`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(5000)
    const cardBox = page.locator(`div.glass-luxury:has(h4:has-text("${SLOT_NAME}"))`).first()
    await cardBox.scrollIntoViewIfNeeded().catch(() => {})
    const cardText = await cardBox.innerText().catch(() => '')
    check('UI: слот после 401 → «🔴 Ошибка»/выключен', cardText.includes('Ошибка') || cardText.includes('Выключен'), cardText.slice(0, 80).replace(/\n/g, ' | '))
    await shot(page, '04-slot-dead-key')

    // З4: кнопка «🔄 Проверить» на обычной карточке (у сохранённого ключа)
    const savedCard = page.locator('div.glass-luxury:has(button[title*="Проверить"])').first()
    const hasCheckBtn = await savedCard.isVisible().catch(() => false)
    check('UI: кнопка «🔄 Проверить» есть на сохранённой карточке', hasCheckBtn)
    if (hasCheckBtn) {
      await savedCard.scrollIntoViewIfNeeded().catch(() => {})
      await shot(page, '05-card-recheck-button')
    }

    // удаление слота из UI (с подтверждением)
    await cardBox.locator('button').last().click()
    await page.waitForTimeout(1500)
    const gone = !(await page.locator(`h4:has-text("${SLOT_NAME}")`).isVisible().catch(() => false))
    check('UI: слот удалён из кабинета (confirm)', gone)
    await shot(page, '06-slot-deleted')
  })

  // ── light + mobile скрины секции ──
  await withPage(browser, { token: ot, theme: 'light' }, async (page) => {
    await page.goto(`${BASE}/owner?tab=apiKeys`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(5000)
    await page.locator(`h3:has-text("Свои провайдеры")`).scrollIntoViewIfNeeded().catch(() => {})
    await shot(page, '07-section-light')
  })
  await withPage(browser, { token: ot, vw: 390, vh: 844 }, async (page) => {
    await page.goto(`${BASE}/owner?tab=apiKeys`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(5000)
    await page.locator(`h3:has-text("Свои провайдеры")`).scrollIntoViewIfNeeded().catch(() => {})
    await shot(page, '08-section-390')
  })

  // cleanup (если UI-удаление не дошло)
  const tail = await api('GET', '/custom-providers', ot)
  for (const p of tail.json?.providers || []) {
    if (p.name === SLOT_NAME) await api('DELETE', `/custom-providers/${p.id}`, ot)
  }
} finally {
  await browser.close()
  stub.close()
}

const realErrors = consoleErrors.filter(e => !/favicon|net::|Failed to load resource|WebSocket|driver\.js|404/.test(e))
check('0 критичных console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))
console.log(failures === 0 ? '\n✅ keys-universal-shots: ALL GREEN' : `\n❌ keys-universal-shots: ${failures} FAIL`)
process.exit(failures === 0 ? 0 : 1)
