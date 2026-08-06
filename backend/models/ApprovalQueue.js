import mongoose from 'mongoose'

const approvalQueueSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['code_change', 'post', 'campaign', 'budget', 'feature', 'api_key'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  proposedBy: {
    type: String,
    default: 'OMEGA',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  },
  resolutionNote: {
    type: String,
  },
})

approvalQueueSchema.index({ status: 1, createdAt: -1 })
approvalQueueSchema.index({ ownerId: 1, status: 1 })

const ApprovalQueue = mongoose.model('ApprovalQueue', approvalQueueSchema)
export default ApprovalQueue
