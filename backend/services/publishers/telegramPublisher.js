export const publishToTelegram = async (botToken, chatId, text, imageUrl) => {
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`
    const formData = new FormData()
    formData.append('chat_id', chatId)
    formData.append('caption', text)
    if (imageUrl) formData.append('photo', imageUrl)

    const res = await fetch(url, { method: 'POST', body: formData })
    return res.json()
}

// [SOCIAL-v5.1] added