export const isClickUpConfigured = () => !!process.env.CLICKUP_API_KEY

export function getClickUpStatus() {
    return {
        provider: 'ClickUp API',
        status: isClickUpConfigured() ? 'configured' : 'not_configured',
        message: isClickUpConfigured()
            ? 'ClickUp подключен'
            : 'Создайте API Key в ClickUp Settings → Apps, добавьте ID списка (listId) для синхронизации задач.',
        setupUrl: '/owner?tab=integrations',
    }
}

export async function createClickUpTask({ listId, name, description, dueDate, assignees = [] }) {
    if (!isClickUpConfigured()) return { success: false, ...getClickUpStatus() }
    try {
        const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
            method: 'POST',
            headers: {
                'Authorization': process.env.CLICKUP_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                description,
                due_date: dueDate ? new Date(dueDate).getTime() : undefined,
                assignees,
            }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.err || 'ClickUp API error')
        return { success: true, data }
    } catch (err) {
        console.error('[clickupService:createTask]', err.message)
        return { success: false, error: err.message }
    }
}

export default { isClickUpConfigured, getClickUpStatus, createClickUpTask }
