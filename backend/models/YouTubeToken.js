import mongoose from 'mongoose'
import crypto from 'crypto'

// [v9.9.19.17.4] per-user YouTube OAuth tokens with AES-256-GCM encryption at rest.
// Key: TOKEN_ENCRYPTION_KEY (32+ bytes). Fallback to JWT_SECRET for dev bootstrap only.
const ALGO = 'aes-256-gcm'
const rawKey = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-insecure-key'
const KEY = crypto.createHash('sha256').update(String(rawKey)).digest()

function encrypt(text) {
  if (!text) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

function decrypt(payload) {
  if (!payload) return ''
  try {
    const [ivB64, tagB64, dataB64] = String(payload).split(':')
    if (!ivB64 || !tagB64 || !dataB64) return ''
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
    return decrypted.toString('utf8')
  } catch (err) {
    console.warn('[YouTubeToken] decrypt failed:', err.message)
    return ''
  }
}

const youtubeTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    scope: { type: [String], default: [] },
    channelId: { type: String, default: '' },
    channelTitle: { type: String, default: '' },
    expiresAt: Date,
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

youtubeTokenSchema.statics.setTokens = async function (userId, data = {}) {
  const update = {
    userId,
    accessToken: data.accessToken ? encrypt(data.accessToken) : '',
    refreshToken: data.refreshToken ? encrypt(data.refreshToken) : '',
    scope: Array.isArray(data.scope) ? data.scope : [],
    channelId: data.channelId || '',
    channelTitle: data.channelTitle || '',
    expiresAt: data.expiresAt || null,
    connectedAt: data.connectedAt || new Date(),
  }
  return this.findOneAndUpdate({ userId }, { $set: update }, { upsert: true, new: true, setDefaultsOnInsert: true })
}

youtubeTokenSchema.statics.getTokens = async function (userId) {
  const doc = await this.findOne({ userId }).select('+accessToken +refreshToken').lean()
  if (!doc) return null
  return {
    userId: doc.userId,
    accessToken: decrypt(doc.accessToken),
    refreshToken: decrypt(doc.refreshToken),
    scope: doc.scope || [],
    channelId: doc.channelId || '',
    channelTitle: doc.channelTitle || '',
    connectedAt: doc.connectedAt || null,
    expiresAt: doc.expiresAt || null,
  }
}

youtubeTokenSchema.statics.deleteForUser = async function (userId) {
  return this.deleteOne({ userId })
}

const YouTubeToken = mongoose.model('YouTubeToken', youtubeTokenSchema)
export default YouTubeToken
