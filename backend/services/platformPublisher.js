import Integration from '../models/Integration.js'
import { publishToVKWall } from './vkPublishService.js'
import { publishToTelegram } from './telegramPublish.js'
import { publish } from './publishers/index.js'

/**
 * [v9.9.19.15] Unified publisher: VK/Telegram use user.socials tokens,
 * legacy platforms use Integration collection.
 */
export async function publishToPlatform(user, platform, post) {
    if (platform === 'vk') {
        return publishToVKWall(user, { text: post.content, link: post.mediaUrl })
    }

    if (platform === 'telegram') {
        const botToken = user.telegramBotToken
        const chatId = user.telegramChatId || user.telegramId
        if (!botToken || !chatId) {
            throw new Error('Telegram bot token или chat ID не настроены')
        }
        const text = `${post.title}\n\n${post.content || ''}\n\n${post.hashtags || ''}`
        return publishToTelegram(botToken, chatId, text, post.mediaUrl)
    }

    const integration = await Integration.findOne({ userId: user._id || user.id, provider: platform, isActive: true })
    if (!integration) {
        throw new Error('Not connected')
    }
    return publish(platform, integration, post)
}
