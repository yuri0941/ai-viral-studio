import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/ai_viral_studio'
}

import User from '../models/User.js'

const users = [
    {
        name: 'Owner',
        email: 'owner@ai-viral.com',
        password: 'owner123',
        role: 'owner',
        subscription: 'enterprise',
        isActive: true,
        isVerified: true
    },
    {
        name: 'Admin',
        email: 'admin@ai-viral.com',
        password: 'admin123',
        role: 'admin',
        subscription: 'enterprise',
        isActive: true,
        isVerified: true
    },
    {
        name: 'Staff',
        email: 'staff@ai-viral.com',
        password: 'staff123',
        role: 'staff',
        subscription: 'business',
        isActive: true,
        isVerified: true
    },
    {
        name: 'Advertiser',
        email: 'ads@ai-viral.com',
        password: 'ads123',
        role: 'advertiser',
        subscription: 'business',
        isActive: true,
        isVerified: true
    }
]

async function seedUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
        console.log('✅ Connected to MongoDB')

        // Удалить старых тестовых пользователей
        await User.deleteMany({
            email: { $in: users.map(u => u.email) }
        })
        console.log('🗑️  Old test users removed')

        // Создать новых — Mongoose сам захеширует пароли через pre('save')
        for (const userData of users) {
            const user = new User(userData)
            await user.save()  // ← pre('save') хеширует пароль автоматически!
            console.log(`✅ Created: ${userData.email} (${userData.role})`)
        }

        console.log('\n🎉 All users created successfully!')
        console.log('\n📋 Login credentials:')
        console.log('─────────────────────────────────')
        users.forEach(u => {
            console.log(`${u.role.padEnd(12)} | ${u.email.padEnd(25)} | ${u.password}`)
        })
        console.log('─────────────────────────────────')

        process.exit(0)
    } catch (error) {
        console.error('❌ Error:', error.message)
        process.exit(1)
    }
}

seedUsers()