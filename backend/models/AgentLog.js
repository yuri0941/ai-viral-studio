import mongoose from 'mongoose'

const agentLogSchema = new mongoose.Schema({
    agentId: { type: String, required: true, index: true },
    role: { type: String, enum: ['researcher', 'coder', 'designer', 'tester', 'marketer', 'analyst'], required: true },
    task: { type: String, default: '' },
    message: { type: String, required: true },
    level: { type: String, enum: ['info', 'warning', 'error', 'success'], default: 'info' },
}, {
    timestamps: true,
})

agentLogSchema.index({ agentId: 1, createdAt: -1 })

export const AgentLog = mongoose.model('AgentLog', agentLogSchema)
export default AgentLog
