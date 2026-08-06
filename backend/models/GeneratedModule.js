import mongoose from 'mongoose'

const generatedModuleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Frontend', 'Backend', 'Fullstack'], required: true },
    spec: { type: mongoose.Schema.Types.Mixed, default: {} },
    frontendCode: { type: String, default: '' },
    backendCode: { type: String, default: '' },
    testCode: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'approved', 'deployed'], default: 'draft' },
    createdBy: { type: String, default: 'OMEGA' },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
})

generatedModuleSchema.index({ status: 1, createdAt: -1 })
generatedModuleSchema.index({ createdById: 1 })

export const GeneratedModule = mongoose.model('GeneratedModule', generatedModuleSchema)
export default GeneratedModule
