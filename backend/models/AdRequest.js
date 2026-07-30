import mongoose from 'mongoose'

const adRequestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    clientName: {
        type: String,
        required: true,
        trim: true,
    },
    clientEmail: {
        type: String,
        trim: true,
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    budget: {
        type: Number,
        default: 0,
    },
    platform: {
        type: String,
        trim: true,
    },
    targetAudience: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['new', 'in_review', 'approved', 'in_progress', 'completed', 'rejected'],
        default: 'new',
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    files: {
        type: [{
            url: String,
            name: String,
            type: String,
        }],
        default: [],
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
})

adRequestSchema.index({ ownerId: 1, status: 1 })
adRequestSchema.index({ clientId: 1, createdAt: -1 })

export const AdRequest = mongoose.model('AdRequest', adRequestSchema)
export default AdRequest
