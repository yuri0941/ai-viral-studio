// [HOTFIX-FINAL] Скрины «стало» для отчёта: витрина /credits (dark/light × desktop/mobile),
// PricingTab с маржой тарифов (owner). Локально: preview :4173 + backend :18080 (прокси prod-API).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/hotfix-final/local-shots')
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

// owner-токен — напрямую из локальной БД (как qaSecurityFlow), пароль owner не нужен
async function ownerTokenFromDb() {
  try {
    const req2 = createRequire(path.resolve('backend', 'package.json'))
    const mongoose = req2('mongoose')
    const fs2 = await import('node:fs')
    const envText = fs2.readFileSync('backend/.env', 'utf8')
    const uri = envText.match(/^\s*MONGO_URI=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '') || 'mongodb://localhost:27017/ai_viral_studio'
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = envText.match(/^\s*JWT_SECRET=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '') || ''
    }
    await mongoose.connect(uri)
    const { default: User } = await import('./../backend/models/User.js')
    const owner = await User.findOne({ role: 'owner' })
    const token = owner?.generateToken?.() || null
    await mongoose.disconnect()
    return token
  } catch (e) {
    console.warn('owner token from db failed:', e.message)
    return null
  }
}

async function withPage(browser, { token, theme = 'dark', mobile = false }, fn) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, locale: 'ru-RU' })
  context.setDefaultTimeout(30000)
  await proxyApi(context)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.addInitScript(([tk, th]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th)
    localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('cookie_consent', 'accepted')
  }, [token, theme])
  try { await fn(page, errors) } finally { await context.close() }
}

async function main() {
  const clientToken = await login('creator.test@aiviral-studio.ru', 'TestCreator123!')
  const ownerToken = await ownerTokenFromDb()
  check('вход клиента', !!clientToken)

  const browser = await chromium.launch()
  try {
    // витрина /credits — клиент, обе темы × desktop/mobile
    for (const [theme, mobile] of [['dark', false], ['light', false], ['dark', true], ['light', true]]) {
      await withPage(browser, { token: clientToken, theme, mobile }, async (page, errors) => {
        await page.goto(BASE + '/credits', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3500)
        const text = await page.evaluate(() => document.body?.innerText || '')
        const hasPacks = /100✦|500✦/.test(text) && /99|449/.test(text)
        check(`витрина /credits (${theme}${mobile ? '/mobile' : ''})`, hasPacks, `chars=${text.length}`)
        const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
        check(`без h-scroll (${theme}${mobile ? '/m' : ''})`, !hScroll)
        await shot(page, `credits-${theme}${mobile ? '-mobile' : '-desktop'}`)
        check(`без pageerror (${theme}${mobile ? '/m' : ''})`, errors.length === 0, errors[0] || '')
      })
    }

    // PricingTab с маржой (owner)
    if (ownerToken) {
      await withPage(browser, { token: ownerToken, theme: 'dark' }, async (page, errors) => {
        await page.goto(BASE + '/owner?tab=pricing', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(5000)
        const text = await page.evaluate(() => document.body?.innerText || '')
        check('PricingTab: маржа тарифов видна', /Маржа|маржа/.test(text), `chars=${text.length}`)
        await shot(page, 'pricing-margin-desktop')
      })
    } else {
      console.log('⚠️ owner-токен не получен — скрин PricingTab пропущен')
    }
  } finally {
    await browser.close()
  }
  console.log(`\nИТОГ: ${failures === 0 ? '✅ всё зелёное' : `❌ провалов: ${failures}`}`)
  process.exit(failures === 0 ? 0 : 1)
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
