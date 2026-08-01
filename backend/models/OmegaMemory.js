import mongoose from 'mongoose'

const memoryEntrySchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ['short_term', 'working', 'long_term', 'semantic', 'procedural', 'episodic', 'owner_profile', 'emotional'],
        required: true,
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    weight: {
        type: Number,
        default: 1,
    },
    accessCount: {
        type: Number,
        default: 0,
    },
    lastAccessedAt: {
        type: Date,
    },
    expiresAt: {
        type: Date,
    },
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})

const omegaMemorySchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    entries: {
        type: [memoryEntrySchema],
        default: [],
    },
    personalityProfile: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    trustLevel: {
        type: Number,
        default: 0.5,
        min: 0,
        max: 1,
    },
}, {
    timestamps: true,
})

omegaMemorySchema.index({ ownerId: 1, 'entries.level': 1 })
omegaMemorySchema.index({ ownerId: 1 }, { unique: true })

export const OmegaMemory = mongoose.model('OmegaMemory', omegaMemorySchema)
export default OmegaMemory
