// [DESIGN-PRO] «Было»-скрины: снимаем ключевые экраны из worktree на коммите ДО фиксов.
// Запуск: node scripts/design-pro-before-shots.mjs (ожидает preview СТАРОГО билда на :4174)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE_BEFORE || 'http://127.0.0.1:4174'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/design-pro/before')
fs.mkdirSync(OUT, { recursive: true })

const OWNER = { email: 'owner.test@aiviral-studio.ru', password: 'TestOwner123!' }

async function login() {
  const r = await fetch(`${LOCAL_API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(OWNER) })
  const j = await r.json()
  return j?.data?.token || j?.token || null
}

const browser = await chromium.launch()
const ot = await login()
const shots = [
  { name: 'register-dark-1440', url: '/register', auth: false, theme: 'dark', vw: 1440, vh: 900 },
  { name: 'chat-dark-390-tour', url: '/creative-hub/chat', auth: true, theme: 'dark', vw: 390, vh: 844, tour: true },
  { name: 'chat-light-1440', url: '/creative-hub/chat', auth: true, theme: 'light', vw: 1440, vh: 900 },
  { name: 'landing-dark-390', url: '/', auth: false, theme: 'dark', vw: 390, vh: 844 },
]
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.vw, height: s.vh }, locale: 'ru-RU' })
  await ctx.route(`${API_ORIGIN}/**`, async (route) => {
    const req = route.request()
    const url = req.url().replace(API_ORIGIN, LOCAL_API)
    try {
      const headers = { ...req.headers() }; delete headers.host; delete headers.origin; delete headers.referer
      const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
      const body = await resp.body()
      await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body })
    } catch (e) { await route.fulfill({ status: 502, body: '{}' }) }
  })
  const page = await ctx.newPage()
  await page.addInitScript(([tk, th, tour]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th); localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('lang', 'ru'); localStorage.setItem('app_language', 'ru')
    localStorage.setItem('cookie_consent', 'accepted')
    if (!tour) localStorage.setItem('omega_onboarding_tour_done', 'true')
  }, [s.auth ? ot : null, s.theme, !!s.tour])
  await page.goto(`${BASE}${s.url}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${OUT}/${s.name}.png` })
  console.log(`📸 before/${s.name}.png`)
  await ctx.close()
}
await browser.close()
console.log('✅ before-скрины готовы')
