import mongoose from 'mongoose'

const predictionStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ScheduledPost',
        default: null,
        index: true,
    },
    platform: {
        type: String,
        default: 'unknown',
    },
    niche: {
        type: String,
        default: '',
    },
    prediction: {
        estimatedViews: { type: String, default: '0' },
        score: { type: Number, default: 0 },
        direction: { type: String, enum: ['more', 'less', 'none'], default: 'none' },
        wager: { type: String, enum: ['more', 'less', 'skip'], default: 'skip' },
    },
    actual: {
        views: { type: Number, default: 0 },
    },
    resolvedAt: {
        type: Date,
        default: null,
    },
    wasCorrect: {
        type: Boolean,
        default: null,
    },
    reward: {
        credits: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'expired'],
        default: 'pending',
    },
}, {
    timestamps: true,
})

predictionStatsSchema.index({ userId: 1, status: 1 })
predictionStatsSchema.index({ userId: 1, createdAt: -1 })
predictionStatsSchema.index({ platform: 1, wasCorrect: 1 })

export const PredictionStats = mongoose.models.PredictionStats || mongoose.model('PredictionStats', predictionStatsSchema)
export default PredictionStats
