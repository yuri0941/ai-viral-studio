// ============================================
// AI VIRAL STUDIO — OWNER DASHBOARD DATA
// Все мок-данные в одном месте. Легко заменить на API.
// ============================================

export const INITIAL_STAFF = [
    { id: 1, name: 'Анна Петрова', email: 'anna@ai-viral.com', role: 'manager', department: 'sales', status: 'active', tasksCompleted: 145, load: 85, skills: ['React', 'Sales', 'CRM'], joined: '2024-01-15', lastActive: '2 мин назад', avatar: 'А' },
    { id: 2, name: 'Иван Сидоров', email: 'ivan@ai-viral.com', role: 'developer', department: 'tech', status: 'active', tasksCompleted: 203, load: 92, skills: ['Node.js', 'AI', 'Python'], joined: '2023-11-20', lastActive: '5 мин назад', avatar: 'И' },
    { id: 3, name: 'Мария Козлова', email: 'maria@ai-viral.com', role: 'designer', department: 'content', status: 'active', tasksCompleted: 89, load: 67, skills: ['Figma', 'Motion', 'UI/UX'], joined: '2024-03-10', lastActive: '1 час назад', avatar: 'М' },
    { id: 4, name: 'Дмитрий Волков', email: 'dmitry@ai-viral.com', role: 'support', department: 'support', status: 'paused', tasksCompleted: 312, load: 45, skills: ['Support', 'Communication'], joined: '2023-08-05', lastActive: '2 дня назад', avatar: 'Д' },
    { id: 5, name: 'Елена Соколова', email: 'elena@ai-viral.com', role: 'marketer', department: 'marketing', status: 'active', tasksCompleted: 178, load: 78, skills: ['SEO', 'Ads', 'Analytics'], joined: '2024-02-01', lastActive: '15 мин назад', avatar: 'Е' },
]

export const INITIAL_CABINETS = [
    { id: 1, name: 'Мария Сидорова', email: 'maria.cabinet@ai-viral.com', department: 'support', status: 'active', avatar: 'М', activeNow: true, lastLogin: '2026-07-24 18:15', sessionsToday: 12, actionsToday: 45 },
    { id: 2, name: 'Алексей Иванов', email: 'alex.cabinet@ai-viral.com', department: 'content', status: 'active', avatar: 'А', activeNow: true, lastLogin: '2026-07-24 17:50', sessionsToday: 8, actionsToday: 23 },
    { id: 3, name: 'Ольга Козлова', email: 'olga.cabinet@ai-viral.com', department: 'sales', status: 'paused', avatar: 'О', activeNow: false, lastLogin: '2026-07-22 14:30', sessionsToday: 0, actionsToday: 0 },
    { id: 4, name: 'Дмитрий Смирнов', email: 'dmitry.cabinet@ai-viral.com', department: 'tech', status: 'active', avatar: 'Д', activeNow: true, lastLogin: '2026-07-24 18:10', sessionsToday: 15, actionsToday: 67 },
]

export const INITIAL_SUBSCRIPTIONS = [
    { name: 'Free', price: 0, users: 450, color: '#6b7280', features: ['1 проект', 'Базовая аналитика', 'Email поддержка'] },
    { name: 'Creator', price: 10, users: 280, color: '#2563eb', features: ['5 проектов', 'Расширенная аналитика', 'Приоритетная поддержка'] },
    { name: 'Pro', price: 30, users: 150, color: '#8b5cf6', features: ['20 проектов', 'AI генерация', 'API доступ'] },
    { name: 'Agency', price: 100, users: 80, color: '#00ff41', features: ['Безлимит проектов', 'White label', 'Выделенный менеджер'] },
    { name: 'Enterprise', price: 300, users: 40, color: '#f0883e', features: ['Кастом решения', 'On-premise', 'SLA 99.9%'] },
]

export const INITIAL_SERVERS = [
    { id: 1, name: 'API Gateway', region: 'Frankfurt', status: 'online', cpu: 45, ram: 62, disk: 34, uptime: '99.98%', cost: 120, lastRestart: '2026-07-01' },
    { id: 2, name: 'AI Worker #1', region: 'Amsterdam', status: 'online', cpu: 78, ram: 81, disk: 45, uptime: '99.95%', cost: 340, lastRestart: '2026-07-10' },
    { id: 3, name: 'AI Worker #2', region: 'London', status: 'warning', cpu: 91, ram: 89, disk: 67, uptime: '99.90%', cost: 340, lastRestart: '2026-07-20' },
    { id: 4, name: 'DB Primary', region: 'Frankfurt', status: 'online', cpu: 32, ram: 55, disk: 78, uptime: '99.99%', cost: 200, lastRestart: '2026-06-15' },
    { id: 5, name: 'CDN Node US', region: 'New York', status: 'offline', cpu: 0, ram: 0, disk: 12, uptime: '97.50%', cost: 80, lastRestart: '2026-07-23' },
]

export const INITIAL_PAYMENTS = [
    { id: 1, date: '2026-07-24', amount: 12500, type: 'income', source: 'Подписки', status: 'completed' },
    { id: 2, date: '2026-07-23', amount: 3400, type: 'expense', source: 'Серверы', status: 'completed' },
    { id: 3, date: '2026-07-23', amount: 8900, type: 'income', source: 'Реклама', status: 'completed' },
    { id: 4, date: '2026-07-22', amount: 2100, type: 'expense', source: 'Зарплата', status: 'completed' },
    { id: 5, date: '2026-07-22', amount: 5600, type: 'income', source: 'Подписки', status: 'pending' },
    { id: 6, date: '2026-07-21', amount: 1200, type: 'expense', source: 'API', status: 'completed' },
]

export const INITIAL_AUDIT_LOGS = [
    { id: 1, action: 'Изменение цены Pro', user: 'owner@ai-viral.com', timestamp: '2026-07-24 18:20:15', type: 'config', severity: 'medium' },
    { id: 2, action: 'Добавлен сотрудник: Иван Сидоров', user: 'owner@ai-viral.com', timestamp: '2026-07-24 17:45:00', type: 'staff', severity: 'low' },
    { id: 3, action: 'Вывод средств: $5,000', user: 'owner@ai-viral.com', timestamp: '2026-07-23 14:30:22', type: 'finance', severity: 'high' },
    { id: 4, action: 'API ключ Replicate обновлён', user: 'admin@ai-viral.com', timestamp: '2026-07-23 09:15:00', type: 'security', severity: 'high' },
    { id: 5, action: 'Кабинет Ольга Козлова приостановлен', user: 'owner@ai-viral.com', timestamp: '2026-07-22 16:00:00', type: 'staff', severity: 'medium' },
]

export const INITIAL_PROMOS = [
    { id: 1, code: 'VIRAL20', discount: 20, type: 'percent', usageLimit: 100, usedCount: 45, status: 'active', expiry: '2026-08-31' },
    { id: 2, code: 'SUMMER50', discount: 50, type: 'percent', usageLimit: 50, usedCount: 50, status: 'expired', expiry: '2026-07-01' },
    { id: 3, code: 'STARTUP10', discount: 10, type: 'fixed', usageLimit: 200, usedCount: 12, status: 'active', expiry: '2026-12-31' },
]

export const INITIAL_NEWS = [
    { id: 1, title: 'Запуск AI Video Generator 2.0', content: 'Теперь вы можете создавать вирусные видео за 60 секунд...', date: '2026-07-24', views: 1240, status: 'published' },
    { id: 2, title: 'Новый тариф Agency', content: 'Для крупных команд мы запустили тариф с white-label...', date: '2026-07-20', views: 890, status: 'published' },
    { id: 3, title: 'Технические работы 25.07', content: 'Плановое обслуживание серверов с 03:00 до 05:00 UTC...', date: '2026-07-23', views: 0, status: 'draft' },
]

export const INITIAL_REFERRALS = [
    { id: 1, code: 'OWNER50', referrer: 'partner1@site.com', earnings: 1250, conversions: 45, status: 'active' },
    { id: 2, code: 'BLOG20', referrer: 'blog@tech.ru', earnings: 3400, conversions: 120, status: 'active' },
    { id: 3, code: 'YOUTUBE', referrer: 'channel@youtube.com', earnings: 890, conversions: 30, status: 'paused' },
]

export const INITIAL_AD_CAMPAIGNS = [
    { id: 1, name: 'TechBrand Promo', client: 'TechBrand Inc.', budget: 5000, spent: 3200, status: 'active', ctr: 4.2, cpc: 0.85, roi: 145, startDate: '15.07.2026', endDate: '15.08.2026', platform: 'YouTube', negotiations: [] },
    { id: 2, name: 'Summer Sale', client: 'FashionStore', budget: 3000, spent: 1500, status: 'pending_review', ctr: 0, cpc: 0, roi: 0, startDate: '01.08.2026', endDate: '31.08.2026', platform: 'Instagram', negotiations: [] },
    { id: 3, name: 'App Launch', client: 'MobileDev Co', budget: 10000, spent: 8000, status: 'completed', ctr: 6.1, cpc: 1.2, roi: 210, startDate: '01.06.2026', endDate: '30.06.2026', platform: 'TikTok', negotiations: [] },
]

export const INITIAL_SECURITY = {
    twoFactorEnabled: true,
    activeSessions: [
        { id: 1, device: 'Chrome / Windows', ip: '185.12.34.56', location: 'Москва, РФ', lastActive: '2 мин назад', current: true },
        { id: 2, device: 'Safari / iPhone', ip: '91.203.45.78', location: 'Санкт-Петербург, РФ', lastActive: '2 часа назад', current: false },
    ],
    loginHistory: [
        { date: '23.07.2026 18:45', ip: '185.12.34.56', status: 'success', location: 'Москва' },
        { date: '23.07.2026 12:30', ip: '91.203.45.78', status: 'success', location: 'СПб' },
        { date: '22.07.2026 03:15', ip: '45.67.89.12', status: 'failed', location: 'Неизвестно' },
    ],
    alerts: [
        { id: 1, type: 'suspicious_login', message: 'Попытка входа с неизвестного IP', time: '22.07.2026 03:15', severity: 'high' },
    ]
}

export const INITIAL_INTEGRATIONS = [
    { id: 'youtube', name: 'YouTube', connected: true, status: 'active', followers: 125000, views: '2.4M', lastSync: '2 мин назад', apiKey: 'AIzaSyD1SH9...' },
    { id: 'tiktok', name: 'TikTok', connected: true, status: 'active', followers: 89000, views: '5.1M', lastSync: '5 мин назад', apiKey: 'tiktok_api_...' },
    { id: 'instagram', name: 'Instagram', connected: false, status: 'disconnected', followers: 0, views: '0', lastSync: 'Никогда', apiKey: '' },
    { id: 'telegram', name: 'Telegram', connected: true, status: 'warning', followers: 45000, views: '1.2M', lastSync: '1 час назад', apiKey: 'tg_bot_...' },
]

export const INITIAL_AI_ANALYTICS = {
    businessHealth: 87,
    churnForecast: { nextMonth: 2.1, nextQuarter: 2.8, nextYear: 3.5 },
    revenueForecast: [
        { month: 'Авг', predicted: 38000, optimistic: 42000, pessimistic: 34000 },
        { month: 'Сен', predicted: 42000, optimistic: 48000, pessimistic: 37000 },
        { month: 'Окт', predicted: 45000, optimistic: 52000, pessimistic: 39000 },
    ],
    recommendations: [
        { id: 1, priority: 'high', title: 'Повысить цену Pro на $5', impact: '+$2,400/мес', confidence: 92 },
        { id: 2, priority: 'medium', title: 'Запустить email-кампанию', impact: '+15% retention', confidence: 78 },
    ]
}

export const INITIAL_SYSTEM_LOGS = [
    { id: 1, level: 'error', message: 'Failed to connect to AI API (Groq)', timestamp: '23.07.2026 18:42:15', source: 'AI Service', stack: 'Error: timeout...' },
    { id: 2, level: 'warning', message: 'High CPU usage on AI Worker #2', timestamp: '23.07.2026 18:30:00', source: 'Monitoring', stack: '' },
    { id: 3, level: 'info', message: 'User subscription upgraded: Free → Pro', timestamp: '23.07.2026 18:15:22', source: 'Billing', stack: '' },
    { id: 4, level: 'info', message: 'Scheduled post published: #1234', timestamp: '23.07.2026 18:00:00', source: 'Scheduler', stack: '' },
]

export const INITIAL_WITHDRAW_REQUISITES = {
    legal: { companyName: '', inn: '', kpp: '', rs: '', bik: '', bank: '' },
    ip: { fullName: '', inn: '', ogrnip: '', rs: '', bik: '', bank: '' },
    card: { cardNumber: '', cardHolder: '', bank: '' },
    international: { iban: '', swift: '', bankName: '', bankAddress: '', country: '', beneficiaryName: '' },
    crypto: { walletAddress: '', network: 'TRC20', currency: 'USDT' },
    paypal: { email: '' }
}

export const INITIAL_COMPANY = {
    name: 'AI Viral Studio LLC',
    inn: '7701234567',
    kpp: '770101001',
    ogrn: '1157746123456',
    address: 'г. Москва, ул. Примерная, д. 1',
    ceo: 'Иванов Иван Иванович',
    email: 'legal@ai-viral.com',
    phone: '+7 (999) 123-45-67'
}
export const AI_AGENTS = [
    { id: 'pricing', name: 'Pricing Agent', role: 'Анализ цен', status: 'active', icon: 'TrendingUp', description: 'Анализирует цены конкурентов и рекомендует оптимальные тарифы' },
    { id: 'revenue', name: 'Revenue Agent', role: 'Прогноз доходов', status: 'active', icon: 'BarChart', description: 'Прогнозирует MRR, churn и LTV на основе истории' },
    { id: 'security', name: 'Security Agent', role: 'Мониторинг', status: 'active', icon: 'Shield', description: 'Отслеживает подозрительную активность и алерты' },
    { id: 'growth', name: 'Growth Agent', role: 'Рекомендации', status: 'paused', icon: 'Zap', description: 'Анализирует метрики роста и даёт рекомендации' },
    { id: 'support', name: 'Support Agent', role: 'Авто-ответы', status: 'active', icon: 'MessageSquare', description: 'Автоматически отвечает на типовые тикеты' },
    { id: 'content', name: 'Content Agent', role: 'Модерация', status: 'active', icon: 'Eye', description: 'Модерирует контент на наличие нарушений' },
    { id: 'seo', name: 'SEO Agent', role: 'SEO', status: 'active', icon: 'Search', description: 'Оптимизирует теги, описания и структуру контента' },
    { id: 'analytics', name: 'Analytics Agent', role: 'Аналитика', status: 'active', icon: 'BarChart2', description: 'Собирает и визуализирует ключевые метрики' },
    { id: 'design', name: 'Design Agent', role: 'Дизайн', status: 'active', icon: 'Palette', description: 'Генерирует идеи миниатюр и визуальных концепций' },
    { id: 'legal', name: 'Legal Agent', role: 'Юридический', status: 'paused', icon: 'Scale', description: 'Проверяет контент на риски и соответствие законам' },
    { id: 'finance', name: 'Finance Agent', role: 'Финансы', status: 'active', icon: 'Wallet', description: 'Мониторит платежи, выплаты и финансовые риски' },
    { id: 'trend', name: 'Trend Agent', role: 'Тренды', status: 'active', icon: 'TrendingUp', description: 'Отслеживает тренды в соцсетях и рекомендует темы' },
    { id: 'competitor', name: 'Competitor Agent', role: 'Конкуренты', status: 'active', icon: 'Target', description: 'Анализирует конкурентов и их успешный контент' },
    { id: 'viral', name: 'Viral Agent', role: 'Вирусность', status: 'active', icon: 'Flame', description: 'Оценивает вирусный потенциал идеи и контента' },
]

export const TAB_LABELS = {
    overview: 'Обзор',
    team: 'Команда',
    cabinets: 'Кабинеты',
    finance: 'Финансы',
    legal: 'Юр. лицо',
    audit: 'Аудит',
    subscriptions: 'Подписки',
    requisites: '🏢 Реквизиты',
    servers: 'Серверы',
    updates: 'Обновления',
    promo: 'Промо',
    news: 'Новости',
    referrals: 'Рефералы',
    advertising: 'Реклама',
    security: 'Безопасность',
    integrations: 'Интеграции',
    aiAnalytics: 'AI Аналитика',
    logs: 'Логи системы',
    agents: '🤖 AI Агенты',
    chat: '💬 Чаты',
    omega: 'Ω OMEGA Core',
    tasks: '✅ Задачи',
    apiKeys: '🔑 API Keys',
    notifications: '🔔 Уведомления',
    help: '❓ Помощь',
    feedback: '💬 Feedback',
    devStudio: '🚀 DevStudio',
    omegaFinance: '💰 OMEGA Finance',
    omegaSkills: '🧠 OMEGA Skills',
    omegaMemory: '🗄️ OMEGA Memory',
    legalSettings: '⚖️ Юр. настройки',
    analytics: '📊 Аналитика',
    aiChat: '🤖 AI Chat',
    contentAnalyzer: '🔍 Анализ контента',
    scheduler: '📅 Планировщик',
    viralChat: '💬 Viral Chat',
    brandVoice: '🎨 Brand Voice',
    templates: '📋 Шаблоны',
    scout: '🔥 Scout',
    whiteLabel: '🏷️ White-Label',
    workspaces: '📁 Workspaces',
    developer: '👨‍💻 Developer API',
    qr: '📱 QR / Офлайн',
    franchise: '🏪 Франшиза',
    fleet: '🚀 Fleet',
}
