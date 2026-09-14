// [STAFF-MGMT] Пруф-гейт: owner редактирует staff-аккаунт (email сохраняется фактом в таблице),
// удаление — только через confirm-диалог с именем аккаунта, AuditLog пишет staff_updated/staff_deleted,
// admin → 403 на PATCH/DELETE /owner/staff/:id (API-факт в логе).
// Запуск: backend :18080 + preview :4173 (127.0.0.1) + node scripts/staff-mgmt-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/staff-mgmt')
fs.mkdirSync(OUT, { recursive: true })

const OWNER = { email: 'owner.test@aiviral-studio.ru', password: 'TestOwner123!' }
const ADMIN = { email: 'admin.test@aiviral-studio.ru', password: 'TestAdmin123!' }

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

async function proxyApi(context) {
  await context.route(`${API_ORIGIN}/**`, async (route) => {
    const req = route.request()
    const url = req.url().replace(API_ORIGIN, LOCAL_API)
    try {
      const headers = { ...req.headers() }
      delete headers.host; delete headers.origin; delete headers.referer
      const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
      const body = await resp.body()
      if (url.includes('/owner/staff')) console.log(`[proxy] ${req.method()} staff → ${resp.status()}`)
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

const browser = await chromium.launch()
const ts = Date.now()
const staffEmail = `qa-ui-staff-${ts}@test.ru`
const staffEmail2 = `qa-ui-staff2-${ts}@test.ru`
try {
  const ot = await login(OWNER)
  const at = await login(ADMIN)
  check('логин owner/admin', !!ot && !!at)

  // API: создать staff для UI-сценария
  const created = await api('POST', '/owner/staff', ot, { email: staffEmail, name: 'QA UI Staff', role: 'staff' })
  const staffId = created.json?.staff?.id
  check('API: owner создал staff-аккаунт', created.status === 201 && !!staffId, `status=${created.status}`)

  // API-негатив: admin → 403 на PATCH/DELETE (скрин не нужен — факт в логе)
  const pAdmin = await api('PATCH', `/owner/staff/${staffId}`, at, { name: 'Hack' })
  const dAdmin = await api('DELETE', `/owner/staff/${staffId}`, at)
  check('API: admin PATCH /owner/staff/:id → 403', pAdmin.status === 403, pAdmin.status)
  check('API: admin DELETE /owner/staff/:id → 403', dAdmin.status === 403, dAdmin.status)

  // ── UI: редактирование сохраняется ──
  await withPage(browser, { token: ot }, async (page) => {
    await page.goto(`${BASE}/owner?tab=team`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(4000)
    const row = page.locator(`tr:has-text("${staffEmail}")`)
    check('UI: staff-строка в таблице команды', await row.isVisible().catch(() => false))
    // редактирование: карандаш в строке → модалка → новый email → сохранить
    await row.locator('button').first().click()
    await page.waitForTimeout(600)
    const emailInput = page.locator('input[type="email"]')
    check('UI: модалка редактирования открылась', await emailInput.isVisible().catch(() => false))
    await emailInput.fill(staffEmail2)
    await shot(page, 'edit-modal')
    await page.locator('button:has-text("Сохранить")').click()
    await page.waitForTimeout(2000)
    const updated = await page.locator(`tr:has-text("${staffEmail2}")`).isVisible().catch(() => false)
    check('UI: новый email сохранён и виден в таблице', updated)
    await shot(page, 'edit-saved')

    // ── UI: удаление с подтверждением (имя в диалоге) ──
    const row2 = page.locator(`tr:has-text("${staffEmail2}")`)
    await row2.locator('button').last().click()
    await page.waitForTimeout(600)
    const dlg = page.locator('[data-testid="staff-delete-confirm"]')
    check('UI: confirm-диалог удаления открылся', await dlg.isVisible().catch(() => false))
    const dlgText = await dlg.innerText().catch(() => '')
    check('UI: имя и email аккаунта в диалоге', dlgText.includes('QA UI Staff') && dlgText.includes(staffEmail2), dlgText.slice(0, 80).replace(/\n/g, ' | '))
    await shot(page, 'delete-confirm')
    await page.locator('[data-testid="staff-delete-confirm-btn"]').click()
    await page.waitForTimeout(2000)
    const gone = !(await page.locator(`tr:has-text("${staffEmail2}")`).isVisible().catch(() => false))
    check('UI: после подтверждения строка исчезла', gone)
    await shot(page, 'delete-done')

    // ── UI: AuditLog записи видны в кабинете ──
    await page.goto(`${BASE}/owner?tab=audit`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(4000)
    const auditText = await page.locator('body').innerText().catch(() => '')
    check('UI: AuditLog содержит staff_updated', auditText.includes('staff_updated'), '')
    check('UI: AuditLog содержит staff_deleted', auditText.includes('staff_deleted'), '')
    await shot(page, 'audit-log')
  })

  // cleanup: если UI-удаление не дошло — добить через API
  await api('DELETE', `/owner/staff/${staffId}`, ot).catch(() => {})
} finally {
  await browser.close()
}

const realErrors = consoleErrors.filter(e => !/favicon|net::|Failed to load resource|WebSocket|driver\.js|404/.test(e))
check('0 критичных console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))
console.log(failures === 0 ? '\n✅ staff-mgmt-shots: ALL GREEN' : `\n❌ staff-mgmt-shots: ${failures} FAIL`)
process.exit(failures === 0 ? 0 : 1)
