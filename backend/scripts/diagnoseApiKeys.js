import mongoose from 'mongoose'
import dotenv from 'dotenv'
import ApiKey from '../models/ApiKey.js'

dotenv.config({ path: 'backend/.env' })

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio'
  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  const keys = await ApiKey.find({}).lean()
  console.log(`Total ApiKey documents: ${keys.length}`)

  const grouped = {}
  keys.forEach(k => {
    if (!grouped[k.provider]) grouped[k.provider] = []
    grouped[k.provider].push({
      _id: k._id?.toString(),
      ownerId: k.ownerId?.toString(),
      status: k.status,
      isValid: k.isValid,
      isActive: k.isActive,
      hasKey: !!k.key,
      hasKeyValue: !!k.keyValue,
      keyPreview: k.key ? `${String(k.key).slice(0, 6)}...${String(k.key).slice(-4)}` : null,
      lastError: k.lastError,
      updatedAt: k.updatedAt,
    })
  })

  console.log('\nBy provider:')
  Object.entries(grouped).forEach(([provider, arr]) => {
    console.log(`  ${provider}: ${arr.length}`)
    arr.forEach(x => console.log(`    - ownerId=${x.ownerId} status=${x.status} isValid=${x.isValid} active=${x.isActive} key=${x.keyPreview} err=${x.lastError || ''}`))
  })

  const yookassaKeys = keys.filter(k => k.provider && k.provider.startsWith('yookassa'))
  console.log(`\nYooKassa keys found: ${yookassaKeys.length}`)
  yookassaKeys.forEach(k => console.log(`  ${k.provider} ownerId=${k.ownerId?.toString()} status=${k.status}`))

  await mongoose.disconnect()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
