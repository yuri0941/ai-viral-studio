export const publishToVK = async (accessToken, ownerId, message, attachments) => {
    const url = 'https://api.vk.com/method/wall.post'
    const params = new URLSearchParams({
        access_token: accessToken,
        owner_id: ownerId,
        message,
        v: '5.199',
    })
    if (attachments) params.append('attachments', attachments)

    const res = await fetch(`${url}?${params}`)
    return res.json()
}

// [SOCIAL-v5.1] added