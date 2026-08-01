import mongoose from 'mongoose'

const aiVsHumanRoundSchema = new mongoose.Schema({
    week: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    theme: {
        type: String,
        required: true,
    },
    platform: {
        type: String,
        default: 'tiktok',
    },
    aiPost: {
        type: String,
        default: '',
    },
    humanPost: {
        type: String,
        default: '',
    },
    aiVotes: {
        type: Number,
        default: 0,
    },
    humanVotes: {
        type: Number,
        default: 0,
    },
    voters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    status: {
        type: String,
        enum: ['active', 'revealed', 'archived'],
        default: 'active',
    },
    winner: {
        type: String,
        enum: ['ai', 'human', 'tie'],
        default: null,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    endedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
})

aiVsHumanRoundSchema.index({ status: 1, startedAt: -1 })

export const AiVsHumanRound = mongoose.models.AiVsHumanRound || mongoose.model('AiVsHumanRound', aiVsHumanRoundSchema)
export default AiVsHumanRound
