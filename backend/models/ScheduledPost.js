import mongoose from 'mongoose'

const scheduledPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  platforms: [{ type: String, enum: ['youtube', 'tiktok', 'instagram', 'twitter', 'telegram', 'vk'] }],
  types: [{ type: String, enum: ['video', 'short', 'reels', 'post', 'story', 'carousel'] }],
  mediaUrl: { type: String, default: '' },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'published', 'failed'], default: 'scheduled' },
  publishedUrl: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  autoPilotEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

scheduledPostSchema.index({ scheduledAt: 1, status: 1 })

export default mongoose.model('ScheduledPost', scheduledPostSchema)
