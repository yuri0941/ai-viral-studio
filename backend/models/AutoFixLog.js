import mongoose from 'mongoose'

const autoFixLogSchema = new mongoose.Schema({
    errorType: { type: String, required: true },
    errorStack: { type: String, default: '' },
    detectedAt: { type: Date, default: Date.now },
    fixCode: { type: String, default: '' },
    fixExplanation: { type: String, default: '' },
    status: {
        type: String,
        enum: ['detected', 'analyzing', 'proposed', 'approved', 'rejected', 'deployed'],
        default: 'detected',
    },
    module: { type: String, default: '' },
    priority: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'low',
    },
}, {
    timestamps: true,
})

autoFixLogSchema.index({ status: 1, priority: 1 })
autoFixLogSchema.index({ createdAt: -1 })

export const AutoFixLog = mongoose.model('AutoFixLog', autoFixLogSchema)
export default AutoFixLog
