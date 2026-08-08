import mongoose from 'mongoose';

const AdOrderSchema = new mongoose.Schema({
  clientTelegramId: { type: String, required: true },
  clientUsername: String,
  clientName: String,
  channelUsername: { type: String, default: '@aiviralstudio' },
  niche: String,
  slotType: { type: String, enum: ['1/24', '1/48', 'forever', 'story', 'native'], default: '1/24' },
  price: { type: Number, required: true },
  currency: { type: String, default: 'RUB' },
  content: {
    text: String,
    link: String,
    mediaUrl: String,
    desiredTime: Date
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'approved', 'rejected', 'published', 'completed', 'refunded'],
    default: 'pending'
  },
  payment: {
    provider: String,
    paymentId: String,
    paidAt: Date,
    amount: Number
  },
  ownerDecision: {
    approved: Boolean,
    reason: String,
    decidedAt: Date
  },
  publishedPostId: String,
  stats: {
    views: Number,
    clicks: Number,
    ctr: Number
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('AdOrder', AdOrderSchema);
