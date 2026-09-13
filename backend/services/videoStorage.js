import { unlink } from 'fs/promises'
import { join, normalize } from 'path'
import MediaFile from '../models/MediaFile.js'

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
        await MediaFile.findOneAndUpdate(
            { url: videoUrl },
            { analyzedAt: new Date(), deleteAt },
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

export default { applyVideoStorageTtl }
