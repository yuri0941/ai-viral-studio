// [v9.9.19.14.2] Диагностика legacy OmegaMemory (per-user) — почему миграция не подхватила записи.
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
const col = mongoose.connection.collection('omegamemories')
const docs = await col.find({}).limit(10).toArray()
console.log('legacy docs:', docs.length)
for (const d of docs) {
  const levels = {}
  ;(d.entries || []).forEach(e => { const k = e && typeof e === 'object' ? (e.level || 'no-level') : typeof e; levels[k] = (levels[k] || 0) + 1 })
  console.log('doc', String(d._id), 'ownerId:', String(d.ownerId || '-'), 'entries:', (d.entries || []).length, JSON.stringify(levels))
}
await mongoose.disconnect()
