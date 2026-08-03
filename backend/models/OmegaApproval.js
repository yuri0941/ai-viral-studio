import mongoose from 'mongoose';

// [P19] added: MongoDB persistence for OMEGA Coder approval queue
const omegaApprovalSchema = new mongoose.Schema({
  patchId: { type: String, unique: true, required: true },
  filePath: { type: String, required: true },
  description: { type: String, default: '' },
  patch: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'applied', 'rejected'],
    default: 'pending',
  },
  validation: {
    success: Boolean,
    stage: String,
    error: String,
    logs: [String],
    durationMs: Number,
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  submittedAt: { type: Date, default: Date.now },
  appliedAt: Date,
  rejectedAt: Date,
}, {
  timestamps: true,
});

omegaApprovalSchema.index({ status: 1, submittedAt: -1 });

export default mongoose.model('OmegaApproval', omegaApprovalSchema);
