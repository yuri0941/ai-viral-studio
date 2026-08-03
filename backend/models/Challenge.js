import mongoose from 'mongoose'

const evaluationSchema = new mongoose.Schema({
    viral: { type: Number, min: 0, max: 100, default: 0 },
    creative: { type: Number, min: 0, max: 100, default: 0 },
    engagement: { type: Number, min: 0, max: 100, default: 0 },
    total: { type: Number, min: 0, max: 100, default: 0 },
    reasoning: { type: String, default: '' },
}, { _id: false })

const submissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contentUrl: { type: String, default: '' },
    caption: { type: String, default: '' },
    platform: { type: String, default: 'tiktok' },
    niche: { type: String, default: 'general' },
    score: { type: Number, default: 0 },
    evaluation: { type: evaluationSchema, default: () => ({}) },
    submittedAt: { type: Date, default: Date.now },
    analytics: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
    },
}, {
    timestamps: true,
})

const challengeSchema = new mongoose.Schema({
    theme: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    submissions: [submissionSchema],
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    prize: {
        label: { type: String, default: '500 кредитов + фичеринг' },
        credits: { type: Number, default: 500 },
        featureSpot: { type: Boolean, default: true },
    },
    status: {
        type: String,
        enum: ['upcoming', 'active', 'voting', 'finished'],
        default: 'upcoming',
    },
    caseStudy: { type: String, default: '' },
}, {
    timestamps: true,
})

challengeSchema.index({ status: 1, endDate: -1 })
challengeSchema.index({ startDate: -1 })

export const Challenge = mongoose.model('Challenge', challengeSchema)
export default Challenge
