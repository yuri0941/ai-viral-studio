// [v9.9.19.14] Тест персистентности: пишем факт напрямую в коллекцию слоёв (как write-through),
// затем читаем обратно — после рестарта сервера запись обязана быть на месте.
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const mode = process.argv[2] || 'write'
const MARK = 'тест-память-14'

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
const col = mongoose.connection.collection('omegamemorylayers')

if (mode === 'write') {
  await col.updateOne(
    { layer: 'semantic' },
    {
      $push: { entries: { id: `test-${Date.now()}`, type: 'fact', content: `Факт: ${MARK}`, tags: ['test'], createdAt: new Date(), updatedAt: new Date(), accessCount: 0 } },
      $set: { lastUpdated: new Date() },
      $inc: { version: 1 },
    },
    { upsert: true }
  )
  console.log('WRITE_OK')
} else {
  const doc = await col.findOne({ layer: 'semantic' })
  const found = (doc?.entries || []).filter(e => String(e.content).includes(MARK)).length
  console.log(`FOUND=${found}`)
  // чистим тестовые записи
  await col.updateOne({ layer: 'semantic' }, { $pull: { entries: { tags: 'test' } } })
  console.log('CLEANED')
}
await mongoose.disconnect()
