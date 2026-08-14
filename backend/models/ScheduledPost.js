import mongoose from 'mongoose'

const scheduledPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  platforms: [{ type: String, enum: ['telegram', 'vk', 'linkedin', 'pinterest', 'facebook', 'instagram', 'tiktok', 'youtube', 'discord'] }],
  types: [{ type: String, enum: ['video', 'short', 'reels', 'post', 'story', 'carousel'] }],
  mediaUrl: { type: String, default: '' },
  mediaName: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video', ''], default: '' },
  hashtags: { type: String, default: '' },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'paused', 'publishing', 'published', 'failed', 'skipped', 'error'], default: 'scheduled' },
  hidden: { type: Boolean, default: false },
  pausedAt: { type: Date },
  autoDeleteAt: { type: Date },
  fileExpiresAt: { type: Date },
  publishedUrl: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  autoPilotEnabled: { type: Boolean, default: false },
  // [SOCIAL-v5.1] added publishing metadata
  publishResults: [{ platform: String, status: String, result: Object, error: String }],
  publishedAt: { type: Date },
  retriedAt: { type: Date },
  // [FIX-BUFFER] потолок ретраев: максимум 3 неудачи подряд → стоп + одно уведомление владельцу
  failCount: { type: Number, default: 0 },
  failAlertedAt: { type: Date },
  // [19.17.5-UPLOAD-SCHEDULER] YouTube scheduled upload fields
  youtubeTitle: { type: String, default: '' },
  youtubeDescription: { type: String, default: '' },
  youtubeTags: { type: String, default: '' },
  youtubePrivacyStatus: { type: String, enum: ['private', 'unlisted', ''], default: '' },
  youtubeVideoId: { type: String, default: '' },
  youtubeVideoUrl: { type: String, default: '' },
  youtubeVideoPath: { type: String, default: '' },
  youtubeThumbnailPath: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

scheduledPostSchema.index({ scheduledAt: 1, status: 1 })
scheduledPostSchema.index({ userId: 1, status: 1 })
scheduledPostSchema.index({ createdAt: -1 })
scheduledPostSchema.index({ title: 'text', content: 'text' })

export default mongoose.model('ScheduledPost', scheduledPostSchema)
