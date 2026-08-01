import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'creator', 'pro', 'agency', 'enterprise'],
    default: 'free',
  },
  status: {
    type: String,
    enum: ['active', 'trialing', 'past_due', 'canceled', 'paused', 'inactive'],
    default: 'active',
  },
  price: {
    type: Number,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    enum: ['RUB'],
    default: 'RUB',
  },
  interval: {
    type: String,
    enum: ['month', 'year'],
    default: 'month',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  trialEndsAt: {
    type: Date,
  },
  autoRenew: {
    type: Boolean,
    default: true,
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'crypto', 'paypal', 'invoice', 'manual', 'none'],
    default: 'none',
  },
  provider: {
    type: String,
    enum: ['yookassa', 'stripe', 'cryptomus', 'internal', 'none'],
    default: 'none',
  },
  providerPaymentId: {
    type: String,
  },
  isTrial: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Index for fast lookup of active subscriptions
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
