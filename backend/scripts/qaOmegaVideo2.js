// [OMEGA-VIDEO ДОП-2] qaOmegaVideo2 — контур цен ✦ / TTL / обложек / конкурентов ниши.
// Матрица: guard (anon 401 / client 403 на owner video-settings), hot-reload цены (owner ставит 3✦ →
// клиент видит 3✦ в /upload/limits без деплоя), consume/refund по фактической цене N✦, TTL 0 удаляет
// файл сразу фактом, TTL 24ч удаляет кроном по deleteAt, сироты (без разбора >24ч) удаляются, счётчик
// хранилища фактом с диска (занято → 0 после очистки), обложки: размер под платформу + читаемость
// (textHeightRatio, ≥10px в сетке 320px), niche-competitors без ключа → честный отказ, не мок-цифры.
// Запуск: сервер на :18080 + node backend/scripts/qaOmegaVideo2.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })
// cwd = backend/ — как у сервера, иначе services (videoStorage/mediaCleanup) и HTTP-ручки
// (/upload/storage-usage) смотрят в разные uploads/ (факт: счётчик видел 0 при файле на диске)
process.chdir(path.join(__dirname, '..'))

const API = process.env.QA_API_URL || 'http://localhost:18080'
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { default: MediaFile } = await import('../models/MediaFile.js')
const { UsageQuota } = await import('../models/index.js')
const { applyVideoStorageTtl } = await import('../services/videoStorage.js')
const { runMediaCleanup } = await import('../cron/mediaCleanup.js')
const { generateCoverVariants, COVER_TEXT_MIN_RATIO, coverSizeForPlatform } = await import('../services/coverGenerator.js')
const { consumeGeneration, refundGeneration } = await import('../services/usageQuotaService.js')

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

// 0. guard-матрица: owner video-settings только owner/admin
const anonVs = await req('GET', '/api/owner/video-settings', 'broken.token.here')
check('anon GET /owner/video-settings → 401', anonVs.status === 401, anonVs.status)
const clientVs = await req('POST', '/api/owner/video-settings', ct, { videoAnalysisCostCredits: 5 })
check('client POST /owner/video-settings → 403', clientVs.status === 403, clientVs.status)

// 1. hot-reload цены: owner ставит 3✦ → клиент видит 3✦ сразу (без деплоя)
const set3 = await req('POST', '/api/owner/video-settings', ot, { videoAnalysisCostCredits: 3 })
check('owner POST video-settings {analysis:3} → 200', set3.status === 200 && set3.json.videoAnalysisCostCredits === 3, `status=${set3.status}`)
const lim3 = await req('GET', '/api/upload/limits', ct)
check('клиент /upload/limits видит 3✦ сразу (hot-reload)', lim3.status === 200 && lim3.json.videoAnalysisCost === 3, `cost=${lim3.json.videoAnalysisCost}`)
const back1 = await req('POST', '/api/owner/video-settings', ot, { videoAnalysisCostCredits: 1 })
check('возврат цены 1✦', back1.status === 200 && back1.json.videoAnalysisCostCredits === 1, `status=${back1.status}`)

// 2. списание/возврат по фактической цене N✦
const stamp = Date.now()
const quser = await User.create({ email: `qa-ttl-${stamp}@test.local`, password: 'Test12345!', name: 'QA TTL', role: 'creator' })
await UsageQuota.deleteMany({ userId: quser._id })
await UsageQuota.create({ userId: quser._id, plan: 'free', trialTokens: 10, trialUsed: 0, generationsLimit: 0, generationsUsed: 0, cycleStartedAt: new Date(), cycleEndsAt: new Date(Date.now() + 86400000) })
const consumed = await consumeGeneration(quser._id, 'creator', { cost: 3 })
const afterConsume = await UsageQuota.findOne({ userId: quser._id }).lean()
check('consume cost=3: trialTokens 10 → 7', consumed.allowed === true && afterConsume.trialTokens === 7, `tokens=${afterConsume.trialTokens}`)
await refundGeneration(quser._id, 3)
const afterRefund = await UsageQuota.findOne({ userId: quser._id }).lean()
check('refund cost=3: trialTokens обратно 10', afterRefund.trialTokens === 10, `tokens=${afterRefund.trialTokens}`)
const over = await consumeGeneration(quser._id, 'creator', { cost: 11 })
check('нехватка (цена 11✦ > 10✦) → отказ (UpsellModal на фронте)', over.allowed === false && over.code === 'TRIAL_EXHAUSTED', `code=${over.code}`)

// 3. TTL: файлы пользователя — факт на диске
const dir = path.join(process.cwd(), 'uploads', String(quser._id))
fs.mkdirSync(dir, { recursive: true })
const mkFile = (name, size = 1024 * 100) => {
  fs.writeFileSync(path.join(dir, name), Buffer.alloc(size, 7))
  return `/uploads/${quser._id}/${name}`
}

// TTL 0 → удаление сразу после разбора (фактом)
const url0 = mkFile('ttl0.mp4')
await MediaFile.create({ userId: quser._id, url: url0, sizeBytes: 1024 * 100, kind: 'video' })
const r0 = await applyVideoStorageTtl({ videoUrl: url0, userId: String(quser._id), ttlHours: 0 })
check('TTL 0: файл удалён сразу после разбора', r0.deletedNow === true && !fs.existsSync(path.join(dir, 'ttl0.mp4')), `deletedNow=${r0.deletedNow}`)

// TTL 24ч → файл жив до deleteAt, крон удаляет по факту
const url24 = mkFile('ttl24.mp4')
const r24 = await applyVideoStorageTtl({ videoUrl: url24, userId: String(quser._id), ttlHours: 24 })
const rec24 = await MediaFile.findOne({ url: url24 }).lean()
const ttlOk = rec24?.deleteAt && Math.abs(new Date(rec24.deleteAt).getTime() - (Date.now() + 24 * 3600 * 1000)) < 60000
check('TTL 24ч: файл на месте + deleteAt ≈ +24ч', r24.deletedNow === false && fs.existsSync(path.join(dir, 'ttl24.mp4')) && ttlOk, `deleteAt=${rec24?.deleteAt}`)
await MediaFile.updateOne({ url: url24 }, { deleteAt: new Date(Date.now() - 1000) }) // «прошли сутки»
await runMediaCleanup()
check('TTL 24ч: крон удалил файл по истечении', !fs.existsSync(path.join(dir, 'ttl24.mp4')), 'файл удалён кроном')

// Сирота: файл без записи анализа (analyzedAt null) старше 24ч → удаление по расписанию
const urlOrph = mkFile('orphan.mp4')
await MediaFile.create({ userId: quser._id, url: urlOrph, sizeBytes: 1024 * 100, kind: 'video', createdAt: new Date(Date.now() - 25 * 3600 * 1000) })
await runMediaCleanup()
check('сирота (без разбора >24ч): удалена кроном', !fs.existsSync(path.join(dir, 'orphan.mp4')), 'файл удалён')

// [COVERS-FRAMES ДОР] обложка НЕ живёт по TTL исходника: legacy-запись (kind image, analyzedAt null)
// старше 24ч + mtime старше 7 дней — крон обязан оставить cover-*.jpg на диске (вечный инвентарь чата)
const urlCov = mkFile('cover-qa-protect.jpg')
await MediaFile.create({ userId: quser._id, url: urlCov, sizeBytes: 1024, kind: 'image', createdAt: new Date(Date.now() - 25 * 3600 * 1000) })
const oldMtime = new Date(Date.now() - 8 * 24 * 3600 * 1000)
fs.utimesSync(path.join(dir, 'cover-qa-protect.jpg'), oldMtime, oldMtime)
await runMediaCleanup()
check('обложка cover-*.jpg: крон НЕ удаляет (ни сирота-свип, ни 7-дневный)', fs.existsSync(path.join(dir, 'cover-qa-protect.jpg')), 'файл на месте')
fs.unlinkSync(path.join(dir, 'cover-qa-protect.jpg'))
await MediaFile.deleteOne({ url: urlCov })

// 4. счётчик хранилища клиента — фактом с диска
const urlCnt = mkFile('counter.mp4', 100 * 1024 * 1024) // 100 МБ
const qt = quser.generateToken()
const usageBusy = await req('GET', '/api/upload/storage-usage', qt)
check('счётчик: загружено 100МБ → занято ~100МБ', usageBusy.status === 200 && usageBusy.json.usedMb >= 99 && usageBusy.json.usedMb <= 101, `usedMb=${usageBusy.json.usedMb}`)
fs.unlinkSync(path.join(dir, 'counter.mp4'))
const usageFree = await req('GET', '/api/upload/storage-usage', qt)
check('счётчик: после удаления занято 0', usageFree.status === 200 && usageFree.json.usedBytes === 0, `usedBytes=${usageFree.json.usedBytes}`)

// 5. обложки: размер под платформу фактом + читаемость в мелкой сетке
for (const [platform, expect] of [['youtube', { width: 1280, height: 720 }], ['tiktok', { width: 1080, height: 1920 }]]) {
  const variants = await generateCoverVariants({ topic: 'финансы для начинающих', coverText: 'Деньги с нуля сегодня', platform, count: 3, forceFallback: true })
  const okCount = variants.length === 3
  const okSize = variants.every(v => v.width === expect.width && v.height === expect.height)
  const okRatio = variants.every(v => v.textHeightRatio >= COVER_TEXT_MIN_RATIO)
  // мелкая сетка ленты: превью 320px по ширине — текст ≥10px фактического рендера
  const okGrid = variants.every(v => (v.textHeightRatio * Math.min(v.width, v.height) * (320 / v.width)) >= 10)
  let okJpeg = false
  try {
    const sharp = (await import('sharp')).default
    const meta = await sharp(variants[0].buffer).metadata()
    okJpeg = meta.format === 'jpeg' && meta.width === expect.width && meta.height === expect.height
  } catch { /* ignore */ }
  check(`обложки ${platform}: 3 варианта ${expect.width}×${expect.height}, читаемы в сетке 320px`, okCount && okSize && okRatio && okGrid && okJpeg, `n=${variants.length} ratio=${variants[0]?.textHeightRatio?.toFixed(3)}`)
}
const sizeVk = coverSizeForPlatform('vk')
check('размеры платформ: vk/telegram 1280×720', sizeVk.width === 1280 && sizeVk.height === 720, `${sizeVk.width}×${sizeVk.height}`)

// 5b. [COVERS-FRAMES] основа = реальный кадр: 3 лучших кадра по скору, source='frame', НЕ pollinations
const { extractYouTubeId, pickBestFrames } = await import('../services/coverGenerator.js')
const sharpQa = (await import('sharp')).default
const mkFrame = async (kind) => {
  let img
  if (kind === 'noise') { // контрастный детальный кадр — должен выигрывать скор
    const raw = Buffer.alloc(640 * 360 * 3)
    for (let i = 0; i < raw.length; i++) raw[i] = Math.floor(Math.random() * 256)
    img = sharpQa(raw, { raw: { width: 640, height: 360, channels: 3 } })
  } else if (kind === 'dark') {
    img = sharpQa({ create: { width: 640, height: 360, channels: 3, background: { r: 8, g: 8, b: 10 } } })
  } else {
    img = sharpQa({ create: { width: 640, height: 360, channels: 3, background: { r: 120, g: 120, b: 124 } } })
  }
  const buf = await img.jpeg({ quality: 70 }).toBuffer()
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}
const frameDataUrls = [await mkFrame('dark'), await mkFrame('flat'), await mkFrame('noise'), await mkFrame('flat')]
const frameVariants = await generateCoverVariants({ topic: 'разбор кадра', coverText: 'Главный секрет ролика', platform: 'youtube', count: 3, frames: frameDataUrls })
const frameOk = frameVariants.length === 3
  && frameVariants.every(v => v.source === 'frame' && v.provider === 'video-frame')
  && frameVariants.every(v => v.width === 1280 && v.height === 720)
  && frameVariants.every(v => v.textHeightRatio >= COVER_TEXT_MIN_RATIO)
// [COVERS-SUPREME З6] порядок вариантов — по AI-скору (лучший первый), не по скору кадра;
// шумный кадр (лучший момент) обязан попасть в выборку, скоры отсортированы desc, best ровно один
const noisePicked = frameVariants.some(v => v.frameIndex === 2)
const scoresDesc = frameVariants.every(v => typeof v.score === 'number' && v.score >= 1 && v.score <= 100)
  && frameVariants[0].score >= frameVariants[1].score && frameVariants[1].score >= frameVariants[2].score
  && frameVariants.filter(v => v.best).length === 1 && frameVariants[0].best === true
check('обложки frame-режим: 3 варианта из реальных кадров, лучший момент в выборке, AI-скор у всех, лучший первый', frameOk && noisePicked && scoresDesc, `frames=${frameVariants.map(v => v.frameIndex).join(',')} scores=${frameVariants.map(v => v.score).join(',')}`)
// скор кадров: шумный кадр выше плоского фактом
const picked = await pickBestFrames(frameDataUrls.map(u => Buffer.from(u.split(',')[1], 'base64')), 3)
check('pickBestFrames: шумный кадр имеет топ-скор', picked[0]?.index === 2, `order=${picked.map(p => p.index).join(',')}`)
// YouTube-ссылка: videoId из любой формы; мусор → null (не уходит в fetch)
const ytOk = extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ'
  && extractYouTubeId('https://youtu.be/dQw4w9WgXcQ') === 'dQw4w9WgXcQ'
  && extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ') === 'dQw4w9WgXcQ'
  && extractYouTubeId('https://evil.example.com/watch?v=dQw4w9WgXcQ') === null
check('extractYouTubeId: watch/youtu.be/shorts → id, чужой домен → null', ytOk, '')
// [YT-DATA-FIX] регресс parse Shorts-URL с si-параметром (инцидент 15.09 — подозрение на сломанный parse)
const ytSi = extractYouTubeId('https://youtube.com/shorts/dQw4w9WgXcQ?si=xyz123') === 'dQw4w9WgXcQ'
  && extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?si=xyz123') === 'dQw4w9WgXcQ'
  && extractYouTubeId('https://youtube.com/watch?v=dQw4w9WgXcQ&si=xyz123') === 'dQw4w9WgXcQ'
check('extractYouTubeId: si-параметр не ломает id (shorts/youtu.be/watch)', ytSi, '')
// mode:'ai' остаётся text-to-image (кнопка «Перегенерировать стиль»), forceFallback — детерминированный фон
const aiVariants = await generateCoverVariants({ topic: 'тест', coverText: 'Стиль заново', platform: 'youtube', count: 3, forceFallback: true, mode: 'ai', frames: frameDataUrls })
check('mode ai: кадры игнорируются, source=ai (перегенерация стиля)', aiVariants.length === 3 && aiVariants.every(v => v.source === 'ai'), `src=${aiVariants[0]?.source}`)

// 5c. [COVERS-FRAMES ДОР] рендер из полноразмерного кадра: скор на 640px, фон — исходник до 1920×1080
const mkSolid = async (w, h, rgb) => {
  const buf = await sharpQa({ create: { width: w, height: h, channels: 3, background: rgb } }).jpeg({ quality: 80 }).toBuffer()
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}
// скор-кадры 640px: шумный (индекс 2) побеждает; полноразмерный кадр того же индекса — ярко-зелёный маркер
const fullDataUrls = [await mkSolid(1920, 1080, { r: 200, g: 30, b: 30 }), await mkSolid(1920, 1080, { r: 30, g: 30, b: 200 }), await mkSolid(1920, 1080, { r: 20, g: 210, b: 20 }), await mkSolid(1920, 1080, { r: 200, g: 200, b: 30 })]
const hiVariants = await generateCoverVariants({ topic: 'разбор кадра', coverText: 'Главный секрет ролика', platform: 'youtube', count: 3, frames: frameDataUrls, fullFrames: fullDataUrls })
// [COVERS-SUPREME З6] порядок — по AI-скору; маркер смотрим у варианта с лучшим моментом (frameIndex 2)
const hiBest = hiVariants.find(v => v.frameIndex === 2) || hiVariants[0]
const hiMeta = await sharpQa(hiBest.buffer).metadata()
const hiStats = await sharpQa(hiBest.buffer).stats()
const rMean = hiStats.channels[0]?.mean || 0
const gMean = hiStats.channels[1]?.mean || 0
const bMean = hiStats.channels[2]?.mean || 0
check('fullFrames: фон из полноразмерного кадра 1920×1080 → 1280×720 (зелёный маркер)',
  hiVariants.length === 3 && hiBest.frameIndex === 2 && hiBest.bgFullRes === true
    && hiMeta.width === 1280 && hiMeta.height === 720 && gMean > rMean + 40 && gMean > bMean + 40,
  `idx=${hiBest?.frameIndex} ${hiMeta.width}x${hiMeta.height} rgb=${rMean.toFixed(0)},${gMean.toFixed(0)},${bMean.toFixed(0)}`)
// исходник меньше цели → без апскейла выше исходника (960×540 не растягивается до 1280×720)
const lowVariants = await generateCoverVariants({ topic: 'тест', coverText: 'Маленький исходник', platform: 'youtube', count: 1, frames: [frameDataUrls[2]], fullFrames: [await mkSolid(960, 540, { r: 40, g: 40, b: 180 })] })
const lowMeta = await sharpQa(lowVariants[0].buffer).metadata()
check('fullFrames: нет апскейла выше исходника (960×540 → 960×540)', lowVariants.length === 1 && lowMeta.width === 960 && lowMeta.height === 540, `${lowMeta.width}x${lowMeta.height}`)

// 5d. [COVERS-FRAMES ДОР-2] один базовый кадр (YouTube-thumbnail / повтор кадра при нехватке) →
// 3 визуально РАЗЛИЧИМЫХ варианта: разные кропы/зум кадра + разные цветовые схемы/сила скрима
const oneVariants = await generateCoverVariants({ topic: 'разбор кадра', coverText: 'Главный секрет ролика', platform: 'youtube', count: 3, frames: [frameDataUrls[2]] })
const sameBase = oneVariants.length === 3 && oneVariants.every(v => v.source === 'frame' && v.frameIndex === 0)
const oneRaws = []
for (const v of oneVariants) oneRaws.push(await sharpQa(v.buffer).resize(64, 36, { fit: 'fill' }).raw().toBuffer())
const pairDiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length }
const d01 = pairDiff(oneRaws[0], oneRaws[1]); const d02 = pairDiff(oneRaws[0], oneRaws[2]); const d12 = pairDiff(oneRaws[1], oneRaws[2])
check('один кадр → 3 визуально различимых варианта (кроп/зум + схема текста)', sameBase && d01 > 8 && d02 > 8 && d12 > 8, `diff=${d01.toFixed(1)},${d02.toFixed(1)},${d12.toFixed(1)}`)


// 5e. [YT-FRAMES] кадры из YouTube-видео: ffmpeg-извлечение (файл удаляется сразу), 3 разных кадра,
// честные фолбэки без ошибки клиенту. Сеть/yt-dlp в гейте НЕ нужны — синтетика + тестовый шов.
const { framesFromVideoFile, extractYouTubeFrames: extractYtFramesGate, getLastYtFramesSkip } = await import('../services/ytFrames.js')
const ffmpegStatic = (await import('ffmpeg-static')).default
const tmpVid = path.join(dir, 'gate-yt.mp4')
await new Promise((resolve, reject) => {
  const p = spawn(ffmpegStatic, ['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=30:duration=5', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-y', tmpVid], { stdio: 'ignore' })
  p.on('close', c => (c === 0 ? resolve() : reject(new Error(`ffmpeg_exit_${c}`))))
  p.on('error', reject)
})
const vidExisted = fs.existsSync(tmpVid)
const ytFramesRes = await framesFromVideoFile(tmpVid, { durationSec: 5 })
check('yt-frames: 8–10 кадров из видео равномерно по длительности', !!ytFramesRes && ytFramesRes.frames.length >= 8 && ytFramesRes.frames.length <= 10, `frames=${ytFramesRes?.frames?.length}`)
check('yt-frames: файл видео удалён СРАЗУ после извлечения кадров', vidExisted && !fs.existsSync(tmpVid), `exists=${fs.existsSync(tmpVid)}`)
const ytFrameMeta = ytFramesRes ? await sharpQa(ytFramesRes.frames[0]).metadata() : {}
check('yt-frames: кадр нативного разрешения потока (640×360, без апскейла)', ytFrameMeta.width === 640 && ytFrameMeta.height === 360, `${ytFrameMeta.width}x${ytFrameMeta.height}`)
// pipeline: те же кадры → generateCoverVariants (тестовый шов ytFramesProvider) → 3 РАЗНЫХ кадра
const ytVar = await generateCoverVariants({
  topic: 'разбор', coverText: 'Главный секрет ролика', platform: 'youtube', count: 3,
  sourceUrl: 'https://youtu.be/dQw4w9WgXcQ',
  ytFramesProvider: async () => ytFramesRes,
})
const ytDiffs = []
if (ytVar.length === 3) {
  const raws2 = []
  for (const v of ytVar) raws2.push(await sharpQa(v.buffer).resize(64, 36, { fit: 'fill' }).raw().toBuffer())
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) { let s = 0; for (let k = 0; k < raws2[i].length; k++) s += Math.abs(raws2[i][k] - raws2[j][k]); ytDiffs.push(s / raws2[i].length) }
}
const ytIdx = new Set(ytVar.map(v => v.frameIndex))
check('yt-frames: 3 обложки из РАЗНЫХ кадров видео, визуально различимы', ytVar.length === 3 && ytVar.every(v => v.source === 'youtube-frames') && ytIdx.size === 3 && ytDiffs.every(d => d > 8), `idx=${ytVar.map(v => v.frameIndex).join(',')} diff=${ytDiffs.map(d => d.toFixed(1)).join(',')}`)
// фолбэк: кадры недоступны → прежняя цепочка (thumbnail → AI), клиенту НЕ ошибка
const fbVar = await generateCoverVariants({
  topic: 'разбор', coverText: 'Главный секрет ролика', platform: 'youtube', count: 3, forceFallback: true,
  sourceUrl: 'https://youtu.be/dQw4w9WgXcQ',
  ytFramesProvider: async () => null,
})
check('yt-frames: сбой кадров → фолбэк (thumbnail/AI), 3 варианта без ошибки', fbVar.length === 3 && fbVar.every(v => v.source === 'youtube' || v.source === 'ai'), `src=${fbVar[0]?.source}`)
// kill-switch и мусорный id → честный null + reason
process.env.YT_FRAMES_DISABLE = '1'
const dis = await extractYtFramesGate('dQw4w9WgXcQ')
delete process.env.YT_FRAMES_DISABLE
check('yt-frames: YT_FRAMES_DISABLE=1 → null + reason (честный фолбэк)', dis === null && getLastYtFramesSkip() === 'disabled', `reason=${getLastYtFramesSkip()}`)
const badId = await extractYtFramesGate('../../etc/passwd')
check('yt-frames: мусорный videoId → null (в fetch не уходит)', badId === null && getLastYtFramesSkip() === 'bad_video_id', `reason=${getLastYtFramesSkip()}`)



// 5f. [COVERS-SUPREME] стикер с обводкой, текст-блок ≥25% кадра, blur-fill на вертикали,
// AI-режим без запечённого текста, AI-скор у всех 3 вариантов, экспорт во все 4 формата.
{
  const { buildBackgroundPrompt } = await import('../services/coverGenerator.js')
  // стикер: кадр с ярким объектом на тёмном фоне БЕЗ белых пикселей (белое в результате = обводка)
  const circleSvg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg"><rect width="1280" height="720" fill="#202028"/><circle cx="400" cy="360" r="170" fill="#ff5533"/></svg>`
  const circleFrame = `data:image/jpeg;base64,${(await sharpQa(Buffer.from(circleSvg)).jpeg({ quality: 80 }).toBuffer()).toString('base64')}`
  const stVars = await generateCoverVariants({ topic: 'обзор босса', coverText: 'Финальный босс пал', platform: 'youtube', count: 3, frames: [circleFrame] })
  const stVar = stVars.find(v => v.sticker)
  check('supreme: стикер-объект собран (organic без ключа / pro с ключом)', !!stVar && ['organic', 'pro'].includes(stVar.sticker), `sticker=${stVar?.sticker}`)
  if (stVar) {
    const { data, info } = await sharpQa(stVar.buffer).raw().toBuffer({ resolveWithObject: true })
    let white = 0
    for (let i = 0; i < data.length; i += 3) {
      if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) white++
    }
    const whiteRatio = white / (info.width * info.height)
    check('supreme: у стикера есть светлая обводка/свечение (белые пиксели фактом)', whiteRatio > 0.0005, `white=${(whiteRatio * 100).toFixed(2)}%`)
  }
  // текст-блок ≥25% кадра (Russo One авто-фит)
  check('supreme: текст-блок ≥25% высоты кадра', stVars.every(v => (v.textBlockRatio || 0) >= 0.25), `block=${stVars.map(v => (v.textBlockRatio || 0).toFixed(2)).join(',')}`)
  // blur-fill: горизонтальный кадр → вертикаль Shorts: полосы = размытая копия (не center-crop)
  const halfSvg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg"><rect width="1280" height="360" fill="#cc2222"/><rect y="360" width="1280" height="360" fill="#2222cc"/></svg>`
  const halfFrame = `data:image/jpeg;base64,${(await sharpQa(Buffer.from(halfSvg)).jpeg({ quality: 80 }).toBuffer()).toString('base64')}`
  const vVars = await generateCoverVariants({ topic: 'вертикаль', coverText: 'Шортс тест вертикали', platform: 'shorts', count: 1, frames: [halfFrame] })
  const vv = vVars[0]
  let blurOk = false
  if (vv && vv.width === 1080 && vv.height === 1920) {
    // sharp: stats() игнорирует extract (считает по входу) — материализуем регионы.
    // Маркеры blur-fill (факт по пикселям): верхняя полоса — размытая И затемнённая копия
    // (stdev≈0, красный приглушён 204→~134), fg в центре — резкий и ПОЛНОЙ яркости (R≈204),
    // шов fg резкий (stdev высокий). При center-crop fg-зона была бы единственной (без полос).
    const reg = async (top, height, left = 200, width = 680) => {
      const b = await sharpQa(vv.buffer).extract({ left, top, width, height }).toBuffer()
      return sharpQa(b).stats()
    }
    const band = await reg(30, 120)
    const fgRed = await reg(800, 60)
    const seam = await reg(930, 60)
    const bandStd = (band.channels[0].stdev + band.channels[1].stdev + band.channels[2].stdev) / 3
    const seamStd = (seam.channels[0].stdev + seam.channels[1].stdev + seam.channels[2].stdev) / 3
    blurOk = bandStd < 12 && fgRed.channels[0].mean > 180 && band.channels[0].mean > 70 && band.channels[0].mean < 180 && seamStd > 25
  }
  check('supreme: вертикаль 1080×1920 с blur-fill полосами (полоса размыта+затемнена, fg резкий)', !!vv && vv.width === 1080 && vv.height === 1920 && vv.blurFilled === true && blurOk, `blur=${vv?.blurFilled}`)
  // AI-режим: текст НЕ передаётся в image-провайдер (жёсткий strip — только тема/сцена)
  const prompt = buildBackgroundPrompt('обзор игры', 'dark cave with dragon')
  check('supreme: AI-промпт без текста обложки (текст только sharp-оверлей)', !prompt.includes('СЕКРЕТ') && !prompt.includes('Финальный босс пал') && prompt.includes('no text'), prompt.slice(0, 60))
  // niche-пресет: без данных → честный универсальный фолбэк (не мок)
  const { getNicheStylePreset } = await import('../services/nicheStyleService.js')
  const presetEmpty = await getNicheStylePreset({ topic: '', niche: '' })
  check('supreme: пресет без данных ниши → universal (честный фолбэк)', presetEmpty.source === 'universal', presetEmpty.source)
  // cover-choice: лог выбора пишется, bias читается
  const { default: CoverChoiceLog, getChoiceBias } = await import('../models/CoverChoiceLog.js')
  await CoverChoiceLog.create({ userId: quser._id, topic: 'qa', platform: 'youtube', chosenIndex: 0, scheme: 0, source: 'frame', score: 90, bestScore: 90, pickedBest: true })
  const bias = await getChoiceBias()
  check('supreme: выбор клиента логируется (Self-Optimize)', bias && typeof bias.samples === 'number', `samples=${bias?.samples}`)
  const choiceAnon = await req('POST', '/api/omega/cover-choice', 'broken.token.here', { chosenIndex: 0 })
  check('cover-choice anon → 401', choiceAnon.status === 401, choiceAnon.status)
  const choiceBad = await req('POST', '/api/omega/cover-choice', qt, {})
  check('cover-choice без chosenIndex → 400', choiceBad.status === 400, choiceBad.status)
  // экспорт во все 4 формата: свой файл → 200 + размер платформы; чужой → 403
  const exportSrc = mkFile('cover-export-src.jpg')
  fs.writeFileSync(path.join(dir, 'cover-export-src.jpg'), stVars[0].buffer)
  for (const [pf, ew, eh] of [['youtube', 1280, 720], ['shorts', 1080, 1920], ['vk', 1280, 720], ['telegram', 1280, 720]]) {
    const r = await fetch(`${API}/api/omega/cover-export?url=${encodeURIComponent(exportSrc)}&platform=${pf}`, { headers: H(qt) })
    const buf = Buffer.from(await r.arrayBuffer())
    const m = await sharpQa(buf).metadata()
    check(`cover-export ${pf}: 200, ${ew}×${eh}`, r.status === 200 && m.width === ew && m.height === eh, `status=${r.status} ${m.width}x${m.height}`)
  }
  const exportForeign = await req('GET', `/api/omega/cover-export?url=${encodeURIComponent(`/uploads/${owner._id}/x.jpg`)}&platform=youtube`, qt)
  check('cover-export чужой файл → 403', exportForeign.status === 403, exportForeign.status)
  fs.unlinkSync(path.join(dir, 'cover-export-src.jpg'))
}

// 6. конкуренты ниши: без ключа — честный отказ, никаких выдуманных цифр
const compTiktok = await req('GET', '/api/omega/niche-competitors?niche=финансы&platform=tiktok', ct)
check('конкуренты tiktok без ключа → available:false + requiredKey', compTiktok.status === 200 && compTiktok.json.available === false && compTiktok.json.requiredKey === 'tiktok' && !compTiktok.json.rows, `reason=${compTiktok.json.reason}`)
const compAnon = await req('GET', '/api/omega/niche-competitors?niche=x&platform=youtube', 'broken.token.here')
check('конкуренты anon → 401', compAnon.status === 401, compAnon.status)

// 7. сценарий из мысли: уточнение цели БЕЗ списания ✦
const clarify = await req('POST', '/api/omega/script-from-idea', ct, { idea: 'ролик про деньги' })
check('сценарий: неполная цель → needClarification без списания', clarify.status === 200 && clarify.json.needClarification === true && clarify.json.missing?.length >= 1, `missing=${(clarify.json.missing || []).join(',')}`)
const clarifyCost = typeof clarify.json.cost === 'number' && clarify.json.cost >= 1
check('сценарий: цена ✦ показана до запуска', clarifyCost, `cost=${clarify.json.cost}`)

// 8. [YT-DATA-FIX] YouTube-ссылка в чате: статистика недоступна → честный отказ с причиной,
// БЕЗ шаблонного ответа AI и БЕЗ списания ✦ (инцидент 15.09: 4 ссылки → «нет данных» на списанные генерации).
// Несуществующий id (11 символов, формат валиден) → video_not_found при живом ключе / no_api_key без ключа —
// обе ветки детерминированно сходятся на честном отказе.
const qayt = await User.create({ email: `qa-yt-${stamp}@test.local`, password: 'Test12345!', name: 'QA YT', role: 'creator' })
await UsageQuota.create({ userId: qayt._id, plan: 'free', trialTokens: 10, trialUsed: 0, generationsLimit: 0, generationsUsed: 0, cycleStartedAt: new Date(), cycleEndsAt: new Date(Date.now() + 86400000) })
const qaytToken = qayt.generateToken()
const chatYt = await req('POST', '/api/omega/chat', qaytToken, { message: 'разбор https://youtu.be/AAAAAAAAAAZ', lang: 'ru' })
check('chat yt-link: статистика недоступна → honest-отказ (не шаблон AI)',
  chatYt.status === 200 && chatYt.json?.data?.honest === true && chatYt.json?.data?.source === 'youtube-unavailable'
    && /Не удалось получить данные YouTube/.test(chatYt.json?.data?.response || ''),
  `status=${chatYt.status} src=${chatYt.json?.data?.source}`)
check('chat yt-link: карточка с причиной (statsAvailable:false + statsError)',
  chatYt.json?.data?.videoAnalysis?.statsAvailable === false && typeof chatYt.json?.data?.videoAnalysis?.statsError === 'string' && chatYt.json.data.videoAnalysis.statsError.length > 3,
  `err=${String(chatYt.json?.data?.videoAnalysis?.statsError || '').slice(0, 60)}`)
const qaytQuota = await UsageQuota.findOne({ userId: qayt._id }).lean()
check('chat yt-link: ✦ НЕ списан при честном отказе (trialTokens 10)', qaytQuota?.trialTokens === 10, `tokens=${qaytQuota?.trialTokens}`)
// живое состояние ключа: доступен → реальные цифры фактом; нет → честный unavailable с reason (не мок)
const { fetchVideoStats: fetchVideoStatsGate, mapYoutubeError: mapYtErrGate } = await import('../services/youtubeDataService.js')
const liveStats = await fetchVideoStatsGate('887uCBMcnIM')
check('youtubeDataService: живой API (views>0) ИЛИ честный unavailable с кодом причины',
  liveStats.available === true ? (liveStats.views > 0 && !!liveStats.title) : (liveStats.available === false && typeof liveStats.error?.code === 'string' && liveStats.error.code.length > 2),
  liveStats.available ? `views=${liveStats.views}` : `code=${liveStats.error?.code}`)
// mapYoutubeError: квота ≠ битый ключ (квота НЕ должна выводить ключ из ротации)
const quotaMapped = mapYtErrGate({ response: { status: 403, data: { error: { errors: [{ reason: 'quotaExceeded' }], message: 'quota' } } } })
const badKeyMapped = mapYtErrGate({ response: { status: 400, data: { error: { errors: [{ reason: 'keyInvalid' }], message: 'bad key' } } } })
check('mapYoutubeError: quotaExceeded и keyInvalid различимы (разная обработка)',
  quotaMapped.code === 'quotaExceeded' && badKeyMapped.code === 'keyInvalid', `quota=${quotaMapped.code} key=${badKeyMapped.code}`)
await UsageQuota.deleteMany({ userId: qayt._id })
await User.deleteOne({ _id: qayt._id })

// cleanup
await MediaFile.deleteMany({ userId: quser._id })
await UsageQuota.deleteMany({ userId: quser._id })
await User.deleteOne({ _id: quser._id })
fs.rmSync(dir, { recursive: true, force: true })
// вернуть TTL кабинета в дефолт, если тесты его трогали (не трогали — но страховка дефолта)
await req('POST', '/api/owner/video-settings', ot, { videoAnalysisCostCredits: 1, videoStorageTtlHours: 0 })

console.log(failed === 0 ? '\n✅ qaOmegaVideo2: все проверки зелёные' : `\n❌ qaOmegaVideo2: ${failed} провал(ов)`)
await mongoose.disconnect()
process.exit(failed === 0 ? 0 : 1)
