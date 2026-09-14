// [YT-FRAMES] Кадры из YouTube-видео для обложек: yt-dlp ТОЛЬКО скачивает (≤720p, ≤15 мин,
// лимит размера, таймауты), ffmpeg режет 8–10 кадров равномерно в исходном разрешении потока.
// Любой сбой (anti-bot, приватное/возрастное/стрим, нет места на диске, нет бинарей) → null +
// reason, вызывающий код молча уходит в thumbnail-фолбэк — клиенту НЕ ошибка.
// Файл видео и каталог кадров удаляются СРАЗУ после извлечения (диск Render не резиновый),
// готовые обложки живут по правилам cover-*.jpg (вечный инвентарь, вне TTL исходника).
// Параллельных скачиваний max 2 (free tier). Бинарь yt-dlp: env YTDLP_PATH → PATH →
// ленивая загрузка в os.tmpdir()/aiviral-bin (пин версии), недоступен → честный фолбэк.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import axios from 'axios'
import { logMemory } from '../utils/memoryLog.js'

const MAX_DURATION_SEC = 15 * 60
const MAX_FILE_BYTES = 150 * 1024 * 1024
const MIN_FREE_BYTES = 400 * 1024 * 1024
const PROBE_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 180_000
const FFMPEG_TIMEOUT_MS = 60_000
const FRAMES_COUNT = 9
const MAX_PARALLEL = 2
const YTDLP_VERSION = '2026.08.19'

let lastSkipReason = ''
export function getLastYtFramesSkip() { return lastSkipReason }

// ── семафор: max 2 параллельных скачивания ──
let active = 0
const waiters = []
async function acquireSlot() {
    if (active >= MAX_PARALLEL) await new Promise((resolve) => waiters.push(resolve))
    active++
}
function releaseSlot() {
    active--
    const next = waiters.shift()
    if (next) next()
}

// ── бинари ──
async function getFfmpegPath() {
    try {
        const m = await import('ffmpeg-static')
        return m.path || m.default || null
    } catch { return null }
}

function whichSync(bin) {
    const dirs = String(process.env.PATH || '').split(path.delimiter)
    const names = process.platform === 'win32' ? [`${bin}.exe`, bin] : [bin]
    for (const d of dirs) {
        for (const n of names) {
            const p = path.join(d, n)
            try { fs.accessSync(p, fs.constants.X_OK); return p } catch { /* next */ }
        }
    }
    return null
}

let ytDlpPathPromise = null
export function ensureYtDlp() {
    if (!ytDlpPathPromise) ytDlpPathPromise = resolveYtDlp().catch(() => null)
    return ytDlpPathPromise
}
async function resolveYtDlp() {
    if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) return process.env.YTDLP_PATH
    const inPath = whichSync('yt-dlp')
    if (inPath) return inPath
    const binDir = path.join(os.tmpdir(), 'aiviral-bin')
    const binPath = path.join(binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
    if (fs.existsSync(binPath) && fs.statSync(binPath).size > 1_000_000) return binPath
    // ленивая загрузка pinned-версии; не удалось → null (честный фолбэк на thumbnail)
    try {
        fs.mkdirSync(binDir, { recursive: true })
        const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
        const url = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/${name}`
        const res = await axios.get(url, { responseType: 'stream', timeout: 120_000, maxRedirects: 5 })
        await new Promise((resolve, reject) => {
            const ws = fs.createWriteStream(binPath)
            res.data.pipe(ws)
            ws.on('finish', resolve)
            ws.on('error', reject)
        })
        fs.chmodSync(binPath, 0o755)
        if (fs.statSync(binPath).size < 1_000_000) throw new Error('yt-dlp binary too small')
        console.log('[yt-frames] yt-dlp binary cached:', binPath)
        return binPath
    } catch (e) {
        try { fs.rmSync(binPath, { force: true }) } catch { /* ignore */ }
        console.warn('[yt-frames] yt-dlp unavailable:', e.message)
        return null
    }
}

// ── запуск процесса с таймаутом, без shell (инъекций нет — videoId валидирован регексом выше) ──
function run(cmd, args, timeoutMs) {
    return new Promise((resolve) => {
        let out = ''
        let err = ''
        let done = false
        let proc
        try { proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }) } catch (e) { return resolve({ code: -1, out, err: String(e) }) }
        const timer = setTimeout(() => {
            if (!done) { try { proc.kill('SIGKILL') } catch { /* ignore */ } }
        }, timeoutMs)
        proc.stdout.on('data', (d) => { if (out.length < 2_000_000) out += d })
        proc.stderr.on('data', (d) => { if (err.length < 200_000) err += d })
        proc.on('error', (e) => { done = true; clearTimeout(timer); resolve({ code: -1, out, err: String(e) }) })
        proc.on('close', (code) => { done = true; clearTimeout(timer); resolve({ code, out, err }) })
    })
}

// ── probe: длительность/стрим/доступность без скачивания ──
async function probeYouTube(ytDlp, videoId) {
    const res = await run(ytDlp, ['--no-playlist', '--skip-download', '--no-warnings', '-j', `https://www.youtube.com/watch?v=${videoId}`], PROBE_TIMEOUT_MS)
    if (res.code !== 0 || !res.out.trim()) return { ok: false, reason: `probe_failed:${(res.err || '').slice(0, 120)}` }
    let meta
    try { meta = JSON.parse(res.out.trim().split('\n').pop()) } catch { return { ok: false, reason: 'probe_bad_json' } }
    if (meta.is_live || meta.live_status === 'is_live' || meta.live_status === 'is_upcoming') return { ok: false, reason: 'live_stream' }
    const duration = Number(meta.duration) || 0
    if (!duration) return { ok: false, reason: 'no_duration' }
    if (duration > MAX_DURATION_SEC) return { ok: false, reason: `too_long:${Math.round(duration)}s` }
    return { ok: true, durationSec: duration }
}

// ── ffmpeg: N кадров равномерно (5%..95% длительности), исходное разрешение потока ──
export async function extractFramesFromVideo(ffmpegPath, videoPath, workDir, durationSec, count = FRAMES_COUNT) {
    const start = Math.max(0, durationSec * 0.05)
    const windowSec = Math.max(1, durationSec * 0.9)
    const outPattern = path.join(workDir, 'ytf-%02d.jpg')
    const res = await run(ffmpegPath, [
        '-ss', start.toFixed(2), '-i', videoPath,
        '-vf', `fps=${count}/${windowSec.toFixed(2)}`,
        '-frames:v', String(count),
        '-q:v', '3', '-y', outPattern,
    ], FFMPEG_TIMEOUT_MS)
    if (res.code !== 0) return { ok: false, reason: `ffmpeg_exit_${res.code}` }
    const files = fs.readdirSync(workDir).filter(f => f.startsWith('ytf-') && f.endsWith('.jpg')).sort()
    const frames = []
    for (const f of files) {
        const buf = fs.readFileSync(path.join(workDir, f))
        if (buf.length > 500) frames.push(buf)
    }
    if (!frames.length) return { ok: false, reason: 'no_frames' }
    return { ok: true, frames }
}

// ── тестовый/внутренний вход: кадры из ЛОКАЛЬНОГО файла + удаление файла после извлечения ──
export async function framesFromVideoFile(videoPath, { durationSec = 0, count = FRAMES_COUNT, cleanup = true } = {}) {
    const ffmpeg = await getFfmpegPath()
    if (!ffmpeg) return null
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiviral-ytf-'))
    try {
        let dur = durationSec
        if (!dur) { // длительность из stderr ffmpeg -i
            const probe = await run(ffmpeg, ['-i', videoPath], 10_000)
            const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe.err || '')
            if (m) dur = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3])
        }
        if (!dur) return null
        const r = await extractFramesFromVideo(ffmpeg, videoPath, workDir, Math.min(dur, MAX_DURATION_SEC), count)
        return r.ok ? { frames: r.frames, durationSec: dur } : null
    } finally {
        try { fs.rmSync(workDir, { recursive: true, force: true }) } catch { /* ignore */ }
        if (cleanup) { try { fs.rmSync(videoPath, { force: true }) } catch { /* ignore */ } }
    }
}

// ── основной вход: YouTube videoId → кадры | null (фолбэк на thumbnail — решение вызывающего) ──
export async function extractYouTubeFrames(videoId) {
    lastSkipReason = ''
    if (process.env.YT_FRAMES_DISABLE === '1') { lastSkipReason = 'disabled'; return null }
    if (!/^[a-zA-Z0-9_-]{11}$/.test(String(videoId || ''))) { lastSkipReason = 'bad_video_id'; return null }
    logMemory('yt-frames:start')
    await acquireSlot()
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiviral-yt-'))
    try {
        const [ytDlp, ffmpeg] = await Promise.all([ensureYtDlp(), getFfmpegPath()])
        if (!ytDlp || !ffmpeg) { lastSkipReason = `no_binary:${!ytDlp ? 'yt-dlp' : 'ffmpeg'}`; return null }
        let freeBytes = Infinity
        try { const st = fs.statfsSync(os.tmpdir()); freeBytes = st.bavail * st.bsize } catch { /* платформа без statfs — не блокируем */ }
        if (freeBytes < MIN_FREE_BYTES) { lastSkipReason = 'disk_low'; return null }
        const probe = await probeYouTube(ytDlp, videoId)
        if (!probe.ok) { lastSkipReason = probe.reason; return null }
        const videoPath = path.join(workDir, 'video.mp4')
        const dl = await run(ytDlp, [
            '--no-playlist', '--no-warnings',
            '-f', 'bestvideo[height<=720][ext=mp4]/bestvideo[height<=720]/best[height<=720][ext=mp4]/best[height<=720]/best',
            '--max-filesize', String(MAX_FILE_BYTES),
            '--no-part',
            '-o', videoPath,
            `https://www.youtube.com/watch?v=${videoId}`,
        ], DOWNLOAD_TIMEOUT_MS)
        if (dl.code !== 0 || !fs.existsSync(videoPath)) {
            lastSkipReason = `download_failed:${(dl.err || '').slice(0, 120)}`
            return null
        }
        if (fs.statSync(videoPath).size > MAX_FILE_BYTES) { lastSkipReason = 'file_too_big'; return null }
        const r = await extractFramesFromVideo(ffmpeg, videoPath, workDir, probe.durationSec)
        if (!r.ok) { lastSkipReason = r.reason; return null }
        logMemory('yt-frames:done')
        return { frames: r.frames, durationSec: probe.durationSec, width: 0, height: 0 }
    } finally {
        releaseSlot()
        // файл видео и кадры на диске удаляются СРАЗУ — в память ушли только jpeg-буферы кадров
        try { fs.rmSync(workDir, { recursive: true, force: true }) } catch { /* ignore */ }
    }
}

export default { extractYouTubeFrames, framesFromVideoFile, extractFramesFromVideo, ensureYtDlp, getLastYtFramesSkip }
