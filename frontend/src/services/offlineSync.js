// [v6.5.5] offline action queue via IndexedDB
import { API_BASE_URL } from '../config.js'

const DB_NAME = 'ai_viral_offline'
const STORE_NAME = 'queue'
const DB_VERSION = 1

function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !('indexedDB' in window)) {
            return resolve(null)
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
                store.createIndex('status', 'status', { unique: false })
                store.createIndex('createdAt', 'createdAt', { unique: false })
            }
        }
    })
}

export async function queueAction(action, data, endpoint, method = 'POST') {
    const db = await openDB().catch(() => null)
    if (!db) return { success: false, queued: false }

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const item = {
            action,
            data,
            endpoint,
            method,
            status: 'pending',
            retryCount: 0,
            createdAt: new Date().toISOString(),
        }
        const request = store.add(item)
        request.onsuccess = () => resolve({ success: true, queued: true, id: request.result })
        request.onerror = () => reject(request.error)
    })
}

export async function syncQueue() {
    const db = await openDB().catch(() => null)
    if (!db) return { synced: 0, failed: 0 }

    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('status')
    const pending = await new Promise((resolve, reject) => {
        const req = index.getAll('pending')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })

    let synced = 0
    let failed = 0
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    for (const item of pending) {
        try {
            const res = await fetch(item.endpoint, {
                method: item.method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(item.data),
            })
            if (res.ok) {
                await new Promise((resolve, reject) => {
                    const tx2 = db.transaction(STORE_NAME, 'readwrite')
                    const store2 = tx2.objectStore(STORE_NAME)
                    const req = store2.delete(item.id)
                    req.onsuccess = () => resolve()
                    req.onerror = () => reject(req.error)
                })
                synced++
            } else {
                throw new Error(`HTTP ${res.status}`)
            }
        } catch (e) {
            const retry = (item.retryCount || 0) + 1
            const status = retry >= 5 ? 'failed' : 'pending'
            await new Promise((resolve, reject) => {
                const tx2 = db.transaction(STORE_NAME, 'readwrite')
                const store2 = tx2.objectStore(STORE_NAME)
                const req = store2.put({ ...item, retryCount: retry, status })
                req.onsuccess = () => resolve()
                req.onerror = () => reject(req.error)
            })
            failed++
        }
    }

    return { synced, failed }
}

export async function isOnline() {
    if (typeof navigator === 'undefined') return true
    if (!navigator.onLine) return false
    try {
        const res = await fetch(`${API_BASE_URL}/health`, { method: 'HEAD', cache: 'no-store' })
        return res.ok
    } catch (e) {
        return false
    }
}

export function initOfflineSync() {
    if (typeof window === 'undefined') return
    window.addEventListener('online', () => {
        console.log('[offlineSync] back online, syncing queue...')
        syncQueue().catch(e => console.error('[offlineSync] sync failed:', e))
    })
}
