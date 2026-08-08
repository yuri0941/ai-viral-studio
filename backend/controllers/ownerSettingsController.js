import { OwnerSettings } from '../models/OwnerSettings.js'
import { alertOwner } from '../services/ownerBot.js'

export async function getOwnerSettings(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        if (!ownerId) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' })
        }
        let settings = await OwnerSettings.findOne({ ownerId }).lean()
        if (!settings) {
            settings = {
                ownerId,
                features: { autopilot: false, predictive: false, repurposing: false, voice: false },
                autopilot: { schedule: '*/30 * * * *', platforms: [] },
                voice: { elevenLabsApiKey: '', elevenLabsVoiceId: '' },
                telegramSettings: { channelId: '', botToken: '', autoReply: true },
            }
        }
        res.json({ status: 'ok', data: settings })
    } catch (err) {
        console.error('[ownerSettings] get failed:', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function updateOwnerSettings(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        if (!ownerId) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' })
        }
        const { features, autopilot, voice, telegramSettings } = req.body
        const update = {}
        if (features) update.features = features
        if (autopilot) update.autopilot = autopilot
        if (voice) update.voice = voice
        if (telegramSettings) update.telegramSettings = telegramSettings

        const settings = await OwnerSettings.findOneAndUpdate(
            { ownerId },
            { $set: update },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )

        // Notify owner about feature toggles (best effort)
        const toggled = []
        if (features?.autopilot !== undefined) toggled.push(`AutoPilot ${features.autopilot ? 'ON' : 'OFF'}`)
        if (features?.predictive !== undefined) toggled.push(`Predictive ${features.predictive ? 'ON' : 'OFF'}`)
        if (features?.repurposing !== undefined) toggled.push(`Repurposing ${features.repurposing ? 'ON' : 'OFF'}`)
        if (features?.voice !== undefined) toggled.push(`Voice ${features.voice ? 'ON' : 'OFF'}`)
        if (toggled.length) {
            alertOwner(`⚙️ OMEGA настройки обновлены:\n${toggled.join('\n')}`).catch(() => {})
        }

        res.json({ status: 'ok', data: settings })
    } catch (err) {
        console.error('[ownerSettings] update failed:', err.message)
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getOwnerSettingsById(ownerId) {
    const settings = await OwnerSettings.findOne({ ownerId }).lean()
    if (!settings) {
        return {
            ownerId,
            features: { autopilot: false, predictive: false, repurposing: false, voice: false },
            autopilot: { schedule: '*/30 * * * *', platforms: [] },
            voice: { elevenLabsApiKey: '', elevenLabsVoiceId: '' },
        }
    }
    return settings
}
