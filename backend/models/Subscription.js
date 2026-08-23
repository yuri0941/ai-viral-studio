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
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'refunded', 'pending', 'inactive', 'expired'],
    default: 'active'
  },
  provider: { type: String, enum: ['yookassa', 'stripe', 'paypal', 'crypto', 'manual', 'sberpay', 'tinkoff'] },
  providerSubscriptionId: { type: String, index: true },
  // [SUBSCRIPTION-CHECKOUT-FIX] providerPaymentId пишется yookassaController, но отсутствовал в схеме
  providerPaymentId: { type: String, index: true },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  // [SUBSCRIPTION-CHECKOUT-FIX] поля, которые пишутся контроллерами, но отсутствовали в strict-схеме
  price: Number,
  interval: { type: String, enum: ['month', 'year'], default: 'month' },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  autoRenew: { type: Boolean, default: true },
  paymentMethod: { type: String, default: 'card' },
  isTrial: { type: Boolean, default: false },
  trialEndsAt: Date,
  reminderSent: { type: Boolean, default: false },
  urgentReminderSent: { type: Boolean, default: false },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  amount: Number,
  currency: { type: String, default: 'RUB' },
  paymentHistory: [PaymentHistorySchema],
  metadata: mongoose.Schema.Types.Mixed,
  // [PLANCONFIG-ADMIN] grandfathering: условия тарифа на момент покупки (цена/квоты/фичи)
  planSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
SubscriptionSchema.index({ status: 1, endDate: 1 });

SubscriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Subscription', SubscriptionSchema);
