// [CHANNEL-DEL] Управление каналом из owner-бота: «удали последний пост» / «удали пост <ссылка>».
// Источник факта «последний пост» — CognitiveNode (source='telegram_auto', metadata.type='telegram_post'),
// куда publishToChannel пишет каждую публикацию с messageId/url. Удаление — Bot API deleteMessage
// токеном клиентского бота (он админ канала), только после превью-подтверждения владельца ✅.
import mongoose from 'mongoose'
import { resolveTelegramTarget } from './telegramChannelManager.js'

async function postNodeModel() {
    await import('../models/CognitiveNode.js') // регистрация схемы
    return mongoose.model('CognitiveNode')
}

export async function getLastChannelPost() {
    const Node = await postNodeModel()
    const node = await Node.findOne({
        source: 'telegram_auto',
        'metadata.type': 'telegram_post',
        'metadata.messageId': { $ne: null },
        'metadata.deleted': { $ne: true },
    }).sort({ createdAt: -1 }).lean()
    if (!node) return null
    return {
        messageId: node.metadata.messageId,
        url: node.metadata.url || null,
        text: String(node.content || '').replace(/^Telegram post published:\s*/i, ''),
        at: node.createdAt,
    }
}

// Ссылка вида t.me/<slug>/<id> или t.me/c/<internal>/<id> (приватный канал)
export function parsePostLink(input) {
    const m = String(input || '').match(/t\.me\/c\/(\d+)\/(\d+)/)
    if (m) return { chatId: `-100${m[1]}`, messageId: Number(m[2]) }
    const p = String(input || '').match(/t\.me\/([\w]+)\/(\d+)/)
    if (p) return { chatId: null, messageId: Number(p[2]) } // chatId из конфига канала
    return null
}

export async function deleteChannelPost({ messageId, chatId = null }) {
    const { token, channel } = await resolveTelegramTarget()
    if (!token || (!channel && !chatId)) {
        return { success: false, error: 'Telegram не настроен: нет telegram_bot/telegram_chat_id (Кабинет → API Ключи)' }
    }
    const target = chatId || channel
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: target, message_id: Number(messageId) }),
        })
        const data = await res.json()
        if (!data.ok) {
            const desc = String(data.description || '')
            if (/message to delete not found/i.test(desc)) return { success: false, error: 'Пост не найден в канале (возможно, уже удалён)' }
            if (/not enough rights|administrator|forbidden/i.test(desc)) return { success: false, error: 'Бот не админ канала или нет права удалять сообщения' }
            return { success: false, error: `Telegram: ${desc}` }
        }
        // помечаем узел, чтобы «последний пост» не предлагал уже удалённый
        const Node = await postNodeModel()
        await Node.updateMany(
            { source: 'telegram_auto', 'metadata.type': 'telegram_post', 'metadata.messageId': Number(messageId) },
            { $set: { 'metadata.deleted': true, 'metadata.deletedAt': new Date() } }
        )
        return { success: true }
    } catch (e) {
        return { success: false, error: e.message }
    }
}
