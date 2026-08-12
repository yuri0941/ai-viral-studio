import User from '../models/User.js'
import VkPost from '../models/VkPost.js'
import ScheduledPost from '../models/ScheduledPost.js'
import sharp from 'sharp'

const alertOwner = (async (...args) => {
  try {
    const { alertOwner: fn } = await import('./ownerBot.js')
    return await fn?.(...args)
  } catch {
    // owner bot may not be initialized in tests/scripts
  }
})

const VK_API_VERSION = '5.199'

/**
 * [v9.9.19.15.4] VK community-token posting.
 * Uses a per-user community key + groupId to post on a VK group wall.
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

function mapVkError(error) {
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

async function vkApi(method, params) {
  const url = `https://api.vk.com/method/${method}`
  const body = new URLSearchParams({ ...params, v: VK_API_VERSION })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (json.error) {
    const err = new Error(json.error.error_msg || 'VK API error')
    err.vkError = json.error
    throw err
  }
  return json
}

async function fetchMediaBuffer(mediaUrl) {
  if (!mediaUrl) return null
  if (mediaUrl.startsWith('data:')) {
    const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    return Buffer.from(match[2], 'base64')
  }
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    const res = await fetch(mediaUrl, { timeout: 30000 })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  }
  return null
}

async function uploadPhotoToVK(communityKey, groupId, buffer, { logPrefix = '[vk:photo]' } = {}) {
  const numericGroupId = Number(groupId)
  let lastErr = null

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // Step 1: get upload server
      const getServerRes = await vkApi('photos.getWallUploadServer', {
        access_token: communityKey,
        group_id: numericGroupId,
      })
      const uploadUrl = getServerRes.response?.upload_url
      if (!uploadUrl) {
        console.warn(`${logPrefix} step=getServer code=0 msg=empty_upload_url`)
        throw new Error('VK did not return photo upload url')
      }
      console.log(`${logPrefix} step=getServer code=200 msg=ok`)

      // Step 2: upload file as multipart, field name must be 'photo'
      let photoBuffer = buffer
      try {
        photoBuffer = await sharp(buffer).jpeg({ quality: 92, progressive: true }).toBuffer()
      } catch (e) {
        console.warn(`${logPrefix} step=convert code=0 msg=sharp_failed_use_original reason=${e.message}`)
      }

      const form = new FormData()
      form.append('photo', new Blob([photoBuffer], { type: 'image/jpeg' }), 'photo.jpg')

      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form })
      const uploadData = await uploadRes.json().catch(() => ({}))
      if (uploadData.error) {
        const code = uploadData.error.error_code || uploadRes.status
        const msg = uploadData.error.error_msg || 'Photo upload failed'
        console.warn(`${logPrefix} step=upload code=${code} msg=${msg}`)
        throw Object.assign(new Error(msg), { vkError: uploadData.error })
      }
      if (!uploadData.server || !uploadData.photo || !uploadData.hash) {
        console.warn(`${logPrefix} step=upload code=0 msg=missing_fields fields=${Object.keys(uploadData).join(',')}`)
        throw new Error('VK upload response missing server/photo/hash')
      }
      console.log(`${logPrefix} step=upload code=200 msg=ok`)

      // Step 3: save wall photo
      const saveRes = await vkApi('photos.saveWallPhoto', {
        access_token: communityKey,
        group_id: numericGroupId,
        photo: typeof uploadData.photo === 'string' ? uploadData.photo : JSON.stringify(uploadData.photo),
        server: uploadData.server,
        hash: uploadData.hash,
      })
      const photo = saveRes.response?.[0]
      if (!photo) {
        console.warn(`${logPrefix} step=save code=0 msg=empty_response`)
        throw new Error('VK did not return saved photo')
      }
      console.log(`${logPrefix} step=save code=200 msg=ok owner_id=${photo.owner_id} id=${photo.id}`)
      return `photo${photo.owner_id}_${photo.id}`
    } catch (e) {
      lastErr = e
      const code = e.vkError?.error_code || 0
      const msg = e.message || 'unknown'
      console.warn(`${logPrefix} attempt=${attempt}/2 code=${code} msg=${msg}`)
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000))
    }
  }

  throw lastErr || new Error('VK photo upload failed after 2 attempts')
}

async function uploadVideoToVK(communityKey, groupId, buffer, filename, title, description) {
  const saved = await vkApi('video.save', {
    access_token: communityKey,
    group_id: groupId,
    name: (title || 'AI Viral Studio video').slice(0, 100),
    description: (description || '').slice(0, 2000),
  })
  const uploadUrl = saved.response?.upload_url
  const ownerId = saved.response?.owner_id
  const videoId = saved.response?.video_id
  if (!uploadUrl || !ownerId || !videoId) throw new Error('VK did not return video upload url')

  const form = new FormData()
  const ext = (filename || 'video.mp4').split('.').pop() || 'mp4'
  const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4'
  form.append('video_file', new Blob([buffer], { type: mimeType }), filename || 'video.mp4')

  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form })
  // VK video upload endpoint returns empty body on success sometimes
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '')
    throw new Error(text || `Video upload HTTP ${uploadRes.status}`)
  }
  return `video${ownerId}_${videoId}`
}

function detectMediaType(buffer, filename = '') {
  // Quick sniff
  if (!buffer || !Buffer.isBuffer(buffer)) return null
  const lower = filename.toLowerCase()
  if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm') || lower.endsWith('.avi')) return 'video'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.gif')) return 'image'
  // JPEG magic
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image'
  // PNG magic
  if (buffer[0] === 0x89 && buffer.slice(0, 4).toString('hex') === '89504e47') return 'image'
  // WebP
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image'
  // MP4 / mov
  if (buffer.slice(4, 8).toString('ascii') === 'ftyp' || lower.endsWith('.mp4')) return 'video'
  return null
}

export async function publishToVKGroup(user, { text, title, hashtags, link, mediaUrl, mediaName } = {}) {
  // [v9.9.19.15.5] root-level fields avoid Mongoose socials path collision
  const communityKey = user?.vkCommunityKey
  const groupId = String(user?.vkGroupId || '').replace(/^-/, '')

  console.log(`[vk:publish] user=${user?._id || user?.id}, groupId=${groupId}, hasCommunityKey=${!!communityKey}`)

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

  // Media upload (photo: soft fallback to text; video: best effort)
  if (mediaUrl) {
    try {
      const buffer = await fetchMediaBuffer(mediaUrl)
      if (buffer) {
        const mediaType = detectMediaType(buffer, mediaName || mediaUrl)
        if (mediaType === 'image') {
          try {
            const photoAttachment = await uploadPhotoToVK(communityKey, groupId, buffer, { logPrefix: '[vk:photo]' })
            attachments.push(photoAttachment)
            mediaStatus = 'uploaded'
          } catch (e) {
            const mapped = e.vkError ? mapVkError(e.vkError) : { error: 'vk_photo_upload_failed', reason: e.message }
            mediaStatus = 'failed'
            mediaError = mapped
            const reasonText = mapped.reason || mapped.error || 'unknown'
            console.warn(`[vk:publish] photo upload failed, falling back to text-only. reason=${reasonText}`)
            alertOwner(`🖼️ Пост опубликован без фото в VK: ${reasonText}. Перевыпустите ключ сообщества с правом «Фотографии».`)
          }
        } else if (mediaType === 'video') {
          let videoAttachment = null
          let lastErr = null
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              videoAttachment = await uploadVideoToVK(communityKey, groupId, buffer, mediaName || mediaUrl, title, message)
              break
            } catch (e) {
              lastErr = e
              console.warn(`[vk:publish] video upload attempt ${attempt}/3 failed:`, e.message)
              if (attempt < 3) await new Promise(r => setTimeout(r, 2000))
            }
          }
          if (videoAttachment) {
            attachments.push(videoAttachment)
            mediaStatus = 'uploaded'
          } else {
            mediaStatus = 'failed'
            const mapped = lastErr?.vkError ? mapVkError(lastErr.vkError) : { error: 'vk_video_upload_failed', reason: lastErr?.message || 'unknown' }
            mediaError = mapped
            console.warn('[vk:publish] video upload failed after 3 attempts, continuing with text/photo:', lastErr?.message)
          }
        } else {
          console.warn('[vk:publish] media type unknown, skipping upload')
          mediaStatus = 'skipped'
        }
      } else {
        console.warn('[vk:publish] could not fetch media buffer, using link only')
        if (mediaUrl.startsWith('http')) attachments.push(mediaUrl)
        mediaStatus = 'fetch_failed'
      }
    } catch (e) {
      console.warn('[vk:publish] media upload error:', e.message)
      mediaStatus = 'failed'
      mediaError = { error: 'media_fetch_error', reason: e.message }
    }
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

    const vkResult = await vkApi('wall.post', params)
    const postId = vkResult.response?.post_id
    if (!postId) {
      return { success: false, error: 'no_post_id', reason: 'VK не вернул ID поста', hint: 'Попробуйте опубликовать позже' }
    }

    const postUrl = `https://vk.com/wall-${groupId}_${postId}`
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

    return { success: true, postId, postUrl, attachments, mediaStatus, mediaError }
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

    for (const post of toRecover) {
      post.status = 'scheduled'
      post.scheduledAt = new Date(Date.now() + 5 * 60 * 1000)
      post.retriedAt = undefined
      post.errorMessage = '[VK Requeue] recovered after community key saved'
      await post.save()
    }

    console.log(`[VK Requeue] ${toRecover.length} posts re-queued for group ${groupId}`)
    return { requeued: toRecover.length }
  } catch (err) {
    console.error('[VK Requeue] error:', err.message)
    return { requeued: 0, error: err.message }
  }
}
