import mongoose from 'mongoose';

// [v9.9.19.2-v4-CHANNEL-AUTO] Состояние автономного ведения канала (singleton):
// слоты автопостов, ротация рубрик, активное голосование, счётчик подписчиков
const ChannelStateSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  lastAutoPostSlot: { type: String, default: '' },
  lastAutoPostAt: { type: Date, default: null },
  lastManualPostAt: { type: Date, default: null },
  rubricHistory: [{ rubric: String, date: String }],
  lastPollDate: { type: String, default: '' },
  activePoll: {
    messageId: { type: Number, default: null },
    options: { type: [String], default: [] },
    createdAt: { type: Date, default: null },
    done: { type: Boolean, default: false },
  },
  lastPollWinner: {
    topic: { type: String, default: '' },
    votes: { type: Number, default: 0 },
    date: { type: String, default: '' },
  },
  lastSubscribers: { type: Number, default: 0 },
  lastSubsDate: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('ChannelState', ChannelStateSchema);
