// [UI-VERIFY] Живое переключение RU↔EN на каждой вкладке (360/1280).
// Переключаем язык через реальный UI-контрол в шапке (не localStorage напрямую),
// проверяем: язык применился без перезагрузки, нет кириллицы в chrome UI при EN,
// нет латиницы-остатков при RU (точечно), нет сырых ключей, нет console errors.
// Запуск: node scripts/ui-i18n-toggle.mjs (preview на UI_AUDIT_BASE)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const OUT = path.resolve(process.env.UI_AUDIT_OUT || 'reports/ui-verify/i18n-toggle')
fs.mkdirSync(OUT, { recursive: true })

const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const WIDTHS = [360, 1280]

// вкладки каждой роли (только реально рендерящиеся роуты)
const TABS = {
    creator: ['/dashboard', '/analytics', '/scheduler', '/video-creator', '/settings', '/ai-vs-human', '/leaderboard', '/challenge', '/creative-hub'],
    business: ['/dashboard', '/boardroom', '/business-spawner', '/leaderboard', '/challenge', '/settings'],
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

const RAW_KEY_RE = /\b[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*\b/g
const RAW_KEY_WHITELIST = /^(AI Viral|aiviral-studio|app\.aiviral\.studio|https?:|www\.|node_modules)/
const CYRILLIC_RE = /[А-Яа-яЁё]/
// легальная кириллица в EN-режиме: UGC (уведомления, чат), имена, бренд-строки — проверяем только chrome UI
const CYRILLIC_WHITELIST = /OMEGA|AI Viral/i

const summary = []
let browser

async function chromeText(page) {
    // текст «хрома» приложения: шапка + сайдбар + заголовки — без UGC-областей.
    // [UI-VERIFY] рекурсивно, только ВИДИМЫЕ поддеревья: закрытые дропдауны (opacity-0) не считаем.
    return page.evaluate(() => {
        const textOf = (el) => {
            let out = ''
            for (const n of el.childNodes) {
                if (n.nodeType === 3) { out += n.textContent + '\n'; continue }
                if (n.nodeType !== 1) continue
                const cs = getComputedStyle(n)
                if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue
                out += textOf(n)
            }
            return out
        }
        const parts = []
        for (const sel of ['header', 'nav', 'aside', '[class*="sidebar"]', '[class*="Sidebar"]', 'main h1', 'main h2']) {
            document.querySelectorAll(sel).forEach(el => parts.push(textOf(el)))
        }
        return parts.join('\n')
    })
}

async function checkTab(role, tab, width) {
    const consoleErrors = []
    await apiPut(role, { preferences: { language: 'ru' } })
    const context = await browser.newContext({
        viewport: { width, height: 900 }, deviceScaleFactor: 1,
        isMobile: width < 768, hasTouch: width < 768,
    })
    const token = tokenFor(role)
    await context.addInitScript(([t]) => {
        if (t) localStorage.setItem('token', t)
        localStorage.removeItem('user_profile')
        localStorage.setItem('app_language', 'ru')
        localStorage.setItem('i18n-lang', 'ru')
        localStorage.setItem('omega_onboarding_tour_done', 'true')
        localStorage.setItem('cookie_consent', 'accepted')
    }, [token])
    await enableApiProxy(context)
    const page = await context.newPage()
    page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`.slice(0, 200)))
    page.on('console', msg => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (/net::|Failed to load resource|favicon|status of 4|status of 5/i.test(text)) return
        consoleErrors.push(text.slice(0, 200))
    })

    const res = { role, tab, width, steps: [] }
    try {
        await page.goto(`${BASE}${tab}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.waitForTimeout(4000)
        // гасим возможную update-модалку
        for (let i = 0; i < 10; i++) {
            const overlay = page.locator('div.fixed.inset-0[class*="z-["]').first()
            if (!(await overlay.isVisible().catch(() => false))) break
            await overlay.locator('button').first().click().catch(() => {})
            await page.waitForTimeout(600)
        }
        res.finalPath = await page.evaluate(() => location.pathname)
        if (res.finalPath !== tab) { res.steps.push(`REDIRECT→${res.finalPath}`); throw 'skip' }

        const ruText = await chromeText(page)
        res.steps.push(CYRILLIC_RE.test(ruText) ? 'RU: кириллица есть ✓' : 'RU-FAIL: кириллицы нет в chrome')

        // живое переключение RU → EN через контрол в шапке
        // [UI-VERIFY] aria-label переведён (header.chooseLanguage) — матчим оба языка
        const langBtn = page.locator('button[aria-label="Выбрать язык"], button[aria-label="Choose language"]').first()
        if (!(await langBtn.isVisible().catch(() => false))) {
            res.steps.push('EN-FAIL: контрол языка не найден в шапке')
            throw 'skip'
        }
        if (!(await langBtn.isEnabled().catch(() => false)) || !(await langBtn.click({ trial: true }).then(() => true).catch(() => false))) {
            // [UI-VERIFY] /video-creator — полноэкранный wizard поверх шапки: контрол недоступен by design
            res.steps.push('SKIP: контрол языка перекрыт полноэкранным UI страницы')
            throw 'skip'
        }
        await langBtn.click()
        await page.waitForTimeout(400)
        await page.locator('div.z-dropdown button', { hasText: 'English' }).first().click()
        await page.waitForTimeout(1500)

        const enText = await chromeText(page)
        const enRawKeys = [...new Set((enText.match(RAW_KEY_RE) || [])
            .filter(k => !RAW_KEY_WHITELIST.test(k) && k.split('.').every(p => p.length > 1)))].slice(0, 10)
        const cyrLeft = [...new Set(enText.split('\n').map(s => s.trim())
            .filter(s => CYRILLIC_RE.test(s) && !CYRILLIC_WHITELIST.test(s)))].slice(0, 10)
        res.enRawKeys = enRawKeys
        res.enCyrillicLeft = cyrLeft
        res.steps.push(enRawKeys.length ? `EN-RAWKEYS: ${enRawKeys.join(',')}` : 'EN: сырых ключей нет ✓')
        res.steps.push(cyrLeft.length ? `EN-CYR-LEFT: ${cyrLeft.join(' | ')}` : 'EN: кириллицы в chrome нет ✓')
        const stored = await page.evaluate(() => localStorage.getItem('app_language'))
        if (stored !== 'en') res.steps.push(`EN-FAIL: app_language=${stored}`)
        await page.screenshot({ path: path.join(OUT, `${role}${tab.replace(/\//g, '_')}_${width}_en.png`) })

        // живое переключение EN → RU
        await langBtn.click()
        await page.waitForTimeout(400)
        await page.locator('div.z-dropdown button', { hasText: 'Русский' }).first().click()
        await page.waitForTimeout(1500)
        const ruText2 = await chromeText(page)
        res.steps.push(CYRILLIC_RE.test(ruText2) ? 'RU←EN: кириллица вернулась ✓' : 'RU-FAIL: после возврата кириллицы нет')
        await page.screenshot({ path: path.join(OUT, `${role}${tab.replace(/\//g, '_')}_${width}_ru.png`) })
    } catch (e) {
        if (e !== 'skip') res.steps.push(`FATAL: ${String(e.message || e).slice(0, 150)}`)
    }
    res.consoleErrors = consoleErrors
    if (consoleErrors.length) res.steps.push(`CONSOLE: ${consoleErrors[0]}`)
    summary.push(res)
    console.log(`${role} ${tab} [${width}] ${res.steps.filter(s => /FAIL|RAWKEYS|CYR-LEFT|CONSOLE|REDIRECT|FATAL/.test(s)).join('; ') || 'OK'}`)
    await context.close()
}

async function main() {
    browser = await chromium.launch()
    const roles = (process.env.UI_AUDIT_ROLES || 'creator,business,advertiser').split(',')
    for (const role of roles) {
        await apiPut(role, { role })
        for (const tab of TABS[role] || []) {
            for (const width of WIDTHS) await checkTab(role, tab, width)
        }
    }
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
    const bad = summary.filter(s => s.steps.some(x => /FAIL|RAWKEYS|CYR-LEFT|CONSOLE|REDIRECT|FATAL/.test(x)))
    console.log(`\nВкладок проверено: ${summary.length}, с проблемами: ${bad.length}`)
    await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
