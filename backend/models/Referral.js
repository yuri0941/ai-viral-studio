import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, unique: true },
  code: { type: String, required: true, unique: true, index: true },
  clicks: { type: Number, default: 0 },
  signups: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  referrals: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('Referral', referralSchema);
