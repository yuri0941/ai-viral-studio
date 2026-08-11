// [v9.9.19.14.2] Тест write-through: restore → addMemoryEntry('short_term') → в БД объект, не строка.
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
const { restoreMemoryLayers, addMemoryEntry, getLayerCounts } = await import('../services/memoryLayerService.js')

await restoreMemoryLayers()
const before = getLayerCounts().short_term
const entry = await addMemoryEntry('short_term', { type: 'fact', content: 'тест-короткий-15', tags: ['test'] })
const after = getLayerCounts().short_term
console.log(`WRITE-THROUGH: before=${before} after=${after} entryId=${entry?.id || 'dedup-null'}`)

const col = mongoose.connection.collection('omegamemorylayers')
const doc = await col.findOne({ layer: 'short_term' })
const last = doc.entries[doc.entries.length - 1]
console.log(`DB: short_term length=${doc.entries.length} last-type=${typeof last} isArray=${Array.isArray(doc.entries)}`)
await mongoose.disconnect()
