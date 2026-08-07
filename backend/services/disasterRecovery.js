import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import cron from 'node-cron'
import { fileURLToPath } from 'url'
import { sendEmail } from './emailService.js'
import { getOwnerBot } from './ownerBot.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups'))
const MONGODB_URI = process.env.MONGODB_URI
const OWNER_PIN = process.env.OWNER_PIN || '000000'

let lastBackup = null
let lastBackupStatus = 'never'

async function ensureDir(dir) {
    try {
        await fs.access(dir)
    } catch {
        await fs.mkdir(dir, { recursive: true })
    }
}

export async function runBackup() {
    await ensureDir(BACKUP_DIR)
    const date = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
    const outDir = path.join(BACKUP_DIR, `backup_${date}`)
    await ensureDir(outDir)

    if (!MONGODB_URI) {
        lastBackupStatus = 'no-mongodb-uri'
        console.warn('[disasterRecovery] MONGODB_URI not set, skipping backup')
        return { success: false, error: 'MONGODB_URI not set' }
    }

    try {
        await new Promise((resolve, reject) => {
            const proc = spawn('mongodump', ['--uri', MONGODB_URI, '--out', outDir], { shell: false })
            let stderr = ''
            proc.stderr.on('data', d => { stderr += d.toString() })
            proc.on('close', code => {
                if (code === 0) resolve()
                else reject(new Error(`mongodump exited ${code}: ${stderr}`))
            })
            proc.on('error', reject)
        })

        lastBackup = new Date()
        lastBackupStatus = 'success'
        await cleanupOldBackups()
        await sendOwnerAlert(`✅ Бэкап MongoDB создан: ${outDir}`)
        return { success: true, path: outDir, createdAt: lastBackup }
    } catch (err) {
        lastBackupStatus = 'failed'
        console.error('[disasterRecovery] backup failed:', err.message)
        await sendOwnerAlert(`❌ Бэкап MongoDB не удался: ${err.message}`)
        return { success: false, error: err.message }
    }
}

export async function restoreFromBackup(date, pin) {
    if (pin !== OWNER_PIN) {
        return { success: false, error: 'Invalid PIN' }
    }

    if (!MONGODB_URI) {
        return { success: false, error: 'MONGODB_URI not set' }
    }

    const backup = await findBackup(date)
    if (!backup) {
        return { success: false, error: 'Backup not found' }
    }

    try {
        await new Promise((resolve, reject) => {
            const proc = spawn('mongorestore', ['--uri', MONGODB_URI, '--drop', backup], { shell: false })
            let stderr = ''
            proc.stderr.on('data', d => { stderr += d.toString() })
            proc.on('close', code => {
                if (code === 0) resolve()
                else reject(new Error(`mongorestore exited ${code}: ${stderr}`))
            })
            proc.on('error', reject)
        })

        await sendOwnerAlert(`♻️ Восстановление из бэкапа выполнено: ${backup}`)
        return { success: true, path: backup }
    } catch (err) {
        console.error('[disasterRecovery] restore failed:', err.message)
        await sendOwnerAlert(`❌ Восстановление из бэкапа не удалось: ${err.message}`)
        return { success: false, error: err.message }
    }
}

export async function listBackups() {
    await ensureDir(BACKUP_DIR)
    const entries = await fs.readdir(BACKUP_DIR)
    const stats = await Promise.all(entries.map(async name => {
        const full = path.join(BACKUP_DIR, name)
        const stat = await fs.stat(full)
        return { name, path: full, createdAt: stat.mtime }
    }))
    return stats.filter(s => s.stat.isDirectory()).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getBackupStatus() {
    return {
        lastBackup: lastBackup ? lastBackup.toISOString() : null,
        status: lastBackupStatus,
        backupsCount: (await listBackups()).length,
        stale: !lastBackup || (Date.now() - lastBackup.getTime() > 24 * 60 * 60 * 1000),
    }
}

export async function findBackup(date) {
    const backups = await listBackups()
    if (!date) return backups[0]?.path || null
    const match = backups.find(b => b.name.includes(date))
    return match?.path || null
}

async function cleanupOldBackups() {
    const backups = await listBackups()
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    for (const b of backups) {
        if (b.createdAt < cutoff) {
            await fs.rm(b.path, { recursive: true, force: true }).catch(() => {})
        }
    }
}

export async function checkBackupStale() {
    const status = await getBackupStatus()
    if (status.stale) {
        console.warn('[disasterRecovery] backup is stale')
        await sendOwnerAlert('⚠️ Бэкап MongoDB не создавался более 24 часов. Проверьте disasterRecovery.')
    }
    return status
}

export async function rollbackToPreviousVersion(tag) {
    // Rollback plan: deploy a previous git tag and restart (manual for now)
    console.warn(`[disasterRecovery] rollback requested to ${tag}. Trigger manual redeploy or CI rollback.`)
    await sendOwnerAlert(`🚨 Rollback requested to ${tag}. Выполните redeploy вручную или через CI.`)
    return { success: true, tag, note: 'Rollback requires manual redeploy or CI trigger.' }
}

async function sendOwnerAlert(message) {
    try {
        const bot = getOwnerBot()
        if (bot && process.env.TELEGRAM_OWNER_CHAT_ID) {
            await bot.sendMessage(process.env.TELEGRAM_OWNER_CHAT_ID, message).catch(() => {})
        }
    } catch (e) { /* ignore */ }
    try {
        if (process.env.OWNER_EMAIL) {
            await sendEmail({ to: process.env.OWNER_EMAIL, subject: '[AI Viral Studio] DR Alert', text: message }).catch(() => {})
        }
    } catch (e) { /* ignore */ }
}

export function startBackupCron() {
    if (!cron.validate('0 3 * * *')) return
    cron.schedule('0 3 * * *', () => {
        runBackup().catch(e => console.error('[disasterRecovery] cron backup failed:', e.message))
    })
    // Stale check every 6 hours
    cron.schedule('0 */6 * * *', () => {
        checkBackupStale().catch(e => console.error('[disasterRecovery] stale check failed:', e.message))
    })
    console.log('[disasterRecovery] backup cron scheduled at 03:00 and stale check every 6h')
}
