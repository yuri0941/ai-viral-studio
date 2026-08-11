// [v9.9.19.14.2] Диагностика 12 слоёв памяти: типы entries в MongoDB. Только чтение.
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const LAYERS = ['short_term', 'working', 'long_term', 'semantic', 'procedural', 'episodic', 'owner_profile', 'emotional', 'prospective', 'metacognitive', 'social', 'instrumental']

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
const col = mongoose.connection.collection('omegamemorylayers')

console.log('layer           | exists | typeof entries | isArray | length | first  | last')
console.log('----------------|--------|----------------|---------|--------|--------|--------')
for (const layer of LAYERS) {
  const doc = await col.findOne({ layer })
  if (!doc) {
    console.log(`${layer.padEnd(15)} | no     | -              | -       | -      | -      | -`)
    continue
  }
  const e = doc.entries
  const isArr = Array.isArray(e)
  const len = isArr ? e.length : (typeof e === 'string' ? e.length : 0)
  const first = isArr && e.length ? typeof e[0] : '-'
  const last = isArr && e.length ? typeof e[e.length - 1] : '-'
  console.log(`${layer.padEnd(15)} | yes    | ${typeof e}    | ${String(isArr).padEnd(7)} | ${String(len).padEnd(6)} | ${first.padEnd(6)} | ${last}`)
}
await mongoose.disconnect()
