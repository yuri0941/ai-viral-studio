import mongoose from 'mongoose'

const usageQuotaSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    plan: {
        type: String,
        enum: ['free', 'creator', 'pro', 'agency', 'enterprise'],
        default: 'free',
    },
    generationsUsed: {
        type: Number,
        default: 0,
        min: 0,
    },
    generationsLimit: {
        type: Number,
        default: 50,
        min: 0,
    },
    overageCost: {
        type: Number,
        default: 4, // USD per 100 extra generations
        min: 0,
    },
    overageUsed: {
        type: Number,
        default: 0,
        min: 0,
    },
    topUpPackSize: {
        type: Number,
        default: 100,
    },
    topUpPackPrice: {
        type: Number,
        default: 4,
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly',
    },
    cycleStartedAt: {
        type: Date,
        default: Date.now,
    },
    cycleEndsAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
}, {
    timestamps: true,
})

usageQuotaSchema.index({ userId: 1 })

export const UsageQuota = mongoose.model('UsageQuota', usageQuotaSchema)
export default UsageQuota
