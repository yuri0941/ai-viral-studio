import mongoose from 'mongoose'

const integrationSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: ['telegram', 'vk', 'linkedin', 'pinterest', 'facebook', 'instagram', 'tiktok', 'youtube', 'discord'],
        required: true,
    },
    name: {
        type: String,
        trim: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    connected: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ['active', 'disconnected', 'warning', 'error'],
        default: 'disconnected',
    },
    followers: {
        type: Number,
        default: 0,
    },
    views: {
        type: String,
        default: '0',
    },
    lastSync: {
        type: Date,
    },
    apiKey: {
        type: String,
        select: false,
    },
    accessToken: {
        type: String,
        select: false,
        required: true,
    },
    refreshToken: {
        type: String,
        select: false,
    },
    expiresAt: {
        type: Date,
    },
    accountName: {
        type: String,
    },
    accountId: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    settings: {
        autoPublish: { type: Boolean, default: false },
        defaultHashtags: { type: String, default: '' },
        bestTime: { type: String, default: '18:00' },
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
})

integrationSchema.index({ ownerId: 1, provider: 1 })
// [SOCIAL-v5.1] added unique user+provider index
integrationSchema.index({ userId: 1, provider: 1 }, { unique: true })

export const Integration = mongoose.model('Integration', integrationSchema)
export default Integration
