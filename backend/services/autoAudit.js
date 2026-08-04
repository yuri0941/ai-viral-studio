import User from '../models/User.js'

// [MASTER-v5.0] added: auto-audit system ensures test accounts exist on startup
export const autoAuditSystem = async () => {
    console.log('🔍 [AUTO-AUDIT] Starting...')
    const testAccounts = [
        { email: 'owner@aiviral.ru', password: 'Owner123!', role: 'owner', name: 'Владелец' },
        { email: 'admin@aiviral.ru', password: 'Admin123!', role: 'admin', name: 'Админ' },
        { email: 'staff@aiviral.ru', password: 'Staff123!', role: 'staff', name: 'Сотрудник' },
        { email: 'creator@aiviral.ru', password: 'Creator123!', role: 'creator', name: 'Креатор' },
        { email: 'advertiser@aiviral.ru', password: 'Advert123!', role: 'advertiser', name: 'Рекламодатель' }
    ]
    for (const acc of testAccounts) {
        const exists = await User.findOne({ email: acc.email })
        if (!exists) {
            const bcrypt = await import('bcryptjs')
            const hash = await bcrypt.default.hash(acc.password, 10)
            await User.create({
                ...acc,
                password: hash,
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                isVerified: true,
                acceptedTerms: true,
                acceptedPrivacy: true,
                acceptedConsent: true,
                isAdult: true,
                acceptedAt: new Date(),
                preferences: { timezone: 'Europe/Moscow', language: 'ru', currency: 'RUB' }
            })
            console.log(`[AUTO-AUDIT] Created ${acc.role}: ${acc.email} / ${acc.password}`)
        }
    }
    console.log('✅ [AUTO-AUDIT] System ready for clients')
}
