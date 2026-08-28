// [fix/ratelimit-vpn] qaRateLimitVpn — лимиты без привязки к голому IP (VPN-safe).
// Матрица:
//  1) forgot-password ×6 с ОДНОГО IP, РАЗНЫЕ email → НЕ 429 (ключ IP+email)
//  2) forgot-password ×6 с одного IP, ТОТ ЖЕ email → 6-й = 429, ответ RU/EN + «через сколько»
//  3) авторизованный запрос со сменой IP (X-Forwarded-For) → НЕ 429 (ключ userId)
// Запуск: сервер на :18080 + node backend/scripts/qaRateLimitVpn.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const API = process.env.QA_API_URL || 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 100) : ''}`)
  if (!ok) failed++
}

async function req(method, p, { token, ip, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (ip) headers['X-Forwarded-For'] = ip
  const r = await fetch(`${API}${p}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

// ============ 1. Один IP, разные email → НЕ 429 ============
const IP1 = '203.0.113.50'
let anyBlocked1 = false
for (let i = 1; i <= 6; i++) {
  const r = await req('POST', '/api/auth/forgot-password', { ip: IP1, body: { email: `vpn-user-${i}@example.com` } })
  if (r.status === 429) anyBlocked1 = true
}
check('1: 6× forgot-password, один IP, разные email → ни одного 429', !anyBlocked1)

// ============ 2. Один IP, тот же email → 6-й = 429 ============
const IP2 = '203.0.113.51'
let last
for (let i = 1; i <= 6; i++) {
  last = await req('POST', '/api/auth/forgot-password', { ip: IP2, body: { email: 'Vpn-Same@Example.com ' } }) // с регистром/пробелом — нормализация
}
check('2: 6× forgot-password, тот же email (разный регистр/пробел) → 429', last.status === 429, last.status)
check('2: 429 содержит RU/EN + время повтора', /Повторите через ~\d+ мин/.test(last.json.error || '') && /Try again in ~\d+ min/.test(last.json.error || ''), last.json.error)

// ============ 3. Авторизованный запрос, смена IP → НЕ 429 ============
const client = await User.findOne({ email: 'creator.test@aiviral-studio.ru' })
if (!client) {
  console.error('❌ Нет creator.test@aiviral-studio.ru: запустите backend/scripts/createTestAccounts.js')
  process.exit(1)
}
const ct = client.generateToken()
let anyBlocked3 = false
let lastStatus3 = 0
for (let i = 1; i <= 8; i++) {
  const r = await req('GET', '/api/users/me', { token: ct, ip: `203.0.113.${100 + i}` }) // каждый запрос — новый IP
  lastStatus3 = r.status
  if (r.status === 429) anyBlocked3 = true
}
check('3: 8× /api/users/me с меняющимся IP, один userId → ни одного 429', !anyBlocked3 && lastStatus3 === 200, lastStatus3)

await mongoose.disconnect()
console.log(failed ? `\n❌ FAILED: ${failed}` : '\n✅ ALL PASSED')
process.exit(failed ? 1 : 0)
