import mongoose from 'mongoose'

// [19.17.9-DIRECT-UPLOAD] resumable YouTube upload sessions (browser → Google direct).
// The file itself never passes through the backend; we only store the resumable
// upload URL + metadata so the upload can resume after a network break / page reload.
// Resumable session URIs live ~1 week on Google's side.
const uploadSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    uploadUrl: { type: String, required: true },
    videoMeta: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      tags: { type: [String], default: [] },
      categoryId: { type: String, default: '22' },
      privacyStatus: { type: String, default: 'private' },
      madeForKids: { type: Boolean, default: false },
      publishAt: { type: String, default: '' },
      playlistId: { type: String, default: '' },
      language: { type: String, default: '' },
    },
    fileSize: { type: Number, required: true },
    fileName: { type: String, default: '' },
    // SHA-256 (first 1MB + last 1MB) — duplicate detection on the client side
    fileHash: { type: String, default: '', index: true },
    bytesUploaded: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'failed', 'expired'], default: 'active', index: true },
    videoId: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

// Keep history ~30 days for duplicate detection (last uploads per user), then auto-clean
uploadSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

const UploadSession = mongoose.model('UploadSession', uploadSessionSchema)
export default UploadSession
