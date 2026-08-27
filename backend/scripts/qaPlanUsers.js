// [CLIENT-JOURNEY-QA] создать/обновить QA-юзеров pro и agency, выдать JWT
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const { UsageQuota } = await import('../models/index.js')

const out = {}
for (const plan of ['pro', 'agency']) {
  const email = `qa.${plan}@test.dev`
  let u = await User.findOne({ email })
  if (!u) {
    u = await User.create({
      name: `QA ${plan}`, email, password: 'QaTest123!',
      role: 'creator', subscription: plan, isActive: true, isVerified: true,
      acceptedTerms: true, acceptedPrivacy: true, acceptedConsent: true, isAdult: true,
      preferences: { language: 'ru', timezone: 'Europe/Moscow' },
    })
  } else {
    u.subscription = plan
    await u.save()
  }
  await UsageQuota.findOneAndUpdate(
    { userId: u._id },
    { $set: { plan, generationsLimit: plan === 'pro' ? 200 : 1000, generationsUsed: 0, trialTokens: 0, trialUsed: 0 } },
    { upsert: true }
  )
  out[plan] = { email, id: String(u._id), token: u.generateToken() }
  console.log(`${plan}: ${email} ready`)
}
fs.writeFileSync(path.join(__dirname, '../../.tmp-ui-polish/qa-plans.json'), JSON.stringify(out))
await mongoose.disconnect()
