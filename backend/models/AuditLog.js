import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        trim: true,
    },
    user: {
        type: String,
        required: true,
        trim: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    type: {
        type: String,
        enum: ['system', 'staff', 'finance', 'security', 'config', 'content', 'api', 'owner'],
        default: 'system',
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    processed: {
        type: Boolean,
        default: false,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: { createdAt: 'timestamp', updatedAt: false },
})

auditLogSchema.index({ ownerId: 1, timestamp: -1 })
auditLogSchema.index({ type: 1, severity: 1 })

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
export default AuditLog
