import mongoose from 'mongoose'

const omegaSkillSchema = new mongoose.Schema({
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
    description: {
        type: String,
        default: '',
    },
    category: {
        type: String,
        enum: ['finance', 'security', 'content', 'support', 'marketing', 'dev', 'analytics', 'product'],
        default: 'analytics',
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    triggers: {
        type: [String],
        default: [],
    },
    enabled: {
        type: Boolean,
        default: true,
    },
    level: {
        type: Number,
        default: 1,
        min: 1,
    },
    experience: {
        type: Number,
        default: 0,
        min: 0,
    },
    maxLevel: {
        type: Number,
        default: 10,
    },
    config: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
})

omegaSkillSchema.index({ ownerId: 1, category: 1 })

export const OmegaSkill = mongoose.model('OmegaSkill', omegaSkillSchema)
export default OmegaSkill
