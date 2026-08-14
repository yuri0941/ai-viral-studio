// [UI-POLISH] Скрин-аудит UI: все доступные экраны × 5 ширин × RU/EN.
// Проверки на каждом снимке: горизонтальный скролл, элементы за viewport, сырые i18n-ключи, console errors.
// Запуск: node scripts/ui-audit.mjs   (ожидает preview на UI_AUDIT_BASE, default http://localhost:4173)
// Результат: reports/ui-audit/*.png + summary.json
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const OUT = path.resolve('reports/ui-audit')
fs.mkdirSync(OUT, { recursive: true })

const WIDTHS = [360, 428, 768, 1280, 1920]
const LANGS = ['ru', 'en']
const HEIGHT = 900

const ROLES = (process.env.UI_AUDIT_ROLES || 'public,creator,business,advertiser').split(',')
const PUBLIC_PAGES = ['/', '/login', '/register']

// [UI-POLISH] явные маршруты (сайдбар рендерится кнопками, discovery по a[href] их не видит)
const EXTRA_PAGES = {
    public: ['/', '/login', '/register', '/signup', '/privacy', '/terms', '/launch', '/roadmap', '/download'],
    creator: ['/dashboard', '/ai-chat', '/analytics', '/scheduler', '/video-creator', '/neuro-sales', '/omega-supreme', '/project-factory', '/prediction', '/investment', '/settings', '/ai-vs-human', '/boardroom', '/business-spawner', '/leaderboard', '/challenge', '/creative-hub', '/workspaces', '/checkout'],
    business: ['/business', '/dashboard', '/settings', '/analytics', '/scheduler'],
    advertiser: ['/advertiser', '/advertiser-requests', '/dashboard', '/settings'],
}
const DISCOVERY = process.env.UI_AUDIT_DISCOVERY === '1' // по умолчанию — явный список
// точечная пересъёмка: UI_AUDIT_ONLY="creator:/scheduler,public:/,public:/privacy"
const ONLY = (process.env.UI_AUDIT_ONLY || '').split(',').filter(Boolean).map(s => s.trim())

function tokenFor(role) {
    try {
        const j = JSON.parse(fs.readFileSync(`.tmp-ui-polish/token-${role}.json`, 'utf8'))
        return j.token || j.data?.accessToken || null
    } catch { return null }
}

const RAW_KEY_RE = /\b[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*\b/g
const RAW_KEY_WHITELIST = /^(AI Viral|aiviral-studio|app\.aiviral\.studio|https?:|www\.|node_modules)/

// [UI-POLISH] прокси продового API: preview на 127.0.0.1 не в CORS-whitelist бэкенда,
// поэтому перехватываем запросы и отвечаем с Access-Control-Allow-Origin.
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
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
            delete headers.host
            delete headers.origin
            delete headers.referer
            const resp = await fetch(req.url(), {
                method: req.method(),
                headers,
                body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postDataBuffer(),
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

const summary = []
let browser

async function newContext(role, width, lang) {
    // [UI-POLISH] для авторизованных страниц язык берётся из user.preferences (DashboardShell),
    // поэтому выставляем его через API ДО загрузки страницы
    if (role !== 'public') await setUserLanguage(role, lang)
    const context = await browser.newContext({
        viewport: { width, height: HEIGHT },
        deviceScaleFactor: 1,
        isMobile: width < 768,
        hasTouch: width < 768,
    })
    const token = role !== 'public' ? tokenFor(role) : null
    await context.addInitScript(([t, l]) => {
        if (t) localStorage.setItem('token', t)
        localStorage.removeItem('user_profile') // не давать кэшу профиля перекрыть язык
        localStorage.setItem('app_language', l)
        localStorage.setItem('i18n-lang', l)
    }, [token, lang])
    await enableApiProxy(context)
    return context
}

async function setUserLanguage(role, lang) {
    const token = tokenFor(role)
    if (!token) return
    try {
        await fetch(`${API_ORIGIN}/api/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ preferences: { language: lang } }),
        })
    } catch { /* best-effort */ }
}

async function checkPage(page, label, width, lang) {
    const consoleErrors = []
    page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`.slice(0, 200)))
    page.on('console', msg => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (/net::|Failed to load resource|favicon|status of 4|status of 5/i.test(text)) return // сетевые/API — отдельно не ломаем критерий
        consoleErrors.push(text.slice(0, 200))
    })

    try {
        await page.goto(`${BASE}${label}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    } catch (e) {
        summary.push({ page: label, width, lang, fatal: e.message.slice(0, 150) })
        return
    }
    // SPA: даём React отрендериться и данным прийти, не ждём полного networkidle (prod API поллит)
    await page.waitForTimeout(4000)

    // [UI-POLISH] закрыть модалку обновления PWA, если перекрывает экран (не влияет на продукт)
    const updateModalClose = page.locator('div.fixed.inset-0[class*="z-[200]"] button').first()
    if (await updateModalClose.isVisible().catch(() => false)) {
        await updateModalClose.click().catch(() => {})
        await page.waitForTimeout(600)
    }

    const metrics = await page.evaluate(() => {
        const vw = window.innerWidth
        const doc = document.scrollingElement || document.documentElement
        const hScroll = doc.scrollWidth > vw + 1
        const offenders = []
        if (hScroll) {
            for (const el of document.querySelectorAll('body *')) {
                const r = el.getBoundingClientRect()
                if (r.width && (r.right > vw + 4 || r.left < -4)) {
                    const cls = (el.className?.toString() || '').slice(0, 60)
                    offenders.push(`${el.tagName}.${cls} right=${Math.round(r.right)}`)
                    if (offenders.length >= 5) break
                }
            }
        }
        const text = document.body?.innerText || ''
        return { hScroll, offenders, text }
    })

    const rawKeys = [...new Set((metrics.text.match(RAW_KEY_RE) || [])
        .filter(k => !RAW_KEY_WHITELIST.test(k) && k.split('.').every(p => p.length > 1)))].slice(0, 10)

    const safeName = (label === '/' ? 'home' : label.replace(/^\//, '').replace(/[/?=&]/g, '_'))
    const shot = `${safeName}_${width}_${lang}.png`
    await page.screenshot({ path: path.join(OUT, shot), fullPage: false })

    summary.push({
        page: label, width, lang,
        hScroll: metrics.hScroll,
        offenders: metrics.offenders,
        rawKeys,
        consoleErrors,
        screenshot: shot,
    })
    const flags = [metrics.hScroll && 'H-SCROLL', rawKeys.length && 'RAW-KEYS', consoleErrors.length && 'CONSOLE'].filter(Boolean).join(',')
    console.log(`${label} [${width}/${lang}] ${flags || 'OK'}`)
}

async function discoverPages(role) {
    if (role === 'public') return PUBLIC_PAGES
    const context = await newContext(role, 1280, 'ru')
    const page = await context.newPage()
    const links = new Set(['/dashboard'])
    try {
        await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 45000 })
        await page.waitForTimeout(2000)
        for (const href of await page.$$eval('a[href]', els => els.map(e => e.getAttribute('href')))) {
            if (href && href.startsWith('/') && !href.startsWith('//') && !href.includes('#')) links.add(href.split('?')[0])
        }
    } catch (e) {
        console.warn(`[discover:${role}] failed:`, e.message)
    }
    await context.close()
    return [...links].sort()
}

async function main() {
    browser = await chromium.launch()
    const allPages = {}
    for (const role of ROLES) {
        const discovered = DISCOVERY ? await discoverPages(role) : []
        allPages[role] = [...new Set([...(EXTRA_PAGES[role] || []), ...discovered])].sort()
        const only = ONLY.filter(o => o.startsWith(`${role}:`)).map(o => o.slice(role.length + 1))
        if (ONLY.length) allPages[role] = only.length ? only : []
        console.log(`[${role}] страниц: ${allPages[role].length}`)
    }
    for (const role of ROLES) {
        for (const p of allPages[role]) {
            for (const width of WIDTHS) {
                for (const lang of LANGS) {
                    const context = await newContext(role, width, lang)
                    const page = await context.newPage()
                    await checkPage(page, p, width, lang)
                    await context.close()
                }
            }
        }
    }
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
    const bad = summary.filter(s => s.fatal || s.hScroll || s.rawKeys?.length || s.consoleErrors?.length)
    console.log(`\nВсего снимков: ${summary.length}, с проблемами: ${bad.length}`)
    await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
