import mongoose from 'mongoose';

// [v9.9.19.6] Персистентное состояние OMEGA (key-value): метрики Dream Mode,
// счётчики, прогресс обучения. In-memory — только кэш с восстановлением отсюда.
const LearningStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model('LearningState', LearningStateSchema);
