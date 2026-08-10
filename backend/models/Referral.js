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
  }],
  // [v9.9.19-MASTER-AUDIT] поля для referralService (тиры, выплаты)
  referralCode: { type: String, default: '' },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  referralCount: { type: Number, default: 0 },
  paidReferralCount: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 },
  tier: { type: String, default: 'starter' },
  paidMarked: { type: Boolean, default: false }
}, { timestamps: true });

export const Referral = mongoose.model('Referral', referralSchema);
export default Referral;
