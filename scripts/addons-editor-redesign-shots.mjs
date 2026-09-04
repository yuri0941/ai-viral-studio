// [ADDONS-EDITOR-REDESIGN] Скрины + overflow-гейт нового редактора аддонов.
// Запуск: backend на :18080 + vite preview на :4173 + node scripts/addons-editor-redesign-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireBE = createRequire(path.resolve('backend', 'noop.js'))
const mongoose = requireBE('mongoose')
const dotenv = requireBE('dotenv')

dotenv.config({ path: path.resolve('backend/.env') })
const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const API_LOCAL = 'http://localhost:18080'
const API_PROD = 'https://aiviral-backend.onrender.com'
const OUT = path.resolve(process.env.SHOTS_OUT || 'reports/addons-editor-redesign')
fs.mkdirSync(OUT, { recursive: true })

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../backend/models/User.js')
const owner = await User.findOne({ email: 'qa.owner@test.dev' })
const token = owner.generateToken()

function corsHeaders() {
    return {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-requested-with',
    }
}

async function newContext(browser, width, lang) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: lang === 'en' ? 'en-US' : 'ru-RU', deviceScaleFactor: 2 })
    await context.route(`${API_PROD}/**`, async (route) => {
        const req = route.request()
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders() })
        try {
            const url = req.url().replace(API_PROD, API_LOCAL)
            const headers = { ...req.headers() }
            delete headers.host; delete headers.origin; delete headers.referer
            const resp = await fetch(url, {
                method: req.method(), headers,
                body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postDataBuffer(),
                signal: AbortSignal.timeout(20000),
            })
            const buf = Buffer.from(await resp.arrayBuffer())
            const outHeaders = {}
            resp.headers.forEach((v, k) => {
                if (!['content-encoding', 'transfer-encoding', 'content-length', 'access-control-allow-origin'].includes(k.toLowerCase())) outHeaders[k] = v
            })
            Object.assign(outHeaders, corsHeaders())
            await route.fulfill({ status: resp.status, headers: outHeaders, body: buf })
        } catch (e) {
            await route.fulfill({ status: 502, headers: corsHeaders(), body: JSON.stringify({ error: String(e.message).slice(0, 120) }) })
        }
    })
    await context.addInitScript(([t, lang]) => {
        localStorage.setItem('token', t)
        localStorage.removeItem('user_profile')
        localStorage.setItem('app_language', lang)
        localStorage.setItem('i18n-lang', lang)
        localStorage.setItem('omega_onboarding_tour_done', 'true')
        localStorage.setItem('cookie_consent', 'accepted')
    }, [token, lang])
    return context
}

const shot = async (page, name, fullPage = false) => {
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage })
    console.log('shot:', name)
}

async function openEditor(page, lang) {
    page.on('dialog', d => d.accept())
    await page.goto(`${BASE}/owner?tab=addonsManage`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(2500)
    const editBtn = page.locator('button', { hasText: lang === 'en' ? /Edit prices/i : /Редактировать цены/i }).first()
    if (await editBtn.count()) await editBtn.click()
    await page.waitForTimeout(800)
}

const hasHScroll = async (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)

const browser = await chromium.launch()
const results = []
try {
    // Гейт ширин × RU/EN: 0 горизонтальных скроллов
    for (const width of [360, 428, 768, 1280, 1920]) {
        for (const lang of ['ru', 'en']) {
            const ctx = await newContext(browser, width, lang)
            const page = await ctx.newPage()
            await openEditor(page, lang)
            const overflow = await hasHScroll(page)
            results.push(`${overflow ? '❌' : '✅'} ${width} ${lang}: h-scroll=${overflow}`)
            await ctx.close()
        }
    }

    // Скрин 1280 RU — редактор «после»
    let ctx = await newContext(browser, 1280, 'ru')
    let page = await ctx.newPage()
    await openEditor(page, 'ru')
    await shot(page, '01-editor-after-1280-ru')

    // Dirty-состояние: меняем цену → активный «Сохранить» + точка «несохранено»
    const priceInput = page.locator('input[type="number"]').first()
    await priceInput.fill('777')
    await page.waitForTimeout(400)
    await shot(page, '02-editor-dirty-1280-ru')

    // AI-панель: «AI Анализ цены» → панель себестоимость/рынок/рекомендация + «Применить»
    const aiBtn = page.locator('button', { hasText: /AI Анализ цены/i }).first()
    if (await aiBtn.count()) {
        await aiBtn.click()
        await page.waitForTimeout(8000)
        await shot(page, '03-editor-ai-panel-1280-ru')
    }
    await ctx.close()

    // Скрин 360 RU — мобильный редактор, fullPage
    ctx = await newContext(browser, 360, 'ru')
    page = await ctx.newPage()
    await openEditor(page, 'ru')
    await shot(page, '04-editor-after-360-ru', true)
    await ctx.close()
} finally {
    await browser.close()
    await mongoose.disconnect()
}
console.log(results.join('\n'))
