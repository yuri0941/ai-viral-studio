// [ADDONS-MARKETPLACE-RESTORE] Скрины для отчёта: редактор аддонов у owner (1280 RU),
// пункт «Управление аддонами» в сайдбаре owner, отсутствие пункта у admin/клиента.
// Запуск: backend на :18080 + vite preview на :4173 + node scripts/addons-editor-shots.mjs
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
const OUT = path.resolve('reports/addons-marketplace-restore')
fs.mkdirSync(OUT, { recursive: true })

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../backend/models/User.js')

const owner = await User.findOne({ email: 'qa.owner@test.dev' })
const client = await User.findOne({ email: 'qa.referrer@test.dev' })
const adminEmail = `qa.addon.shot.${Date.now()}@test.dev`
const admin = await User.create({ name: 'QA Shot Admin', email: adminEmail, password: 'qa-password-123', role: 'admin' })

const tokens = { owner: owner.generateToken(), client: client.generateToken(), admin: admin.generateToken() }

function corsHeaders() {
    return {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-requested-with',
    }
}

async function newContext(browser, role, width = 1280) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ru-RU', deviceScaleFactor: 2 })
    // прод-API → локальный бэкенд (реальные данные аддонов)
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
    await context.addInitScript(([t]) => {
        if (t) localStorage.setItem('token', t)
        localStorage.removeItem('user_profile')
        localStorage.setItem('app_language', 'ru')
        localStorage.setItem('i18n-lang', 'ru')
        localStorage.setItem('omega_onboarding_tour_done', 'true')
        localStorage.setItem('cookie_consent', 'accepted')
    }, [tokens[role]])
    return context
}

const shot = async (page, name) => {
    await page.screenshot({ path: path.join(OUT, `${name}.png`) })
    console.log('shot:', name)
}

const browser = await chromium.launch()
try {
    // 1. Owner: редактор аддонов (edit mode открыт)
    let ctx = await newContext(browser, 'owner')
    let page = await ctx.newPage()
    page.on('dialog', d => d.accept())
    await page.goto(`${BASE}/owner?tab=addonsManage`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(2500)
    const editBtn = page.locator('button', { hasText: /Редактировать цены|Edit prices/i }).first()
    if (await editBtn.count()) await editBtn.click()
    await page.waitForTimeout(800)
    await shot(page, '01-owner-addons-editor-1280-ru')

    // 2. Owner: пункт в сайдбаре (hover-peek раскрывает на 1024–1439), скроллим nav до пункта
    await page.hover('nav')
    await page.waitForTimeout(600)
    const addonsItem = page.locator('nav').first().locator('button', { hasText: /Управление аддонами/ }).first()
    await addonsItem.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(400)
    await shot(page, '02-owner-sidebar-addons-item-1280-ru')
    await ctx.close()

    // 3. Admin: пункта «Управление аддонами» нет (сайдбар admin)
    ctx = await newContext(browser, 'admin')
    page = await ctx.newPage()
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(2500)
    await page.hover('nav')
    await page.waitForTimeout(600)
    await shot(page, '03-admin-sidebar-no-addons-1280-ru')
    await ctx.close()

    // 4. Клиент: витрина есть (Мои дополнения), но кнопки «Редактировать цены» нет
    ctx = await newContext(browser, 'client')
    page = await ctx.newPage()
    await page.goto(`${BASE}/settings?tab=addons`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(2500)
    await shot(page, '04-client-marketplace-no-edit-1280-ru')
    await ctx.close()
} finally {
    await browser.close()
    await User.deleteOne({ _id: admin._id })
    await mongoose.disconnect()
}
console.log('DONE →', OUT)
