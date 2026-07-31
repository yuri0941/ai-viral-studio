// ============================================
// CONSTANTS — конфигурация всей системы
// ============================================

export const DEPARTMENTS = [
    { value: 'sales', label: 'Продажи', color: '#2563eb' },
    { value: 'tech', label: 'Разработка', color: '#8b5cf6' },
    { value: 'content', label: 'Контент', color: '#f0883e' },
    { value: 'support', label: 'Поддержка', color: '#00ff41' },
    { value: 'marketing', label: 'Маркетинг', color: '#ec4899' },
]

export const ROLES = [
    { value: 'manager', label: 'Менеджер' },
    { value: 'developer', label: 'Разработчик' },
    { value: 'designer', label: 'Дизайнер' },
    { value: 'support', label: 'Поддержка' },
    { value: 'marketer', label: 'Маркетолог' },
    { value: 'admin', label: 'Админ' },
]

export const CAMPAIGN_STATUSES = {
    draft: { label: 'Черновик', color: 'bg-gray-500', icon: 'Edit' },
    pending_review: { label: 'На проверке', color: 'bg-yellow-500', icon: 'Clock' },
    approved: { label: 'Утверждено', color: 'bg-blue-500', icon: 'Check' },
    active: { label: 'Активна', color: 'bg-emerald-500', icon: 'Zap' },
    paused: { label: 'Приостановлена', color: 'bg-orange-500', icon: 'Pause' },
    completed: { label: 'Завершена', color: 'bg-purple-500', icon: 'CheckCircle' },
    cancelled: { label: 'Отменена', color: 'bg-red-500', icon: 'X' },
}

export const SERVER_REGIONS = {
    'Frankfurt': { flag: '🇩🇪', lat: 50.11, lng: 8.68 },
    'Amsterdam': { flag: '🇳🇱', lat: 52.37, lng: 4.90 },
    'London': { flag: '🇬🇧', lat: 51.51, lng: -0.13 },
    'New York': { flag: '🇺🇸', lat: 40.71, lng: -74.01 },
    'Singapore': { flag: '🇸🇬', lat: 1.35, lng: 103.82 },
}

export const CRYPTO_NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'SOL', 'BTC']
export const CRYPTO_CURRENCIES = ['USDT', 'BTC', 'ETH']

export const TABS_ORDER = [
    'overview', 'team', 'tasks', 'cabinets', 'finance', 'legal', 'legalSettings', 'audit',
    'subscriptions', 'requisites', 'servers', 'updates', 'promo', 'news', 'referrals',
    'advertising', 'security', 'apiKeys', 'integrations', 'aiAnalytics', 'logs',
    'agents', 'omega', 'omegaFinance', 'omegaSkills', 'omegaMemory',
    'notifications', 'devStudio', 'help', 'feedback', 'chat',
    'analytics', 'aiChat', 'contentAnalyzer', 'scheduler', 'viralChat'
]

export const CHAT_TYPES = {
    staff: { label: 'Сотрудники', color: 'text-blue-400', icon: 'Users' },
    ai: { label: 'AI Агенты', color: 'text-purple-400', icon: 'Bot' },
    client: { label: 'Клиенты', color: 'text-emerald-400', icon: 'MessageSquare' },
}

export const AI_AGENTS = [
    { id: 'pricing', name: 'Pricing Agent', role: 'Анализ цен', status: 'active', icon: 'TrendingUp', description: 'Анализирует цены конкурентов и рекомендует оптимальные тарифы' },
    { id: 'revenue', name: 'Revenue Agent', role: 'Прогноз доходов', status: 'active', icon: 'BarChart3', description: 'Прогнозирует MRR, churn и LTV на основе истории' },
    { id: 'security', name: 'Security Agent', role: 'Мониторинг', status: 'active', icon: 'Shield', description: 'Отслеживает подозрительную активность и алерты' },
    { id: 'growth', name: 'Growth Agent', role: 'Рекомендации', status: 'paused', icon: 'Zap', description: 'Анализирует метрики роста и даёт рекомендации' },
    { id: 'support', name: 'Support Agent', role: 'Авто-ответы', status: 'active', icon: 'MessageSquare', description: 'Автоматически отвечает на типовые тикеты' },
    { id: 'content', name: 'Content Agent', role: 'Модерация', status: 'active', icon: 'Eye', description: 'Модерирует контент на наличие нарушений' },
]