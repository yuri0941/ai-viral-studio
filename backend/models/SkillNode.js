import mongoose from 'mongoose';

// [v9.9.19.6] Реально изученный навык OMEGA: конспект фактов + счётчик применений.
// Используется OmegaSkillsTab, postBuilder (подмешивание фактов), Dream Mode (ночное обучение).
const SkillNodeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameKey: { type: String, required: true, unique: true, index: true }, // lowercase для дедупликации
  summary: { type: String, default: '' },
  facts: [{ type: String }],
  source: { type: String, default: 'ai' }, // serpapi | duckduckgo | ai | dream_mode
  learnedAt: { type: Date, default: Date.now },
  appliedCount: { type: Number, default: 0 },
  lastAppliedAt: { type: Date, default: null },
}, { timestamps: true });

SkillNodeSchema.index({ learnedAt: -1 });

export default mongoose.model('SkillNode', SkillNodeSchema);
