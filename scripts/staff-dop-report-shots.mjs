// [STAFF-DOP] Скрины для отчёта владельцу (Задача 5): «как теперь выглядит».
// owner: вкладка Команда + модалка создания staff; admin: клиенты + confirm бана + модалка продления;
// staff: список тикетов + модалка тикета с блоком «контекст клиента».
// Запуск: backend на :18080 + frontend preview на :4173 + node scripts/staff-dop-report-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('backend/package.json'))
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve('backend/.env') })
const mongoose = require('mongoose')
const { chromium } = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const API_ORIGIN = 'https://aiviral-backend.onrender.com'
const LOCAL_API = process.env.QA_API_URL || 'http://localhost:18080'
const OUT = path.resolve('reports/staff-dop-final')
fs.mkdirSync(OUT, { recursive: true })

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const imp = (p) => import(pathToFileURL(path.resolve('backend', p)).href)
const { default: User } = await imp('models/User.js')

const owner = await User.findOne({ role: 'owner' })
if (!owner) { console.error('❌ Нет owner в БД'); process.exit(1) }
const token = owner.generateToken()
const profile = {
    id: String(owner._id), _id: String(owner._id), email: owner.email,
    name: owner.name, role: 'owner', subscription: owner.subscription || 'agency',
}

// тестовый клиент + тикет — чтобы в staff-кабинете было что открыть
const stamp = Date.now()
const client = await User.create({
    name: 'QA Shot Client', email: `qa.shot.${stamp}@test.dev`, password: 'QaShot12345!',
    role: 'creator', subscription: 'pro', isActive: true, isVerified: true,
    acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
})
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${client.generateToken()}` }
const tRes = await fetch(`${LOCAL_API}/api/support`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ subject: 'Не пришло письмо с подтверждением', description: 'Здравствуйте! Оплатил тариф Pro, письмо не пришло.' }),
})
const tJson = await tRes.json().catch(() => ({}))
const ticketId = tJson?.data?._id
console.log('ticket:', tRes.status, ticketId || '-')

async function proxyApi(context) {
    await context.route(`${API_ORIGIN}/**`, async (route) => {
        const req = route.request()
        const url = req.url().replace(API_ORIGIN, LOCAL_API)
        try {
            const headers = { ...req.headers() }
            delete headers.host; delete headers.origin; delete headers.referer
            const resp = await route.fetch({ url, method: req.method(), headers, postData: req.postData() ?? undefined })
            const body = await resp.body()
            await route.fulfill({
                status: resp.status(),
                headers: { 'content-type': resp.headers()['content-type'] || 'application/json', 'access-control-allow-origin': '*' },
                body,
            })
        } catch (e) {
            await route.fulfill({ status: 502, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: String(e) }) })
        }
    })
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ru-RU' })
await proxyApi(context)
await context.addInitScript(([t, p]) => {
    localStorage.setItem('token', t)
    localStorage.setItem('user_profile', JSON.stringify(p))
    localStorage.setItem('i18nextLng', 'ru')
}, [token, profile])
const page = await context.newPage()
const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name) }); console.log('📸', name) }

// 1. owner → Команда
await page.goto(`${BASE}/owner?tab=team`, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(2500)
await shot('owner-team.png')
// 2. модалка создания сотрудника
try {
    await page.getByRole('button', { name: /Добавить/ }).first().click({ timeout: 5000 })
    await page.waitForTimeout(800)
    await shot('owner-add-staff-modal.png')
    await page.keyboard.press('Escape')
} catch (e) { console.log('⚠️ add-staff modal:', e.message.slice(0, 80)) }

// 3. admin → клиенты
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(2500)
try { await page.getByRole('button', { name: 'Принять' }).click({ timeout: 2000 }) } catch {}
await shot('admin-clients.png')
// 4. confirm бана (кнопка блокировки в строке клиента)
try {
    await page.locator('button[title*="локир"], button[title*="lock"], button[title*="Lock"], button[title*="бан"], button[title*="Бан"]').first().click({ timeout: 5000 })
    await page.waitForTimeout(800)
    await shot('admin-ban-confirm.png')
    try { await page.getByRole('button', { name: /Отмена/ }).click({ timeout: 2000 }) } catch { await page.keyboard.press('Escape') }
} catch (e) { console.log('⚠️ ban confirm:', e.message.slice(0, 80)) }
// 5. модалка продления тарифа (иконка-календарь — соседняя кнопка перед баном)
try {
    await page.locator('button[title*="локир"]').first().locator('xpath=preceding-sibling::button[1]').click({ timeout: 5000 })
    await page.waitForTimeout(800)
    await shot('admin-extend-modal.png')
    await page.keyboard.press('Escape')
} catch (e) { console.log('⚠️ extend modal:', e.message.slice(0, 80)) }

// 6. staff → тикеты
await page.goto(`${BASE}/staff`, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(2500)
await shot('staff-tickets.png')
// 7. модалка тикета с контекстом клиента
if (ticketId) {
    try {
        await page.getByRole('button', { name: /Открыть|Open/ }).first().click({ timeout: 5000 })
        await page.waitForTimeout(1200)
        await shot('staff-ticket-context.png')
    } catch (e) { console.log('⚠️ ticket modal:', e.message.slice(0, 80)) }
}

await browser.close()

// cleanup
const { default: SupportTicket } = await imp('models/SupportTicket.js')
if (ticketId) await SupportTicket.deleteOne({ _id: ticketId })
await User.deleteOne({ _id: client._id })
await mongoose.disconnect()
console.log('🧹 cleanup done. Скрины в reports/staff-dop-final/')
