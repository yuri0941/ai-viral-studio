import mongoose from 'mongoose'

const negotiationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    from: { type: String, enum: ['owner', 'client', 'staff', 'ai'], required: true },
    time: { type: Date, default: Date.now },
}, { _id: false })

const campaignSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    client: { type: String, required: true, trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    budget: { type: Number, required: true, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    status: {
        type: String,
        enum: ['draft', 'pending_review', 'approved', 'active', 'paused', 'completed', 'cancelled'],
        default: 'draft',
    },
    platform: { type: String, trim: true },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    roi: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    negotiations: { type: [negotiationSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
    timestamps: true,
})

campaignSchema.index({ ownerId: 1, status: 1 })
campaignSchema.index({ clientId: 1, createdAt: -1 })

export const Campaign = mongoose.model('Campaign', campaignSchema)
export default Campaign
