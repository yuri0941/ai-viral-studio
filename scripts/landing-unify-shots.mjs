// [LANDING-UNIFY] точечные скрины для отчёта: герой + тарифы × 360/1280 × RU/EN.
// Прод-API сейчас недоступен из этой сети (HTTP:000) — при фейле прокси отдаём фикстуры,
// повторяющие продовые данные PlanConfig (free 0 / pro 990 / agency 4990, founding 50 слотов).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const OUT = path.resolve('reports/landing-unify/report-shots')
fs.mkdirSync(OUT, { recursive: true })

const API_ORIGIN = 'https://aiviral-backend.onrender.com'

const FIXTURES = {
    '/api/plan-config': {
        success: true,
        plans: [
            { plan: 'free', price: 0, currency: 'RUB', quotas: { generationsPerDay: 20, youtubeUploadsPerDay: 2, youtubeChannels: 1, mediaQueueMB: 500, scheduledPostsMax: 10, aiTagsPerDay: 5 }, features: { publishAt: true } },
            { plan: 'pro', price: 990, currency: 'RUB', quotas: { generationsPerDay: 200, youtubeUploadsPerDay: 5, youtubeChannels: 3, mediaQueueMB: 5120, scheduledPostsMax: 100, aiTagsPerDay: 50 }, features: { publishAt: true, playlists: true, brandVoice: true, abTesting: true, analytics: true } },
            { plan: 'agency', price: 4990, currency: 'RUB', quotas: { generationsPerDay: 1000, youtubeUploadsPerDay: 10, youtubeChannels: 10, mediaQueueMB: 25600, scheduledPostsMax: 0, aiTagsPerDay: 200 }, features: { publishAt: true, playlists: true, brandVoice: true, abTesting: true, analytics: true, whiteLabel: true } },
        ],
    },
    '/api/launch/beta/slots': { success: true, data: { remaining: 37, total: 50, foundingActive: true } },
    '/api/testimonials': { success: true, testimonials: [] },
    '/api/launch/founding-members': { success: true, data: { members: [] } },
    '/api/launch/waitlist/count': { success: true, data: { count: 128 } },
}

function corsHeaders() {
    return {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-requested-with',
        'content-type': 'application/json',
    }
}

const browser = await chromium.launch()
for (const width of [360, 1280]) {
    for (const lang of ['ru', 'en']) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: lang })
        await context.addInitScript((l) => {
            localStorage.setItem('app_language', l)
            localStorage.setItem('cookie_consent', 'accepted')
        }, lang)
        await context.route(`${API_ORIGIN}/**`, async (route) => {
            const req = route.request()
            if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders() })
            try {
                const headers = { ...req.headers() }
                delete headers.host; delete headers.origin; delete headers.referer
                const resp = await fetch(req.url(), {
                    method: req.method(), headers,
                    body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postDataBuffer(),
                    signal: AbortSignal.timeout(8000),
                })
                const body = Buffer.from(await resp.arrayBuffer())
                const h = {}
                resp.headers.forEach((v, k) => { if (!['content-encoding', 'transfer-encoding', 'connection'].includes(k)) h[k] = v })
                return route.fulfill({ status: resp.status, headers: { ...h, ...corsHeaders() }, body })
            } catch {
                const url = new URL(req.url())
                const fix = FIXTURES[url.pathname]
                if (fix && req.method() === 'GET') {
                    return route.fulfill({ status: 200, headers: corsHeaders(), body: JSON.stringify(fix) })
                }
                return route.fulfill({ status: 502, headers: corsHeaders(), body: '{}' })
            }
        })
        const page = await context.newPage()
        await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
        await page.waitForTimeout(5000)
        await page.screenshot({ path: path.join(OUT, `hero_${width}_${lang}.png`) })
        await page.evaluate(() => document.getElementById('pricing')?.scrollIntoView({ block: 'start' }))
        await page.waitForTimeout(3000)
        await page.screenshot({ path: path.join(OUT, `pricing_${width}_${lang}.png`) })
        console.log(`shot ${width}/${lang} done`)
        await context.close()
    }
}
await browser.close()
console.log('DONE')
