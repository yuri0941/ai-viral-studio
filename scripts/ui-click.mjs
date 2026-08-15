// [UI-VERIFY] Клик-прогон: навигация сайдбара/дроуера через реальные клики + безопасные
// on-page контролы (табы, дропдауны, аккордеоны). НЕ трогаем: оплату, публикации, OAuth,
// удаление, отправку форм, генерацию (тратит квоты), сохранение настроек.
// Проверки после каждого клика: URL/рендер, console errors, не осталось открытой модалки.
// Запуск: node scripts/ui-click.mjs (preview на UI_AUDIT_BASE)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const OUT = path.resolve(process.env.UI_AUDIT_OUT || 'reports/ui-verify/click')
fs.mkdirSync(OUT, { recursive: true })

const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const RUNS = [
    { width: 1280, lang: 'ru' }, { width: 1280, lang: 'en' },
    { width: 360, lang: 'ru' }, { width: 360, lang: 'en' },
]

const DANGER_RE = /оплат|pay\b|stripe|публику|publish|подключ|connect|oauth|удал|delet|отправ|send\b|генер|generat|созда|creat(e|ion)|запус|launch|старт|start\b|сохран|save\b|примен|apply|купи|buy\b|refund|возврат|submit|обновить сейчас|update now/i
const SKIP_HREF_RE = /checkout|payment|oauth|\/auth\//i

function tokenFor(role) {
    try {
        const j = JSON.parse(fs.readFileSync(`.tmp-ui-polish/token-${role}.json`, 'utf8'))
        return j.token || j.data?.accessToken || null
    } catch { return null }
}

function corsHeaders() {
    return {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-requested-with',
    }
}
async function enableApiProxy(context) {
    await context.route(`${API_ORIGIN}/**`, async (route) => {
        const req = route.request()
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders() })
        try {
            const headers = { ...req.headers() }
            delete headers.host; delete headers.origin; delete headers.referer
            const resp = await fetch(req.url(), {
                method: req.method(), headers,
                body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postDataBuffer(),
                signal: AbortSignal.timeout(20000),
            })
            const buf = Buffer.from(await resp.arrayBuffer())
            const outHeaders = {}
            resp.headers.forEach((v, k) => {
                const lk = k.toLowerCase()
                if (!['content-encoding', 'transfer-encoding', 'content-length', 'access-control-allow-origin'].includes(lk)) outHeaders[k] = v
            })
            Object.assign(outHeaders, corsHeaders())
            await route.fulfill({ status: resp.status, headers: outHeaders, body: buf })
        } catch (e) {
            await route.fulfill({ status: 502, headers: corsHeaders(), body: JSON.stringify({ error: String(e.message).slice(0, 120) }) })
        }
    })
}

async function apiPut(role, body) {
    const token = tokenFor(role)
    if (!token) return
    try {
        await fetch(`${API_ORIGIN}/api/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        })
    } catch { /* best-effort */ }
}

const summary = []
let browser

async function killOverlays(page) {
    for (let i = 0; i < 8; i++) {
        const overlay = page.locator('div.fixed.inset-0[class*="z-["]').first()
        if (!(await overlay.isVisible().catch(() => false))) break
        await overlay.locator('button').first().click().catch(() => {})
        await page.waitForTimeout(500)
    }
    const tourClose = page.locator('.driver-popover .driver-popover-close-btn').first()
    if (await tourClose.isVisible().catch(() => false)) await tourClose.click().catch(() => {})
}

async function run(role, width, lang) {
    const res = { role, width, lang, nav: [], widgets: [], consoleErrors: [] }
    await apiPut(role, { role })
    await apiPut(role, { preferences: { language: lang } })
    const context = await browser.newContext({
        viewport: { width, height: 900 }, deviceScaleFactor: 1,
        isMobile: width < 768, hasTouch: width < 768,
    })
    const token = tokenFor(role)
    await context.addInitScript(([t, l]) => {
        if (t) localStorage.setItem('token', t)
        localStorage.removeItem('user_profile')
        localStorage.setItem('app_language', l)
        localStorage.setItem('i18n-lang', l)
        localStorage.setItem('omega_onboarding_tour_done', 'true')
        localStorage.setItem('cookie_consent', 'accepted')
    }, [token, lang])
    await enableApiProxy(context)
    const page = await context.newPage()
    page.on('pageerror', e => res.consoleErrors.push(`pageerror: ${e.message}`.slice(0, 150)))
    page.on('console', msg => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (/net::|Failed to load resource|favicon|status of 4|status of 5/i.test(text)) return
        res.consoleErrors.push(text.slice(0, 150))
    })

    const mobile = width < 768
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(4000)
    await killOverlays(page)

    // [UI-VERIFY] сайдбар рендерится <button>, не <a>: кликаем по индексу (DOM перерисовывается).
    // Пропускаем logout и заголовки-тоглы групп.
    const openDrawerIfMobile = async () => {
        if (!mobile) return
        // дроуер уже открыт (translate-x-0) — повторный клик по бургеру попадёт в overlay
        const open = await page.locator('aside.translate-x-0').count().catch(() => 0)
        if (open) return
        const burger = page.locator('button.lg\\:hidden').first()
        if (await burger.isVisible().catch(() => false)) {
            await burger.click({ timeout: 5000 }).catch(() => {})
            await page.waitForTimeout(700)
        }
    }
    const navSelectors = 'aside nav button, aside button'
    await openDrawerIfMobile()
    const navCount = await page.locator(navSelectors).count()
    const SKIP_RE = /выйти|logout|^меню$|^menu$|обзор|overview|^omega$|финансы|команда|контент|настройки$|^client|свернуть|развернуть/i

    // 1) навигация реальными кликами
    for (let i = 0; i < navCount; i++) {
        await openDrawerIfMobile()
        const btn = page.locator(navSelectors).nth(i)
        const label = (((await btn.innerText().catch(() => '')) || (await btn.getAttribute('title').catch(() => '')) || '').trim() || (await btn.getAttribute('aria-label').catch(() => '')) || '').slice(0, 40)
        if (!label || SKIP_RE.test(label)) continue
        if (!(await btn.isVisible().catch(() => false))) continue
        const before = await page.evaluate(() => location.pathname + location.search)
        await btn.click({ timeout: 8000 }).catch(e => res.nav.push({ label, fail: `click: ${e.message.slice(0, 60)}` }))
        await page.waitForTimeout(2500)
        await killOverlays(page)
        const after = await page.evaluate(() => location.pathname + location.search)
        const navigated = after !== before
        res.nav.push({ label, from: before, to: after, ok: navigated })
        if (!navigated) continue

        // 2) безопасные on-page контролы на открывшейся странице
        const safe = await page.evaluate((dangerSrc) => {
            const danger = new RegExp(dangerSrc, 'i')
            const out = []
            for (const el of document.querySelectorAll('[role="tab"], button[aria-haspopup], button[aria-expanded]')) {
                const r = el.getBoundingClientRect()
                if (!r.width || !r.height || r.top > innerHeight) continue
                const label = ((el.innerText || '').trim() || el.getAttribute('aria-label') || '').slice(0, 60)
                if (!label || danger.test(label)) continue
                out.push(label)
            }
            return [...new Set(out)].slice(0, 6)
        }, DANGER_RE.source)
        for (const label of safe) {
            const btn = page.locator(`[role="tab"]:has-text("${label.slice(0, 30)}"), button[aria-haspopup]:has-text("${label.slice(0, 30)}"), button[aria-expanded]:has-text("${label.slice(0, 30)}")`).first()
            if (!(await btn.isVisible().catch(() => false))) continue
            await btn.click().catch(() => {})
            await page.waitForTimeout(800)
            const leftover = await page.evaluate(() => {
                for (const el of document.querySelectorAll('div.fixed.inset-0')) {
                    const r = el.getBoundingClientRect()
                    const z = parseInt(getComputedStyle(el).zIndex || '0', 10)
                    if (r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9 && z >= 100) return true
                }
                return false
            }).catch(() => false)
            if (leftover) {
                await page.keyboard.press('Escape').catch(() => {})
                await page.waitForTimeout(400)
                const still = await page.evaluate(() => !!document.querySelector('div.fixed.inset-0[class*="z-["]')).catch(() => false)
                res.widgets.push({ page: after, widget: label, modalLeft: still })
            } else {
                res.widgets.push({ page: after, widget: label, ok: true })
            }
        }
    }
    await page.screenshot({ path: path.join(OUT, `${role}_final_${width}_${lang}.png`) })
    summary.push(res)
    const navBad = res.nav.filter(n => n.fail)
    const wBad = res.widgets.filter(w => w.modalLeft)
    console.log(`${role} [${width}/${lang}] nav: ${res.nav.length} (плохих ${navBad.length}), widgets: ${res.widgets.length} (модалка осталась ${wBad.length}), console: ${res.consoleErrors.length}`)
    if (navBad.length) console.log('  NAV-BAD:', JSON.stringify(navBad.slice(0, 5)))
    if (wBad.length) console.log('  WIDGET-BAD:', JSON.stringify(wBad.slice(0, 5)))
    if (res.consoleErrors.length) console.log('  CONSOLE:', res.consoleErrors.slice(0, 3).join(' | '))
    await context.close()
}

async function main() {
    browser = await chromium.launch()
    const roles = (process.env.UI_AUDIT_ROLES || 'creator').split(',')
    for (const role of roles) for (const r of RUNS) await run(role, r.width, r.lang)
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
    await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
