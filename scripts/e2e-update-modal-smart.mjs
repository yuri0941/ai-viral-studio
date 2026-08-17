#!/usr/bin/env node
// E2E для UPDATE-MODAL-SMART: модалка по ролям + toast после reload.
// Запуск: node scripts/e2e-update-modal-smart.mjs   (preview на http://localhost:4173)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const OUT = path.resolve('reports', 'update-modal-smart')
fs.mkdirSync(OUT, { recursive: true })

const API = 'https://aiviral-backend.onrender.com/api'
const REQUIRED = '9.9.99'

function ownerUser() {
    return {
        success: true,
        user: {
            id: 'owner-e2e',
            email: 'owner@ai-viral.com',
            name: 'Owner E2E',
            role: 'owner',
            preferences: { language: 'ru', timezone: 'Europe/Moscow' }
        }
    }
}

function creatorUser() {
    return {
        success: true,
        user: {
            id: 'creator-e2e',
            email: 'creator@ai-viral.com',
            name: 'Creator E2E',
            role: 'creator',
            preferences: { language: 'ru', timezone: 'Europe/Moscow' }
        }
    }
}

function versionResponse(required) {
    return {
        version: '9.9.21',
        build: 202608140746,
        requiredFrontend: required,
        features: []
    }
}

async function interceptApi(page, { role, required }) {
    await page.route(`${API}/**`, async (route) => {
        const req = route.request()
        const url = req.url()
        if (url === `${API}/version`) {
            return route.fulfill({
                status: 200,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(versionResponse(required))
            })
        }
        if (url === `${API}/auth/me` && role !== 'guest') {
            return route.fulfill({
                status: 200,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(role === 'owner' ? ownerUser() : creatorUser())
            })
        }
        // Пустой ответ для остальных, чтобы не тянуть прод.
        return route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: '{}' })
    })
}

async function prepareContext(browser, { role, lang }) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    if (role !== 'guest') {
        await context.addInitScript(() => {
            localStorage.setItem('token', 'e2e-token')
        })
    }
    await context.addInitScript((language) => {
        localStorage.setItem('i18n-lang', language)
    }, lang)
    return context
}

async function run() {
    const browser = await chromium.launch({ headless: true })
    const results = []

    // 1. Гость — видит client + all
    {
        const context = await prepareContext(browser, { role: 'guest', lang: 'ru' })
        const page = await context.newPage()
        await interceptApi(page, { role: 'guest', required: REQUIRED })
        await page.goto(BASE, { waitUntil: 'networkidle' })
        const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Доступно обновление' })
        await modal.waitFor({ timeout: 10000 })
        const text = await modal.innerText()
        results.push({ role: 'guest', hasOwnerTech: /Groq 70b|Key Health Monitor|fitToView|provider\/model/.test(text) })
        await modal.screenshot({ path: path.join(OUT, 'modal-guest-ru.png') })
        await context.close()
    }

    // 2. Владелец — видит и technical-записи
    {
        const context = await prepareContext(browser, { role: 'owner', lang: 'ru' })
        const page = await context.newPage()
        await interceptApi(page, { role: 'owner', required: REQUIRED })
        await page.goto(BASE, { waitUntil: 'networkidle' })
        const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Доступно обновление' })
        await modal.waitFor({ timeout: 10000 })
        const text = await modal.innerText()
        results.push({
            role: 'owner',
            hasClientText: /OMEGA стала умнее|Стабильность ответов|Безопасность ключей/.test(text),
            hasOwnerTech: /Groq 70b|Key Health Monitor|fitToView|provider\/model/.test(text)
        })
        await modal.evaluate(el => {
            el.style.maxHeight = 'none'
            el.style.overflow = 'visible'
            const ul = el.querySelector('ul')
            if (ul) { ul.style.maxHeight = 'none'; ul.style.overflow = 'visible' }
        })
        await modal.screenshot({ path: path.join(OUT, 'modal-owner-ru.png') })
        await context.close()
    }

    // 3. Toast после обновления (требуемая версия == текущая, чтобы модалка не показывалась)
    {
        const context = await prepareContext(browser, { role: 'guest', lang: 'ru' })
        const page = await context.newPage()
        await context.addInitScript(() => {
            localStorage.setItem('pending_update_toast_version', '9.9.21')
        })
        await interceptApi(page, { role: 'guest', required: '9.9.21' })
        await page.goto(BASE, { waitUntil: 'networkidle' })
        const toast = page.locator('text=✅ Обновлено до v9.9.21')
        await toast.waitFor({ timeout: 10000 })
        results.push({ toast: 'visible' })
        await page.screenshot({ path: path.join(OUT, 'toast-after-update-ru.png'), fullPage: false })
        await context.close()
    }

    await browser.close()

    fs.writeFileSync(path.join(OUT, 'e2e-results.json'), JSON.stringify(results, null, 2), 'utf8')
    console.log('E2E UPDATE-MODAL-SMART:', JSON.stringify(results, null, 2))
    console.log('Screenshots:', OUT)

    const failed = results.some(r => r.hasOwnerTech === true && r.role === 'guest') ||
                   results.some(r => r.role === 'owner' && (!r.hasClientText || !r.hasOwnerTech)) ||
                   results.some(r => r.toast && r.toast !== 'visible')
    if (failed) {
        console.error('E2E checks FAILED')
        process.exit(1)
    }
}

run().catch(e => {
    console.error(e)
    process.exit(1)
})
