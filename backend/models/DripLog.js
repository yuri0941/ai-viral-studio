import mongoose from 'mongoose';

const dripLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  step: { type: Number, required: true },
  type: { type: String, required: true },
  name: { type: String, default: '' },
  message: { type: String, default: '' },
  scheduledAt: { type: Date, default: Date.now },
  sentAt: Date,
  sent: { type: Boolean, default: false },
  opened: { type: Boolean, default: false },
  openedAt: Date,
  converted: { type: Boolean, default: false },
  convertedAt: Date
}, { timestamps: true });

dripLogSchema.index({ userId: 1, step: 1 }, { unique: true });

export default mongoose.model('DripLog', dripLogSchema);
