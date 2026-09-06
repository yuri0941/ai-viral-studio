#!/usr/bin/env node
// [DESIGN-LAB] Отправка скринов /preview/* владельцу в TG owner-бота (sendMediaGroup, альбомы по 10).
// Ключи — как в report-to-owner.mjs: env → apikeys БД / OwnerSettings. Секреты в stdout не выводятся.
// Запуск: node scripts/design-lab-send-shots.mjs [--dir reports/design-lab-pr2]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function arg(name, def = '') {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] || '') : def
}

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
      await mongoose.disconnect()
    } catch { /* БД недоступна — останется env */ }
  }
  return { token, chatId }
}

const dir = path.resolve(ROOT, arg('dir', 'reports/design-lab-pr2'))
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort()
if (!files.length) {
  console.log(`⚠️ нет скринов в ${dir}`)
  process.exit(0)
}

const CAPTIONS = {
  chat: '💬 Фокус-чат', profile: '💎 Люкс-хаб', 'advertiser-a': '🅰 Дашборд',
  'advertiser-b': '🅱 Командный центр', 'advertiser-c': '🅲 Терминал',
  slots: '📢 Слоты', studio: '🎬 Студия', menu: '☰ Глобальное меню (бургер)',
}
const caption = (f) => {
  const m = f.replace('.png', '').split('-')
  const page = Object.keys(CAPTIONS).find(k => f.startsWith(k))
  const vp = f.includes('iphone') ? 'iPhone 390' : 'desktop 1280'
  const theme = f.endsWith('-light.png') ? 'светлая' : 'тёмная'
  return `${CAPTIONS[page] || m[0]} · ${page === 'menu' ? vp : `${vp} · ${theme}`}`
}

const { token, chatId } = await resolveTgCredentials()
if (!token || !chatId) {
  console.log('⚠️ TG недоступен: нет токена owner-бота и/или chat_id (env / кабинет)')
  process.exit(0)
}

let sent = 0
for (let i = 0; i < files.length; i += 10) {
  const chunk = files.slice(i, i + 10)
  const form = new FormData()
  form.append('chat_id', chatId)
  const media = chunk.map((f, j) => ({
    type: 'photo',
    media: `attach://p${j}`,
    caption: caption(f),
  }))
  form.append('media', JSON.stringify(media))
  chunk.forEach((f, j) => {
    form.append(`p${j}`, new Blob([fs.readFileSync(path.join(dir, f))], { type: 'image/png' }), f)
  })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 60000)
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, { method: 'POST', body: form, signal: ctrl.signal })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.ok) throw new Error(body.description || `HTTP ${res.status}`)
    sent += chunk.length
    console.log(`✅ альбом ${i / 10 + 1}: ${chunk.length} фото`)
  } catch (e) {
    console.log(`⚠️ альбом ${i / 10 + 1} не отправлен: ${e.message}`)
  } finally {
    clearTimeout(timer)
  }
}
console.log(`Итого отправлено: ${sent}/${files.length} → владельцу в TG`)
