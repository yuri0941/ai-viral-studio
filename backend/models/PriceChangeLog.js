import mongoose from 'mongoose'

// [25-TARIFF-GATES] immutable log of every price change
const priceChangeLogSchema = new mongoose.Schema(
  {
    what: { type: String, required: true }, // tariff.pro | ad.channel.cpm | ad.app.banner
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    currency: { type: String, default: 'RUB' },
    source: { type: String, enum: ['cabinet', 'telegram'], required: true },
    analysisSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    reason: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

priceChangeLogSchema.index({ what: 1, createdAt: -1 })
priceChangeLogSchema.index({ changedBy: 1, createdAt: -1 })

const PriceChangeLog = mongoose.models.PriceChangeLog || mongoose.model('PriceChangeLog', priceChangeLogSchema)
export default PriceChangeLog
