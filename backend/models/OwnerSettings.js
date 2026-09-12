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
    // [REFERRAL-PCT] реферальная комиссия, % от платежа (0–50). Применяется к НОВЫМ начислениям,
    // уже начисленное не пересчитывается. Каноничное место — здесь, рядом с рубильниками.
    referralPercent: { type: Number, default: 12, min: 0, max: 50 },
    // [OMEGA-VIDEO] лимит веса загружаемого медиа (МБ), задаётся владельцем из кабинета.
    // Верхняя граница 250 — жёсткий потолок multer memoryStorage в routes/upload.js.
    mediaUploadLimitMb: { type: Number, default: 250, min: 1, max: 250 },
    // [OMEGA-VIDEO ДОП-2] цены AI-действий в ✦ и TTL хранения загруженного видео (часы).
    // Задаются владельцем из кабинета (Подписки), hot-reload ≤60с, без деплоя. Реестр цен
    // централизованно соберёт REAL-DATA — здесь поля плоские, паттерн mediaUploadLimitMb.
    videoAnalysisCostCredits: { type: Number, default: 1, min: 1, max: 100 },
    coverGenerationCostCredits: { type: Number, default: 1, min: 1, max: 100 },
    scriptGenerationCostCredits: { type: Number, default: 2, min: 1, max: 100 },
    // 0 = удалить файл сразу после разбора (дефолт); результат анализа (текст в чате) остаётся навсегда.
    videoStorageTtlHours: { type: Number, default: 0, min: 0, max: 720 },
    // [OMEGA-CONTROL] рубильники автономных контуров OMEGA (owner-бот /omega, TG).
    // Дефолт true = текущее поведение прода не меняется; выключение — только с превью ✅ владельца.
    omegaControl: {
        autopilot: { type: Boolean, default: true },
        dream: { type: Boolean, default: true },
        memory: { type: Boolean, default: true },
        selfHealing: { type: Boolean, default: true },
    },
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
    let value = { maintenanceMode: false, registrationEnabled: true, referralPercent: 12 }
    try {
        if (mongoose.connection?.readyState === 1) {
            const doc = await OwnerSettings.findOne().sort({ updatedAt: -1 }).lean()
            if (doc) {
                value = {
                    maintenanceMode: !!doc.maintenanceMode,
                    registrationEnabled: doc.registrationEnabled !== false,
                    referralPercent: Number.isFinite(doc.referralPercent) ? doc.referralPercent : 12,
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

// [REFERRAL-PCT] реферальная комиссия 0–50%: пишет в самый свежий документ; кэш сбрасывается сразу.
export async function setReferralPercent(pct) {
    const value = Number(pct)
    if (!Number.isFinite(value) || value < 0 || value > 50) {
        throw new Error('referralPercent must be a number 0–50')
    }
    let doc = await OwnerSettings.findOne().sort({ updatedAt: -1 })
    if (!doc) {
        const ownerUser = await mongoose.model('User').findOne({ role: 'owner' }).select('_id').lean()
        if (!ownerUser) throw new Error('OwnerSettings document not found')
        doc = new OwnerSettings({ ownerId: ownerUser._id })
    }
    doc.referralPercent = Math.round(value)
    await doc.save()
    invalidateOwnerFlagsCache()
    return { referralPercent: doc.referralPercent }
}

// [OMEGA-VIDEO] лимит веса медиа-загрузки (МБ): кэш ≤60 сек, смена в кабинете применяется без деплоя.
const MEDIA_LIMIT_TTL_MS = 60 * 1000
let mediaLimitCache = { value: null, at: 0 }

export function invalidateMediaUploadLimitCache() {
    mediaLimitCache = { value: null, at: 0 }
}

export async function getMediaUploadLimitMb() {
    if (mediaLimitCache.at && Date.now() - mediaLimitCache.at < MEDIA_LIMIT_TTL_MS) {
        return mediaLimitCache.value
    }
    let value = 250
    try {
        if (mongoose.connection?.readyState === 1) {
            const doc = await OwnerSettings.findOne().sort({ updatedAt: -1 }).lean()
            const raw = Number(doc?.mediaUploadLimitMb)
            if (Number.isFinite(raw) && raw >= 1) value = Math.min(250, Math.round(raw))
        }
    } catch (e) {
        console.warn('[OwnerSettings] getMediaUploadLimitMb db read failed:', e.message)
    }
    mediaLimitCache = { value, at: Date.now() }
    return value
}

export async function setMediaUploadLimitMb(mb) {
    const value = Number(mb)
    if (!Number.isFinite(value) || value < 1 || value > 250) {
        throw new Error('mediaUploadLimitMb must be a number 1–250')
    }
    let doc = await OwnerSettings.findOne().sort({ updatedAt: -1 })
    if (!doc) {
        const ownerUser = await mongoose.model('User').findOne({ role: 'owner' }).select('_id').lean()
        if (!ownerUser) throw new Error('OwnerSettings document not found')
        doc = new OwnerSettings({ ownerId: ownerUser._id })
    }
    doc.mediaUploadLimitMb = Math.round(value)
    await doc.save()
    invalidateMediaUploadLimitCache()
    return { mediaUploadLimitMb: doc.mediaUploadLimitMb }
}

// [OMEGA-VIDEO ДОП-2] цены AI-действий (✦) + TTL хранения видео: кэш ≤60 сек, смена в кабинете
// применяется без деплоя (паттерн mediaUploadLimitMb). Дефолты = поведение до допа (разбор 1✦, TTL 0).
const VIDEO_SETTINGS_DEFAULTS = {
    videoAnalysisCostCredits: 1,
    coverGenerationCostCredits: 1,
    scriptGenerationCostCredits: 2,
    videoStorageTtlHours: 0,
}
const VIDEO_SETTINGS_TTL_MS = 60 * 1000
let videoSettingsCache = { value: null, at: 0 }

export function invalidateVideoSettingsCache() {
    videoSettingsCache = { value: null, at: 0 }
}

function clampInt(raw, min, max, fallback) {
    const n = Number(raw)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n)))
}

export async function getVideoSettings() {
    if (videoSettingsCache.at && Date.now() - videoSettingsCache.at < VIDEO_SETTINGS_TTL_MS) {
        return videoSettingsCache.value
    }
    let value = { ...VIDEO_SETTINGS_DEFAULTS }
    try {
        if (mongoose.connection?.readyState === 1) {
            const doc = await OwnerSettings.findOne().sort({ updatedAt: -1 }).lean()
            if (doc) {
                value = {
                    videoAnalysisCostCredits: clampInt(doc.videoAnalysisCostCredits, 1, 100, 1),
                    coverGenerationCostCredits: clampInt(doc.coverGenerationCostCredits, 1, 100, 1),
                    scriptGenerationCostCredits: clampInt(doc.scriptGenerationCostCredits, 1, 100, 2),
                    videoStorageTtlHours: clampInt(doc.videoStorageTtlHours, 0, 720, 0),
                }
            }
        }
    } catch (e) {
        console.warn('[OwnerSettings] getVideoSettings db read failed:', e.message)
    }
    videoSettingsCache = { value, at: Date.now() }
    return value
}

export async function setVideoSettings(patch = {}) {
    const next = {}
    if (patch.videoAnalysisCostCredits !== undefined) {
        next.videoAnalysisCostCredits = clampInt(patch.videoAnalysisCostCredits, 1, 100, NaN)
        if (!Number.isFinite(next.videoAnalysisCostCredits)) throw new Error('videoAnalysisCostCredits must be a number 1–100')
    }
    if (patch.coverGenerationCostCredits !== undefined) {
        next.coverGenerationCostCredits = clampInt(patch.coverGenerationCostCredits, 1, 100, NaN)
        if (!Number.isFinite(next.coverGenerationCostCredits)) throw new Error('coverGenerationCostCredits must be a number 1–100')
    }
    if (patch.scriptGenerationCostCredits !== undefined) {
        next.scriptGenerationCostCredits = clampInt(patch.scriptGenerationCostCredits, 1, 100, NaN)
        if (!Number.isFinite(next.scriptGenerationCostCredits)) throw new Error('scriptGenerationCostCredits must be a number 1–100')
    }
    if (patch.videoStorageTtlHours !== undefined) {
        next.videoStorageTtlHours = clampInt(patch.videoStorageTtlHours, 0, 720, NaN)
        if (!Number.isFinite(next.videoStorageTtlHours)) throw new Error('videoStorageTtlHours must be a number 0–720')
    }
    if (!Object.keys(next).length) throw new Error('no video settings fields provided')
    let doc = await OwnerSettings.findOne().sort({ updatedAt: -1 })
    if (!doc) {
        const ownerUser = await mongoose.model('User').findOne({ role: 'owner' }).select('_id').lean()
        if (!ownerUser) throw new Error('OwnerSettings document not found')
        doc = new OwnerSettings({ ownerId: ownerUser._id })
    }
    Object.assign(doc, next)
    await doc.save()
    invalidateVideoSettingsCache()
    return getVideoSettings()
}

// [OMEGA-CONTROL] рубильники контуров автономии. Чтение без кэша (кроны 5–60 мин — свежести достаточно),
// запись в самый свежий документ настроек (паттерн setOwnerFlag). undefined → включено (дефолт схемы true).
export const OMEGA_CONTROL_KEYS = ['autopilot', 'dream', 'memory', 'selfHealing']

export async function getOmegaControl() {
    const value = { autopilot: true, dream: true, memory: true, selfHealing: true }
    try {
        if (mongoose.connection?.readyState === 1) {
            const doc = await OwnerSettings.findOne().sort({ updatedAt: -1 }).lean()
            if (doc?.omegaControl) {
                for (const k of OMEGA_CONTROL_KEYS) {
                    if (doc.omegaControl[k] === false) value[k] = false
                }
            }
        }
    } catch (e) {
        console.warn('[OwnerSettings] getOmegaControl db read failed:', e.message)
    }
    return value
}

export async function isOmegaContourEnabled(key) {
    const state = await getOmegaControl()
    return state[key] !== false
}

export async function setOmegaControlFlag(key, flagValue) {
    if (!OMEGA_CONTROL_KEYS.includes(key)) {
        throw new Error(`Unknown omega control key: ${key}`)
    }
    let doc = await OwnerSettings.findOne().sort({ updatedAt: -1 })
    if (!doc) {
        const ownerUser = await mongoose.model('User').findOne({ role: 'owner' }).select('_id').lean()
        if (!ownerUser) throw new Error('OwnerSettings document not found')
        doc = new OwnerSettings({ ownerId: ownerUser._id })
    }
    const current = doc.omegaControl?.toObject?.() || doc.omegaControl || {}
    doc.omegaControl = { autopilot: true, dream: true, memory: true, selfHealing: true, ...current, [key]: !!flagValue }
    doc.markModified('omegaControl')
    await doc.save()
    return { [key]: doc.omegaControl[key] }
}

export default OwnerSettings
