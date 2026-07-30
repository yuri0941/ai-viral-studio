import mongoose from 'mongoose'

const aiAgentSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'error', 'learning'],
        default: 'active',
    },
    icon: {
        type: String,
        default: 'Bot',
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    skills: {
        type: [String],
        default: [],
    },
    lastActiveAt: {
        type: Date,
        default: Date.now,
    },
    errorCount: {
        type: Number,
        default: 0,
    },
    metrics: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
})

aiAgentSchema.index({ ownerId: 1, status: 1 })

export const AIAgent = mongoose.model('AIAgent', aiAgentSchema)
export default AIAgent
