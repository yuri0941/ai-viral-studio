// [COVERS-SUPREME] Пруфы для отчёта владельцу (НЕ гейт CI): side-by-side «оригинал YouTube vs Омега».
// 4 кейса: 1) видео со стримером (лицо) 2) игровое без лица 3) YouTube-ссылка (thumbnail-фолбэк)
// 4) вертикаль 1080×1920. Запуск при поднятом backend :18080 не нужен — работает напрямую
// через сервисы (yt-dlp кадры + coverGenerator). Выход: reports/covers-supreme/*.jpg
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(path.join(ROOT, 'backend'))
const sharp = createRequire(path.join(ROOT, 'backend', 'noop.js'))('sharp')
const OUT = path.join(ROOT, 'reports', 'covers-supreme')
fs.mkdirSync(OUT, { recursive: true })

const { generateCoverVariants, fetchYouTubeThumbnail } = await import('../backend/services/coverGenerator.js')
const { extractYouTubeFrames } = await import('../backend/services/ytFrames.js')

async function toDataUrls(buffers) {
    return buffers.map(b => `data:image/jpeg;base64,${b.toString('base64')}`)
}

async function sideBySide(name, ytId, omegaBuffer) {
    const thumb = await fetchYouTubeThumbnail(ytId).catch(() => null)
    if (!thumb) { console.log(`⚠ ${name}: нет оригинального thumbnail`); return }
    const left = await sharp(thumb.buffer).resize(640, 360, { fit: 'cover' }).jpeg().toBuffer()
    const right = await sharp(omegaBuffer).resize(640, 360, { fit: 'cover' }).jpeg().toBuffer()
    await sharp({ create: { width: 1290, height: 360, channels: 3, background: { r: 10, g: 10, b: 14 } } })
        .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 650, top: 0 }])
        .jpeg({ quality: 88 }).toFile(path.join(OUT, `${name}-vs.jpg`))
    console.log(`📸 ${name}-vs.jpg (слева оригинал YouTube, справа Омега)`)
}

const cases = [
    { name: 'case1-streamer', ytId: 'jfKfPfyJRdk', text: 'Она сделала ЭТО в прямом эфире', note: 'стример/лицо' },
    { name: 'case2-game', ytId: 'dQw4w9WgXcQ', text: 'Финальный босс пал', note: 'без лица — эпичный объект' },
    { name: 'case3-yt-link', ytId: '9bZkp7q19f0', text: 'Взорвал весь интернет', note: 'YouTube-ссылка' },
]

for (const c of cases) {
    console.log(`\n▶ ${c.name} (${c.note})`)
    const framesRes = await extractYouTubeFrames(c.ytId).catch(() => null)
    const frames = framesRes?.frames?.length ? await toDataUrls(framesRes.frames.slice(0, 6)) : []
    const variants = await generateCoverVariants({
        topic: c.text, coverText: c.text, platform: 'youtube', count: 3,
        frames, sourceUrl: `https://youtu.be/${c.ytId}`,
    })
    const v = variants[0]
    console.log(`   source=${v.source} frame=${v.frameIndex ?? '-'} score=${v.score} sticker=${v.sticker || '-'} blur=${v.blurFilled}`)
    await sharp(v.buffer).jpeg({ quality: 90 }).toFile(path.join(OUT, `${c.name}-omega.jpg`))
    await sideBySide(c.name, c.ytId, v.buffer)
    if (c.name === 'case3-yt-link') {
        // кейс 4: вертикаль из того же источника
        const vv = await generateCoverVariants({ topic: c.text, coverText: c.text, platform: 'shorts', count: 1, frames, sourceUrl: `https://youtu.be/${c.ytId}` })
        await sharp(vv[0].buffer).jpeg({ quality: 90 }).toFile(path.join(OUT, 'case4-vertical-omega.jpg'))
        console.log(`   case4 vertical: ${vv[0].width}x${vv[0].height} blur=${vv[0].blurFilled} score=${vv[0].score}`)
    }
}
console.log('\n✅ пруфы в reports/covers-supreme/')
