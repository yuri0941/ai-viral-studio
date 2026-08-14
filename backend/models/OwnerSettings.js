import mongoose from 'mongoose'

const ownerSettingsSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    features: {
        autopilot: { type: Boolean, default: false },
        predictive: { type: Boolean, default: false },
        repurposing: { type: Boolean, default: false },
        voice: { type: Boolean, default: false },
    },
    autopilot: {
        schedule: { type: String, default: '*/30 * * * *' },
        platforms: [{ type: String, enum: ['youtube', 'instagram', 'tiktok', 'telegram', 'twitter'] }],
    },
    voice: {
        elevenLabsApiKey: { type: String, default: '', select: false },
        elevenLabsVoiceId: { type: String, default: '' },
    },
    autoReport: {
        enabled: { type: Boolean, default: true },
        time: { type: String, default: '08:00' },
        frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
        channels: [{ type: String, enum: ['in-app', 'telegram', 'email'], default: 'in-app' }],
    },
    telegramSettings: {
        channelId: { type: String, default: '' },
        botToken: { type: String, default: '', select: false },
        autoReply: { type: Boolean, default: true },
    },
    lastReport: {
        date: Date,
        mrr: Number,
        newUsers: Number,
        errors: Number,
        topTrends: [String],
        recommendations: [String],
        generatedBy: { type: String, default: 'OMEGA' },
    },
    // [OWNER-REMOTE-CONTROL] рубильники (hot-reload, кэш ≤60 сек) и TG владельца
    maintenanceMode: { type: Boolean, default: false },
    registrationEnabled: { type: Boolean, default: true },
    ownerTelegramChatId: { type: String, default: '' },
}, {
    timestamps: true,
})

export const OwnerSettings = mongoose.models.OwnerSettings || mongoose.model('OwnerSettings', ownerSettingsSchema)

// ============ [OWNER-REMOTE-CONTROL] единый источник TG chat_id владельца ============
// Приоритет: OwnerSettings.ownerTelegramChatId → env TELEGRAM_OWNER_CHAT_ID → legacy OWNER_CHAT_ID / OWNER_USER_ID.
// Кэш ≤60 сек: смена применяется без redeploy.
const CHAT_ID_TTL_MS = 60 * 1000
let chatIdCache = { value: null, at: 0 }

function envOwnerChatId() {
    return process.env.TELEGRAM_OWNER_CHAT_ID || process.env.OWNER_CHAT_ID || process.env.OWNER_USER_ID || null
}

export function invalidateOwnerChatIdCache() {
    chatIdCache = { value: null, at: 0 }
}

export async function getOwnerChatId(forceRefresh = false) {
    if (!forceRefresh && chatIdCache.at && Date.now() - chatIdCache.at < CHAT_ID_TTL_MS) {
        return chatIdCache.value
    }
    let value = null
    try {
        if (mongoose.connection?.readyState === 1) {
            const doc = await OwnerSettings.findOne({ ownerTelegramChatId: { $nin: [null, ''] } })
                .sort({ updatedAt: -1 })
                .lean()
            value = doc?.ownerTelegramChatId || null
        }
    } catch (e) {
        console.warn('[OwnerSettings] getOwnerChatId db read failed:', e.message)
    }
    if (!value) value = envOwnerChatId()
    chatIdCache = { value, at: Date.now() }
    return value
}

// Синхронный доступ для hot-path проверок isOwner: отдаёт кэш (или env при холодном старте),
// при протухшем кэше запускает фоновое обновление.
export function getOwnerChatIdSync() {
    if (Date.now() - chatIdCache.at >= CHAT_ID_TTL_MS) {
        getOwnerChatId().catch(() => {})
    }
    return chatIdCache.at ? chatIdCache.value : envOwnerChatId()
}

// ============ [OWNER-REMOTE-CONTROL] рубильники с кэшем ≤60 сек ============
const FLAGS_TTL_MS = 60 * 1000
let flagsCache = { value: null, at: 0 }

export function invalidateOwnerFlagsCache() {
    flagsCache = { value: null, at: 0 }
}

export async function getOwnerFlags(forceRefresh = false) {
    if (!forceRefresh && flagsCache.value && Date.now() - flagsCache.at < FLAGS_TTL_MS) {
        return flagsCache.value
    }
    let value = { maintenanceMode: false, registrationEnabled: true }
    try {
        if (mongoose.connection?.readyState === 1) {
            const doc = await OwnerSettings.findOne().sort({ updatedAt: -1 }).lean()
            if (doc) {
                value = {
                    maintenanceMode: !!doc.maintenanceMode,
                    registrationEnabled: doc.registrationEnabled !== false,
                }
            }
        }
    } catch (e) {
        console.warn('[OwnerSettings] getOwnerFlags db read failed:', e.message)
    }
    flagsCache = { value, at: Date.now() }
    return value
}

// Установка флага: пишет в самый свежий документ настроек; кэш сбрасывается сразу.
export async function setOwnerFlag(key, flagValue) {
    if (!['maintenanceMode', 'registrationEnabled'].includes(key)) {
        throw new Error(`Unknown owner flag: ${key}`)
    }
    let doc = await OwnerSettings.findOne().sort({ updatedAt: -1 })
    if (!doc) {
        // Первый запуск: создаём документ настроек для пользователя с ролью owner
        const ownerUser = await mongoose.model('User').findOne({ role: 'owner' }).select('_id').lean()
        if (!ownerUser) throw new Error('OwnerSettings document not found')
        doc = new OwnerSettings({ ownerId: ownerUser._id })
    }
    doc[key] = !!flagValue
    await doc.save()
    invalidateOwnerFlagsCache()
    return { [key]: doc[key] }
}

export default OwnerSettings
