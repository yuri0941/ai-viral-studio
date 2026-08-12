import User from '../models/User.js'
import VkPost from '../models/VkPost.js'
import ScheduledPost from '../models/ScheduledPost.js'
import { fetchMediaBuffer, preparePhotoBuffer, prepareVideoBuffer } from './vkMediaPipeline.js'

const alertOwner = (async (...args) => {
  try {
    const { alertOwner: fn } = await import('./ownerBot.js')
    return await fn?.(...args)
  } catch {
    // owner bot may not be initialized in tests/scripts
  }
})

const sendClientNotification = (async (chatId, text) => {
  try {
    const { sendClientNotification: fn } = await import('./omegaBot.js')
    return await fn?.(chatId, text)
  } catch {
    // omega bot may not be initialized
  }
})

const VK_API_VERSION = '5.199'

/**
 * [v9.9.19.15.8] VK community-token posting.
 * Photo uses photos.getMessagesUploadServer workaround because VK error 27
 * blocks photos.getWallUploadServer for community tokens.
 */

const PERMANENT_VK_ERRORS = {
  5: 'vk_invalid_token',
  15: 'vk_access_denied',
  27: 'vk_group_disabled',
  101: 'vk_auth_failed',
  113: 'vk_invalid_group',
  200: 'vk_access_denied',
  214: 'vk_wall_denied',
  100: 'vk_invalid_request',
}

export function mapVkError(error) {
  const code = error?.error_code
  const msg = error?.error_msg || 'VK API error'
  const mapped = PERMANENT_VK_ERRORS[code]
  if (mapped) return { error: mapped, permanent: true, reason: msg }
  if (code >= 500 && code < 600) return { error: 'vk_server_error', permanent: false, reason: msg }
  if (code === undefined || code === null) {
    if (/network|timeout|fetch|econnrefused/i.test(msg)) return { error: 'vk_network_error', permanent: false, reason: msg }
    return { error: 'vk_api_error', permanent: true, reason: msg }
  }
  return { error: `vk_error_${code}`, permanent: false, reason: msg }
}

export async function vkApi(method, params) {
  const url = `https://api.vk.com/method/${method}`
  const body = new URLSearchParams({ ...params, v: VK_API_VERSION })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(30000),
  })
  const json = await res.json().catch(() => ({}))
  if (json.error) {
    const err = new Error(json.error.error_msg || 'VK API error')
    err.vkError = json.error
    throw err
  }
  return json
}

function isTransientError(err) {
  const code = err?.vkError?.error_code
  if (!code) {
    const msg = err?.message || ''
    return /network|timeout|fetch|econnrefused/i.test(msg)
  }
  return code >= 500 || code === 6 || code === 9 || code === 10
}

function formatAttachment(type, ownerId, id, accessKey) {
  let str = `${type}${ownerId}_${id}`
  if (accessKey) str += `_${accessKey}`
  return str
}

async function waitForPhotoProcessing(user, photo, { logPrefix = '[vk:photo]', start = Date.now() } = {}) {
  const communityKey = user?.vkCommunityKey
  const steps = []
  let ready = false
  const maxAttempts = 6
  const delayMs = 4000
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await vkApi('photos.getById', {
        access_token: communityKey,
        photos: `${photo.owner_id}_${photo.id}_${photo.access_key || ''}`,
      })
      const fetched = res.response?.[0]
      const sizes = fetched?.sizes || []
      const sizes2 = fetched?.sizes2 || []
      ready = sizes.length > 0 || sizes2.length > 0
      console.log(`${logPrefix} waitProcessing attempt=${attempt}/${maxAttempts} ready=${ready} sizes=${sizes.length} sizes2=${sizes2.length}`)
      steps.push({ step: 'waitProcessing', ok: ready, attempt, sizes: sizes.length, sizes2: sizes2.length, ms: Date.now() - start })
      if (ready) break
    } catch (e) {
      const code = e.vkError?.error_code || 0
      const msg = e.message || 'unknown'
      console.warn(`${logPrefix} waitProcessing attempt=${attempt}/${maxAttempts} code=${code} msg=${msg}`)
      steps.push({ step: 'waitProcessing', ok: false, attempt, code, msg, ms: Date.now() - start })
    }
    if (attempt < maxAttempts) await new Promise(r => setTimeout(r, delayMs))
  }
  if (!ready) {
    console.warn(`${logPrefix} waitProcessing timeout after ${maxAttempts} attempts`)
    steps.push({ step: 'waitProcessing', ok: false, attempt: maxAttempts, msg: 'timeout', ms: Date.now() - start })
  }
  return { ready, timeout: !ready, steps }
}

async function verifyPostAttachment(user, ownerId, postId, attachment, { logPrefix = '[vk:publish]' } = {}) {
  if (!attachment || !attachment.startsWith('photo')) return { ok: false, reason: 'not_a_photo' }
  const match = attachment.match(/^photo(-?\d+)_(\d+)(?:_.*)?$/)
  if (!match) return { ok: false, reason: 'bad_attachment' }
  const [, photoOwnerId, photoId] = match
  try {
    const res = await vkApi('wall.getById', {
      access_token: user?.vkCommunityKey,
      posts: `${ownerId}_${postId}`,
    })
    const post = res.response?.[0]
    const attachments = post?.attachments || []
    const found = attachments.some(a =>
      a.type === 'photo' &&
      String(a.photo?.owner_id) === photoOwnerId &&
      String(a.photo?.id) === photoId
    )
    console.log(`${logPrefix} verify ${found ? 'photo in' : 'FAILED photo dropped'} post_id=${postId} attachments=${attachments.length}`)
    return { ok: found }
  } catch (e) {
    const code = e.vkError?.error_code || 0
    const msg = e.message || 'unknown'
    console.warn(`${logPrefix} verify error post_id=${postId} code=${code} msg=${msg}`)
    return { ok: false, reason: msg }
  }
}

function getVkLang(user) {
  return user?.preferences?.language === 'en' ? 'en' : 'ru'
}

function tPhotoProcessing(user) {
  return getVkLang(user) === 'en'
    ? 'VK is processing the photo; post may appear without image'
    : 'VK обрабатывает фото, пост может быть без изображения'
}

function tPhotoDropped(user) {
  return getVkLang(user) === 'en'
    ? 'VK did not attach the photo to the post'
    : 'VK не прикрепил фото к посту'
}

function tVideoNoScopeReason(user) {
  return getVkLang(user) === 'en'
    ? 'VK does not support video upload via community key. Video support coming after YouTube integration.'
    : 'VK не поддерживает загрузку видео ключом сообщества. Видео появится после подключения YouTube (скоро).'
}

export async function uploadPhotoToVK(user, buffer, { logPrefix = '[vk:photo]' } = {}) {
  const communityKey = user?.vkCommunityKey
  const groupId = String(user?.vkGroupId || '').replace(/^-/, '')
  const numericGroupId = Number(groupId)
  let lastErr = null
  const steps = []
  const start = Date.now()

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // Step 1: get messages upload server (workaround for community token)
      const getServerParams = { access_token: communityKey }
      if (groupId) getServerParams.group_id = numericGroupId
      const getServerRes = await vkApi('photos.getMessagesUploadServer', getServerParams)
      const uploadUrl = getServerRes.response?.upload_url
      if (!uploadUrl) {
        steps.push({ step: 'getServer', ok: false, code: 0, msg: 'empty_upload_url', ms: Date.now() - start })
        throw new Error('VK did not return photo upload url')
      }
      steps.push({ step: 'getServer', ok: true, code: 200, ms: Date.now() - start })

      // Step 2: run media pipeline (JPEG conversion)
      let photoBuffer = buffer
      try {
        const prepared = await preparePhotoBuffer(buffer)
        photoBuffer = prepared.buffer
        steps.push({ step: 'pipeline', ok: true, flags: prepared.flags, ms: Date.now() - start })
      } catch (e) {
        steps.push({ step: 'pipeline', ok: false, msg: e.message, ms: Date.now() - start })
        throw e
      }

      // Step 3: upload multipart, field name must be 'photo'
      const form = new FormData()
      form.append('photo', new Blob([photoBuffer], { type: 'image/jpeg' }), 'photo.jpg')

      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form })
      const uploadRaw = await uploadRes.text().catch(() => '')
      const uploadRawSafe = uploadRaw.slice(0, 300)
      console.log(`${logPrefix} uploadRaw=${uploadRawSafe}${uploadRaw.length > 300 ? '...' : ''}`)
      let uploadData = {}
      try { uploadData = uploadRaw ? JSON.parse(uploadRaw) : {} } catch { uploadData = {} }
      if (uploadData.error) {
        const code = uploadData.error.error_code || uploadRes.status
        const msg = uploadData.error.error_msg || 'Photo upload failed'
        steps.push({ step: 'upload', ok: false, code, msg, raw: uploadRawSafe, ms: Date.now() - start })
        throw Object.assign(new Error(msg), { vkError: uploadData.error })
      }
      const photoFieldEmpty = !uploadData.photo || uploadData.photo === '[]'
      if (uploadData.photo === '') {
        steps.push({ step: 'upload', ok: false, code: 0, msg: 'empty_photo_retry', raw: uploadRawSafe, ms: Date.now() - start })
        if (attempt < 2) {
          console.warn(`${logPrefix} attempt=${attempt} photo empty, retrying with fresh upload_url`)
          continue
        }
      }
      if (!uploadData.server || photoFieldEmpty || !uploadData.hash) {
        const reason = 'vk_rejected_upload'
        steps.push({ step: 'upload', ok: false, code: 0, msg: reason, raw: uploadRawSafe, ms: Date.now() - start })
        throw Object.assign(new Error('VK rejected photo upload'), { reason, uploadRaw: uploadRawSafe })
      }
      steps.push({ step: 'upload', ok: true, code: 200, raw: uploadRawSafe, ms: Date.now() - start })

      // Step 4: save messages photo (photo must be passed exactly as returned by VK)
      const saveRes = await vkApi('photos.saveMessagesPhoto', {
        access_token: communityKey,
        photo: uploadData.photo,
        server: uploadData.server,
        hash: uploadData.hash,
      })
      const photo = saveRes.response?.[0]
      if (!photo) {
        steps.push({ step: 'save', ok: false, code: 0, msg: 'empty_response', ms: Date.now() - start })
        throw new Error('VK did not return saved photo')
      }
      const sizes = photo.sizes || []
      const sizes2 = photo.sizes2 || []
      console.log(`${logPrefix} step=save photoId=${photo.id} ownerId=${photo.owner_id} accessKey=${photo.access_key ? 'yes' : 'no'} sizes=${sizes.length} sizes2=${sizes2.length}`)
      steps.push({ step: 'save', ok: true, code: 200, photoId: photo.id, ownerId: photo.owner_id, hasAccessKey: !!photo.access_key, sizes: sizes.length, sizes2: sizes2.length, ms: Date.now() - start })

      const processing = await waitForPhotoProcessing(user, photo, { logPrefix, start })
      steps.push(...processing.steps)

      return {
        attachment: formatAttachment('photo', photo.owner_id, photo.id, photo.access_key),
        photo,
        processingTimeout: processing.timeout,
        steps,
      }
    } catch (e) {
      lastErr = e
      const code = e.vkError?.error_code || 0
      const msg = e.message || 'unknown'
      if (!steps.find(s => s.step === 'getServer')) {
        steps.push({ step: 'getServer', ok: false, code, msg, ms: Date.now() - start })
      }
      console.warn(`${logPrefix} attempt=${attempt}/2 code=${code} msg=${msg}`)
      if (attempt < 2 && isTransientError(e)) await new Promise(r => setTimeout(r, 2000))
      else break
    }
  }

  throw lastErr || new Error('VK photo upload failed after 2 attempts')
}

export async function uploadVideoToVK(user, buffer, { title, description, logPrefix = '[vk:video]' } = {}) {
  const communityKey = user?.vkCommunityKey
  const groupId = String(user?.vkGroupId || '').replace(/^-/, '')
  const numericGroupId = Number(groupId)
  let lastErr = null
  const steps = []
  const start = Date.now()

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Step 1: save video (get upload url)
      const saveRes = await vkApi('video.save', {
        access_token: communityKey,
        group_id: numericGroupId,
        name: (title || 'Видео').slice(0, 128),
        description: (description || '').slice(0, 5000),
      })
      const uploadUrl = saveRes.response?.upload_url
      const ownerId = saveRes.response?.owner_id
      const videoId = saveRes.response?.video_id
      const accessKey = saveRes.response?.access_key
      if (!uploadUrl || !ownerId || !videoId) {
        steps.push({ step: 'save', ok: false, code: 0, msg: 'missing_upload_data', ms: Date.now() - start })
        throw new Error('VK did not return video upload url')
      }
      steps.push({ step: 'save', ok: true, code: 200, ms: Date.now() - start })

      // Step 2: run media pipeline (H.264/AAC MP4)
      let videoBuffer = buffer
      try {
        const prepared = await prepareVideoBuffer(buffer)
        if (prepared.skipped) {
          steps.push({ step: 'pipeline', ok: false, reason: prepared.reason, flags: prepared.flags, ms: Date.now() - start })
          throw Object.assign(new Error(prepared.reason || 'video pipeline skipped'), { skipped: true })
        }
        videoBuffer = prepared.buffer
        steps.push({ step: 'pipeline', ok: true, converted: prepared.converted, flags: prepared.flags, ms: Date.now() - start })
      } catch (e) {
        if (e?.skipped) throw e
        steps.push({ step: 'pipeline', ok: false, msg: e.message, ms: Date.now() - start })
        throw e
      }

      // Step 3: upload multipart, field name must be 'video_file'
      const form = new FormData()
      form.append('video_file', new Blob([videoBuffer], { type: 'video/mp4' }), 'video.mp4')

      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form })
      const uploadRaw = await uploadRes.text().catch(() => '')
      const uploadRawSafe = uploadRaw.slice(0, 300)
      console.log(`${logPrefix} uploadRaw=${uploadRawSafe}${uploadRaw.length > 300 ? '...' : ''}`)
      if (!uploadRes.ok) {
        steps.push({ step: 'upload', ok: false, code: uploadRes.status, msg: uploadRawSafe, ms: Date.now() - start })
        throw new Error(uploadRawSafe || `Video upload HTTP ${uploadRes.status}`)
      }
      let uploadData = {}
      try { uploadData = uploadRaw ? JSON.parse(uploadRaw) : {} } catch { uploadData = {} }
      if (uploadData.error) {
        const code = uploadData.error.error_code || uploadRes.status
        const msg = uploadData.error.error_msg || 'Video upload failed'
        steps.push({ step: 'upload', ok: false, code, msg, raw: uploadRawSafe, ms: Date.now() - start })
        throw Object.assign(new Error(msg), { vkError: uploadData.error })
      }
      steps.push({ step: 'upload', ok: true, code: uploadRes.status || 200, raw: uploadRawSafe, ms: Date.now() - start })

      return {
        attachment: formatAttachment('video', ownerId, videoId, accessKey),
        video: { owner_id: ownerId, id: videoId, access_key: accessKey },
        steps,
      }
    } catch (e) {
      lastErr = e
      const code = e.vkError?.error_code || 0
      const msg = e.message || 'unknown'
      if (!steps.find(s => s.step === 'save')) {
        steps.push({ step: 'save', ok: false, code, msg, ms: Date.now() - start })
      }
      console.warn(`${logPrefix} attempt=${attempt}/3 code=${code} msg=${msg}`)
      if (attempt < 3 && isTransientError(e)) await new Promise(r => setTimeout(r, 2000))
      else break
    }
  }

  if (lastErr?.vkError?.error_code === 5) {
    throw Object.assign(new Error('VK community key cannot upload video (scope missing)'), {
      vkError: { error_code: 'vk_video_no_scope', error_msg: 'VK community key cannot upload video' }
    })
  }
  throw lastErr || new Error('VK video upload failed after 3 attempts')
}

function detectMediaType(buffer, filename = '') {
  if (!buffer || !Buffer.isBuffer(buffer)) return null
  const lower = filename.toLowerCase()
  if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm') || lower.endsWith('.avi') || lower.endsWith('.mkv')) return 'video'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.gif') || lower.endsWith('.bmp')) return 'image'
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image'
  if (buffer[0] === 0x89 && buffer.slice(0, 4).toString('hex') === '89504e47') return 'image'
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image'
  if (buffer.slice(4, 8).toString('ascii') === 'ftyp' || lower.endsWith('.mp4')) return 'video'
  return null
}

// Anti-spam notification state: postUrl -> notifiedAt
const notifiedPosts = new Map()
const NOTIFICATION_WINDOW_MS = 5 * 60 * 1000

function cleanupNotifiedCache() {
  const now = Date.now()
  for (const [key, ts] of notifiedPosts) {
    if (now - ts > NOTIFICATION_WINDOW_MS) notifiedPosts.delete(key)
  }
}
setInterval(cleanupNotifiedCache, 60000)

function shouldNotify(postUrl) {
  cleanupNotifiedCache()
  return !notifiedPosts.has(postUrl)
}

function markNotified(postUrl) {
  notifiedPosts.set(postUrl, Date.now())
}

async function maybeSendNotifications(user, result, { isOwner = false } = {}) {
  const postUrl = result?.postUrl
  if (!postUrl) return

  const userId = user?._id || user?.id
  const ownerId = process.env.OWNER_USER_ID
  const isOwnerUser = isOwner || String(userId) === String(ownerId)

  const settings = user?.notificationSettings || {}
  if (settings.notifyPublishSuccess === false) return

  if (!shouldNotify(postUrl)) return
  markNotified(postUrl)

  const mediaNote = result.mediaStatus && result.mediaStatus !== 'ok' && result.mediaStatus !== 'none'
    ? `\n⚠️ Медиа не прикреплено: ${result.mediaError?.reason || result.mediaStatus}`
    : ''

  const ownerText = `✅ Пост опубликован в VK: ${postUrl}${mediaNote}`
  alertOwner(ownerText)

  // Notify client if they are not the owner and have a linked Telegram chat
  if (!isOwnerUser) {
    const chatId = user?.telegramChatId || user?.telegramId
    if (chatId) {
      sendClientNotification(chatId, `✅ Ваш пост опубликован в VK: ${postUrl}${mediaNote}`)
    }
  }
}

export async function publishToVKGroup(user, { text, title, hashtags, link, mediaUrl, mediaName, mediaType: providedMediaType } = {}) {
  const communityKey = user?.vkCommunityKey
  const groupId = String(user?.vkGroupId || '').replace(/^-/, '')
  const displayMedia = (mediaUrl || '').toString().slice(0, 60)

  console.log(`[vk:publish] user=${user?._id || user?.id}, groupId=${groupId}, hasCommunityKey=${!!communityKey}, hasMedia=${!!mediaUrl}, mediaType=${providedMediaType || 'auto'}, mediaUrl=${displayMedia}${mediaUrl && mediaUrl.length > 60 ? '...' : ''}`)

  if (!communityKey) {
    return { success: false, error: 'not_connected', permanent: true, hint: 'Подключите ключ сообщества VK в Соцсетях' }
  }
  if (!groupId) {
    return { success: false, error: 'no_group', permanent: true, hint: 'Укажите ID группы VK в Соцсетях' }
  }
  if (!/^\d+$/.test(groupId)) {
    return { success: false, error: 'invalid_group', permanent: true, hint: 'ID группы VK должен содержать только цифры' }
  }

  const message = [text, hashtags].filter(Boolean).join('\n\n') || ''
  if (!message.trim() && !link && !mediaUrl) {
    return { success: false, error: 'empty_text', hint: 'Добавьте текст поста' }
  }

  let attachments = []
  let mediaStatus = 'none'
  let mediaError = null

  // Optional link as plain URL attachment if no media
  if (!mediaUrl && link) {
    attachments.push(link)
  }

  // Media pipeline + upload ladder
  if (mediaUrl) {
    let buffer = null
    try {
      buffer = await fetchMediaBuffer(mediaUrl)
    } catch (e) {
      console.warn('[vk:publish] media fetch error:', e.message)
      mediaStatus = 'fetch_failed'
      mediaError = { error: 'media_fetch_error', reason: e.message }
    }

    if (buffer) {
      const mediaType = providedMediaType || detectMediaType(buffer, mediaName || mediaUrl)

      if (mediaType === 'video') {
        // Try video first; if it fails, try photo pipeline; if that fails, text-only
        let videoResult = null
        let videoErr = null
        try {
          videoResult = await uploadVideoToVK(user, buffer, { title, description: message })
          attachments.push(videoResult.attachment)
          mediaStatus = 'ok'
        } catch (e) {
          if (e?.vkError?.error_code === 5 || e?.vkError?.error_code === 'vk_video_no_scope') {
            videoErr = { error: 'vk_video_no_scope', permanent: true, reason: tVideoNoScopeReason(user) }
          } else {
            videoErr = e?.vkError ? mapVkError(e.vkError) : { error: 'vk_video_upload_failed', reason: e?.message || 'unknown' }
          }
          console.warn(`[vk:publish] video upload failed, falling back to text-only. error=${videoErr.error} reason=${videoErr.reason || videoErr.error}`)
        }

        if (!videoResult) {
          // VK community tokens cannot upload video (code 5); publish text-only with explanation
          mediaStatus = 'video_failed'
          mediaError = videoErr
          if (videoErr?.error !== 'vk_video_no_scope') {
            const reasonText = videoErr?.reason || videoErr?.error || 'unknown'
            alertOwner(`🎥 Пост опубликован без видео в VK: ${reasonText}. Проверьте ключ/права или формат видео.`)
          }
        }
      } else if (mediaType === 'image') {
        // Try photo
        let photoResult = null
        let photoErr = null
        try {
          photoResult = await uploadPhotoToVK(user, buffer)
          attachments.push(photoResult.attachment)
          mediaStatus = 'ok'
          if (photoResult.processingTimeout) {
            mediaStatus = 'processing'
            mediaError = { error: 'vk_photo_processing_timeout', reason: tPhotoProcessing(user) }
            alertOwner(`⏳ ${tPhotoProcessing(user)}`)
          }
        } catch (e) {
          photoErr = e?.vkError ? mapVkError(e.vkError) : { error: 'vk_photo_upload_failed', reason: e?.message || 'unknown' }
          mediaStatus = 'photo_failed'
          mediaError = photoErr
          const reasonText = photoErr?.reason || photoErr?.error || 'unknown'
          console.warn(`[vk:publish] photo upload failed, falling back to text-only. reason=${reasonText}`)
          alertOwner(`🖼️ Пост опубликован без фото в VK: ${reasonText}. Перевыпустите ключ сообщества с правами «Фотографии» и «Сообщения сообщества».`)
        }
      } else {
        console.warn('[vk:publish] media type unknown, using link only')
        if (mediaUrl.startsWith('http')) attachments.push(mediaUrl)
        mediaStatus = 'skipped'
      }
    } else if (!mediaError) {
      console.warn('[vk:publish] could not fetch media buffer, using link only')
      if (mediaUrl.startsWith('http')) attachments.push(mediaUrl)
      mediaStatus = 'fetch_failed'
    }
  }

  if (!message.trim() && attachments.length === 0) {
    return { success: false, error: 'empty_post', permanent: true, hint: 'Пост пуст: добавьте текст, ссылку или медиа' }
  }

  try {
    const params = {
      access_token: communityKey,
      owner_id: `-${groupId}`,
      from_group: 1,
      message,
      v: VK_API_VERSION,
    }
    if (attachments.length) params.attachments = attachments.join(',')
    console.log(`[vk:publish] wallPost params: owner_id=${params.owner_id} attachments=${params.attachments || 'EMPTY'}`)

    const vkResult = await vkApi('wall.post', params)
    const postId = vkResult.response?.post_id
    console.log(`[vk:publish] wallPost result post_id=${postId || 'missing'}`)
    if (!postId) {
      return { success: false, error: 'no_post_id', reason: 'VK не вернул ID поста', hint: 'Попробуйте опубликовать позже' }
    }

    const postUrl = `https://vk.com/wall-${groupId}_${postId}`

    // [v9.9.19.15.16] verify the photo really ended up in the post
    if (postId && attachments.length && mediaStatus !== 'photo_failed') {
      const verified = await verifyPostAttachment(user, `-${groupId}`, postId, attachments.find(a => typeof a === 'string' && a.startsWith('photo')))
      if (mediaStatus === 'processing') {
        // If it finally appeared, mark ok; otherwise keep processing
        if (verified.ok) {
          mediaStatus = 'ok'
          mediaError = null
        }
      } else if (!verified.ok && mediaStatus === 'ok') {
        mediaStatus = 'dropped'
        mediaError = { error: 'vk_photo_dropped', reason: tPhotoDropped(user) }
        alertOwner(`🖼️ ${tPhotoDropped(user)}`)
      }
    }

    await VkPost.create({
      userId: user._id || user.id,
      postId: String(postId),
      ownerId: `-${groupId}`,
      text: message,
      link: link || mediaUrl || '',
      status: 'published',
      mediaStatus,
      mediaError,
      vkResponse: vkResult,
    })

    const result = { success: true, postId, postUrl, attachments, mediaStatus, mediaError }
    if (mediaStatus !== 'processing' && mediaStatus !== 'dropped') {
      maybeSendNotifications(user, result)
    }
    return result
  } catch (err) {
    if (err.vkError) {
      const mapped = mapVkError(err.vkError)
      return { success: false, ...mapped, hint: mapped.reason }
    }
    const reason = err.message || 'Network error'
    return { success: false, error: 'vk_network_error', permanent: false, reason, hint: 'Ошибка публикации. Попробуйте позже' }
  }
}

/**
 * Legacy alias kept for routes that still import it.
 * Community-token posting is the only supported flow now.
 */
export async function publishToVKWall(user, payload) {
  return publishToVKGroup(user, payload)
}

const REQUEUE_PERMANENT_REASONS = [
  'not_connected',
  'no_group',
  'invalid_group',
  'vk_invalid_token',
  'vk_wall_denied',
  'vk_access_denied',
  'vk_group_disabled',
  'vk_invalid_group',
]

/**
 * [v9.9.19.15.5] Re-queue old VK failed posts when a user saves a valid community key + group id.
 * Only posts failed for missing/invalid credentials are recovered.
 */
export async function requeueVkFailedPosts(userId, groupId) {
  try {
    const posts = await ScheduledPost.find({
      userId,
      status: 'failed',
      platforms: { $in: ['vk'] },
    }).sort({ createdAt: -1 })

    const toRecover = []
    for (const post of posts) {
      const text = String(post.errorMessage || '') + ' ' + JSON.stringify(post.publishResults || [])
      const matches = REQUEUE_PERMANENT_REASONS.some(reason =>
        text.toLowerCase().includes(reason.toLowerCase())
      )
      if (matches) toRecover.push(post)
    }

    if (!toRecover.length) return { requeued: 0 }

    // [v9.9.19.15.6] dedupe by content hash
    const hashGroups = new Map()
    for (const post of toRecover) {
      const h = String(post.content || '') + '|' + String(post.title || '') + '|' + String(post.hashtags || '')
      if (!hashGroups.has(h)) hashGroups.set(h, [])
      hashGroups.get(h).push(post)
    }

    const unique = []
    const duplicates = []
    for (const group of hashGroups.values()) {
      unique.push(group[0])
      duplicates.push(...group.slice(1))
    }

    for (const post of unique) {
      post.status = 'scheduled'
      post.scheduledAt = new Date(Date.now() + 5 * 60 * 1000)
      post.retriedAt = undefined
      post.errorMessage = '[VK Requeue] recovered after community key saved'
      await post.save()
    }

    for (const post of duplicates) {
      post.status = 'cancelled'
      post.errorMessage = 'duplicate_requeue'
      await post.save()
    }

    console.log(`[VK Requeue] ${unique.length} posts re-queued for group ${groupId}${duplicates.length ? `, deduped ${duplicates.length} duplicates` : ''}`)
    return { requeued: unique.length, deduped: duplicates.length }
  } catch (err) {
    console.error('[VK Requeue] error:', err.message)
    return { requeued: 0, error: err.message }
  }
}
