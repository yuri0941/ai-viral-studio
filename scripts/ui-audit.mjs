// [UI-POLISH] Скрин-аудит UI: все доступные экраны × 5 ширин × RU/EN.
// Проверки на каждом снимке: горизонтальный скролл, элементы за viewport, сырые i18n-ключи, console errors.
// [UI-VERIFY] Дополнительно: детерминированное гашение модалок (update/onboarding/cookie),
// верификация реального рендера роута (final URL + маркер страницы), роль выставляется через API.
// Запуск: node scripts/ui-audit.mjs   (ожидает preview на UI_AUDIT_BASE, default http://localhost:4173)
// Результат: reports/ui-audit/*.png + summary.json
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const OUT = path.resolve(process.env.UI_AUDIT_OUT || 'reports/ui-audit')
fs.mkdirSync(OUT, { recursive: true })

const WIDTHS = [360, 428, 768, 1280, 1920]
const LANGS = ['ru', 'en']
const HEIGHT = 900

const ROLES = (process.env.UI_AUDIT_ROLES || 'public,creator,business,advertiser').split(',')
const PUBLIC_PAGES = ['/', '/login', '/register']

// [UI-VERIFY] EXTRA_PAGES — роуты, которые роль должна РЕНДЕРИТЬ (полная матрица 5 ширин × RU/EN).
// PROBE_PAGES — роуты под guard'ами/legacy-редиректами: только проверка «куда редиректит» (1280/ru, 1 снимок).
const EXTRA_PAGES = {
    public: ['/', '/login', '/register', '/signup', '/privacy', '/terms', '/launch', '/roadmap', '/download'],
    creator: ['/dashboard', '/analytics', '/scheduler', '/video-creator', '/settings', '/ai-vs-human', '/leaderboard', '/challenge', '/creative-hub', '/creative-hub/chat', '/checkout'],
    business: ['/dashboard', '/analytics', '/scheduler', '/settings', '/business-spawner', '/ai-vs-human', '/leaderboard', '/challenge', '/creative-hub', '/creative-hub/chat'],
    advertiser: ['/advertiser', '/neuro-sales', '/settings', '/creative-hub', '/creative-hub/chat'],
}
const PROBE_PAGES = {
    creator: ['/ai-chat', '/neuro-sales', '/omega-supreme', '/project-factory', '/prediction', '/investment', '/boardroom', '/business-spawner', '/workspaces', '/business', '/advertiser', '/advertiser-requests', '/owner', '/admin', '/staff'],
    business: ['/business', '/boardroom', '/workspaces', '/video-creator', '/neuro-sales', '/omega-supreme', '/project-factory', '/prediction', '/investment', '/advertiser', '/advertiser-requests', '/owner', '/admin', '/staff'],
    advertiser: ['/advertiser-requests', '/dashboard', '/analytics', '/scheduler', '/video-creator', '/leaderboard', '/challenge', '/boardroom', '/workspaces', '/owner', '/admin'],
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

// [CHAT-HOTFIX] 2+ сегмента: ловим и двусегментные сырые ключи (chat.placeholder и т.п.)
const RAW_KEY_RE = /\b[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*(?:\.[a-z][a-zA-Z]*)*\b/g
const RAW_KEY_WHITELIST = /^(AI Viral|aiviral-studio|app\.aiviral\.studio|https?:|www\.|node_modules)/
// [CHAT-HOTFIX] домены/TLD — не i18n-ключи (studio.ru из aiviral-studio.ru, yandex.ru);
// email (uitest.creator@...) вычищается из текста до матчинга
const RAW_KEY_DOMAIN_RE = /\.(ru|com|net|org|io|dev|app|me|ai|xyz|studio|guru|email)$/i
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g

// [UI-POLISH] прокси продового API: preview на 127.0.0.1 не в CORS-whitelist бэкенда,
// поэтому перехватываем запросы и отвечаем с Access-Control-Allow-Origin.
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
// [CHAT-UNIFY] тестовые токены прода протухли и перевыпустить их нечем (регистрация закрыта,
// сид-креды не подходят). UI_AUDIT_MOCK_AUTH=1 — стабим ТОЛЬКО auth/me и users/me (профиль с ролью прогона),
// остальное API идёт в прод как раньше. Без флага поведение не меняется.
const MOCK_AUTH = process.env.UI_AUDIT_MOCK_AUTH === '1'
function mockUserFor(role, lang = 'ru') {
    return {
        _id: `audit-${role}`, id: `audit-${role}`,
        email: `audit.${role}@test.com`, name: `Audit ${role}`,
        role, trialTokens: 10,
        preferences: { language: lang, timezone: 'Europe/Moscow' },
    }
}
function corsHeaders() {
    return {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-requested-with',
    }
}
async function enableApiProxy(context, role, lang) {
    await context.route(`${API_ORIGIN}/**`, async (route) => {
        const req = route.request()
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders() })
        // [CHAT-UNIFY] mock-auth: профиль/квота из заглушки, всё остальное — в прод
        if (MOCK_AUTH && role && role !== 'public') {
            const u = new URL(req.url())
            const user = mockUserFor(role, lang)
            const json = (obj, status = 200) => route.fulfill({ status, headers: { ...corsHeaders(), 'content-type': 'application/json' }, body: JSON.stringify(obj) })
            if (u.pathname === '/api/auth/me' && req.method() === 'GET') return json({ success: true, user })
            if (u.pathname === '/api/users/me' && req.method() === 'GET') return json({ success: true, user, data: user })
            if (u.pathname === '/api/users/me' && req.method() === 'PUT') return json({ success: true, user })
            if (u.pathname === '/api/users/me/quota') return json({ status: 'success', data: { trialTokens: 10 } })
        }
        try {
            const headers = { ...req.headers() }
            delete headers.host
            delete headers.origin
            delete headers.referer
            const resp = await fetch(req.url(), {
                method: req.method(),
                headers,
                body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postDataBuffer(),
                signal: AbortSignal.timeout(20000), // [UI-VERIFY] не вешать route-handler на дохлом проде
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
        // [UI-VERIFY] детерминированное гашение модалок ДО первого рендера:
        localStorage.setItem('omega_onboarding_tour_done', 'true') // onboarding tour (driver.js)
        localStorage.setItem('cookie_consent', 'accepted') // cookie-баннер
    }, [token, lang])
    await enableApiProxy(context, role, lang)
    return context
}

// [UI-VERIFY] роль аккаунта выставляем через API (P16 role switching),
// иначе прогоны business/advertiser идут под creator и покрытие иллюзорно
async function setUserRole(role) {
    if (MOCK_AUTH) return // роль уже в mock-профиле, прод не трогаем
    const token = tokenFor(role)
    if (!token) return
    try {
        const resp = await fetch(`${API_ORIGIN}/api/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ role }),
        })
        const j = await resp.json().catch(() => ({}))
        console.log(`[role:${role}] PUT /users/me role → ${j?.user?.role || resp.status}`)
    } catch (e) { console.warn(`[role:${role}] set role failed:`, e.message) }
}

async function setUserLanguage(role, lang) {
    if (MOCK_AUTH) return // язык выставляется через localStorage в newContext
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

async function checkPage(page, label, width, lang, role = 'public') {
    const consoleErrors = []
    page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`.slice(0, 200)))
    page.on('console', msg => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (/net::|Failed to load resource|favicon|status of 4|status of 5/i.test(text)) return // сетевые/API — отдельно не ломаем критерий
        consoleErrors.push(text.slice(0, 200))
    })

    try {
        await page.goto(`${BASE}${label}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    } catch (e) {
        summary.push({ role, page: label, width, lang, fatal: e.message.slice(0, 150) })
        return
    }
    // SPA: даём React отрендериться и данным прийти, не ждём полного networkidle (prod API поллит)
    await page.waitForTimeout(4000)

    // [UI-VERIFY] Детерминированное гашение модалок: update-модалка приезжает с API ПОСЛЕ рендера,
    // поэтому опрашиваем в цикле, а не один раз. driver.js (onboarding tour) гасим как fallback —
    // основной путь: флаг omega_onboarding_tour_done в init-script.
    const modalsClosed = []
    for (let i = 0; i < 14; i++) {
        let acted = false
        // onboarding tour (driver.js) — закрыть крестиком поповера
        const tourClose = page.locator('.driver-popover .driver-popover-close-btn').first()
        if (await tourClose.isVisible().catch(() => false)) {
            await tourClose.click().catch(() => {})
            modalsClosed.push('onboarding-tour')
            acted = true
        }
        // любой полноэкранный overlay с высоким z (update-модалка и т.п.) — первая кнопка = закрытие (X/skip)
        const overlay = page.locator('div.fixed.inset-0[class*="z-["]').first()
        if (await overlay.isVisible().catch(() => false)) {
            const btn = overlay.locator('button').first()
            const label = ((await btn.getAttribute('aria-label').catch(() => null)) || (await btn.innerText().catch(() => '')) || '').trim().slice(0, 40)
            await btn.click().catch(() => {})
            modalsClosed.push(`overlay:${label || 'btn'}`)
            acted = true
        }
        if (!acted) break
        await page.waitForTimeout(700)
    }
    // верификация: ни одного видимого полноэкранного overlay/тура не осталось.
    // Порог z>=100: update-модалка (z-[200]) и driver.js поповер — модалки ПОВЕРХ контента;
    // z-50 и ниже — собственный полноэкранный UI страницы (AIVideoCreator-роут, дроуер сайдбара).
    const modalLeftover = await page.evaluate(() => {
        if (document.querySelector('.driver-popover')) return 'onboarding-tour'
        for (const el of document.querySelectorAll('div.fixed.inset-0')) {
            const r = el.getBoundingClientRect()
            const z = parseInt(getComputedStyle(el).zIndex || '0', 10)
            if (r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9 && z >= 100 && getComputedStyle(el).visibility !== 'hidden') {
                return (el.className?.toString() || 'overlay').slice(0, 80)
            }
        }
        return null
    }).catch(() => null)

    // [UI-VERIFY] верификация реального рендера: куда в итоге попали + маркер страницы
    const render = await page.evaluate(() => {
        const h = document.querySelector('main h1, main h2, h1, h2')
        return {
            path: location.pathname,
            title: document.title || '',
            marker: (h?.innerText || '').trim().slice(0, 80),
        }
    }).catch(() => ({ path: '', title: '', marker: '' }))
    const redirected = render.path !== label.split('?')[0] // [CHECKOUT-UNIFY] label может нести query (?tab=...)

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

    const rawKeys = [...new Set((metrics.text.replace(EMAIL_RE, ' ').match(RAW_KEY_RE) || [])
        .filter(k => !RAW_KEY_WHITELIST.test(k) && !RAW_KEY_DOMAIN_RE.test(k) && k.split('.').every(p => p.length > 1)))].slice(0, 10)

    const safeName = (label === '/' ? 'home' : label.replace(/^\//, '').replace(/[/?=&]/g, '_'))
    const shot = `${role}_${safeName}_${width}_${lang}.png`
    let shotError = null
    try {
        await page.screenshot({ path: path.join(OUT, shot), fullPage: false, timeout: 20000 })
    } catch (e) {
        shotError = e.message.slice(0, 120) // [UI-VERIFY] скрин не должен валить весь прогон
    }

    summary.push({
        role, page: label, width, lang,
        hScroll: metrics.hScroll,
        offenders: metrics.offenders,
        rawKeys,
        consoleErrors,
        shotError,
        redirected,
        finalPath: render.path,
        marker: render.marker,
        modalsClosed,
        modalLeftover,
        screenshot: shot,
    })
    const flags = [
        metrics.hScroll && 'H-SCROLL',
        rawKeys.length && 'RAW-KEYS',
        consoleErrors.length && 'CONSOLE',
        redirected && `REDIRECT→${render.path}`,
        modalLeftover && 'MODAL-LEFT',
        shotError && 'SHOT-ERR',
    ].filter(Boolean).join(',')
    console.log(`${role} ${label} [${width}/${lang}] ${flags || 'OK'}`)
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
        if (role !== 'public') await setUserRole(role) // [UI-VERIFY] реальная роль перед прогоном
        for (const p of allPages[role]) {
            for (const width of WIDTHS) {
                for (const lang of LANGS) {
                    // [UI-VERIFY] один ретрай при fatal или неожиданном редиректе
                    // (429 от прода при частых контекстах → ложный Navigate to '/')
                    for (let attempt = 0; attempt < 2; attempt++) {
                        const before = summary.length
                        try {
                            const context = await newContext(role, width, lang)
                            const page = await context.newPage()
                            await checkPage(page, p, width, lang, role)
                            await context.close()
                        } catch (e) {
                            summary.push({ role, page: p, width, lang, fatal: String(e.message).slice(0, 150) })
                        }
                        const entry = summary[before]
                        if (!entry?.fatal && !entry?.redirected && !entry?.shotError) break
                        console.log(`${role} ${p} [${width}/${lang}] retry: ${entry?.fatal ? 'fatal' : entry?.shotError ? 'shot' : 'unexpected-redirect'}`)
                        summary.splice(before, 1)
                        await new Promise(r => setTimeout(r, 2000))
                    }
                    await new Promise(r => setTimeout(r, 400)) // бережём прод-API от rate-limit
                }
            }
        }
        // [UI-VERIFY] probe редиректящих/guard-роутов: один прогон 1280/ru, фиксируем final URL + маркер
        const probes = ONLY.length ? [] : (PROBE_PAGES[role] || [])
        for (const p of probes) {
            const context = await newContext(role, 1280, 'ru')
            const page = await context.newPage()
            await checkPage(page, p, 1280, 'ru', role)
            await context.close()
        }
    }
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
    const bad = summary.filter(s => s.fatal || s.hScroll || s.rawKeys?.length || s.consoleErrors?.length || s.modalLeftover)
    const redir = summary.filter(s => s.redirected)
    console.log(`\nВсего снимков: ${summary.length}, с проблемами: ${bad.length}, редиректов: ${new Set(redir.map(r => `${r.page}→${r.finalPath}`)).size}`)
    await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
