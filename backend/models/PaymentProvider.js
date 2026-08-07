import mongoose from 'mongoose'

const paymentProviderSchema = new mongoose.Schema({
  name: { type: String, enum: ['yookassa', 'stripe', 'paypal', 'crypto', 'sberpay', 'tinkoff'], required: true, unique: true },
  displayName: String,
  isActive: { type: Boolean, default: false },
  config: {
    publicKey: String,
    secretKey: String,
    shopId: String,
    webhookSecret: String,
  },
  supportedCountries: [String],
  defaultCurrency: { type: String, default: 'RUB' },
  commissionPercent: { type: Number, default: 0 },
  icon: String,
  createdBy: { type: String, default: 'owner' },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('PaymentProvider', paymentProviderSchema)
