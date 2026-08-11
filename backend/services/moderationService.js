// [v9.9.19.2-v4-CHANNEL-AUTO] Модерация канала: запрещённые слова (включая обходы через цифры/символы),
// лесенка санкций warn → warn → ban (mute на muteDurationHours), журнал в MongoDB.
import ModerationConfig from '../models/ModerationConfig.js';
import ModerationLog from '../models/ModerationLog.js';

export async function getModerationConfig() {
  return ModerationConfig.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function addBannedWord(word) {
  const w = String(word || '').trim().toLowerCase();
  if (!w) return getModerationConfig();
  return ModerationConfig.findOneAndUpdate(
    { key: 'main' },
    { $addToSet: { bannedWords: w } },
    { upsert: true, new: true }
  );
}

export async function removeBannedWord(word) {
  const w = String(word || '').trim().toLowerCase();
  return ModerationConfig.findOneAndUpdate(
    { key: 'main' },
    { $pull: { bannedWords: w } },
    { new: true }
  );
}

export async function setBanThreshold(n) {
  const v = Math.max(1, Math.min(10, Number(n) || 3));
  return ModerationConfig.findOneAndUpdate({ key: 'main' }, { banThreshold: v }, { upsert: true, new: true });
}

// Слово → regex, устойчивый к обходам: «спам» ловит «спа*м», «сп4м», «с п а м».
// Разделитель — любые НЕ-буквы (\p{L} с u-флагом: \W без u считает кириллицу не-буквами → ложные срабатывания)
function wordToRegex(word) {
  const body = String(word).trim().split('')
    .map(ch => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^\\p{L}]*');
  return new RegExp(body, 'iu');
}

export function findBannedWord(text, bannedWords = []) {
  const t = String(text || '');
  if (!t) return null;
  for (const w of bannedWords) {
    if (!w) continue;
    try {
      if (wordToRegex(w).test(t)) return w;
    } catch { /* кривое слово — пропускаем */ }
  }
  return null;
}

export async function countUserViolations(userId) {
  return ModerationLog.countDocuments({ userId: String(userId) });
}

// Проверка сообщения. Возвращает { violation, word, action, count, banThreshold, muteDurationHours }
export async function checkMessage({ userId, username = '', chatId = '', text = '' }) {
  const cfg = await getModerationConfig();
  const word = findBannedWord(text, cfg.bannedWords);
  if (!word) return { violation: false };
  const prev = await countUserViolations(userId);
  const count = prev + 1;
  const action = count >= cfg.banThreshold ? 'ban' : 'warn';
  await ModerationLog.create({
    userId: String(userId),
    username: String(username || ''),
    chatId: String(chatId || ''),
    reason: `banned word: ${word}`,
    action,
    messagePreview: String(text).slice(0, 120),
  });
  console.log(`[MODERATION] user=${username || userId} word="${word}" action=${action} (${count}/${cfg.banThreshold})`);
  return { violation: true, word, action, count, banThreshold: cfg.banThreshold, muteDurationHours: cfg.muteDurationHours };
}

export async function getRecentLogs(limit = 20) {
  return ModerationLog.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}

export default { getModerationConfig, addBannedWord, removeBannedWord, setBanThreshold, findBannedWord, checkMessage, getRecentLogs };
