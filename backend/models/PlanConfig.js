import mongoose from 'mongoose'

// [25-TARIFF-GATES] Tariff matrix stored in DB, hot-editable by owner without deploy
const planConfigSchema = new mongoose.Schema(
  {
    plan: { type: String, enum: ['free', 'pro', 'agency'], required: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'RUB' },
    quotas: {
      generationsPerDay: { type: Number, default: 0 },
      youtubeUploadsPerDay: { type: Number, default: 0 },
      youtubeChannels: { type: Number, default: 0 },
      mediaQueueMB: { type: Number, default: 0 },
      scheduledPostsMax: { type: Number, default: 0 }, // 0 = unlimited
      aiTagsPerDay: { type: Number, default: 0 },
    },
    features: {
      publishAt: { type: Boolean, default: false },
      playlists: { type: Boolean, default: false },
      brandVoice: { type: Boolean, default: false },
      abTesting: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
)

const SEED = [
  {
    plan: 'free',
    price: 0,
    quotas: { generationsPerDay: 20, youtubeUploadsPerDay: 2, youtubeChannels: 1, mediaQueueMB: 500, scheduledPostsMax: 10, aiTagsPerDay: 5 },
    features: { publishAt: false, playlists: false, brandVoice: false, abTesting: false, analytics: false, whiteLabel: false },
  },
  {
    plan: 'pro',
    price: 990,
    quotas: { generationsPerDay: 200, youtubeUploadsPerDay: 5, youtubeChannels: 3, mediaQueueMB: 5120, scheduledPostsMax: 100, aiTagsPerDay: 50 },
    features: { publishAt: true, playlists: true, brandVoice: true, abTesting: true, analytics: true, whiteLabel: false },
  },
  {
    plan: 'agency',
    price: 4990,
    quotas: { generationsPerDay: 1000, youtubeUploadsPerDay: 10, youtubeChannels: 10, mediaQueueMB: 25600, scheduledPostsMax: 0, aiTagsPerDay: 200 },
    features: { publishAt: true, playlists: true, brandVoice: true, abTesting: true, analytics: true, whiteLabel: true },
  },
]

planConfigSchema.statics.seedIfEmpty = async function () {
  const count = await this.countDocuments()
  if (count === 0) {
    await this.insertMany(SEED)
    console.log('[PlanConfig] seeded default plans')
  }
}

planConfigSchema.statics.getPlan = async function (planId) {
  await this.seedIfEmpty()
  const doc = await this.findOne({ plan: planId }).lean()
  return doc || SEED.find(s => s.plan === planId) || SEED[0]
}

planConfigSchema.statics.getAll = async function () {
  await this.seedIfEmpty()
  return this.find({}).sort({ price: 1 }).lean()
}

const PlanConfig = mongoose.models.PlanConfig || mongoose.model('PlanConfig', planConfigSchema)
export default PlanConfig
