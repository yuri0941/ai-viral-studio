import mongoose from 'mongoose';

const PaymentHistorySchema = new mongoose.Schema({
  amount: Number,
  currency: String,
  status: { type: String, enum: ['paid', 'refunded', 'failed', 'pending'], default: 'paid' },
  providerPaymentId: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, enum: ['free', 'starter', 'creator', 'pro', 'business', 'agency', 'enterprise'], default: 'free' },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'refunded'],
    default: 'active'
  },
  provider: { type: String, enum: ['yookassa', 'stripe', 'paypal', 'crypto', 'manual', 'sberpay', 'tinkoff'] },
  providerSubscriptionId: { type: String, index: true },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },
  amount: Number,
  currency: { type: String, default: 'RUB' },
  paymentHistory: [PaymentHistorySchema],
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
SubscriptionSchema.index({ providerSubscriptionId: 1 });

SubscriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Subscription', SubscriptionSchema);
