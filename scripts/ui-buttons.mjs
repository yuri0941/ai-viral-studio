// [UI-VERIFY] Аудит кнопок: все видимые кнопки × 5 ширин × RU/EN.
// Флаги: EMPTY (нет текста/aria-label/иконки), RAWKEY (сырой i18n-ключ в label),
// OFFSCREEN (вылезает за viewport), TINY (тап-зона < 32px на мобильных), COVERED (перекрыта — клик не достанет).
// Запуск: node scripts/ui-buttons.mjs (preview на UI_AUDIT_BASE)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const OUT = path.resolve(process.env.UI_AUDIT_OUT || 'reports/ui-verify/buttons')
fs.mkdirSync(OUT, { recursive: true })

const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const WIDTHS = [360, 428, 768, 1280, 1920]
const LANGS = ['ru', 'en']

const PAGES = {
    public: ['/', '/login', '/register'],
    creator: ['/dashboard', '/analytics', '/scheduler', '/video-creator', '/settings', '/ai-vs-human', '/leaderboard', '/challenge', '/creative-hub', '/checkout'],
    business: ['/dashboard', '/boardroom', '/business-spawner', '/settings'],
    advertiser: ['/advertiser', '/neuro-sales', '/settings'],
}

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

const RAW_KEY_RE = /^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*(\.|$)/

const summary = []
let browser

async function checkPage(role, label, width, lang) {
    if (role !== 'public') await apiPut(role, { preferences: { language: lang } })
    const context = await browser.newContext({
        viewport: { width, height: 900 }, deviceScaleFactor: 1,
        isMobile: width < 768, hasTouch: width < 768,
    })
    const token = role !== 'public' ? tokenFor(role) : null
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
    try {
        await page.goto(`${BASE}${label}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.waitForTimeout(4000)
        for (let i = 0; i < 10; i++) {
            const overlay = page.locator('div.fixed.inset-0[class*="z-["]').first()
            if (!(await overlay.isVisible().catch(() => false))) break
            await overlay.locator('button').first().click().catch(() => {})
            await page.waitForTimeout(600)
        }
        const finalPath = await page.evaluate(() => location.pathname)
        if (finalPath !== label) {
            summary.push({ role, page: label, width, lang, redirected: finalPath, buttons: [], problems: [] })
            console.log(`${role} ${label} [${width}/${lang}] REDIRECT→${finalPath}`)
            await context.close()
            return
        }
        const buttons = await page.evaluate((mobile) => {
            const vw = window.innerWidth
            const out = []
            for (const el of document.querySelectorAll('button, [role="button"]')) {
                const r = el.getBoundingClientRect()
                if (!r.width || !r.height) continue
                // [UI-VERIFY] скрытые поддеревья (opacity-0 дропдауны) и off-canvas дроуеры — не кнопки для пользователя
                let hidden = false
                for (let n = el; n && n !== document.body; n = n.parentElement) {
                    const cs = getComputedStyle(n)
                    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0' || cs.pointerEvents === 'none') { hidden = true; break }
                }
                if (hidden) continue
                if (r.right < 0 || r.left > vw) continue // off-canvas (мобильный дроуер за экраном)
                const cs = getComputedStyle(el)
                const label = (el.innerText || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title') || ''
                const hasIcon = !!el.querySelector('svg, img')
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2
                let covered = false
                let coveredBy = ''
                if (cy >= 0 && cy <= window.innerHeight && cx >= 0 && cx <= vw) {
                    const top = document.elementFromPoint(cx, cy)
                    covered = !!(top && top !== el && !el.contains(top))
                    if (covered) coveredBy = (top.tagName + '.' + (top.className?.toString() || '').split(' ').slice(0, 3).join('.')).slice(0, 70)
                }
                out.push({
                    label: label.slice(0, 60),
                    hasIcon,
                    disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
                    w: Math.round(r.width), h: Math.round(r.height),
                    offscreen: r.left < -2 || r.right > vw + 2,
                    tiny: mobile && (r.width < 32 || r.height < 32),
                    covered,
                    coveredBy,
                    cls: (el.className?.toString() || '').slice(0, 50),
                })
            }
            return out
        }, width < 768)
        const problems = []
        for (const b of buttons) {
            const flags = []
            if (!b.label && !b.hasIcon) flags.push('EMPTY')
            if (b.label && RAW_KEY_RE.test(b.label)) flags.push('RAWKEY')
            if (b.offscreen) flags.push('OFFSCREEN')
            if (b.tiny) flags.push('TINY')
            if (b.covered && !b.disabled) flags.push('COVERED')
            if (flags.length) problems.push({ ...b, flags })
        }
        summary.push({ role, page: label, width, lang, buttonCount: buttons.length, problems })
        console.log(`${role} ${label} [${width}/${lang}] кнопок: ${buttons.length}, проблем: ${problems.length}${problems.length ? ' — ' + problems.slice(0, 3).map(p => `${p.flags.join('+')}:${p.label || p.cls}`).join('; ') : ''}`)
    } catch (e) {
        summary.push({ role, page: label, width, lang, fatal: String(e.message).slice(0, 150) })
        console.log(`${role} ${label} [${width}/${lang}] FATAL`)
    }
    await context.close()
}

async function main() {
    browser = await chromium.launch()
    const roles = (process.env.UI_AUDIT_ROLES || 'public,creator,business,advertiser').split(',')
    // точечный прогон: UI_AUDIT_ONLY="creator:/scheduler,advertiser:/advertiser"
    const ONLY = (process.env.UI_AUDIT_ONLY || '').split(',').filter(Boolean).map(s => s.trim())
    for (const role of roles) {
        if (role !== 'public') await apiPut(role, { role })
        let pages = PAGES[role] || []
        if (ONLY.length) pages = ONLY.filter(o => o.startsWith(`${role}:`)).map(o => o.slice(role.length + 1))
        for (const p of pages) {
            for (const width of WIDTHS) {
                for (const lang of LANGS) {
                    // [UI-VERIFY] один ретрай при fatal (preview/прод флаки)
                    for (let attempt = 0; attempt < 2; attempt++) {
                        const before = summary.length
                        await checkPage(role, p, width, lang)
                        if (!summary[before]?.fatal) break
                        summary.splice(before, 1)
                        await new Promise(r => setTimeout(r, 2000))
                    }
                    await new Promise(r => setTimeout(r, 300))
                }
            }
        }
    }
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
    const bad = summary.filter(s => s.fatal || s.problems?.length)
    console.log(`\nСтраниц проверено: ${summary.length}, с проблемными кнопками: ${bad.length}`)
    await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
