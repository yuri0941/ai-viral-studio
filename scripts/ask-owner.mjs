#!/usr/bin/env node
// [TG-ASK-OWNER] Вопрос кодера владельцу в ДВА канала одновременно:
//  1) TG owner-бота: ❓ контекст + вопрос + inline-кнопки bask:<qid>:<idx> (обработчик
//     backend/services/askOwner.js за owner-гардом) или режим «ответь текстом» (--free);
//  2) локальный терминал: тот же вопрос текстом, ответ цифрой/свободным текстом (stdin).
// Первый полученный ответ побеждает; второй канал закрывается («отвечено в другом канале»).
// TG-ответ: webhook прода → handler пишет в Mongo (коллекция askowner) → скрипт поллит запись.
//
// ПРАВИЛО МОЛЧАНИЯ (ЗАДАЧА 2, дублировано в AGENTS.md):
//  - Вопросы владельцу в процессе батча ЗАПРЕЩЕНЫ, кроме реального блокера (нет доступа/данных,
//    противоречие ТЗ). Всё остальное — решать самому безопасным вариантом.
//  - Нет ответа 15 минут (--timeout, считается от отправки в оба канала) → таймаут: самый
//    безопасный вариант (--default), работа продолжается, в отчёт строка «решил сам: X, причина: Y».
//  - APPROVE-ЗОНА (--approve-zone: деньги, тарифы/PlanConfig, безопасность, удаление данных,
//    секреты) — сам НЕ решать никогда: пропустить кусок, в отчёт «ждёт решения владельца: <что>».
//  - Пуш батча — сам; мерж в main — только ✅ владельца в TG.
//
// Запуск:
//   node scripts/ask-owner.mjs --question "..." [--context "..."] --options "А,Б[,В,Г]" \
//     [--timeout 900] [--default "А"|1] [--approve-zone] [--selftest]
//   node scripts/ask-owner.mjs --question "..." --free [--timeout 900]
// Коды выхода: 0 — ответ/дефолт; 3 — ждёт решения владельца; 1 — ошибка настройки.
// Секреты только из env/backend/.env — в stdout и чат не выводятся.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import readline from 'node:readline'
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

// Источник ключей — как в report-to-owner.mjs: env → apikeys БД / OwnerSettings
async function connectMongo() {
  const uri = env('MONGODB_URI') || env('MONGO_URI')
  if (!uri) return null
  try {
    const { createRequire } = await import('node:module')
    const require = createRequire(path.join(ROOT, 'backend', 'package.json'))
    const mongoose = require('mongoose')
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    return mongoose
  } catch { return null }
}

async function resolveTgCredentials(mongoose) {
  let token = env('TELEGRAM_OWNER_BOT_TOKEN') || env('TELEGRAM_BOT_TOKEN')
  let chatId = env('TELEGRAM_OWNER_CHAT_ID') || env('OWNER_CHAT_ID') || env('OWNER_USER_ID')
  if ((!token || !chatId) && mongoose) {
    const db = mongoose.connection.db
    try {
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
    } catch { /* останется env */ }
  }
  return { token, chatId }
}

const selftest = hasFlag('selftest')
const question = arg('question') || (selftest ? 'SELFTEST: каналы вопросов кодера работают? Нажми любую кнопку или ответь в терминале.' : '')
const context = arg('context') || (selftest ? 'TG-ASK-OWNER SELFTEST' : '')
const options = arg('options')
  ? arg('options').split('|').map(s => s.trim()).filter(Boolean)
  : (selftest ? ['Да, вижу вопрос', 'Вижу, но есть замечание'] : [])
const free = hasFlag('free') || !options.length
const timeoutSec = Number(arg('timeout', '900')) || 900
const approveZone = hasFlag('approve-zone')
const defaultRaw = arg('default')

if (!question) {
  console.error('❌ Нужен --question "текст вопроса" (или --selftest)')
  process.exit(1)
}
if (!free && (options.length < 2 || options.length > 4)) {
  console.error('❌ Вариантов должно быть 2–4 (разделитель «|»): --options "А|Б|В"')
  process.exit(1)
}

let defaultAnswer = defaultRaw
if (defaultRaw && !free && /^\d+$/.test(defaultRaw)) defaultAnswer = options[Number(defaultRaw) - 1] || ''
if (defaultRaw && !defaultAnswer) {
  console.error('❌ --default не совпадает ни с одним вариантом')
  process.exit(1)
}

const qid = crypto.randomBytes(6).toString('hex')
const expiresAt = new Date(Date.now() + timeoutSec * 1000)

const mongoose = await connectMongo()
const col = mongoose ? mongoose.connection.db.collection('askowner') : null
const { token, chatId } = await resolveTgCredentials(mongoose)
const tgOk = !!(token && chatId)

if (!tgOk && !process.stdin.isTTY) {
  console.error('❌ Нет TG-ключей и нет интерактивного терминала — некуда задать вопрос')
  process.exit(1)
}
if (!col) console.warn('⚠️ Mongo недоступна — ответ из TG не будет доставлен, работает только терминал')

if (col) {
  await col.insertOne({
    qid, context, question, options, mode: free ? 'free' : 'options',
    approveZone, status: 'pending', createdAt: new Date(), expiresAt,
  })
}

// --- Канал 1: TG ---
let tgMessage = null
async function tgSend() {
  if (!tgOk) return
  const lines = [`❓ <b>Вопрос кодера</b>${context ? ` (${context})` : ''}`, '', question, '']
  const body = { chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML' }
  if (free) {
    body.text += '✍️ Ответь текстом — следующее сообщение будет ответом.'
  } else {
    body.text += 'Выбери вариант кнопкой ниже:'
    body.reply_markup = { inline_keyboard: options.map((o, i) => ([{ text: o, callback_data: `bask:${qid}:${i}` }])) }
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.ok) tgMessage = { message_id: json.result.message_id }
    else console.warn(`⚠️ TG-отправка не удалась: ${json.description || `HTTP ${res.status}`} (терминал работает)`)
  } catch (e) {
    console.warn(`⚠️ TG недоступен: ${e.message} (терминал работает)`)
  } finally { clearTimeout(timer) }
}

// Закрытие TG-канала: убрать кнопки и пометить исход («отвечено в другом канале» / таймаут)
async function tgClose(note) {
  if (!tgOk || !tgMessage) return
  const text = [`❓ <b>Вопрос кодера</b>${context ? ` (${context})` : ''}`, '', question, '', note].join('\n')
  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: tgMessage.message_id, text, parse_mode: 'HTML' }),
    })
  } catch { /* не критично */ }
}

// --- Канал 2: терминал ---
function printTerminal() {
  console.log('')
  console.log(`❓ Вопрос владельцу${context ? ` (${context})` : ''}:`)
  console.log(question)
  if (!free) options.forEach((o, i) => console.log(`  ${i + 1}) ${o}`))
  console.log(free ? 'Ответ (свободный текст):' : 'Ответ — цифрой варианта или свободным текстом:')
}

// --- Гонка каналов: первый ответ побеждает ---
let done = false
let rl = null
const finish = async (answer, via) => {
  if (done) return
  done = true
  rl?.close()
  if (col) {
    await col.updateOne({ qid, status: 'pending' },
      { $set: { status: 'answered', answer, via, answeredAt: new Date() } }).catch(() => {})
  }
  if (via === 'terminal') {
    await tgClose(`✅ Отвечено в другом канале (терминал): «${answer}»`)
    console.log(`\n✅ Ответ принят из терминала: «${answer}» (TG-канал закрыт: «отвечено в другом канале»)`)
  } else if (via === 'telegram') {
    await tgClose(`✅ Ответ принят: «${answer}»`)
    console.log(`\n✅ Ответ получен из TG: «${answer}» (терминал закрыт: «отвечено в другом канале»)`)
  } else { // timeout-default
    await tgClose(`⏱ Нет ответа ${timeoutSec} сек — применён безопасный дефолт: «${answer}»`)
    console.log(`\n⏱ Таймаут ${timeoutSec} сек. решил сам: ${answer}, причина: нет ответа владельца (безопасный дефолт)`)
  }
  console.log(`ASK_RESULT ${JSON.stringify({ qid, answer, via })}`)
  await mongoose?.disconnect().catch(() => {})
  process.exit(0)
}

const finishWaiting = async () => {
  if (done) return
  done = true
  rl?.close()
  if (col) await col.updateOne({ qid, status: 'pending' }, { $set: { status: 'waiting-owner' } }).catch(() => {})
  await tgClose('⏳ Таймаут — вопрос в APPROVE-зоне / без дефолта: ждёт решения владельца')
  console.log(`\n⏳ ждёт решения владельца: ${question}`)
  console.log(`ASK_RESULT ${JSON.stringify({ qid, answer: null, via: 'waiting-owner' })}`)
  await mongoose?.disconnect().catch(() => {})
  process.exit(3)
}

await tgSend()
printTerminal()
if (tgOk && tgMessage) console.log('(вопрос продублирован в TG owner-бота — первый ответ побеждает)')
else if (tgOk) console.log('(TG отправлен без подтверждения message_id)')
else console.log('(TG недоступен — только терминал)')

rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.on('line', (line) => {
  const t = String(line || '').trim()
  if (!t || done) return
  let answer = t
  if (!free && /^\d+$/.test(t)) answer = options[Number(t) - 1] || t
  finish(answer, 'terminal')
})

// Поллинг Mongo: ответ из TG (записал handler прода)
const poll = col ? setInterval(async () => {
  if (done) return
  try {
    const rec = await col.findOne({ qid })
    if (rec?.status === 'answered' && rec.via === 'telegram') await finish(rec.answer, 'telegram')
  } catch { /* следующий тик */ }
}, 2000) : null
poll?.unref?.()

setTimeout(async () => {
  if (done) return
  if (approveZone || !defaultAnswer) return finishWaiting()
  await finish(defaultAnswer, 'timeout-default')
}, timeoutSec * 1000).unref?.()
