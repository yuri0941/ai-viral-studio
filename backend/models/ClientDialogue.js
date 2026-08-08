import mongoose from 'mongoose';

const ClientDialogueSchema = new mongoose.Schema({
  telegramChatId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    intent: { type: String, enum: ['greeting', 'pricing', 'support', 'sales', 'content', 'churn', 'other'], default: 'other' },
    timestamp: { type: Date, default: Date.now }
  }],
  outcome: { type: String, enum: ['pending', 'converted', 'escalated', 'churn_risk', 'resolved'], default: 'pending' },
  clientTone: { type: String, enum: ['formal', 'casual', 'ironic', 'technical', 'emotional'], default: 'casual' },
  niche: { type: String, default: 'general' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ClientDialogueSchema.index({ telegramChatId: 1, updatedAt: -1 });
ClientDialogueSchema.index({ outcome: 1, intent: 1 });

export default mongoose.model('ClientDialogue', ClientDialogueSchema);
