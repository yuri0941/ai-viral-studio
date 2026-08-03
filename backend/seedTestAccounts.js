import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from './models/User.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// [P24] added: seed script for all roles
dotenv.config({ path: path.resolve(__dirname, '.env') })

const TEST_ACCOUNTS = [
    { email: 'admin@test.com', password: 'AdminPass123!', name: 'Admin Test', role: 'admin' },
    { email: 'staff@test.com', password: 'StaffPass123!', name: 'Staff Test', role: 'staff' },
    { email: 'creator@test.com', password: 'CreatorPass123!', name: 'Creator Test', role: 'creator' },
    { email: 'advertiser@test.com', password: 'AdvertiserPass123!', name: 'Advertiser Test', role: 'advertiser' },
    { email: 'business@test.com', password: 'BusinessPass123!', name: 'Business Test', role: 'business' },
]

async function seed() {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set')
        process.exit(1)
    }
    await mongoose.connect(process.env.MONGO_URI)
    const created = []

    for (const acc of TEST_ACCOUNTS) {
        const exists = await User.findOne({ email: acc.email })
        if (!exists) {
            // User schema pre-save will hash the plain password
            await User.create({
                email: acc.email,
                password: acc.password,
                name: acc.name,
                role: acc.role,
                isVerified: true,
            })
            created.push({ email: acc.email, password: acc.password, role: acc.role })
            console.log(`Created: ${acc.email} [${acc.role}]`)
        } else {
            console.log(`Skipped: ${acc.email}`)
        }
    }

    await mongoose.disconnect()

    if (created.length > 0) {
        const lines = created.map(a => `- ${a.role.toUpperCase()}: ${a.email} / ${a.password}`).join('\n')
        const fs = await import('fs')
        fs.writeFileSync(
            path.resolve(__dirname, '../TEST_ACCOUNTS.md'),
            `## Тестовые аккаунты\n\n${lines}\n\nGenerated: ${new Date().toISOString()}\n`
        )
        console.log('Saved to TEST_ACCOUNTS.md')
    }
}

seed().catch(err => {
    console.error(err)
    process.exit(1)
})
