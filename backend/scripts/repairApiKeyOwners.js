import mongoose from 'mongoose'
import dotenv from 'dotenv'
import ApiKey from '../models/ApiKey.js'
import User from '../models/User.js'

dotenv.config()

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio'
  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  const owner = await User.findOne({ role: 'owner' }).lean()
  if (!owner) {
    console.error('No owner user found — cannot repair')
    process.exit(1)
  }
  console.log(`Owner: ${owner.email} (${owner._id})`)

  const orphaned = await ApiKey.find({ $or: [{ ownerId: { $exists: false } }, { ownerId: null }] })
  console.log(`Found ${orphaned.length} keys without ownerId`)

  for (const doc of orphaned) {
    await ApiKey.updateOne({ _id: doc._id }, { $set: { ownerId: owner._id } })
    console.log(`[REPAIR] ${doc.provider} -> ownerId=${owner._id}`)
  }

  // Also re-validate yookassa keys so UI shows correct status
  const yookassa = await ApiKey.find({ provider: /^yookassa_/ })
  console.log(`YooKassa keys after repair: ${yookassa.length}`)
  yookassa.forEach(k => console.log(`  ${k.provider} ownerId=${k.ownerId?.toString()} status=${k.status} isValid=${k.isValid}`))

  await mongoose.disconnect()
  console.log('Done')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
