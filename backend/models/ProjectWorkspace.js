import mongoose from 'mongoose'

const projectWorkspaceSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    niche: {
        type: String,
        default: '',
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    brandVoice: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    connectedAccounts: {
        type: [String],
        default: [],
    },
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    team: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'editor' },
    }],
    isDefault: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
})

projectWorkspaceSchema.index({ ownerId: 1, isDefault: 1 })
projectWorkspaceSchema.index({ ownerId: 1, name: 1 })

export const ProjectWorkspace = mongoose.model('ProjectWorkspace', projectWorkspaceSchema)
export default ProjectWorkspace
