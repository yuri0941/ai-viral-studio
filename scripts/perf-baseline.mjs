// [PERF-AUDIT П1] Baseline веб-метрик прода фактом: TTFB/FCP/LCP/CLS/INP-proxy/байты.
// Профили: wifi (без троттлинга), slow4g (Lighthouse Slow 4G: 150ms/1.6Mbps, CPU 4x),
// slow3g (DevTools Slow 3G: 400ms/400kbps, CPU 4x). По 2 прогона, медиана.
// Запуск: node scripts/perf-baseline.mjs [url]   (дефолт https://aiviral-studio.ru)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve('.tmp-ui-polish', 'noop.js'))
const { chromium } = require('playwright')

const URLS = [process.argv[2] || 'https://aiviral-studio.ru']
const OUT = path.resolve('reports/perf')
fs.mkdirSync(OUT, { recursive: true })

const PROFILES = {
  wifi: null, // без эмуляции — верхняя граница
  slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, cpu: 4 },
  slow3g: { latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8, cpu: 4 },
}
const RUNS = 2

const COLLECT_JS = () => {
  const nav = performance.getEntriesByType('navigation')[0] || {}
  const paints = {}
  for (const p of performance.getEntriesByType('paint')) paints[p.name] = p.startTime
  const w = window.__perf || {}
  let bytes = 0
  for (const r of performance.getEntriesByType('resource')) bytes += r.transferSize || r.encodedBodySize || 0
  bytes += nav.transferSize || nav.encodedBodySize || 0
  return Promise.resolve({
    ttfb: Math.round(nav.responseStart || 0),
    fcp: Math.round(paints['first-contentful-paint'] || 0),
    lcp: Math.round(w.lcp || 0),
    cls: Math.round((w.cls || 0) * 1000) / 1000,
    inpProxy: Math.round(w.maxEvent || 0),
    loadMs: Math.round(nav.loadEventEnd || nav.duration || 0),
    bytesKB: Math.round(bytes / 1024),
  })
}

const median = (arr, k) => {
  const v = arr.map((x) => x[k]).sort((a, b) => a - b)
  return v[Math.floor(v.length / 2)]
}

const results = []
const browser = await chromium.launch()
for (const url of URLS) {
  for (const [name, prof] of Object.entries(PROFILES)) {
    const runs = []
    for (let i = 0; i < RUNS; i++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const page = await context.newPage()
      await page.addInitScript(() => {
        window.__perf = { lcp: 0, cls: 0, maxEvent: 0 }
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            if (entries.length) window.__perf.lcp = entries[entries.length - 1].startTime
          }).observe({ type: 'largest-contentful-paint', buffered: true })
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value
          }).observe({ type: 'layout-shift', buffered: true })
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) if (e.duration > window.__perf.maxEvent) window.__perf.maxEvent = e.duration
          }).observe({ type: 'event', buffered: true, durationThreshold: 16 })
        } catch { /* */ }
      })
      if (prof) {
        const cdp = await context.newCDPSession(page)
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: prof.latency,
          downloadThroughput: prof.downloadThroughput,
          uploadThroughput: prof.uploadThroughput,
        })
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu })
      }
      await page.goto(url, { waitUntil: 'load', timeout: 90000 })
      await page.waitForTimeout(2500) // LCP/CLS успевают зафиксироваться
      // INP-proxy: реальный клик по первой CTA/кнопке
      try {
        const btn = page.locator('button, a[href]').first()
        if (await btn.count()) await btn.click({ timeout: 3000 }).catch(() => {})
        await page.waitForTimeout(500)
      } catch { /* */ }
      runs.push(await page.evaluate(COLLECT_JS))
      await context.close()
    }
    const med = {}
    for (const k of ['ttfb', 'fcp', 'lcp', 'cls', 'inpProxy', 'loadMs', 'bytesKB']) med[k] = median(runs, k)
    results.push({ url, profile: name, ...med })
    console.log(`${name.padEnd(7)} TTFB=${med.ttfb}ms FCP=${med.fcp}ms LCP=${med.lcp}ms CLS=${med.cls} INP~=${med.inpProxy}ms load=${med.loadMs}ms bytes=${med.bytesKB}KB`)
  }
}
await browser.close()
fs.writeFileSync(path.join(OUT, 'baseline.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
console.log(`\nСохранено: ${path.join(OUT, 'baseline.json')}`)
