import axios from 'axios'

// [MASTER-v5.0] added: real Telegram publishing
export async function publishToTelegram(botToken, chatId, text, imageUrl = null) {
    if (!botToken || !chatId) {
        throw new Error('Bot token and chat ID are required')
    }
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`
    const payload = {
        chat_id: chatId,
        caption: text.slice(0, 1024),
        photo: imageUrl || 'https://via.placeholder.com/600x400?text=AI+Viral+Studio',
    }
    try {
        const res = await axios.post(url, payload, { timeout: 20000 })
        return { success: true, messageId: res.data?.result?.message_id }
    } catch (err) {
        console.error('[telegramPublish]', err.response?.data || err.message)
        throw new Error(err.response?.data?.description || err.message)
    }
}
