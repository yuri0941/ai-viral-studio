// [CLIENT-JOURNEY-QA] получить JWT для последнего qa.journey-юзера (локальная БД)
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_viral_studio')
const { default: User } = await import('../models/User.js')
const u = await User.findOne({ email: /qa\.journey/ }).sort({ _id: -1 })
if (!u) { console.error('no user'); process.exit(1) }
console.log(JSON.stringify({ email: u.email, id: String(u._id), token: u.generateToken() }))
await mongoose.disconnect()
