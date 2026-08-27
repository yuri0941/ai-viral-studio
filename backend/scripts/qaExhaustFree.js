// [CLIENT-JOURNEY-QA] подготовка free-юзера с исчерпанными trial-токенами + свежий JWT
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
const u = await User.findOne({ email: /qa\.journey/ }).sort({ _id: -1 })
if (!u) { console.error('no qa.journey user'); process.exit(1) }
await UsageQuota.updateOne({ userId: u._id }, { $set: { trialTokens: 0, generationsUsed: 0, generationsLimit: 0 } })
fs.writeFileSync(path.join(__dirname, '../../.tmp-ui-polish/qa-free-user.json'),
  JSON.stringify({ email: u.email, id: String(u._id), token: u.generateToken() }))
console.log('ready:', u.email, 'trialTokens=0')
await mongoose.disconnect()
