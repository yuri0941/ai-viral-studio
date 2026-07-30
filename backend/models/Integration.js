import mongoose from 'mongoose'

const integrationSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: ['youtube', 'tiktok', 'instagram', 'twitter', 'telegram', 'vk', 'facebook'],
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
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
    },
    refreshToken: {
        type: String,
        select: false,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
})

integrationSchema.index({ ownerId: 1, provider: 1 })

export const Integration = mongoose.model('Integration', integrationSchema)
export default Integration
