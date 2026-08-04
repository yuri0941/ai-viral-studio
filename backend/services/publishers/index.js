import { publishToTelegram } from './telegramPublisher.js'
import { publishToVK } from './vkPublisher.js'
import { publishToLinkedIn } from './linkedinPublisher.js'
import { decrypt } from '../../utils/crypto.js'

export const publish = async (provider, integration, post) => {
    const token = decrypt(integration.accessToken)
    switch (provider) {
        case 'telegram':
            return publishToTelegram(token, integration.accountId, post.content, post.mediaUrl)
        case 'vk':
            return publishToVK(token, integration.accountId, post.content, post.mediaUrl)
        case 'linkedin':
            return publishToLinkedIn(token, post.content, post.mediaUrl)
        default:
            throw new Error(`Unknown provider: ${provider}`)
    }
}

// [SOCIAL-v5.1] added