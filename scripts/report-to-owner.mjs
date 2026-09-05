#!/usr/bin/env node
// [TG-REPORT-HOOK] сдача батча владельцу: сообщение в owner-бот с кнопками
// [✅ Принять и смёржить] [❌ Отклонить] (callback → backend/services/batchReport.js).
// Запуск: node scripts/report-to-owner.mjs --batch "TG-REPORT-HOOK" [--tests "node --check ✅, build 0 ✅"] [--untouched "платежи, тарифы"] [--selftest]
// Секреты только из env/backend/.env — в stdout и чат не выводятся.
// TG недоступен → «TG недоступен» + тот же текст в stdout, exit 0 (не падаем).
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function arg(name, def = '') {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] || '') : def
}
const hasFlag = (name) => process.argv.includes(`--${name}`)

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

// Источники TG-ключей (приоритет как в aiService.getProviderKey): env → кабинет владельца
// (коллекция apikeys: provider telegram_owner_bot / telegram_chat_id, hot-reload через ApiKeysTab).
// chat_id дополнительно: OwnerSettings.ownerTelegramChatId. Секреты в логи не выводятся.
async function resolveTgCredentials() {
  let token = env('TELEGRAM_OWNER_BOT_TOKEN') || env('TELEGRAM_BOT_TOKEN')
  let chatId = env('TELEGRAM_OWNER_CHAT_ID') || env('OWNER_CHAT_ID') || env('OWNER_USER_ID')
  if (token && chatId) return { token, chatId }
  const uri = env('MONGODB_URI') || env('MONGO_URI')
  if (uri) {
    try {
      const { createRequire } = await import('node:module')
      const require = createRequire(path.join(ROOT, 'backend', 'package.json'))
      const mongoose = require('mongoose')
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
      const db = mongoose.connection.db
      if (!token) {
        const doc = await db.collection('apikeys').findOne(
          { provider: 'telegram_owner_bot', isActive: { $ne: false } }, { projection: { key: 1 } })
        token = doc?.key || ''
      }
      if (!chatId) {
        const doc = await db.collection('ownersettings')
          .findOne({ ownerTelegramChatId: { $nin: [null, ''] } }, { projection: { ownerTelegramChatId: 1 } })
        chatId = doc?.ownerTelegramChatId || ''
      }
      if (!chatId) {
        const doc = await db.collection('apikeys').findOne(
          { provider: 'telegram_chat_id', isActive: { $ne: false } }, { projection: { key: 1 } })
        chatId = doc?.key || ''
      }
      await mongoose.disconnect()
    } catch { /* БД недоступна — останется env */ }
  }
  return { token, chatId }
}

const git = (cmd, def = '') => {
  try { return execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return def }
}

const repoSlug = (() => {
  if (env('GITHUB_REPO')) return env('GITHUB_REPO')
  const url = git('git remote get-url origin')
  const m = url.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/)
  return m ? m[1] : 'yuri0941/ai-viral-studio'
})()

const batch = arg('batch', process.argv.slice(2).filter(a => !a.startsWith('--') && a !== arg('tests') && a !== arg('untouched'))[0] || 'без названия')
const branch = git('git rev-parse --abbrev-ref HEAD', 'unknown')
const compare = `https://github.com/${repoSlug}/compare/main...${branch}`
const base = git('git rev-parse --verify origin/main') ? 'origin/main' : 'main'
const files = git(`git diff --name-only ${base}...HEAD`).split('\n').filter(Boolean).length
const tests = arg('tests', 'не указано')
const untouched = arg('untouched', 'красные зоны (платежи, тарифы, боты-логика, рубильники, гард-матрица Б5)')
const selftest = hasFlag('selftest') || /SELFTEST/i.test(batch)

const text = [
  `🏁 Батч: ${selftest && !/SELFTEST/i.test(batch) ? batch + ' SELFTEST' : batch}`,
  `Ветка: ${branch}`,
  `Compare: ${compare}`,
  `Тесты: ${tests}`,
  `Изменено файлов: ${files}`,
  `НЕ тронуто: ${untouched}`,
  `Статус: ГОТОВ К ПРОВЕРКЕ`,
].join('\n')

const { token, chatId } = await resolveTgCredentials()

async function send() {
  if (!token || !chatId) throw new Error('нет токена owner-бота и/или chat_id владельца (env / кабинет: apikeys)')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Принять и смёржить', callback_data: 'breport:approve' },
            { text: '❌ Отклонить', callback_data: 'breport:reject' },
          ]],
        },
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.ok) throw new Error(body.description || `HTTP ${res.status}`)
    return true
  } finally {
    clearTimeout(timer)
  }
}

try {
  await send()
  console.log(`✅ Отчёт отправлен владельцу в TG (батч «${batch}», ветка ${branch}). Жду approve/reject кнопками.`)
} catch (e) {
  console.log(`⚠️ TG недоступен: ${e.message}`)
  console.log('--- Отчёт (дублирую в stdout) ---')
  console.log(text)
}
process.exit(0)
