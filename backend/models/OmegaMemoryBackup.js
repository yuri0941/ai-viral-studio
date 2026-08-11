import mongoose from 'mongoose';

// [v9.9.19.14] Snapshot всех 12 слоёв памяти (раз в 6 часов из anti-fail cron).
// Если основная коллекция пуста/повреждена — восстановление отсюда + алерт владельцу.
const OmegaMemoryBackupSchema = new mongoose.Schema({
  takenAt: { type: Date, default: Date.now, index: true },
  layers: { type: mongoose.Schema.Types.Mixed, default: {} },
  checksum: { type: String, default: '' },
});

export default mongoose.model('OmegaMemoryBackup', OmegaMemoryBackupSchema);
