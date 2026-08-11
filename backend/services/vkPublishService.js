import User from '../models/User.js'
import VkPost from '../models/VkPost.js'
import { publishToVK } from './publishers/vkPublisher.js'
import { refreshVkToken, isVkTokenExpired } from './vkTokenService.js'

const PERMISSION_ERRORS = ['access_denied', 'permission', 'insufficient_scope', 'invalid_token', 'user_authorization_failed']

function isPermissionError(error) {
  if (!error) return false
  const text = String(error).toLowerCase()
  return PERMISSION_ERRORS.some(code => text.includes(code))
}

async function ensureFreshToken(user) {
  if (!isVkTokenExpired(user.vkTokenExpiresAt) || !user.vkRefreshToken) {
    return { accessToken: user.vkToken, refreshed: false }
  }
  try {
    const data = await refreshVkToken(user.vkRefreshToken)
    if (!data.access_token) {
      return { error: 'refresh_failed', hint: 'Требуется переподключение VK' }
    }
    const expiresIn = Number(data.expires_in) || 0
    await User.findByIdAndUpdate(user._id || user.id, {
      $set: {
        vkToken: data.access_token,
        vkRefreshToken: data.refresh_token || user.vkRefreshToken,
        vkTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
      }
    })
    return { accessToken: data.access_token, refreshed: true }
  } catch (err) {
    const reason = err.response?.data?.error_description || err.response?.data?.error || err.message
    return { error: 'refresh_failed', reason, hint: 'Требуется переподключение VK' }
  }
}

export async function publishToVKWall(user, { text, link } = {}) {
  console.log(`[vk:publish] user=${user?._id || user?.id}, enabled=${user?.socials?.vk?.enabled}, hasToken=${!!user?.vkToken}, vkUserId=${user?.vkUserId}, needsScope=${user?.socials?.vk?.needsScope}`)
  if (!user?.socials?.vk?.enabled || !user.vkToken || !user.vkUserId) {
    return { success: false, error: 'vk_not_connected', hint: 'Подключите VK в Соцсетях' }
  }
  if (user.socials.vk.needsScope) {
    return { success: false, error: 'vk_needs_wall_scope', hint: 'Нажмите «Разрешить публикацию» в настройках VK' }
  }

  const ownerId = user.vkUserId
  const message = link ? `${text}\n\n${link}` : (text || '')
  if (!message.trim()) {
    return { success: false, error: 'empty_text', hint: 'Добавьте текст поста' }
  }

  const tokenResult = await ensureFreshToken(user)
  if (tokenResult.error) return { success: false, ...tokenResult }

  try {
    const vkResult = await publishToVK(tokenResult.accessToken, ownerId, message)

    if (vkResult.error) {
      const vkError = vkResult.error
      const errorCode = vkError.error_code || vkError.error_msg || vkError.error
      if (isPermissionError(errorCode) || isPermissionError(vkError.error_msg)) {
        return { success: false, error: 'vk_permission_denied', reason: vkError.error_msg, hint: 'Разрешите публикацию на стене в настройках VK' }
      }
      return { success: false, error: errorCode || 'vk_api_error', reason: vkError.error_msg, hint: 'Проверьте настройки VK и попробуйте снова' }
    }

    const postId = vkResult.response?.post_id
    if (!postId) {
      return { success: false, error: 'no_post_id', reason: 'VK не вернул ID поста', hint: 'Попробуйте опубликовать позже' }
    }

    const postUrl = `https://vk.com/wall${ownerId}_${postId}`
    await VkPost.create({
      userId: user._id || user.id,
      postId: String(postId),
      ownerId: String(ownerId),
      text: message,
      link: link || '',
      status: 'published',
      vkResponse: vkResult,
    })

    return { success: true, postId, postUrl }
  } catch (err) {
    const reason = err.response?.data?.error_description || err.response?.data?.error || err.message
    return { success: false, error: 'publish_exception', reason, hint: 'Ошибка публикации. Попробуйте позже' }
  }
}
