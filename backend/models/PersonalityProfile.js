import { Schema, model } from 'mongoose';

const personalityProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  tone: { type: String, default: 'casual' },
  phrases: [{ type: String }],
  humor: { type: String, default: 'playful' },
  emojiPattern: { type: String, default: 'moderate' },
  sentenceLength: { type: String, default: 'medium' },
  greeting: { type: String, default: 'Hey' },
  farewell: { type: String, default: 'Cheers' },
  decisionStyle: { type: String, default: 'balanced' },
  voiceCloneId: { type: String },
  isActive: { type: Boolean, default: false },
  sampleMessages: [{ type: String }],
  lastAnalyzed: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export default model('PersonalityProfile', personalityProfileSchema);
