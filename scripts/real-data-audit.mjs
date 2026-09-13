// [REAL-DATA] З1+З5.3: аудит цифр фактом (playwright) + пруфы реестра цен.
// Часть A (скрины/экраны): owner × (dark, light) + client — известные моки должны ОТСУТСТВОВАТЬ,
// empty-state присутствовать там, где данных нет. Скрины → reports/real-data/shots.
// Часть B (реестр цен, API-факт): смена цены → видна на клиентском эндпоинте без деплоя;
// below_cost → 400 при завышенной измеренной себестоимости (синтетический лог, потом чистится).
// Запуск: backend :18080 + preview :4173 (npm run build перед этим).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')
const requireBackend = createRequire(path.resolve('backend', 'package.json'))
const dotenv = requireBackend('dotenv')
dotenv.config({ path: path.resolve('backend/.env') })
const mongoose = requireBackend('mongoose')

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API || 'http://localhost:18080'
const OUT = path.resolve('reports/real-data/shots')
fs.mkdirSync(OUT, { recursive: true })

let failures = 0
const check = (name, ok, detail = '') => {
    if (!ok) failures++
    console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 140) : ''}`)
}

// Известные моки из ТЗ — ни одного на экране быть не должно
const MOCK_PATTERNS = [
    /AI Worker/i, /CDN Node/i, /35\s?936/, /\$32\s?300/, /\+324/, /99\.0\s?%/,
    /DEMO50/, /до 40%/, /TechBrand/, /Анна Петрова/, /Uptime.{0,12}9\d(\.\d+)?\s?%/i,
    /\+\$5/, /15\.2%/, /22\.1%/, /Quick.*Growth.*Wealth/s, /churn.{0,20}2\.1/i,
    // [REAL-DATA-2] хвосты: фейк-логи агентов, mock-оплата, тестовые карты
    /Pricing Agent ::/i, /Revenue Agent ::/i, /Mock-оплата|mock-режим по умолчанию/i, /5555\s?5555/,
]
// Сырые ключи/секреты не должны светиться в теле страницы
const RAW_KEY_PATTERNS = [
    /sk_live_[\w-]{8,}/, /sk_test_[\w-]{8,}/, /gsk_[\w-]{8,}/, /sk-or-[\w-]{8,}/,
    /xox[bap]-[\w-]{8,}/, /AKIA[0-9A-Z]{12,}/, /-----BEGIN [A-Z ]*PRIVATE KEY/,
]

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

async function withPage(browser, { token, theme = 'dark', width = 1280 }, fn) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ru-RU' })
    context.setDefaultTimeout(30000)
    await proxyApi(context)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
    await page.addInitScript(([tk, th]) => {
        if (tk) localStorage.setItem('token', tk)
        localStorage.setItem('theme', th)
        localStorage.setItem('ai-viral-theme', th)
        localStorage.setItem('cookie_consent', 'accepted')
    }, [token, theme])
    try { await fn(page, errors) } finally { await context.close() }
}

async function auditScreen(browser, { token, theme, url, name, width = 1280, wait = 2500, shot = true }) {
    await withPage(browser, { token, theme, width }, async (page, errors) => {
        await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(wait)
        const tag = `${name} [${theme} ${width}]`
        const body = await page.locator('body').innerText().catch(() => '')
        const hits = MOCK_PATTERNS.filter(re => re.test(body)).map(String)
        check(`${tag}: моков нет`, hits.length === 0, hits.join(', '))
        const keyHits = RAW_KEY_PATTERNS.filter(re => re.test(body)).map(String)
        check(`${tag}: сырых ключей нет`, keyHits.length === 0, keyHits.join(', '))
        check(`${tag}: без pageerror`, errors.length === 0, errors[0] || '')
        const hScroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => 0)
        check(`${tag}: без горизонтального скролла`, hScroll <= 1, `overflow=${hScroll}px`)
        if (shot) {
            await page.screenshot({ path: `${OUT}/${name}-${theme}-${width}.png`, fullPage: false })
            console.log(`📸 ${name}-${theme}-${width}.png`)
        }
    })
}

async function main() {
    const ownerToken = await login('owner.test@aiviral-studio.ru', 'TestOwner123!')
    const clientToken = await login('creator.test@aiviral-studio.ru', 'TestCreator123!')
    const advertiserToken = await login('advertiser.test@aiviral-studio.ru', 'TestAdvertiser123!')
    check('вход owner', !!ownerToken)
    check('вход client', !!clientToken)
    check('вход advertiser', !!advertiserToken)

    const browser = await chromium.launch()
    try {
        // ── A. Полный обход: ВСЕ табы owner × 2 темы × 360/1280 (скрины только dark) ──
        const ownerTabs = [
            'overview', 'team', 'cabinets', 'finance', 'legal', 'audit', 'subscriptions',
            'addonsManage', 'payments', 'subscribers', 'servers', 'updates', 'promo', 'news',
            'referrals', 'advertising', 'pricing', 'security', 'integrations', 'aiAnalytics',
            'logs', 'agents', 'chat', 'omega', 'neural', 'tasks', 'apiKeys', 'externalKeys',
            'supreme', 'notifications', 'help', 'feedback', 'devStudio', 'devstudio', 'swarm',
            'autofix', 'autoImprove', 'abTest', 'learning', 'research', 'monitoring', 'resources',
            'roadmap', 'brainviz', 'memory', 'boardroom', 'prediction', 'investment', 'telegram',
            'support', 'channelManager', 'adOrders', 'salesMetrics', 'omegaFinance', 'omegaSkills',
            'omegaMemory', 'personality', 'dream', 'requisites', 'legalSettings', 'clients',
            'monetization', 'brandVoice', 'templates', 'scout', 'whiteLabel', 'workspaces',
            'developer', 'qr', 'franchise', 'fleet', 'selfHealing', 'selfOptimize', 'sandbox',
            'approvalQueue', 'factory', 'analytics', 'scheduler',
        ]
        for (const tab of ownerTabs) {
            for (const theme of ['dark', 'light']) {
                for (const width of [1280, 360]) {
                    await auditScreen(browser, {
                        token: ownerToken, theme, width,
                        url: `/owner?tab=${tab}`, name: `owner-${tab}`,
                        shot: theme === 'dark',
                    })
                }
            }
        }
        // ── Creator (client) ──
        const clientScreens = [
            ['/dashboard', 'client-dashboard'],
            ['/analytics', 'client-analytics'],
            ['/settings', 'client-settings'],
            ['/credits', 'client-credits'],
            ['/scheduler', 'client-scheduler'],
            ['/creative-hub/chat', 'client-hub-chat'],
            ['/creative-hub/analyzer', 'client-hub-analyzer'],
            ['/creative-hub/viral', 'client-hub-viral'],
            ['/creative-hub/planner', 'client-hub-planner'],
        ]
        for (const [url, name] of clientScreens) {
            for (const theme of ['dark', 'light']) {
                for (const width of [1280, 360]) {
                    await auditScreen(browser, { token: clientToken, theme, width, url, name, shot: theme === 'dark' })
                }
            }
        }
        // ── Advertiser ──
        const advertiserScreens = [
            ['/advertiser', 'adv-cabinet'],
            ['/advertiser-requests', 'adv-requests'],
        ]
        for (const [url, name] of advertiserScreens) {
            for (const theme of ['dark', 'light']) {
                for (const width of [1280, 360]) {
                    await auditScreen(browser, { token: advertiserToken, theme, width, url, name, shot: theme === 'dark' })
                }
            }
        }
    } finally {
        await browser.close()
    }

    // ── B. Реестр цен: факт через API ──
    const headers = { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' }
    const getClientPrices = async () => {
        const r = await fetch(`${LOCAL_API}/api/omega/action-prices`, { headers })
        return r.json()
    }

    // B1. hot-reload: меняем цену чата → клиентский эндпоинт видит новую цену без деплоя
    const before = await getClientPrices()
    const chatBefore = before?.prices?.find(p => p.id === 'chat')?.costCredits
    const newPrice = chatBefore === 2 ? 3 : 2
    const setRes = await fetch(`${LOCAL_API}/api/owner/action-prices`, {
        method: 'POST', headers, body: JSON.stringify({ chatMessageCostCredits: newPrice }),
    })
    check('B1: owner меняет цену чата → 200', setRes.status === 200, `status=${setRes.status}`)
    const after = await getClientPrices()
    const chatAfter = after?.prices?.find(p => p.id === 'chat')?.costCredits
    check(`B1: цена чата на клиенте ${chatBefore}→${chatAfter} без деплоя`, chatAfter === newPrice, `after=${chatAfter}`)
    // откат
    await fetch(`${LOCAL_API}/api/owner/action-prices`, { method: 'POST', headers, body: JSON.stringify({ chatMessageCostCredits: 1 }) })

    // B2. below_cost → 400: синтетический лог с огромной себестоимостью → цена 1✦ запрещена
    const imp = (p) => import(pathToFileURL(path.resolve('backend', p)).href)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
    const { default: AiUsageLog } = await imp('models/AiUsageLog.js')
    const synthetic = await AiUsageLog.create({ provider: 'qa-synthetic', promptChars: 4e6, completionChars: 4e6, estTokens: 2e6, estCostUsd: 500, action: 'chat' })
    try {
        const lowRes = await fetch(`${LOCAL_API}/api/owner/action-prices`, {
            method: 'POST', headers, body: JSON.stringify({ chatMessageCostCredits: 1 }),
        })
        const lowJson = await lowRes.json().catch(() => ({}))
        check('B2: below_cost → 400', lowRes.status === 400 && lowJson?.code === 'below_cost', `status=${lowRes.status} code=${lowJson?.code} min=${lowJson?.minCredits}`)
        check('B2: текст «минимум N✦»', /Минимум \d+✦/.test(lowJson?.error || ''), lowJson?.error)
    } finally {
        await AiUsageLog.deleteOne({ _id: synthetic._id })
    }
    // целостность: цена чата после тестов = 1
    const finalPrices = await getClientPrices()
    check('B3: после тестов цена чата = 1✦ (откат чистый)', finalPrices?.prices?.find(p => p.id === 'chat')?.costCredits === 1)

    // B4. аналитика расхода отдаёт строки реестра
    const an = await (await fetch(`${LOCAL_API}/api/owner/action-analytics?days=7`, { headers })).json()
    check('B4: action-analytics 7д — 8 функций', Array.isArray(an?.rows) && an.rows.length === 8, `rows=${an?.rows?.length}`)

    await mongoose.disconnect()

    console.log(`\n═══ REAL-DATA AUDIT: ${failures === 0 ? 'ВСЁ ЗЕЛЁНОЕ' : `провалов: ${failures}`} ═══`)
    process.exit(failures ? 1 : 0)
}

main().catch(e => { console.error('❌ fatal:', e.message); process.exit(1) })
