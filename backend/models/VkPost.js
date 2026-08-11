import mongoose from 'mongoose'

const vkPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  postId: { type: String, required: true },
  ownerId: { type: String, required: true },
  text: { type: String, default: '' },
  link: { type: String, default: '' },
  publishedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['published', 'failed'], default: 'published' },
  errorMessage: { type: String, default: '' },
  vkResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
})

vkPostSchema.index({ userId: 1, postId: 1 }, { unique: true })

export default mongoose.model('VkPost', vkPostSchema)
