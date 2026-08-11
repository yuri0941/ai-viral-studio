import mongoose from 'mongoose';

// [v9.9.19.2-v4-CHANNEL-AUTO] Ежедневная статистика канала (для Daily Report)
const ChannelStatsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD (MSK)
  subscribers: { type: Number, default: 0 },
  delta: { type: Number, default: 0 },
  violations: { type: Number, default: 0 },
  bans: { type: Number, default: 0 },
  pollWinner: {
    topic: { type: String, default: '' },
    votes: { type: Number, default: 0 },
  },
}, { timestamps: true });

export default mongoose.model('ChannelStats', ChannelStatsSchema);
