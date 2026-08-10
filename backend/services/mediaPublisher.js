import axios from 'axios'

const POLLINATIONS_IMAGE_URL = 'https://image.pollinations.ai/prompt/'

export async function generateCover(prompt, width = 1024, height = 1024, seed = null) {
  const safePrompt = encodeURIComponent((prompt || 'abstract luxury digital art').slice(0, 1500))
  const url = `${POLLINATIONS_IMAGE_URL}${safePrompt}?width=${width}&height=${height}&nologo=true${seed ? `&seed=${seed}` : ''}`
  const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
  return Buffer.from(data)
}

export async function publishPhotoToTelegram(bot, channelId, buffer, caption, options = {}) {
  if (!bot || !channelId || !buffer) throw new Error('bot, channelId and buffer required')
  const opts = {
    parse_mode: options.parseMode,
    disable_web_page_preview: options.disableWebPagePreview,
  }
  if (caption) opts.caption = caption.slice(0, 1024)
  return await bot.sendPhoto(channelId, buffer, opts)
}

export async function publishVideoToTelegram(bot, channelId, buffer, caption, options = {}) {
  if (!bot || !channelId || !buffer) throw new Error('bot, channelId and buffer required')
  const opts = { parse_mode: options.parseMode }
  if (caption) opts.caption = caption.slice(0, 1024)
  return await bot.sendVideo(channelId, buffer, opts)
}

export default { generateCover, publishPhotoToTelegram, publishVideoToTelegram }
