import mongoose from 'mongoose'

const paymentProviderSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  yookassaEnabled: { type: Boolean, default: false },
  yookassaShopId: { type: String, default: '' },
  yookassaSecretKey: { type: String, default: '' },
  stripeEnabled: { type: Boolean, default: false },
  stripeSecretKey: { type: String, default: '' },
  stripePublishableKey: { type: String, default: '' },
  stripeWebhookSecret: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
})

export default mongoose.model('PaymentProvider', paymentProviderSchema)
