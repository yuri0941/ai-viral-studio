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
    lastReport: {
        date: Date,
        mrr: Number,
        newUsers: Number,
        errors: Number,
        topTrends: [String],
        recommendations: [String],
        generatedBy: { type: String, default: 'OMEGA' },
    },
}, {
    timestamps: true,
})

export const OwnerSettings = mongoose.models.OwnerSettings || mongoose.model('OwnerSettings', ownerSettingsSchema)
export default OwnerSettings
