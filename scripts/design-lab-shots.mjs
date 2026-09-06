// [DESIGN-LAB] Скрины /preview/* для отчёта владельцу: 7 экранов × (dark|light) × (desktop 1280 | iPhone 390).
// Превью публичные (демо-данные, без API) — нужен только статический сервер dist:
//   cd frontend && npm run build && npx vite preview --port 4173
//   node scripts/design-lab-shots.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:4173'
const OUT = path.resolve('reports/design-lab-pr2')
fs.mkdirSync(OUT, { recursive: true })

const PAGES = [
  ['chat', '/preview/chat'],
  ['profile', '/preview/profile'],
  ['advertiser-a', '/preview/advertiser-a'],
  ['advertiser-b', '/preview/advertiser-b'],
  ['advertiser-c', '/preview/advertiser-c'],
  ['slots', '/preview/slots'],
  ['studio', '/preview/studio'],
]
const VIEWPORTS = [
  ['desktop', { width: 1280, height: 900 }],
  ['iphone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]

const browser = await chromium.launch()
let shots = 0
for (const [vpName, vp] of VIEWPORTS) {
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: vp, ...('isMobile' in vp ? { isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor } : {}) })
    await ctx.addInitScript(t => {
      localStorage.setItem('theme', t)
      localStorage.setItem('ai-viral-theme', t)
      localStorage.setItem('cookie_consent', 'accepted')
    }, theme)
    const page = await ctx.newPage()
    for (const [name, url] of PAGES) {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(700) // count-up и lazy-чанки
      await page.screenshot({ path: path.join(OUT, `${name}-${vpName}-${theme}.png`), fullPage: true })
      shots++
      if (vpName === 'iphone' && name === 'chat') {
        await page.getByRole('button', { name: 'Открыть меню' }).click()
        await page.waitForTimeout(400)
        await page.screenshot({ path: path.join(OUT, `menu-${vpName}-${theme}.png`) })
        shots++
      }
    }
    await ctx.close()
  }
}
await browser.close()
console.log(`OK: ${shots} скринов → ${OUT}`)
