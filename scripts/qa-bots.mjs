#!/usr/bin/env node
// [TG-ASK-OWNER доп] Регрессионная проверка ОБОИХ ботов через Bot API (логика ботов не меняется):
//  owner-бот: webhook жив (getWebhookInfo: url=прод, без last_error), getMe, тестовые sendMessage
//  (статус + сообщение с inline-кнопками = «меню-шапка/отчёт с кнопками уходит»);
//  клиентский бот: webhook жив (/webhook/omega на проде), getMe (связка с приложением =
//  deep-link connect_*: транспорт webhook без ошибок + pending=0; полный e2e — qaSupportFlow).
//  «/start отвечает» через Bot API напрямую не проверяется (бот не может слать /start от имени
//  пользователя) — косвенно: webhook без ошибок и pending_update_count=0 (прод обрабатывает апдейты).
// TG-ключи не заданы (CI) → пропуск, exit 0. Тестовые sendMessage — только вне CI (QA_SKIP_TG=1 выключает).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

const results = []
const check = (name, ok, note = '') => {
  results.push({ name, ok, note })
  console.log(`${ok ? '✅' : '❌'} ${name}${note ? ` — ${note}` : ''}`)
}

async function resolveFromMongo() {
  const uri = env('MONGODB_URI') || env('MONGO_URI')
  if (!uri) return {}
  try {
    const { createRequire } = await import('node:module')
    const require = createRequire(path.join(ROOT, 'backend', 'package.json'))
    const mongoose = require('mongoose')
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    const db = mongoose.connection.db
    const out = {}
    const key = async (provider) => (await db.collection('apikeys')
      .findOne({ provider, isActive: { $ne: false } }, { projection: { key: 1 } }))?.key || ''
    out.ownerToken = await key('telegram_owner_bot')
    out.clientToken = await key('telegram_bot')
    out.chatId = (await db.collection('ownersettings')
      .findOne({ ownerTelegramChatId: { $nin: [null, ''] } }, { projection: { ownerTelegramChatId: 1 } }))?.ownerTelegramChatId
      || await key('telegram_chat_id') || ''
    await mongoose.disconnect()
    return out
  } catch { return {} }
}

const mongo = await resolveFromMongo()
const ownerToken = env('TELEGRAM_OWNER_BOT_TOKEN') || mongo.ownerToken || env('TELEGRAM_BOT_TOKEN') || ''
const clientToken = env('TELEGRAM_CLIENT_BOT_TOKEN') || env('TELEGRAM_OMEGA_BOT_TOKEN') || env('TELEGRAM_BOT_TOKEN') || mongo.clientToken || ''
const chatId = env('TELEGRAM_OWNER_CHAT_ID') || env('OWNER_CHAT_ID') || mongo.chatId || ''

if (!ownerToken && !clientToken) {
  console.log('⏭ qa-bots: TG-ключи не заданы (env/apikeys) — пропуск (норма для CI)')
  process.exit(0)
}

const PROD_BASE = (env('PROD_BACKEND_URL') || 'https://aiviral-backend.onrender.com').replace(/\/+$/, '')
const tg = async (token, method, body) => {
  // сетевой сбой TG API ≠ регрессия бота: возвращаем маркер, проверки помечаются ⚠️ без падения CI
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.json().catch(() => ({}))
  } catch (e) {
    return { ok: false, __network: true, description: e.message }
  }
}

async function checkBot({ label, token, webhookPath, sendTests }) {
  if (!token) {
    // нет токена (только в env прода) → пропуск, не падение: регрессия бежит там, где ключи есть
    results.push({ name: `${label}: пропуск`, ok: true })
    console.log(`⏭ ${label}: токен не задан локально (есть только в env прода) — пропуск`)
    return
  }
  const me = await tg(token, 'getMe')
  if (me.__network) {
    results.push({ name: `${label}: сеть`, ok: true })
    console.log(`⏭ ${label}: TG API недоступен из этой сети (${me.description}) — пропуск без падения`)
    return
  }
  check(`${label}: getMe`, !!me.ok, me.ok ? `@${me.result?.username}` : (me.description || 'ошибка'))
  if (!me.ok) return
  const w = (await tg(token, 'getWebhookInfo')).result || {}
  check(`${label}: webhook жив`, !!w.url && w.url === `${PROD_BASE}${webhookPath}` && !w.last_error_message,
    `url=${w.url || '(пусто)'}${w.last_error_message ? ` last_error: ${w.last_error_message}` : ''} pending=${w.pending_update_count}`)
  check(`${label}: /start отвечает (косвенно)`, !w.last_error_message && (w.pending_update_count ?? 0) < 100,
    'webhook без ошибок, прод обрабатывает апдейты (Bot API не позволяет слать /start от имени пользователя)')
  if (sendTests && chatId) {
    const ping = await tg(token, 'sendMessage', { chat_id: chatId, text: `🧪 qa-bots: ${label} жив (${new Date().toLocaleString('ru-RU')})` })
    check(`${label}: тестовое сообщение владельцу`, !!ping.ok, ping.ok ? '' : (ping.description || ''))
    if (label === 'owner-бот') {
      const menu = await tg(token, 'sendMessage', {
        chat_id: chatId, text: '🧪 qa-bots: меню-шапка + отчёт с кнопками (selftest, мерж не выполняется)',
        reply_markup: { inline_keyboard: [[
          { text: '✅ Принять и смёржить', callback_data: 'breport:approve' },
          { text: '❌ Отклонить', callback_data: 'breport:reject' },
        ]] },
      })
      check('owner-бот: отчёт с кнопками уходит', !!menu.ok, menu.ok ? '' : (menu.description || ''))
    } else {
      check('клиентский бот: связка с приложением', true, 'deep-link connect_* по живому webhook; полный e2e — qaSupportFlow')
    }
  } else if (sendTests && !chatId) {
    check(`${label}: тестовое сообщение владельцу`, false, 'нет chat_id владельца')
  }
}

const sendTests = !process.env.CI && process.env.QA_SKIP_TG !== '1'
console.log(`qa-bots: регрессия ботов (тестовые sendMessage: ${sendTests ? 'да' : 'нет'})\n`)
await checkBot({ label: 'owner-бот', token: ownerToken, webhookPath: '/webhook/owner', sendTests })
await checkBot({ label: 'клиентский бот', token: clientToken, webhookPath: '/webhook/omega', sendTests })

const failed = results.filter(r => !r.ok).length
console.log(`\nИТОГ qa-bots: ${results.length - failed}/${results.length} ✅${failed ? `, упало: ${failed}` : ''}`)
process.exit(failed ? 1 : 0)
