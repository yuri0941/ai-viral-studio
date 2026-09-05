#!/usr/bin/env node
// [BOTS-FIX ЗАДАЧА 4] Закрытие открытых ТЕСТОВЫХ обращений на проде.
// Прод-БД с машины кодера недоступна напрямую → операции через /api/ask-owner/tickets/*
// (ключ = sha256 от owner-токена, тот же контур что и ask-owner).
// Закрываются только тикеты с тестовыми маркерами в теме (QA/тест/test/selftest/проверка).
// Список закрытых выводится для отчёта. Реальные клиентские обращения не трогаем.
// Запуск: node scripts/close-test-tickets.mjs [--dry]
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dry = process.argv.includes('--dry')

function loadEnvFile(file) {
  const out = {}
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (m && !m[1].startsWith('#')) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* нет файла — только process.env */ }
  return out
}
const fileEnv = loadEnvFile(path.join(ROOT, 'backend', '.env'))
const env = (k) => process.env[k] || fileEnv[k] || ''

const token = env('TELEGRAM_OWNER_BOT_TOKEN') || env('TELEGRAM_BOT_TOKEN')
if (!token) { console.error('❌ Нет TELEGRAM_OWNER_BOT_TOKEN — ключ не собрать'); process.exit(1) }
const askKey = crypto.createHash('sha256').update(`ask-owner:${token}`).digest('hex')
const PROD_BASE = (env('PROD_BACKEND_URL') || 'https://aiviral-backend.onrender.com').replace(/\/+$/, '')

const TEST_RE = /(qa|тест|test|selftest|проверка|debug)/i

const api = async (method, url, body) => {
  const res = await fetch(`${PROD_BASE}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-ask-owner-key': askKey },
    signal: AbortSignal.timeout(20000),
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { http: res.status, json }
}

const list = await api('GET', '/api/ask-owner/tickets/open')
if (list.http !== 200) {
  console.error(`❌ Список открытых тикетов: HTTP ${list.http} ${list.json?.message || ''}`)
  if (list.http === 404) console.error('Прод ещё без /api/ask-owner — дождитесь деплоя PR BOTS-FIX')
  process.exit(1)
}
const open = list.json.data || []
console.log(`Открытых обращений на проде: ${open.length}`)
const testOnes = open.filter(t => TEST_RE.test(`${t.subject || ''} ${t.userName || ''}`))
const realOnes = open.filter(t => !TEST_RE.test(`${t.subject || ''} ${t.userName || ''}`))
console.log(`\nТестовые (к закрытию): ${testOnes.length}`)
for (const t of testOnes) console.log(`  #${t.id.slice(-6)} [${t.status}] ${t.subject} (${t.userName || '—'}, ${t.createdAt})`)
console.log(`\nРеальные (НЕ трогаем): ${realOnes.length}`)
for (const t of realOnes) console.log(`  #${t.id.slice(-6)} [${t.status}] ${t.subject} (${t.userName || '—'})`)

if (dry || !testOnes.length) {
  console.log(dry ? '\n--dry: ничего не закрываю' : '\nТестовых тикетов нет — закрывать нечего')
  process.exit(0)
}

const r = await api('POST', '/api/ask-owner/tickets/close', {
  ids: testOnes.map(t => t.id),
  resolution: 'Тестовое обращение — закрыто скриптом (BOTS-FIX)',
})
if (r.http !== 200) { console.error(`❌ Закрытие: HTTP ${r.http} ${r.json?.message || ''}`); process.exit(1) }
console.log(`\n✅ Закрыто: ${r.json.data.closed} из ${testOnes.length}`)
