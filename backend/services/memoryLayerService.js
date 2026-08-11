// [v9.9.19.14-MEMORY-GRAPH-PAYMENT-FIX] Центральный сервис 12 слоёв памяти OMEGA.
// WRITE-THROUGH: каждое изменение сразу upsert'ится в MongoDB (не batch, не «потом cron»).
// RAM — только кэш для быстрых чтений; источник истины — коллекция OmegaMemoryLayer.
// Восстановление при старте: restoreMemoryLayers() + backup каждые 6ч (из anti-fail cron).
import crypto from 'crypto';
import OmegaMemoryLayer from '../models/OmegaMemoryLayer.js';
import OmegaMemoryBackup from '../models/OmegaMemoryBackup.js';

// 8 существующих слоёв СОХРАНЕНЫ (названия не меняются) + 4 новых
export const LAYERS = [
  'short_term', 'working', 'long_term', 'semantic',
  'procedural', 'episodic', 'owner_profile', 'emotional',
  'prospective', 'metacognitive', 'social', 'instrumental',
];

export const LAYER_LABELS = {
  short_term: 'Кратковременная',
  working: 'Рабочая',
  long_term: 'Долговременная',
  semantic: 'Семантическая',
  procedural: 'Процедурная',
  episodic: 'Эпизодическая',
  owner_profile: 'Профиль владельца',
  emotional: 'Эмоциональная',
  prospective: 'Проспективная',
  metacognitive: 'Метакогнитивная',
  social: 'Социальная',
  instrumental: 'Инструментальная',
};

// [1.8] TTL только у двух слоёв; остальные бессрочны и НЕ обрезаются по количеству
const LAYER_TTL_MS = {
  short_term: 7 * 24 * 3600 * 1000,   // 7 дней
  episodic: 90 * 24 * 3600 * 1000,    // 90 дней
};

const state = new Map(); // layer -> entries[] (RAM-кэш)
const dirtyLayers = new Set(); // слои, не записавшиеся в БД (для saveAllLayers)

// [v9.9.19.14.2] однострочный лог ошибки: CastError дампит весь массив в message (~900 строк) — режем
function logMemoryError(prefix, err, extra = '') {
  const kind = err?.name === 'CastError' ? 'CastError' : 'Error';
  const msg = String(err?.message || err).replace(/\s+/g, ' ').slice(0, 200);
  console.warn(`${prefix} [${kind}]${extra} ${msg}`);
}

// [v9.9.19.14.2] 3.1 защита типов: entries — ВСЕГДА массив plain-объектов.
// Строка (сериализованный массив из повреждённого документа) → JSON.parse или []; не-объекты отбрасываются.
function normalizeEntries(raw, layer = '?') {
  let arr = raw;
  if (typeof arr === 'string') {
    try {
      const parsed = JSON.parse(arr);
      arr = Array.isArray(parsed) ? parsed : [];
      console.warn(`[Memory] layer=${layer} entries был строкой — восстановлено из JSON (${arr.length})`);
    } catch {
      console.warn(`[Memory] layer=${layer} entries повреждены (непарсируемая строка ${arr.length} chars) — слой начат с []`);
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(e => e && typeof e === 'object' && !Array.isArray(e))
    .map(e => {
      const plain = JSON.parse(JSON.stringify(e));
      return {
        id: String(plain.id || `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`),
        type: String(plain.type || 'fact'),
        content: plain.content ?? '',
        tags: Array.isArray(plain.tags) ? plain.tags.map(String).slice(0, 10) : [],
        createdAt: plain.createdAt ? new Date(plain.createdAt) : new Date(),
        updatedAt: plain.updatedAt ? new Date(plain.updatedAt) : new Date(),
        accessCount: Number.isFinite(plain.accessCount) ? plain.accessCount : 0,
      };
    });
}

function getRam(layer) {
  if (!state.has(layer)) state.set(layer, []);
  const ram = state.get(layer);
  // [v9.9.19.14.2] RAM не должен содержать строку/не-массив ни при каких условиях
  if (!Array.isArray(ram)) {
    const fixed = normalizeEntries(ram, layer);
    state.set(layer, fixed);
    return fixed;
  }
  return ram;
}

function contentKey(content) {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

async function upsertLayer(layer) {
  // [v9.9.19.14.2] 3.1 перед save: полная замена нормализованным массивом plain-объектов — строка невозможна
  const safe = normalizeEntries(getRam(layer), layer);
  state.set(layer, safe);
  await OmegaMemoryLayer.updateOne(
    { layer },
    { $set: { entries: safe, lastUpdated: new Date() }, $inc: { version: 1 } },
    { upsert: true }
  );
  dirtyLayers.delete(layer);
}

// [1.4] Единая точка записи: RAM + немедленный upsert в MongoDB.
// Ошибка БД → warning (одна строка) + 1 retry; RAM-операция не падает никогда.
export async function addMemoryEntry(layer, { id, type = 'fact', content, tags = [] } = {}) {
  if (!LAYERS.includes(layer) || content == null) return null;
  const ram = getRam(layer);
  const key = contentKey(content);
  // дедуп: идентичный контент в слое не плодим
  if (ram.some(e => contentKey(e.content) === key)) return null;
  const entry = {
    id: id || `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
    type,
    content,
    tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
    createdAt: new Date(),
    updatedAt: new Date(),
    accessCount: 0,
  };
  ram.push(entry);
  try {
    await upsertLayer(layer);
  } catch (e) {
    // [v9.9.19.14.2] 3.2/4.1 CastError логируем отдельно и ОДНОЙ строкой — без дампа массива
    logMemoryError(`[Memory] write-through failed (${layer}), retry once:`, e, ` entries=${ram.length}`);
    try {
      await upsertLayer(layer);
    } catch (e2) {
      dirtyLayers.add(layer);
      logMemoryError(`[Memory] write-through retry failed (${layer}):`, e2, ` entries=${ram.length}`);
    }
  }
  return entry;
}

export function getLayerEntries(layer, limit = 50) {
  const ram = getRam(layer);
  return ram.slice(-limit).reverse();
}

export function getLayerCounts() {
  const counts = {};
  for (const l of LAYERS) counts[l] = getRam(l).length;
  return counts;
}

export function getTotalCount() {
  return LAYERS.reduce((a, l) => a + getRam(l).length, 0);
}

// Миграция legacy-записей OmegaMemory (per-user) в глобальные слои — идемпотентно (дедуп по контенту)
async function migrateLegacyOmegaMemory() {
  try {
    const { OmegaMemory } = await import('../models/index.js');
    const docs = await OmegaMemory.find({}).limit(20).lean();
    let migrated = 0;
    for (const doc of docs) {
      for (const e of (doc.entries || [])) {
        if (!LAYERS.includes(e.level)) continue;
        const added = await addMemoryEntry(e.level, {
          type: 'fact',
          content: e.content,
          tags: [...(e.tags || []), 'legacy'],
        });
        if (added) migrated++;
      }
    }
    if (migrated) console.log(`[OMEGA] Legacy memory migrated: ${migrated} entries`);
  } catch (e) {
    logMemoryError('[OMEGA] Legacy memory migration failed:', e);
  }
}

// [1.5] Восстановление при старте: RAM пуст → загрузить все 12 слоёв из MongoDB.
// [1.7] Основная коллекция пуста, а backup есть → восстановить из backup + один алерт владельцу.
export async function restoreMemoryLayers() {
  try {
    const docs = await OmegaMemoryLayer.find({ layer: { $in: LAYERS } }).lean();
    // [v9.9.19.14.2] self-heal при старте: строка/мусор в entries → нормализация + перезапись чистым массивом
    const byLayer = {};
    for (const d of docs) {
      const cleaned = normalizeEntries(d.entries || [], d.layer);
      const rawLen = Array.isArray(d.entries) ? d.entries.length : -1;
      if (rawLen !== cleaned.length) {
        OmegaMemoryLayer.updateOne({ layer: d.layer }, { $set: { entries: cleaned, lastUpdated: new Date() } }).catch(() => {});
        console.warn(`[Memory] layer=${d.layer} sanitized at restore (${rawLen === -1 ? 'string' : rawLen} → ${cleaned.length})`);
      }
      byLayer[d.layer] = cleaned;
    }

    // [7.3] здоровая структура: отсутствующие слои создаём пустыми
    for (const l of LAYERS) {
      if (!byLayer[l]) {
        byLayer[l] = [];
        OmegaMemoryLayer.updateOne({ layer: l }, { $setOnInsert: { layer: l, entries: [] } }, { upsert: true }).catch(() => {});
      }
    }

    let total = Object.values(byLayer).reduce((a, e) => a + e.length, 0);

    if (total === 0) {
      const backup = await OmegaMemoryBackup.findOne({}).sort({ takenAt: -1 }).lean();
      if (backup?.layers) {
        for (const l of LAYERS) {
          const entries = Array.isArray(backup.layers[l]) ? backup.layers[l] : [];
          byLayer[l] = entries;
          if (entries.length) {
            await OmegaMemoryLayer.updateOne({ layer: l }, { $set: { entries, lastUpdated: new Date() } }, { upsert: true }).catch(() => {});
          }
        }
        total = Object.values(byLayer).reduce((a, e) => a + e.length, 0);
        if (total > 0) {
          console.log(`[OMEGA] Memory restored from backup (${new Date(backup.takenAt).toISOString()})`);
          const { alertOwner } = await import('./ownerBot.js');
          alertOwner?.(`♻️ Память восстановлена из бэкапа от ${new Date(backup.takenAt).toLocaleString('ru-RU')}`);
        }
      }
    }

    // TTL-прочистка + загрузка в RAM
    const counts = [];
    let totalCount = 0;
    for (const l of LAYERS) {
      let entries = byLayer[l] || [];
      const ttl = LAYER_TTL_MS[l];
      if (ttl) {
        const pruned = entries.filter(e => Date.now() - new Date(e.createdAt || 0).getTime() <= ttl);
        if (pruned.length !== entries.length) {
          entries = pruned;
          OmegaMemoryLayer.updateOne({ layer: l }, { $set: { entries } }).catch(() => {});
        }
      }
      state.set(l, entries);
      counts.push(`${l}=${entries.length}`);
      totalCount += entries.length;
    }
    console.log(`[OMEGA] Memory restored: ${counts.join(', ')} total=${totalCount}`);

    await migrateLegacyOmegaMemory();
    return totalCount;
  } catch (e) {
    logMemoryError('[OMEGA] Memory restore failed:', e);
    return 0;
  }
}

// [1.6] Graceful shutdown: дозаписать слои, которые не ушли в БД
export async function saveAllLayers() {
  for (const l of LAYERS) {
    if (!dirtyLayers.has(l)) continue;
    try { await upsertLayer(l); } catch { /* процесс завершается — некритично */ }
  }
  dirtyLayers.clear();
}

// [1.7] Snapshot всех слоёв (вызывается из существующего anti-fail cron раз в 6 часов)
export async function backupMemoryLayers() {
  try {
    const layers = {};
    for (const l of LAYERS) layers[l] = getRam(l);
    const checksum = crypto.createHash('sha256').update(JSON.stringify(layers)).digest('hex');
    await OmegaMemoryBackup.create({ takenAt: new Date(), layers, checksum });
    for (const l of LAYERS) {
      OmegaMemoryLayer.updateOne({ layer: l }, { $set: { backupChecksum: checksum } }).catch(() => {});
    }
    console.log(`[OMEGA] Memory backup saved (checksum ${checksum.slice(0, 8)})`);
    return true;
  } catch (e) {
    logMemoryError('[OMEGA] Memory backup failed:', e);
    return false;
  }
}

export async function getLastBackupAt() {
  try {
    const b = await OmegaMemoryBackup.findOne({}).sort({ takenAt: -1 }).lean();
    return b?.takenAt || null;
  } catch {
    return null;
  }
}

// [7.3] Self-diagnosis — вызывается из существующего cron раз в час (НЕ новый файл)
let diagnosisAlerted = false;
export async function memorySelfDiagnosis() {
  try {
    const counts = getLayerCounts();
    // факты на нуле, но есть backup → восстановить
    if (counts.semantic === 0 && counts.long_term === 0) {
      const backup = await OmegaMemoryBackup.findOne({}).sort({ takenAt: -1 }).lean();
      const backupTotal = backup?.layers ? Object.values(backup.layers).reduce((a, e) => a + (Array.isArray(e) ? e.length : 0), 0) : 0;
      if (backupTotal > 0) {
        for (const l of LAYERS) {
          const entries = Array.isArray(backup.layers[l]) ? backup.layers[l] : [];
          state.set(l, entries);
          await OmegaMemoryLayer.updateOne({ layer: l }, { $set: { entries, lastUpdated: new Date() } }, { upsert: true }).catch(() => {});
        }
        console.log('[OMEGA] Self-diagnosis: memory restored from backup');
        if (!diagnosisAlerted) {
          diagnosisAlerted = true;
          const { alertOwner } = await import('./ownerBot.js');
          alertOwner?.('♻️ Восстановлено из бэкапа: слои памяти были пусты');
        }
      }
    }
    // структура: все 12 слоёв присутствуют в БД
    const existing = await OmegaMemoryLayer.distinct('layer');
    for (const l of LAYERS) {
      if (!existing.includes(l)) {
        await OmegaMemoryLayer.updateOne({ layer: l }, { $setOnInsert: { layer: l, entries: getRam(l) } }, { upsert: true }).catch(() => {});
      }
    }
    return getLayerCounts();
  } catch (e) {
    logMemoryError('[OMEGA] Self-diagnosis failed:', e);
    return null;
  }
}

export default {
  LAYERS,
  LAYER_LABELS,
  addMemoryEntry,
  getLayerEntries,
  getLayerCounts,
  getTotalCount,
  restoreMemoryLayers,
  saveAllLayers,
  backupMemoryLayers,
  getLastBackupAt,
  memorySelfDiagnosis,
};
