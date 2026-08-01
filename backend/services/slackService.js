export const isSlackConfigured = () => !!process.env.SLACK_BOT_TOKEN
export const isDiscordConfigured = () => !!process.env.DISCORD_BOT_TOKEN

export function getSlackStatus() {
    return {
        provider: 'Slack API',
        status: isSlackConfigured() ? 'configured' : 'not_configured',
        message: isSlackConfigured()
            ? 'Slack бот активен'
            : 'Создайте Slack App в api.slack.com/apps, получите Bot User OAuth Token и добавьте бота в канал.',
        setupUrl: '/owner?tab=integrations',
    }
}

export function getDiscordStatus() {
    return {
        provider: 'Discord Developer Portal',
        status: isDiscordConfigured() ? 'configured' : 'not_configured',
        message: isDiscordConfigured()
            ? 'Discord бот активен'
            : 'Создайте бота в Discord Developer Portal, получите Bot Token и добавьте бота на сервер.',
        setupUrl: '/owner?tab=integrations',
    }
}

export async function sendSlackMessage({ channel, text, blocks }) {
    if (!isSlackConfigured()) return { success: false, ...getSlackStatus() }
    try {
        const res = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ channel, text, blocks }),
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error || 'Slack API error')
        return { success: true, data }
    } catch (err) {
        console.error('[slackService:sendMessage]', err.message)
        return { success: false, error: err.message }
    }
}

export async function sendDiscordMessage({ channelId, content, embeds }) {
    if (!isDiscordConfigured()) return { success: false, ...getDiscordStatus() }
    try {
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content, embeds }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Discord API error')
        return { success: true, data }
    } catch (err) {
        console.error('[discordService:sendMessage]', err.message)
        return { success: false, error: err.message }
    }
}

export async function handleSlackCommand({ command, text, channel_id, user_id }) {
    if (command === '/omega') {
        return { success: true, action: 'ask_omega', query: text, channel_id, user_id }
    }
    return { success: false, message: 'Unknown command' }
}

export default { isSlackConfigured, getSlackStatus, sendSlackMessage, isDiscordConfigured, getDiscordStatus, sendDiscordMessage, handleSlackCommand }
