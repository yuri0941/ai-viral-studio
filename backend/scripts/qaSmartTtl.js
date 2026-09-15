// [SMART-TTL] qaSmartTtl — событийная очистка исходников поверх TTL-контура.
// Матрица: guard (anon 401, чужой URL 403), З1 «результат принят» (used → файл удалён немедленно,
// обложка cover-*.jpg не удаляется), З2 «клиент покинул задачу» (heartbeat молчит > N мин → крон
// удаляет; живой heartbeat → файл на месте), З3 TTL-потолок (deleteAt истёк → удаление при ЛЮБОМ
// heartbeat), hot-reload N из кабинета (owner ставит 1 мин → клиент видит в /upload/limits без
// деплоя), З5 storage-usage фактом до/после. Результаты (обложки) вечны.
// Запуск: сервер на :18080 + node backend/scripts/qaSmartTtl.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })
// cwd = backend/ — как у сервера, иначе сервисы и HTTP-ручки смотрят в разные uploads/
process.chdir(path.join(__dirname, '..'))

const API = process.env.QA_API_URL || 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { default: MediaFile } = await import('../models/MediaFile.js')
const { runMediaCleanup } = await import('../cron/mediaCleanup.js')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 90) : ''}`)
  if (!ok) failed++
}
const H = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` })
async function req(method, p, token, body) {
  const r = await fetch(`${API}${p}`, {
    method,
    headers: token ? H(token) : { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

const owner = await User.findOne({ role: 'owner' })
const client = await User.findOne({ email: 'creator.test@aiviral-studio.ru' })
if (!owner || !client) {
  console.error('❌ Нет тестовых аккаунтов: запустите backend/scripts/createTestAccounts.js')
  process.exit(1)
}
const ot = owner.generateToken()
const ct = client.generateToken()

const stamp = Date.now()
const quser = await User.create({ email: `qa-smart-ttl-${stamp}@test.local`, password: 'Test12345!', name: 'QA SmartTTL', role: 'creator' })
const qt = quser.generateToken()
const uid = String(quser._id)
const dir = path.join(process.cwd(), 'uploads', uid)
fs.mkdirSync(dir, { recursive: true })
const mkFile = (name, size = 1024 * 100) => {
  fs.writeFileSync(path.join(dir, name), Buffer.alloc(size, 7))
  return `/uploads/${uid}/${name}`
}
const mkVideoRec = (url, extra = {}) =>
  MediaFile.create({ userId: quser._id, url, sizeBytes: 1024 * 100, kind: 'video', analyzedAt: new Date(), ...extra })

// 0. guard-матрица
const anonUsed = await req('POST', '/api/upload/used', 'broken.token.here', { url: '/uploads/x/y.mp4' })
check('anon POST /upload/used → 401', anonUsed.status === 401, anonUsed.status)
const foreign = await req('POST', '/api/upload/used', ct, { url: `/uploads/${uid}/x.mp4`, reason: 'cover_download' })
check('client чужой URL /upload/used → 403', foreign.status === 403, foreign.status)
const foreignHb = await req('POST', '/api/upload/heartbeat', ct, { url: `/uploads/${uid}/x.mp4` })
check('client чужой URL /upload/heartbeat → 403', foreignHb.status === 403, foreignHb.status)
const clientSetN = await req('POST', '/api/owner/video-settings', ct, { videoIdleMinutes: 5 })
check('client POST /owner/video-settings → 403', clientSetN.status === 403, clientSetN.status)

// 1. hot-reload N из кабинета: owner ставит 1 мин → клиент видит в /upload/limits без деплоя
const setN = await req('POST', '/api/owner/video-settings', ot, { videoIdleMinutes: 1 })
check('owner POST video-settings {idle:1} → 200', setN.status === 200 && setN.json.videoIdleMinutes === 1, `status=${setN.status} n=${setN.json.videoIdleMinutes}`)
const limN = await req('GET', '/api/upload/limits', ct)
check('клиент /upload/limits видит N=1 сразу (hot-reload)', limN.status === 200 && limN.json.videoIdleMinutes === 1, `n=${limN.json.videoIdleMinutes}`)

// 2. З1 «результат принят»: обложка скачана → исходник удаляется немедленно, фактом
const urlUsed = mkFile('accepted.mp4')
await mkVideoRec(urlUsed, { deleteAt: new Date(Date.now() + 24 * 3600 * 1000) })
const used = await req('POST', '/api/upload/used', qt, { url: urlUsed, reason: 'cover_download' })
const recUsed = await MediaFile.findOne({ url: urlUsed }).lean()
check('З1: used → файл удалён немедленно', used.status === 200 && used.json.deleted === true && !fs.existsSync(path.join(dir, 'accepted.mp4')), `deleted=${used.json.deleted}`)
check('З1: запись → status deleted', recUsed?.status === 'deleted' && !!recUsed?.deletedAt, `status=${recUsed?.status}`)

// 2b. обложка вечна: used на cover-*.jpg → отказ, файл на месте
const urlCov = mkFile('cover-qa-smart.jpg', 1024)
await MediaFile.create({ userId: quser._id, url: urlCov, sizeBytes: 1024, kind: 'cover', analyzedAt: new Date() })
const usedCov = await req('POST', '/api/upload/used', qt, { url: urlCov, reason: 'cover_download' })
check('З1: used на обложку → НЕ удаляется (инвентарь вечен)', usedCov.status === 200 && usedCov.json.deleted === false && fs.existsSync(path.join(dir, 'cover-qa-smart.jpg')), `deleted=${usedCov.json.deleted}`)

// 3. З2 «клиент покинул задачу»: heartbeat был, молчание > N мин → крон удаляет
const urlIdle = mkFile('idle.mp4')
await mkVideoRec(urlIdle, { lastSeenAt: new Date(Date.now() - 2 * 60 * 1000), deleteAt: new Date(Date.now() + 24 * 3600 * 1000) })
// свежий heartbeat по другому файлу → тот жить должен
const urlAlive = mkFile('alive.mp4')
await mkVideoRec(urlAlive, { deleteAt: new Date(Date.now() + 24 * 3600 * 1000) })
const hb = await req('POST', '/api/upload/heartbeat', qt, { url: urlAlive })
check('З2: heartbeat принят', hb.status === 200 && hb.json.ok === true, `ok=${hb.json.ok}`)
const recAlive = await MediaFile.findOne({ url: urlAlive }).lean()
check('З2: heartbeat обновил lastSeenAt', !!recAlive?.lastSeenAt && Date.now() - new Date(recAlive.lastSeenAt).getTime() < 60000, `lastSeenAt=${recAlive?.lastSeenAt}`)
await runMediaCleanup()
check('З2: молчание > N мин → исходник удалён кроном', !fs.existsSync(path.join(dir, 'idle.mp4')), 'файл удалён')
check('З2: живой heartbeat → файл на месте', fs.existsSync(path.join(dir, 'alive.mp4')), 'файл жив')

// 4. З3 TTL-потолок: deleteAt истёк → удаление при ЛЮБОМ heartbeat (свежем)
const urlCeil = mkFile('ceiling.mp4')
await mkVideoRec(urlCeil, { lastSeenAt: new Date(), deleteAt: new Date(Date.now() - 1000) })
await runMediaCleanup()
check('З3: TTL-потолок срабатывает поверх свежего heartbeat', !fs.existsSync(path.join(dir, 'ceiling.mp4')), 'файл удалён кроном')

// 5. З5: storage-usage фактом до/после (после = только alive.mp4 100КБ + обложка 1КБ)
const urlCnt = mkFile('usage.mp4', 50 * 1024 * 1024)
await mkVideoRec(urlCnt)
const usageBefore = await req('GET', '/api/upload/storage-usage', qt)
await req('POST', '/api/upload/used', qt, { url: urlCnt, reason: 'script_draft' })
const usageAfter = await req('GET', '/api/upload/storage-usage', qt)
check('З5: storage-usage до ≈50МБ, после ≤200КБ (alive+обложка)', usageBefore.json.usedMb >= 49 && usageAfter.json.usedBytes <= 200 * 1024, `до=${usageBefore.json.usedMb}МБ после=${usageAfter.json.usedBytes}Б`)

// возврат N в дефолт 30 (кабинет не должен остаться на тестовом значении)
const backN = await req('POST', '/api/owner/video-settings', ot, { videoIdleMinutes: 30 })
check('возврат N=30', backN.status === 200 && backN.json.videoIdleMinutes === 30, `status=${backN.status}`)

// cleanup
try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* best-effort */ }
await MediaFile.deleteMany({ userId: quser._id })
await User.deleteOne({ _id: quser._id })
await mongoose.disconnect()

console.log(failed ? `\n❌ qaSmartTtl: ${failed} проверок упало` : '\n✅ qaSmartTtl: ALL GREEN')
process.exit(failed ? 1 : 0)
