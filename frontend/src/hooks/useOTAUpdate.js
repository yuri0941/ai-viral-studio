import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { AppUpdate } from '@capawesome/capacitor-app-update'
import { APP_VERSION } from '../config/version.js'

const LAST_CHECK_KEY = 'ota_last_check'
const UPDATE_STATUS_KEY = 'ota_update_status'

async function isNative() {
    return Capacitor.isNativePlatform()
}

export function useOTAUpdate() {
    useEffect(() => {
        let cancelled = false

        async function check() {
            try {
                if (!(await isNative())) return

                const now = Date.now()
                const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) || 0)
                if (now - lastCheck < 60 * 60 * 1000) return

                const info = await AppUpdate.getAppUpdateInfo()
                localStorage.setItem(LAST_CHECK_KEY, String(now))

                if (!info?.updateAvailability) return

                const hasUpdate = info.updateAvailability === 1 || info.updateAvailability === 'UPDATE_AVAILABLE'
                if (!hasUpdate) {
                    localStorage.setItem(UPDATE_STATUS_KEY, JSON.stringify({ status: 'up_to_date', checkedAt: now }))
                    return
                }

                localStorage.setItem(UPDATE_STATUS_KEY, JSON.stringify({
                    status: 'available',
                    version: info.availableVersion || APP_VERSION,
                    checkedAt: now,
                }))

                const shouldUpdate = window.confirm(`Доступно обновление AI Viral Studio (${info.availableVersion || 'новая версия'}). Установить сейчас?`)
                if (shouldUpdate) {
                    localStorage.setItem(UPDATE_STATUS_KEY, JSON.stringify({ status: 'downloading', checkedAt: now }))
                    try {
                        await AppUpdate.openAppStore()
                        localStorage.setItem(UPDATE_STATUS_KEY, JSON.stringify({ status: 'installed', checkedAt: Date.now() }))
                    } catch (e) {
                        localStorage.setItem(UPDATE_STATUS_KEY, JSON.stringify({ status: 'error', error: e.message, checkedAt: Date.now() }))
                    }
                }
            } catch (e) {
                console.warn('[useOTAUpdate] check failed:', e.message)
                localStorage.setItem(UPDATE_STATUS_KEY, JSON.stringify({ status: 'error', error: e.message, checkedAt: Date.now() }))
            }
        }

        check()
        return () => { cancelled = true }
    }, [])
}

export function getOTAStatus() {
    try {
        return JSON.parse(localStorage.getItem(UPDATE_STATUS_KEY) || '{}')
    } catch {
        return {}
    }
}

export default useOTAUpdate
