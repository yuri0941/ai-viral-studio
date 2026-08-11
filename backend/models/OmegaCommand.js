import mongoose from 'mongoose';

// [v9.9.19.6] Журнал команд владельца: каждая команда — запись с верификацией результата.
// Персистентно в MongoDB — переживает рестарт и редеплой Render.
const OmegaCommandSchema = new mongoose.Schema({
  chatId: { type: String, required: true, index: true },
  text: { type: String, required: true },
  intent: { type: String, default: 'unknown' },
  action: { type: String, default: 'unknown' },
  confidence: { type: Number, default: 0 },
  rephrased: { type: String, default: '' },
  status: { type: String, enum: ['queued', 'running', 'done', 'failed'], default: 'queued', index: true },
  result: { type: String, default: '' },
  verification: { type: String, default: '' },
  error: { type: String, default: '' },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
}, { timestamps: true });

OmegaCommandSchema.index({ chatId: 1, createdAt: -1 });

export default mongoose.model('OmegaCommand', OmegaCommandSchema);
