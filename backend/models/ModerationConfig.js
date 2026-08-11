import mongoose from 'mongoose';

// [v9.9.19.2-v4-CHANNEL-AUTO] Настройки модерации канала — редактируются владельцем через owner-бот /moderation
const ModerationConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  bannedWords: { type: [String], default: ['спам', 'казино', 'ставки'] },
  banThreshold: { type: Number, default: 3 },
  muteDurationHours: { type: Number, default: 24 },
}, { timestamps: true });

export default mongoose.model('ModerationConfig', ModerationConfigSchema);
