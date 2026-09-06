// URGENT-HOTFIX: скрин главной прода с «телефонного Safari» (iPhone-вьюпорт + Safari UA).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const OUT = path.resolve('reports/urgent-spa-redirect')
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const resp = await page.goto('https://aiviral-studio.ru/', { waitUntil: 'networkidle', timeout: 45000 })
console.log('status:', resp.status(), 'url:', page.url())
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/prod-home-iphone-safari.png` })
console.log('📸 prod-home-iphone-safari.png')
console.log('page errors:', errors.length ? errors : 'нет')
await browser.close()
process.exit(resp.status() === 200 && errors.length === 0 ? 0 : 1)
