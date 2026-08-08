import mongoose from 'mongoose';

const DiscountPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  discountPercent: { type: Number, default: 20 },
  oldPrice: Number,
  newPrice: Number,
  planId: { type: String, enum: ['free', 'pro', 'agency'], default: 'pro' },
  promoCode: { type: String, unique: true },
  validUntil: { type: Date, required: true },
  usageLimit: { type: Number, default: 100 },
  usageCount: { type: Number, default: 0 },
  channelPostId: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, default: 'OMEGA_AUTO' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('DiscountPost', DiscountPostSchema);
