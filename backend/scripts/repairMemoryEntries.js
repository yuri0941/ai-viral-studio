// [v9.9.19.14.2] Одноразовый ИДЕМПОТЕНТНЫЙ ремонт entries в OmegaMemoryLayer:
// строка → массив объектов (JSON.parse / перенос в corruptedDump), не-объекты отбрасываются,
// каждая запись — plain object с гарантированными полями. Безопасен при повторном запуске.
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const LAYERS = ['short_term', 'working', 'long_term', 'semantic', 'procedural', 'episodic', 'owner_profile', 'emotional', 'prospective', 'metacognitive', 'social', 'instrumental']

function normalizeEntry(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null
  const plain = JSON.parse(JSON.stringify(e))
  return {
    id: String(plain.id || `repair-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`),
    type: String(plain.type || 'fact'),
    content: plain.content ?? '',
    tags: Array.isArray(plain.tags) ? plain.tags.map(String).slice(0, 10) : [],
    createdAt: plain.createdAt ? new Date(plain.createdAt) : new Date(),
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt) : new Date(),
    accessCount: Number.isFinite(plain.accessCount) ? plain.accessCount : 0,
  }
}

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
const col = mongoose.connection.collection('omegamemorylayers')

for (const layer of LAYERS) {
  const doc = await col.findOne({ layer })
  if (!doc) {
    console.log(`[REPAIR] ${layer}: no doc — skipped`)
    continue
  }
  let entries = doc.entries
  let wasString = false
  let corruptedDump

  if (typeof entries === 'string') {
    wasString = true
    try {
      const parsed = JSON.parse(entries)
      entries = Array.isArray(parsed) ? parsed : []
    } catch {
      // util.inspect-формат (одинарные кавычки) — надёжно не парсится: дамп сохраняем, массив начинаем чистым
      corruptedDump = entries.slice(0, 50000)
      entries = []
    }
  }
  if (!Array.isArray(entries)) entries = []

  const before = entries.length
  const cleaned = entries.map(normalizeEntry).filter(Boolean)
  const removed = before - cleaned.length

  const update = { $set: { entries: cleaned, lastUpdated: new Date() } }
  if (corruptedDump) update.$set.corruptedDump = corruptedDump
  await col.updateOne({ layer }, update)
  console.log(`[REPAIR] ${layer}: before=${before} after=${cleaned.length} (removed ${removed}, was-string: ${wasString})`)
}
await mongoose.disconnect()
console.log('[REPAIR] done')
