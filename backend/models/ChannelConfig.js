import mongoose from 'mongoose';
import { CHANNEL_USERNAME } from '../config/bots.js';

const ChannelConfigSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  channelUsername: { type: String, default: () => `@${CHANNEL_USERNAME}` },
  channelId: { type: String, sparse: true },
  niche: { type: String, default: 'general' },
  language: { type: String, default: 'ru' },
  postingSchedule: {
    timezone: { type: String, default: 'Europe/Moscow' },
    days: [{ type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }],
    times: [{ type: String }]
  },
  contentMix: {
    educational: { type: Number, default: 40 },
    entertaining: { type: Number, default: 30 },
    promotional: { type: Number, default: 20 },
    engagement: { type: Number, default: 10 }
  },
  tone: { type: String, default: 'professional' },
  autoImage: { type: Boolean, default: true },
  brandSignature: { type: String, default: '\n\n— AI Viral Studio | OMEGA 🤖\n🚀 aiviral-studio.ru' },
  lastPostAt: { type: Date },
  nextPostAt: { type: Date },
  postsHistory: [
    {
      messageId: String,
      title: String,
      type: String,
      views: { type: Number, default: 0 },
      date: { type: Date, default: Date.now },
      imageUrl: String
    }
  ],
  stats: {
    subscribers: { type: Number, default: 0 },
    avgReach: { type: Number, default: 0 }
  },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ChannelConfig', ChannelConfigSchema);
