export const isTrelloConfigured = () => !!process.env.TRELLO_API_KEY && !!process.env.TRELLO_TOKEN

export function getTrelloStatus() {
    return {
        provider: 'Trello Power-Up',
        status: isTrelloConfigured() ? 'configured' : 'not_configured',
        message: isTrelloConfigured()
            ? 'Trello подключен'
            : 'Получите API Key и Token на trello.com/app-key, укажите boardId и listId.',
        setupUrl: '/owner?tab=integrations',
    }
}

export async function createTrelloCard({ listId, name, desc }) {
    if (!isTrelloConfigured()) return { success: false, ...getTrelloStatus() }
    try {
        const url = new URL('https://api.trello.com/1/cards')
        url.searchParams.set('key', process.env.TRELLO_API_KEY)
        url.searchParams.set('token', process.env.TRELLO_TOKEN)
        url.searchParams.set('idList', listId)
        url.searchParams.set('name', name)
        if (desc) url.searchParams.set('desc', desc)

        const res = await fetch(url.toString(), { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Trello API error')
        return { success: true, data }
    } catch (err) {
        console.error('[trelloService:createCard]', err.message)
        return { success: false, error: err.message }
    }
}

export default { isTrelloConfigured, getTrelloStatus, createTrelloCard }
