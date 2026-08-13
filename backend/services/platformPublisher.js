import Integration from '../models/Integration.js'
import { publishToVKWall } from './vkPublishService.js'
import { publishToTelegram } from './telegramPublish.js'
import { publish } from './publishers/index.js'
import { publishScheduledYouTubePost } from './youtubeService.js'

/**
 * [v9.9.19.15] Unified publisher: VK/Telegram use user.socials tokens,
 * legacy platforms use Integration collection.
 * [v9.9.19.15.14] mediaType is passed to VK so it can route to photo or video chain.
 */
export async function publishToPlatform(user, platform, post) {
    // [19.17.5-UPLOAD-SCHEDULER] YouTube uploads go through per-user OAuth tokens
    if (platform === 'youtube') {
        return publishScheduledYouTubePost(post)
    }

    if (platform === 'vk') {
        return publishToVKWall(user, {
            text: post.content,
            title: post.title,
            hashtags: post.hashtags,
            link: post.mediaUrl,
            mediaUrl: post.mediaUrl,
            mediaName: post.mediaName || post.mediaUrl,
            mediaType: post.mediaType,
        })
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
