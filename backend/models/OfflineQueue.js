import mongoose from 'mongoose'

const offlineQueueSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    action: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    endpoint: { type: String, default: '' },
    method: { type: String, default: 'POST' },
    status: {
        type: String,
        enum: ['pending', 'synced', 'failed'],
        default: 'pending',
        index: true,
    },
    retryCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
})

export const OfflineQueue = mongoose.models.OfflineQueue || mongoose.model('OfflineQueue', offlineQueueSchema)
export default OfflineQueue
