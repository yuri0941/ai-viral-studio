import mongoose from 'mongoose'

const crisisEventSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectWorkspace',
        default: null,
    },
    type: {
        type: String,
        enum: ['hate_wave', 'misinformation', 'competitor_attack', 'viral_negative', 'other'],
        default: 'other',
    },
    platform: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['active', 'attention', 'resolved', 'rejected'],
        default: 'attention',
    },
    negativeComments: {
        type: Number,
        default: 0,
    },
    totalComments: {
        type: Number,
        default: 0,
    },
    averageSentiment: {
        type: Number,
        default: 0,
    },
    detectedAt: {
        type: Date,
        default: Date.now,
    },
    resolvedAt: {
        type: Date,
        default: null,
    },
    suggestedResponse: {
        type: String,
        default: '',
    },
    finalResponse: {
        type: String,
        default: '',
    },
    autoActions: {
        type: [String],
        default: [],
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
})

crisisEventSchema.index({ ownerId: 1, status: 1, createdAt: -1 })
crisisEventSchema.index({ detectedAt: -1 })

export const CrisisEvent = mongoose.model('CrisisEvent', crisisEventSchema)
export default CrisisEvent
