/**
 * CORS whitelist unit test
 * Verifies:
 * - allowed origins (defaults + FRONTEND_URL + CORS_ORIGINS) pass preflight/POST
 * - disallowed origin is rejected and origin is logged
 */
import express from 'express'
import cors from 'cors'
import { corsOptions } from '../config/cors.js'

const results = []
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`)
  results.push(`PASS: ${msg}`)
}

const logs = []
const origWarn = console.warn
console.warn = (...args) => logs.push(args.join(' '))

const app = express()
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS', message: 'Origin not allowed' })
  }
  next(err)
})
app.use(express.json())
app.post('/api/tickets', (req, res) => res.json({ ok: true, ticketId: 'test123' }))

function headersFor(origin, extra = {}) {
  const h = { ...extra }
  if (origin) h.origin = origin
  return h
}

async function preflight(origin) {
  return fetch('http://127.0.0.1:19090/api/tickets', {
    method: 'OPTIONS',
    headers: headersFor(origin, { 'access-control-request-method': 'POST' })
  })
}

async function postTicket(origin) {
  return fetch('http://127.0.0.1:19090/api/tickets', {
    method: 'POST',
    headers: headersFor(origin, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ subject: 'test', description: 'test' })
  })
}

async function run() {
  const server = app.listen(19090)
  try {
    // Allowed origins
    for (const origin of [
      null,
      'https://aiviral-studio.ru',
      'https://www.aiviral-studio.ru',
      'https://ai-viral-studio.pages.dev',
      'http://localhost:5173',
      'http://localhost:3000'
    ]) {
      const res = await preflight(origin)
      assert(res.status === 204, `preflight allowed for origin=${origin} (status=${res.status})`)
      const postRes = await postTicket(origin)
      assert(postRes.status === 200, `POST allowed for origin=${origin} (status=${postRes.status})`)
      const body = await postRes.json()
      assert(body.ok === true, `POST body ok for origin=${origin}`)
    }

    // Disallowed origin
    const badOrigin = 'https://evil-attacker.example.com'
    const badPreflight = await preflight(badOrigin)
    assert(badPreflight.status === 403, `preflight denied for bad origin (status=${badPreflight.status})`)
    assert(logs.some(l => l.includes(`[CORS] denied origin: ${badOrigin}`)), `denied origin logged: ${badOrigin}`)

    console.log('\n[CORS-UNIT] ALL PASS')
    for (const r of results) console.log('  ', r)
  } finally {
    server.close()
    console.warn = origWarn
  }
}

run().catch(err => {
  console.warn = origWarn
  console.error('[CORS-UNIT] FAILED:', err)
  process.exit(1)
})
