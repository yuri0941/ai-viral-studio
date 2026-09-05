// [TG-ASK-OWNER ЗАДАЧА 0] Webhook-гард: setWebhook/deleteWebhook выполнять ТОЛЬКО на проде.
// Причина: локальный запуск перезаписывал webhook ботов без secret_token → прод отклонял
// команды владельца (403 на приёме). Прод определяется по env: Render автоматически ставит
// RENDER_EXTERNAL_URL = URL прода; локально он пуст/другой → webhook НЕ трогаем и polling
// НЕ включаем (бот живёт на проде и продолжает отвечать). Оверрайд для стейджинга: TG_WEBHOOK_FORCE=1.

const PROD_BASE_URL = () => (process.env.PROD_BACKEND_URL || 'https://aiviral-backend.onrender.com').replace(/\/+$/, '')

export function getBotBaseUrl() {
    return (process.env.RENDER_EXTERNAL_URL || PROD_BASE_URL()).replace(/\/+$/, '')
}

export function isProdWebhookHost() {
    const ext = (process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '')
    if (process.env.TG_WEBHOOK_FORCE === '1') return !!ext
    return !!ext && ext === PROD_BASE_URL()
}
