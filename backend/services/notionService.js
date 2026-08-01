export const isNotionConfigured = () => !!process.env.NOTION_TOKEN

export function getNotionStatus() {
    return {
        provider: 'Notion Integration',
        status: isNotionConfigured() ? 'configured' : 'not_configured',
        message: isNotionConfigured()
            ? 'Notion подключен'
            : 'Создайте интеграцию в notion.so/my-integrations, скопируйте Internal Integration Token и разрешите доступ к базе.',
        setupUrl: '/owner?tab=integrations',
    }
}

export async function createNotionPage({ databaseId, title, content, tags = [] }) {
    if (!isNotionConfigured()) return { success: false, ...getNotionStatus() }
    try {
        const res = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                parent: { database_id: databaseId },
                properties: {
                    Name: { title: [{ text: { content: title } }] },
                    Tags: { multi_select: tags.map(t => ({ name: t })) },
                },
                children: content ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content } }] } }] : [],
            }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Notion API error')
        return { success: true, data }
    } catch (err) {
        console.error('[notionService:createPage]', err.message)
        return { success: false, error: err.message }
    }
}

export default { isNotionConfigured, getNotionStatus, createNotionPage }
