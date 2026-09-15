import { unlink } from 'fs/promises'
import { join, normalize } from 'path'
import MediaFile from '../models/MediaFile.js'

// [SMART-TTL] TG-алерты идут с parse_mode=HTML — весь пользовательский ввод экранируем (& < >)
const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// [SMART-TTL] общая валидация: только свой исходник из /uploads/<userId>/, обложки (cover-*) вечны
function safeVideoRelPath(videoUrl, userId) {
    const relPath = normalize(String(videoUrl || '').replace(/^\/+/, '')).replace(/\\/g, '/')
    if (!relPath.startsWith(`uploads/${userId}/`) || relPath.includes('..')) return null
    if (/(^|\/)cover-[^/]+\.jpg$/.test(relPath)) return null
    return relPath
}

// [SMART-TTL З5] лог владельцу о событийном удалении (файл/размер фактом)
async function alertMediaDeleted(userId, relPath, sizeBytes, reason) {
    try {
        const { sendOwnerAlert } = await import('../services/ownerBot.js')
        const mb = ((sizeBytes || 0) / (1024 * 1024)).toFixed(1)
        await sendOwnerAlert(`🧹 Исходник очищен (${escapeHtml(reason)}): user ${escapeHtml(userId)}, ${escapeHtml(relPath.split('/').pop())}, ${mb} МБ. Результаты сохранены.`)
    } catch (e) {
        console.warn('[videoStorage] owner alert failed:', e.message)
    }
}

// [SMART-TTL З1] событие «результат принят» (обложка скачана/применена, драфт создан):
// исходный видеофайл удаляется немедленно. Результаты (обложки/разбор в чате) НЕ трогаем.
export async function deleteMediaNow({ videoUrl, userId, reason = 'accepted' }) {
    const relPath = safeVideoRelPath(videoUrl, userId)
    if (!relPath) return { deleted: false, skipped: 'forbidden_path' }
    const rec = await MediaFile.findOne({ url: videoUrl }).lean().catch(() => null)
    if (rec && rec.status === 'deleted') return { deleted: false, skipped: 'already_deleted' }
    let removed = false
    await unlink(join(process.cwd(), relPath)).then(() => { removed = true }).catch(e => {
        if (e.code !== 'ENOENT') console.warn('[videoStorage] unlink:', e.message)
    })
    await MediaFile.findOneAndUpdate(
        { url: videoUrl },
        { status: 'deleted', deletedAt: new Date(), deleteAt: null },
        { upsert: true }
    ).catch(() => {})
    if (removed) await alertMediaDeleted(userId, relPath, rec?.sizeBytes, reason)
    return { deleted: removed, skipped: removed ? null : 'file_missing' }
}

// [SMART-TTL З2] heartbeat активности клиента по исходнику (пока задача на экране).
// Молчание дольше OwnerSettings.videoIdleMinutes → файл удалит крон mediaCleanup (idle-свип).
export async function markMediaHeartbeat({ videoUrl, userId }) {
    const relPath = safeVideoRelPath(videoUrl, userId)
    if (!relPath) return { ok: false, skipped: 'forbidden_path' }
    const res = await MediaFile.updateOne(
        { url: videoUrl, status: 'stored' },
        { lastSeenAt: new Date() }
    ).catch(() => null)
    return { ok: !!res && res.matchedCount > 0 }
}

// [OMEGA-VIDEO ДОП-2 З3] применение TTL хранения загруженного видео после успешного разбора.
// ttlHours = 0 (дефолт) → файл удаляется СРАЗУ фактом; >0 → запись deleteAt, удалит крон mediaCleanup.
// Результат анализа (текст/таймкоды/план в чате) не трогаем — удаляется только файл.
// Возвращает факт: { deletedNow, deleteAt }.
export async function applyVideoStorageTtl({ videoUrl, userId, ttlHours }) {
    const relPath = normalize(String(videoUrl || '').replace(/^\/+/, '')).replace(/\\/g, '/')
    if (!relPath.startsWith(`uploads/${userId}/`) || relPath.includes('..')) {
        return { deletedNow: false, deleteAt: null, skipped: 'forbidden_path' }
    }
    if (ttlHours > 0) {
        const deleteAt = new Date(Date.now() + ttlHours * 3600 * 1000)
        // [SMART-TTL] lastSeenAt = момент разбора: idle-таймер стартует отсюда, heartbeat клиента продлевает
        await MediaFile.findOneAndUpdate(
            { url: videoUrl },
            { analyzedAt: new Date(), deleteAt, lastSeenAt: new Date() },
            { upsert: true }
        ).catch(e => console.warn('[videoStorage] TTL set failed:', e.message))
        return { deletedNow: false, deleteAt }
    }
    await unlink(join(process.cwd(), relPath)).catch(e => {
        if (e.code !== 'ENOENT') console.warn('[videoStorage] unlink:', e.message)
    })
    await MediaFile.findOneAndUpdate(
        { url: videoUrl },
        { analyzedAt: new Date(), status: 'deleted', deletedAt: new Date(), deleteAt: null },
        { upsert: true }
    ).catch(() => {})
    return { deletedNow: true, deleteAt: null }
}

export default { applyVideoStorageTtl, deleteMediaNow, markMediaHeartbeat }
