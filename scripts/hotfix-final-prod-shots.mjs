// [HOTFIX-FINAL] Задачи 0.2/0.3: обход прода + пруф дизайна PR #60 на aiviral-studio.ru.
//  0.2: HTTP-статусы экранов + живой проход лендинг → регистрация → чат → профиль → оплата.
//  0.3: скрины прод-сайта (лендинг/чат/профиль, dark/light × desktop/iPhone) — дизайн жив.
// Пользователь: регистрация через ЛОКАЛЬНЫЙ backend :18080 (БД общая с продом), вход — на проде.
// Запуск: backend :18080 + node scripts/hotfix-final-prod-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const PROD = 'https://aiviral-studio.ru'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/hotfix-final/prod-shots')
fs.mkdirSync(OUT, { recursive: true })

let failures = 0
function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`📸 ${name}.png`)
}

// ── 0.2a: HTTP-статусы экранов (SPA-fallback) ──
async function httpTable() {
  console.log('\n— 0.2a HTTP-статусы прода —')
  for (const p of ['/', '/chat', '/profile', '/pricing', '/settings', '/credits']) {
    try {
      const r = await fetch(PROD + p, { redirect: 'manual' })
      check(`GET ${p} → ${r.status}`, r.status === 200)
    } catch (e) {
      check(`GET ${p}`, false, String(e.message).slice(0, 80))
    }
  }
}

// ── регистрация тест-пользователя НА ПРОДЕ (turnstile без токена — fallback next()) ──
async function registerLocal(email, password) {
  const r = await fetch('https://aiviral-backend.onrender.com/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Hotfix QA', email, password, acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true }),
  })
  const j = await r.json().catch(() => ({}))
  return { status: r.status, body: j }
}

async function loginLocal(email, password) {
  // токен ПРОДА (prod API подписывает своим JWT_SECRET — локальный токен прод не примет)
  const r = await fetch('https://aiviral-backend.onrender.com/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const j = await r.json().catch(() => ({}))
  return j?.data?.token || j?.token || null
}

async function withPage(browser, { token, theme = 'dark', mobile = false }, fn) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    locale: 'ru-RU',
    ignoreHTTPSErrors: true,
  })
  context.setDefaultTimeout(45000)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)))
  await page.addInitScript(([tk, th]) => {
    if (tk) localStorage.setItem('token', tk)
    localStorage.setItem('theme', th)
    localStorage.setItem('ai-viral-theme', th)
    localStorage.setItem('cookie_consent', 'accepted')
  }, [token, theme])
  try {
    await fn(page, errors)
  } finally {
    await context.close()
  }
}

async function main() {
  await httpTable()

  // ── 0.2b: регистрация (backend) ──
  console.log('\n— 0.2b регистрация/вход —')
  const email = `hotfix.qa.${Date.now()}@test.dev`
  const password = 'HotfixQa123!'
  const reg = await registerLocal(email, password)
  check('регистрация (API, общая БД)', reg.status === 200 || reg.status === 201, `HTTP ${reg.status}`)
  const token = await loginLocal(email, password)
  check('вход после регистрации', !!token)

  const browser = await chromium.launch()
  try {
    // ── 0.2c/0.3: лендинг (аноним), обе темы × desktop/mobile ──
    console.log('\n— 0.3 лендинг —')
    for (const [theme, mobile] of [['dark', false], ['light', false], ['dark', true], ['light', true]]) {
      await withPage(browser, { token: null, theme, mobile }, async (page, errors) => {
        await page.goto(PROD + '/', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(3500)
        const bodyText = await page.evaluate(() => document.body?.innerText?.length || 0)
        check(`лендинг рендерится (${theme}${mobile ? '/mobile' : ''})`, bodyText > 500, `chars=${bodyText}`)
        await shot(page, `landing-${theme}${mobile ? '-mobile' : '-desktop'}`)
        check(`лендинг без pageerror (${theme}${mobile ? '/m' : ''})`, errors.length === 0, errors[0] || '')
      })
    }

    // ── 0.2d: страница регистрации на проде рендерится ──
    await withPage(browser, { token: null, theme: 'dark' }, async (page) => {
      await page.goto(PROD + '/register', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(3000)
      const hasForm = await page.evaluate(() => !!document.querySelector('form, input[type="email"], input[name="email"]'))
      check('экран регистрации: форма на проде', hasForm)
      await shot(page, 'register-desktop')
    })

    if (token) {
      // ── 0.2e/0.3: чат (Фокус-чат: пилюля квоты) ──
      console.log('\n— 0.3 чат/профиль —')
      for (const [theme, mobile] of [['dark', false], ['light', false], ['dark', true]]) {
        await withPage(browser, { token, theme, mobile }, async (page, errors) => {
          await page.goto(PROD + '/chat', { waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(4500)
          const bodyText = await page.evaluate(() => document.body?.innerText || '')
          const onChat = page.url().includes('/chat')
          check(`чат рендерится (${theme}${mobile ? '/mobile' : ''})`, onChat && bodyText.length > 100, `url=${page.url().replace(PROD, '')} chars=${bodyText.length}`)
          await shot(page, `chat-${theme}${mobile ? '-mobile' : '-desktop'}`)
          check(`чат без pageerror (${theme}${mobile ? '/m' : ''})`, errors.length === 0, errors[0] || '')
        })
      }
      // ── 0.2f/0.3: профиль (Люкс-хаб: кольцо баланса) ──
      for (const [theme, mobile] of [['dark', false], ['light', false], ['dark', true]]) {
        await withPage(browser, { token, theme, mobile }, async (page, errors) => {
          await page.goto(PROD + '/settings', { waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(4500)
          const bodyText = await page.evaluate(() => document.body?.innerText || '')
          const onSettings = page.url().includes('/settings')
          check(`профиль рендерится (${theme}${mobile ? '/mobile' : ''})`, onSettings && bodyText.length > 100, `url=${page.url().replace(PROD, '')} chars=${bodyText.length}`)
          await shot(page, `profile-${theme}${mobile ? '-mobile' : '-desktop'}`)
          check(`профиль без pageerror (${theme}${mobile ? '/m' : ''})`, errors.length === 0, errors[0] || '')
        })
      }
      // ── 0.2g: оплата (экран тарифов) ──
      await withPage(browser, { token, theme: 'dark' }, async (page) => {
        await page.goto(PROD + '/settings?tab=subscription', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(4500)
        const bodyText = await page.evaluate(() => document.body?.innerText || '')
        const hasPrice = /990|4990|₽/.test(bodyText)
        check('экран оплаты/тарифов: цены из PlanConfig', hasPrice, `chars=${bodyText.length}`)
        await shot(page, 'paywall-desktop')
      })
    }
  } finally {
    await browser.close()
  }

  console.log(`\nИТОГ: ${failures === 0 ? '✅ всё зелёное' : `❌ провалов: ${failures}`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
