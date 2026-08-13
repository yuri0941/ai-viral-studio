import mongoose from 'mongoose'

// [19.17.7-SCHEDULER-UX] publish audit log: capped to the last 500 events per user.
// Written BEFORE a scheduled post is deleted so metrics/history survive cleanup.
const publishLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduledPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledPost', default: null },
  platform: { type: String, default: '' },
  type: { type: String, default: '' },
  title: { type: String, default: '' },
  videoId: { type: String, default: '' },
  url: { type: String, default: '' },
  status: { type: String, enum: ['published', 'failed'], required: true },
  errorMessage: { type: String, default: '' },
  publishedAt: { type: Date, default: Date.now },
}, { timestamps: true })

publishLogSchema.index({ userId: 1, createdAt: -1 })

// Keep only the latest 500 records per user (soft cap via pre-save hook)
publishLogSchema.pre('save', async function (next) {
  try {
    const userId = this.userId
    const oldest = await PublishLog.find({ userId })
      .sort({ createdAt: -1 })
      .skip(500)
      .select('_id')
      .limit(1000)
      .lean()
    if (oldest.length) {
      const ids = oldest.map(d => d._id)
      await PublishLog.deleteMany({ _id: { $in: ids } })
    }
  } catch (e) {
    // log-cleanup failure must not break publishing
    console.warn('[PublishLog] cap cleanup failed:', e.message)
  }
  next()
})

const PublishLog = mongoose.model('PublishLog', publishLogSchema)
export default PublishLog
