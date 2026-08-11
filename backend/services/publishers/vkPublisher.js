export const publishToVK = async (accessToken, ownerId, message, attachments) => {
    const url = 'https://api.vk.com/method/wall.post'
    const params = new URLSearchParams({
        access_token: accessToken,
        owner_id: ownerId,
        message,
        v: '5.199',
    })
    if (attachments) params.append('attachments', attachments)

    try {
        const res = await fetch(`${url}?${params}`)
        const data = await res.json()
        return data
    } catch (err) {
        return { error: { error_msg: err.message || 'Network error', error_code: 'network' } }
    }
}

// [SOCIAL-v5.1] added