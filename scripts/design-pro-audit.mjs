// [DESIGN-PRO З1] Аудит экранов фактом по порогам backend/knowledge/design.json.
// Экраны: лендинг, регистрация, чат Омеги, кабинет owner (overview), тарифы/оплата,
// ApiKeysTab, настройки — каждый на 1440px + 390px × dark + light.
// Автопроверки (скриптуемые пороги): горизонтальный скролл (mobile.noHorizontalScroll),
// touch-targets ≥44px на 390 (fitts), инпуты ≥16px на мобильном (mobile.inputsFontSizeMinPx),
// переходы ≤200ms (microFinish.transitionMsMax / doherty), сырые i18n-ключи, console errors,
// primary-CTA в первом вьюпорте лендинга (hick.heroCtaCount).
// Запуск: backend :18080 + preview :4173 + node backend/scripts/createTestAccounts.js,
// затем node scripts/design-pro-audit.mjs
// Результат: reports/design-pro/audit/*.png + summary.json
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/design-pro/audit')
fs.mkdirSync(OUT, { recursive: true })

const OWNER = { email: 'owner.test@aiviral-studio.ru', password: 'TestOwner123!' }
const DESIGN = JSON.parse(fs.readFileSync('backend/knowledge/design.json', 'utf8'))

let failures = 0
const findings = []
function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`)
}
function finding(screen, problem, ruleId, shot) {
  findings.push({ screen, problem, ruleId, shot })
  console.log(`  ⚑ [${ruleId}] ${screen}: ${problem}`)
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
      await route.fulfill({ status: resp.status(), headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' }, body })
    } catch (e) {
      await route.fulfill({ status: 502, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: String(e) }) })
    }
  })
}

const consoleErrors = []
async function withPage(browser, { token, theme = 'dark', vw = 1440, vh = 900 }, fn) {
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
    // гашение модалок/туров, чтобы аудит видел чистый экран
    localStorage.setItem('onboarding_done', '1')
    localStorage.setItem('tour_done', '1')
    localStorage.setItem('omega_onboarding_tour_done', 'true')
  }, [token, theme])
  try { await fn(page) } finally { await context.close() }
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`📸 ${name}.png`)
  return `${name}.png`
}

// ── скриптуемые пороги design.json ──
async function auditThresholds(page, screen, vw) {
  const r = await page.evaluate(({ vw, touchMin, inputFontMin, transMax }) => {
    const out = {}
    out.hScroll = document.documentElement.scrollWidth > window.innerWidth + 1
    if (vw <= 430) {
      const small = []
      document.querySelectorAll('button, a[href], [role="button"], input, select, textarea').forEach(el => {
        const b = el.getBoundingClientRect()
        const st = getComputedStyle(el)
        // закрытые дропдауны (opacity-0 pointer-events-none) не считаем — они невидимы
        if (st.opacity === '0' || st.pointerEvents === 'none' || el.closest('.opacity-0')) return
        if (b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && st.display !== 'none') {
          // design.json fitts.thresholds: iconButtonMinPx=40 для иконочных (без текста), иначе 44
          const iconOnly = !(el.innerText || '').trim() && (el.querySelector('svg') || el.getAttribute('aria-label'))
          const minH = iconOnly ? 40 : touchMin
          if (b.top >= 0 && b.top < window.innerHeight && b.height < minH) {
            small.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} ${Math.round(b.width)}x${Math.round(b.height)}`)
          }
        }
      })
      out.smallTargets = small.slice(0, 8)
      const badInputs = []
      document.querySelectorAll('input, textarea, select').forEach(el => {
        const fs = parseFloat(getComputedStyle(el).fontSize)
        const b = el.getBoundingClientRect()
        if (b.width > 0 && b.height > 0 && fs < inputFontMin) badInputs.push(`${el.tagName.toLowerCase()}[${el.type || ''}] ${fs}px`)
      })
      out.badInputs = badInputs.slice(0, 8)
    }
    const longTransitions = new Set()
    document.querySelectorAll('*').forEach(el => {
      const d = getComputedStyle(el).transitionDuration
      if (d && d !== '0s') {
        for (const part of d.split(',')) {
          const sec = part.trim().endsWith('ms') ? parseFloat(part) / 1000 : parseFloat(part)
          // .reveal — входная scroll-анимация (не interaction-переход), осознанно длиннее
          if (sec > transMax / 1000 && !/driver|shepherd|\breveal\b/.test(String(el.className))) longTransitions.add(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${part.trim()}`)
        }
      }
      if (longTransitions.size > 12) return
    })
    out.longTransitions = [...longTransitions].slice(0, 8)
    const bodyText = (document.body.innerText || '').replace(/\S+@\S+/g, '') // email — не i18n-ключи
    // домены (console.groq.com и т.п.) — тоже не i18n-ключи
    out.rawI18n = (bodyText.match(/\b[a-z]+\.[a-zA-Z]+\.[a-zA-Z]+\b/g) || [])
      .filter(m => !/\.(com|ru|net|org|io|ai|dev|app)\b/i.test(m)).slice(0, 5)
    return out
  }, { vw, touchMin: DESIGN.mobile.touchTargetMinPx, inputFontMin: DESIGN.mobile.inputsFontSizeMinPx, transMax: DESIGN.microFinish.transitionMsMax })
  if (r.hScroll) finding(screen, `горизонтальный скролл на ${vw}px`, 'mobile.noHorizontalScroll', '')
  if (r.smallTargets?.length) finding(screen, `touch-target <44px: ${r.smallTargets.join(' | ')}`, 'fitts.touchTargetMinPx', '')
  if (r.badInputs?.length) finding(screen, `инпут <16px (iOS zoom): ${r.badInputs.join(' | ')}`, 'mobile.inputsFontSizeMinPx', '')
  if (r.longTransitions?.length) finding(screen, `transition >200ms: ${r.longTransitions.join(' | ')}`, 'microFinish.transitionMsMax', '')
  if (r.rawI18n?.length) finding(screen, `сырые i18n-ключи: ${r.rawI18n.join(' | ')}`, 'states.error', '')
  return r
}

// пороги первого экрана лендинга (hick/conv)
async function auditLandingHero(page) {
  const r = await page.evaluate(() => {
    const vh = window.innerHeight
    const btns = [...document.querySelectorAll('a, button')].filter(el => {
      const b = el.getBoundingClientRect()
      const st = getComputedStyle(el)
      return b.top >= 0 && b.bottom <= vh && b.width > 60 && b.height > 20 && st.visibility !== 'hidden'
    }).map(el => ({ text: (el.innerText || '').trim().slice(0, 40), cls: String(el.className).slice(0, 60), h: Math.round(el.getBoundingClientRect().height) }))
    const h1 = document.querySelector('h1')?.innerText?.trim().slice(0, 120) || ''
    return { heroButtons: btns, h1 }
  })
  console.log(`  ℹ hero H1: «${r.h1}»`)
  console.log(`  ℹ hero кнопки: ${r.heroButtons.map(b => `${b.text}(${b.h}px)`).join(' | ')}`)
  return r
}

const SCREENS = [
  { id: 'landing', url: '/', auth: false },
  { id: 'register', url: '/register', auth: false },
  { id: 'chat', url: '/creative-hub/chat', auth: true, wait: 6000 },
  { id: 'owner-overview', url: '/owner?tab=overview', auth: true, wait: 6000 },
  { id: 'pricing', url: '/settings?tab=subscription', auth: true, wait: 5000 },
  { id: 'apiKeys', url: '/owner?tab=apiKeys', auth: true, wait: 6000 },
  { id: 'settings', url: '/settings', auth: true, wait: 5000 },
]

const browser = await chromium.launch()
try {
  const ot = await login(OWNER)
  check('логин owner', !!ot)

  for (const s of SCREENS) {
    for (const theme of ['dark', 'light']) {
      // тема app-экранов — из профиля (user.preferences.theme перекрывает localStorage)
      if (s.auth && ot) await api('PUT', '/users/me', ot, { preferences: { theme } })
      for (const vw of [1440, 390]) {
        const name = `${s.id}-${theme}-${vw}`
        await withPage(browser, { token: s.auth ? ot : null, theme, vw, vh: vw === 390 ? 844 : 900 }, async (page) => {
          await page.goto(`${BASE}${s.url}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
          await page.waitForTimeout(s.wait || 4000)
          // pricing = таб «Подписка» настроек (query-параметр не всегда срабатывает)
          if (s.id === 'pricing') {
            await page.locator('button:has-text("Подписка")').first().click().catch(() => {})
            await page.waitForTimeout(2500)
          }
          const shotName = await shot(page, name)
          const r = await auditThresholds(page, s.id, vw)
          // подставляем имя скрина в находки этого прогона
          for (let i = findings.length - 1; i >= 0; i--) {
            if (findings[i].shot === '') findings[i].shot = shotName; else break
          }
          if (s.id === 'landing' && vw === 1440) await auditLandingHero(page)
          if (r.hScroll) check(`${name}: нет горизонтального скролла`, false)
        })
      }
    }
  }
} finally {
  await browser.close()
}

const realErrors = consoleErrors.filter(e => !/favicon|net::|Failed to load resource|WebSocket|driver\.js|404|Deprecat/i.test(e))
fs.writeFileSync(path.resolve('reports/design-pro/audit-summary.json'), JSON.stringify({ date: new Date().toISOString(), findings, consoleErrors: realErrors }, null, 2))
console.log(`\nНаходок: ${findings.length}; console errors: ${realErrors.length}`)
console.log(findings.length === 0 ? '✅ design-pro-audit: чисто по скриптуемым порогам' : `⚠ design-pro-audit: ${findings.length} находок (см. summary.json)`)
process.exit(0) // аудит — не гейт, находки идут в таблицу З1
