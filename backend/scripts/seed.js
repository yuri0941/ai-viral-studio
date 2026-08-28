import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env') })

import {
    Payment,
    SubscriptionPlan,
    AuditLog,
    Server,
    Integration,
    Promo,
    News,
    AIAgent,
    ApiKey,
    User,
} from '../models/index.js'
import bcrypt from 'bcryptjs'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_viral_studio'

const payments = [
    { amount: 15000, type: 'income', source: 'Подписки Enterprise', status: 'completed', date: new Date('2026-07-29'), currency: 'USD', method: 'bank' },
    { amount: 8500, type: 'income', source: 'Рекламная кампания TechBrand', status: 'completed', date: new Date('2026-07-28'), currency: 'USD', method: 'card' },
    { amount: 4300, type: 'expense', source: 'Серверы и инфраструктура', status: 'completed', date: new Date('2026-07-27'), currency: 'USD', method: 'bank' },
    { amount: 2100, type: 'expense', source: 'Зарплата фрилансерам', status: 'completed', date: new Date('2026-07-26'), currency: 'USD', method: 'paypal' },
    { amount: 5600, type: 'income', source: 'Подписки Pro', status: 'pending', date: new Date('2026-07-25'), currency: 'USD', method: 'card' },
    { amount: 1200, type: 'expense', source: 'API и AI-провайдеры', status: 'completed', date: new Date('2026-07-24'), currency: 'USD', method: 'card' },
    { amount: 3200, type: 'income', source: 'Консалтинг клиента', status: 'completed', date: new Date('2026-07-23'), currency: 'USD', method: 'crypto' },
]

const subscriptions = [
    { name: 'Free', price: 0, users: 450, color: '#6b7280', features: ['1 проект', 'Базовая аналитика', 'Email поддержка'], limits: { projects: 1, aiRequestsPerDay: 10, storageGb: 1, apiAccess: false, whiteLabel: false, dedicatedManager: false } },
    { name: 'Creator', price: 10, users: 280, color: '#2563eb', features: ['5 проектов', 'Расширенная аналитика', 'Приоритетная поддержка'], limits: { projects: 5, aiRequestsPerDay: 100, storageGb: 10, apiAccess: false, whiteLabel: false, dedicatedManager: false } },
    { name: 'Pro', price: 43, users: 150, color: '#8b5cf6', features: ['20 проектов', 'AI генерация', 'API доступ'], limits: { projects: 20, aiRequestsPerDay: 1000, storageGb: 50, apiAccess: true, whiteLabel: false, dedicatedManager: false } },
    { name: 'Agency', price: 143, users: 80, color: '#00ff41', features: ['Безлимит проектов', 'White label', 'Выделенный менеджер'], limits: { projects: -1, aiRequestsPerDay: 10000, storageGb: 200, apiAccess: true, whiteLabel: true, dedicatedManager: true } },
    { name: 'Enterprise', price: 475, users: 40, color: '#f0883e', features: ['Кастом решения', 'On-premise', 'SLA 99.9%'], limits: { projects: -1, aiRequestsPerDay: -1, storageGb: 1000, apiAccess: true, whiteLabel: true, dedicatedManager: true } },
]

const auditLogs = [
    { action: 'Изменение цены Pro на $43', user: 'owner@ai-viral.com', type: 'config', severity: 'medium', timestamp: new Date('2026-07-29T18:20:15') },
    { action: 'Добавлен сотрудник: Иван Сидоров', user: 'owner@ai-viral.com', type: 'staff', severity: 'low', timestamp: new Date('2026-07-29T17:45:00') },
    { action: 'Вывод средств: $5,000', user: 'owner@ai-viral.com', type: 'finance', severity: 'high', timestamp: new Date('2026-07-28T14:30:22') },
    { action: 'API ключ Replicate обновлён', user: 'admin@ai-viral.com', type: 'security', severity: 'high', timestamp: new Date('2026-07-28T09:15:00') },
    { action: 'Кабинет Ольга Козлова приостановлен', user: 'owner@ai-viral.com', type: 'staff', severity: 'medium', timestamp: new Date('2026-07-27T16:00:00') },
    { action: 'Запуск рекламной кампании TechBrand Promo', user: 'marketer@ai-viral.com', type: 'finance', severity: 'medium', timestamp: new Date('2026-07-26T11:30:00') },
]

const servers = [
    { name: 'API Gateway', region: 'Frankfurt', status: 'online', cpu: 45, ram: 62, disk: 34, uptime: '99.98%', cost: 120, lastRestart: new Date('2026-07-01') },
    { name: 'AI Worker #1', region: 'Amsterdam', status: 'online', cpu: 78, ram: 81, disk: 45, uptime: '99.95%', cost: 340, lastRestart: new Date('2026-07-10') },
    { name: 'AI Worker #2', region: 'London', status: 'warning', cpu: 91, ram: 89, disk: 67, uptime: '99.90%', cost: 340, lastRestart: new Date('2026-07-20') },
    { name: 'DB Primary', region: 'Frankfurt', status: 'online', cpu: 32, ram: 55, disk: 78, uptime: '99.99%', cost: 200, lastRestart: new Date('2026-06-15') },
    { name: 'CDN Node US', region: 'New York', status: 'offline', cpu: 0, ram: 0, disk: 12, uptime: '97.50%', cost: 80, lastRestart: new Date('2026-07-23') },
]

const integrations = [
    { provider: 'youtube', name: 'YouTube', connected: true, status: 'active', followers: 125000, views: '2.4M', lastSync: new Date() },
    { provider: 'tiktok', name: 'TikTok', connected: true, status: 'active', followers: 89000, views: '5.1M', lastSync: new Date(Date.now() - 5 * 60000) },
    { provider: 'instagram', name: 'Instagram', connected: false, status: 'disconnected', followers: 0, views: '0' },
    { provider: 'telegram', name: 'Telegram', connected: true, status: 'warning', followers: 45000, views: '1.2M', lastSync: new Date(Date.now() - 60 * 60000) },
]

const promos = [
    { code: 'VIRAL20', discount: 20, type: 'percent', usageLimit: 100, usedCount: 45, status: 'active', expiry: new Date('2026-08-31') },
    { code: 'SUMMER50', discount: 50, type: 'percent', usageLimit: 50, usedCount: 50, status: 'expired', expiry: new Date('2026-07-01') },
    { code: 'STARTUP10', discount: 10, type: 'fixed', usageLimit: 200, usedCount: 12, status: 'active', expiry: new Date('2026-12-31') },
]

const news = [
    { title: 'Запуск AI Video Generator 2.0', content: 'Теперь вы можете создавать вирусные видео за 60 секунд с помощью OMEGA Core.', date: new Date('2026-07-29'), views: 1240, status: 'published' },
    { title: 'Новый тариф Agency', content: 'Для крупных команд мы запустили тариф с white-label и выделенным менеджером.', date: new Date('2026-07-20'), views: 890, status: 'published' },
    { title: 'Технические работы 30.07', content: 'Плановое обслуживание серверов с 03:00 до 05:00 UTC.', date: new Date('2026-07-28'), views: 0, status: 'draft' },
]

const agents = [
    { id: 'pricing', name: 'Pricing Agent', role: 'Анализ цен', status: 'active', icon: 'TrendingUp', description: 'Анализирует цены конкурентов и рекомендует оптимальные тарифы' },
    { id: 'revenue', name: 'Revenue Agent', role: 'Прогноз доходов', status: 'active', icon: 'BarChart3', description: 'Прогнозирует MRR, churn и LTV на основе истории' },
    { id: 'security', name: 'Security Agent', role: 'Мониторинг', status: 'active', icon: 'Shield', description: 'Отслеживает подозрительную активность и алерты' },
    { id: 'growth', name: 'Growth Agent', role: 'Рекомендации', status: 'paused', icon: 'Zap', description: 'Анализирует метрики роста и даёт рекомендации' },
    { id: 'support', name: 'Support Agent', role: 'Авто-ответы', status: 'active', icon: 'MessageSquare', description: 'Автоматически отвечает на типовые тикеты' },
    { id: 'content', name: 'Content Agent', role: 'Модерация', status: 'active', icon: 'Eye', description: 'Модерирует контент на наличие нарушений' },
]

// [security-hardening Б5-З4] значения ключей УДАЛЕНЫ из репозитория (были засвечены в git → на ротацию).
// Seed подхватывает ключи из env; без env seed ключей пропускается.
const apiKeys = [
    { provider: 'groq', label: 'Groq', key: process.env.GROQ_API_KEY || '', status: 'active' },
    { provider: 'openrouter', label: 'OpenRouter', key: process.env.OPENROUTER_API_KEY || '', status: 'active' },
    { provider: 'gemini', label: 'Google Gemini', key: process.env.GEMINI_API_KEY || '', status: 'active' },
    { provider: 'youtube', label: 'YouTube Data API', key: process.env.YOUTUBE_API_KEY || '', status: 'active' },
    { provider: 'github', label: 'GitHub Models', key: process.env.GITHUB_API_KEY || '', status: 'active' },
].filter(k => k.key)

async function upsertApiKeys() {
    for (const k of apiKeys) {
        await ApiKey.updateOne(
            { provider: k.provider },
            { $set: { ...k, ownerId: null, isActive: true, lastRotated: new Date() } },
            { upsert: true }
        )
    }
    console.log(`Upserted ${apiKeys.length} API keys`)
}

async function seed() {
    try {
        await mongoose.connect(MONGO_URI)
        console.log('Connected to MongoDB:', MONGO_URI)

        // Clear collections
        const models = [Payment, SubscriptionPlan, AuditLog, Server, Integration, Promo, News, AIAgent]
        for (const Model of models) {
            if (Model) {
                await Model.deleteMany({})
                console.log(`Cleared ${Model.modelName}`)
            }
        }

        // Insert
        await Payment.insertMany(payments)
        console.log(`Seeded ${payments.length} payments`)

        await SubscriptionPlan.insertMany(subscriptions)
        console.log(`Seeded ${subscriptions.length} subscriptions`)

        await AuditLog.insertMany(auditLogs)
        console.log(`Seeded ${auditLogs.length} audit logs`)

        await Server.insertMany(servers)
        console.log(`Seeded ${servers.length} servers`)

        await Integration.insertMany(integrations)
        console.log(`Seeded ${integrations.length} integrations`)

        await Promo.insertMany(promos)
        console.log(`Seeded ${promos.length} promos`)

        await News.insertMany(news)
        console.log(`Seeded ${news.length} news`)

        await AIAgent.insertMany(agents)
        console.log(`Seeded ${agents.length} agents`)

        await upsertApiKeys()

        // [MONETIZE-2026-08-04] added test accounts
        const testAccounts = [
            { email: 'admin@aiviral.ru', password: 'Admin123!', role: 'admin', name: 'Админ Тест' },
            { email: 'staff@aiviral.ru', password: 'Staff123!', role: 'staff', name: 'Сотрудник Тест' },
            { email: 'creator@aiviral.ru', password: 'Creator123!', role: 'creator', name: 'Креатор Тест' },
            { email: 'advertiser@aiviral.ru', password: 'Advert123!', role: 'advertiser', name: 'Рекламодатель Тест' },
            { email: 'owner@aiviral.ru', password: 'Owner123!', role: 'owner', name: 'Владелец Тест' },
        ]

        for (const acc of testAccounts) {
            const exists = await User.findOne({ email: acc.email })
            if (!exists) {
                await User.create({
                    ...acc,
                    isVerified: true,
                    acceptedTerms: true,
                    acceptedPrivacy: true,
                    acceptedConsent: true,
                    isAdult: true,
                    acceptedAt: new Date(),
                    preferences: { timezone: 'Europe/Moscow', language: 'ru', currency: 'RUB' }
                })
                console.log(`[SEED] Created ${acc.role}: ${acc.email} / ${acc.password}`)
            }
        }

        console.log('\n✅ Seed completed successfully')
    } catch (err) {
        console.error('❌ Seed failed:', err.message)
        process.exit(1)
    } finally {
        await mongoose.disconnect()
    }
}

seed()
