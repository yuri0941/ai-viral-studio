import mongoose from 'mongoose'

const roadmapItemSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    phase: { type: String, enum: ['planned', 'in_progress', 'testing', 'released', 'cancelled'], default: 'planned' },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    eta: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    dependencies: { type: [String], default: [] },
    risks: { type: [String], default: [] },
    mitigation: { type: [String], default: [] },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    createdBy: { type: String, enum: ['OMEGA', 'owner'], default: 'owner' },
    approved: { type: Boolean, default: false },
    month: { type: Number, min: 1, max: 12, default: 1 },
}, {
    timestamps: true,
})

roadmapItemSchema.index({ month: 1, phase: 1 })
roadmapItemSchema.index({ priority: 1, eta: 1 })

const RoadmapItem = mongoose.models.RoadmapItem || mongoose.model('RoadmapItem', roadmapItemSchema)
export default RoadmapItem
