import mongoose from 'mongoose';

// [v9.9.19.2-v4-CHANNEL-AUTO] Журнал модерации: каждое нарушение и санкция
const ModerationLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  username: { type: String, default: '' },
  chatId: { type: String, default: '' },
  reason: { type: String, default: '' },
  action: { type: String, enum: ['warn', 'ban'], default: 'warn' },
  messagePreview: { type: String, default: '' },
}, { timestamps: true });

ModerationLogSchema.index({ createdAt: -1 });

export default mongoose.model('ModerationLog', ModerationLogSchema);
