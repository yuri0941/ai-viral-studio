import mongoose from 'mongoose'

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
    },
    views: {
        type: Number,
        default: 0,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    tags: {
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

newsSchema.index({ ownerId: 1, status: 1, createdAt: -1 })

export const News = mongoose.model('News', newsSchema)
export default News
