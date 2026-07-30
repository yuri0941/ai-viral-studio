import mongoose from 'mongoose'

const bannerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        index: true,
    },
    url: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['draft', 'pending_review', 'approved', 'rejected', 'active', 'archived'],
        default: 'draft',
    },
    version: {
        type: Number,
        default: 1,
    },
    history: {
        type: [{
            version: Number,
            url: String,
            updatedAt: Date,
            updatedBy: mongoose.Schema.Types.ObjectId,
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

bannerSchema.index({ ownerId: 1, status: 1 })
bannerSchema.index({ campaignId: 1, createdAt: -1 })

export const Banner = mongoose.model('Banner', bannerSchema)
export default Banner
