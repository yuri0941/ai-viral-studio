import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    type: {
        type: String,
        enum: ['system', 'finance', 'campaign', 'ai', 'approval', 'chat', 'security'],
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    body: {
        type: String,
        required: true,
    },
    channel: {
        type: String,
        enum: ['in-app', 'email', 'push', 'telegram'],
        default: 'in-app',
    },
    read: {
        type: Boolean,
        default: false,
    },
    readAt: {
        type: Date,
    },
    link: {
        type: String,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
})

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })
notificationSchema.index({ ownerId: 1, type: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
export default Notification
