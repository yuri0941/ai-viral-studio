import mongoose from 'mongoose'

const researchLogSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['trend', 'competitor', 'tech', 'niche', 'general'],
        required: true,
    },
    topic: { type: String, required: true },
    summary: { type: String, default: '' },
    sources: {
        type: [{
            title: { type: String, default: '' },
            url: { type: String, default: '' },
            confidence: { type: Number, min: 0, max: 1, default: 0.5 },
        }],
        default: [],
    },
    ideas: { type: [String], default: [] },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    addedToGraph: { type: Boolean, default: false },
}, {
    timestamps: true,
})

researchLogSchema.index({ type: 1, createdAt: -1 })
researchLogSchema.index({ topic: 'text', summary: 'text' })

export const ResearchLog = mongoose.model('ResearchLog', researchLogSchema)
export default ResearchLog
