import { MongoClient, BSON } from 'mongodb'
import JSZip from 'jszip'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { createGzip, gunzip as gunzipCb } from 'zlib'
import { promisify } from 'util'
import path from 'path'
import cron from 'node-cron'
import { fileURLToPath } from 'url'
import { sendEmail } from './emailService.js'
import { getOwnerBot } from './ownerBot.js'
import { getOwnerChatId } from '../models/OwnerSettings.js' // [OWNER-REMOTE-CONTROL]

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups'))
// [SUBSCRIPTION-CHECKOUT-FIX] mongoose.connect использует MONGO_URI || MONGODB_URI; бэкап должен читать ту же переменную
const getMongoUri = () => process.env.MONGO_URI || process.env.MONGODB_URI
const OWNER_PIN = process.env.OWNER_PIN || '000000'
const MAX_TG_FILE_BYTES = 50 * 1024 * 1024

const gunzip = promisify(gunzipCb)

let lastBackup = null
let lastBackupStatus = 'never'

async function ensureDir(dir) {
    try {
        await fs.access(dir)
    } catch {
        await fs.mkdir(dir, { recursive: true })
    }
}

function getDbNameFromUri(uri) {
    try {
        const url = new URL(uri)
        const db = url.pathname.replace(/^\/+/, '').split('/')[0]
        if (db) return decodeURIComponent(db)
    } catch {}
    return process.env.BACKUP_DB_NAME || 'test'
}

async function backupCollection(db, collectionName, outDir) {
    const filePath = path.join(outDir, `${collectionName}.jsonl.gz`)
    const gzip = createGzip()
    const writeStream = createWriteStream(filePath)
    gzip.pipe(writeStream)

    const collection = db.collection(collectionName)
    let count = 0
    let bytes = 0
    const cursor = collection.find({}).batchSize(500)

    for await (const doc of cursor) {
        const line = BSON.EJSON.stringify(doc) + '\n'
        gzip.write(line)
        bytes += Buffer.byteLength(line)
        count++
    }
    gzip.end()

    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
        gzip.on('error', reject)
    })

    return { name: collectionName, count, bytes }
}

async function createZipArchive(sourceDir, zipPath) {
    const zip = new JSZip()
    const files = await fs.readdir(sourceDir)
    for (const file of files) {
        const filePath = path.join(sourceDir, file)
        const stat = await fs.stat(filePath)
        if (stat.isFile()) {
            zip.file(file, await fs.readFile(filePath))
        }
    }
    const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    })
    await fs.writeFile(zipPath, buffer)
    return zipPath
}

async function sendBackupToOwner(zipPath) {
    try {
        const bot = getOwnerBot()
        const ownerChatId = await getOwnerChatId() // [OWNER-REMOTE-CONTROL]
        if (!bot || !ownerChatId) return false

        const stat = await fs.stat(zipPath)
        if (stat.size > MAX_TG_FILE_BYTES) {
            console.log('[disasterRecovery] backup archive too large to send via Telegram (>50 MB)')
            return false
        }
        await bot.sendDocument(ownerChatId, zipPath, {
            caption: `✅ Бэкап MongoDB\nРазмер: ${(stat.size / 1024 / 1024).toFixed(2)} МБ\nСоздан: ${new Date().toISOString()}`,
        })
        return true
    } catch (e) {
        console.error('[disasterRecovery] failed to send backup via Telegram:', e.message)
        return false
    }
}

async function restoreCollectionFromGz(db, collectionName, gzPath) {
    const compressed = await fs.readFile(gzPath)
    const decompressed = await gunzip(compressed)
    const lines = decompressed.toString('utf8').split('\n').filter(Boolean)
    const docs = lines.map(line => BSON.EJSON.parse(line))

    const collection = db.collection(collectionName)
    await collection.deleteMany({})
    if (docs.length) {
        await collection.insertMany(docs, { ordered: false })
    }
    return docs.length
}

export async function runBackup() {
    await ensureDir(BACKUP_DIR)

    const MONGODB_URI = getMongoUri()
    if (!MONGODB_URI) {
        lastBackupStatus = 'no-mongodb-uri'
        console.warn('[disasterRecovery] MongoDB URI not set, skipping backup')
        await sendOwnerAlert('❌ Бэкап MongoDB не удался: MONGO_URI/MONGODB_URI не задан')
        return { success: false, error: 'MongoDB URI not set' }
    }

    const date = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
    const outDir = path.join(BACKUP_DIR, `backup_${date}`)
    const zipPath = `${outDir}.zip`
    let client

    try {
        await ensureDir(outDir)

        client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 30000 })
        await client.connect()

        const dbName = getDbNameFromUri(MONGODB_URI)
        const admin = client.db().admin()
        const dbInfo = await admin.listDatabases({ nameOnly: true })
        if (!dbInfo.databases.some(d => d.name === dbName)) {
            throw new Error(`database ${dbName} not found on server`)
        }

        const db = client.db(dbName)
        const collections = await db.listCollections().toArray()
        const stats = []

        for (const coll of collections) {
            if (coll.name.startsWith('system.')) continue
            const s = await backupCollection(db, coll.name, outDir)
            stats.push(s)
        }

        await fs.writeFile(
            path.join(outDir, 'metadata.json'),
            JSON.stringify({
                createdAt: new Date().toISOString(),
                dbName,
                collections: stats,
                source: 'js-driver-ejson',
                version: process.env.npm_package_version || 'unknown',
            }, null, 2)
        )

        await createZipArchive(outDir, zipPath)
        const zipStat = await fs.stat(zipPath)

        lastBackup = new Date()
        lastBackupStatus = 'success'
        await cleanupOldBackups()
        await sendBackupToOwner(zipPath)

        const totalDocs = stats.reduce((a, s) => a + s.count, 0)
        await sendOwnerAlert(
            `✅ Бэкап MongoDB создан.\n` +
            `База: ${dbName}\n` +
            `Коллекций: ${stats.length}\n` +
            `Документов: ${totalDocs}\n` +
            `Архив: ${(zipStat.size / 1024 / 1024).toFixed(2)} МБ\n` +
            `Путь: ${zipPath}`
        )

        return { success: true, path: zipPath, createdAt: lastBackup, stats }
    } catch (err) {
        lastBackupStatus = 'failed'
        console.error('[disasterRecovery] backup failed:', err.message)
        await sendOwnerAlert(`❌ Бэкап MongoDB не удался: ${err.message}`)
        return { success: false, error: err.message }
    } finally {
        try { await client?.close() } catch {}
    }
}

export async function restoreFromBackup(date, pin) {
    if (pin !== OWNER_PIN) {
        return { success: false, error: 'Invalid PIN' }
    }

    const MONGODB_URI = getMongoUri()
    if (!MONGODB_URI) {
        return { success: false, error: 'MongoDB URI not set' }
    }

    const backup = await findBackup(date)
    if (!backup) {
        return { success: false, error: 'Backup not found' }
    }

    let client
    let tempDir = null

    try {
        client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 30000 })
        await client.connect()

        const dbName = getDbNameFromUri(MONGODB_URI)
        const db = client.db(dbName)

        let workDir = backup
        if (backup.endsWith('.zip')) {
            tempDir = path.join(BACKUP_DIR, `restore_tmp_${Date.now()}`)
            await ensureDir(tempDir)
            const data = await fs.readFile(backup)
            const zip = await JSZip.loadAsync(data)
            for (const [name, file] of Object.entries(zip.files)) {
                if (file.dir) continue
                const dest = path.join(tempDir, name)
                await ensureDir(path.dirname(dest))
                const content = await file.async('nodebuffer')
                await fs.writeFile(dest, content)
            }
            workDir = tempDir
        }

        const files = (await fs.readdir(workDir)).filter(f => f.endsWith('.jsonl.gz'))
        const restored = []
        for (const file of files) {
            const collectionName = file.replace(/\.jsonl\.gz$/, '')
            const count = await restoreCollectionFromGz(db, collectionName, path.join(workDir, file))
            restored.push({ collection: collectionName, count })
        }

        await sendOwnerAlert(`♻️ Восстановление из бэкапа выполнено: ${backup}\nКоллекций: ${restored.length}`)
        return { success: true, path: backup, restored }
    } catch (err) {
        console.error('[disasterRecovery] restore failed:', err.message)
        await sendOwnerAlert(`❌ Восстановление из бэкапа не удалось: ${err.message}`)
        return { success: false, error: err.message }
    } finally {
        try { await client?.close() } catch {}
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
        }
    }
}

export async function listBackups() {
    await ensureDir(BACKUP_DIR)
    const entries = await fs.readdir(BACKUP_DIR)
    const stats = await Promise.all(entries.map(async name => {
        const full = path.join(BACKUP_DIR, name)
        const stat = await fs.stat(full)
        return {
            name,
            path: full,
            createdAt: stat.mtime,
            size: stat.size,
            isDirectory: stat.isDirectory(),
        }
    }))
    return stats.filter(s => s.name.startsWith('backup_')).sort((a, b) => b.createdAt - a.createdAt)
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
        // [FIX-BUFFER] владельцу — не сухой "stale", а причина и что делать
        console.warn('[disasterRecovery] backup is stale:', status.status)
        await sendOwnerAlert(
            `⚠️ Бэкап MongoDB не создавался более 24 часов.\n` +
            `Последний статус: ${status.status || 'unknown'}\n` +
            `Бэкапов на диске: ${status.backupsCount}\n` +
            `Ручной запуск: POST /api/admin/backup/trigger`
        )
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
        const ownerChatId = await getOwnerChatId() // [OWNER-REMOTE-CONTROL]
        if (bot && ownerChatId) {
            await bot.sendMessage(ownerChatId, message).catch(() => {})
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
