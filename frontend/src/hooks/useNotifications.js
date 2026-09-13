import { useState, useEffect, useCallback, useMemo } from 'react'
import { playSound } from './useSound.js'

// [REAL-DATA-2] мок-уведомления (TechBrand/$29/8.5/10) удалены; ключ v2 — старый кэш с моками не подхватывается
const STORAGE_KEY = 'app_notifications_v2'
const PERMISSION_ASKED_KEY = 'notifications_permission_asked'

function loadNotifications() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved ? JSON.parse(saved) : []
    } catch {
        return []
    }
}

export function useNotifications() {
    const [notifications, setNotifications] = useState(loadNotifications)
    const [permission, setPermission] = useState('default')

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
        } catch {
            // ignore
        }
    }, [notifications])

    // [P21] added: ask notification permission once after login (non-aggressive)
    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return
        setPermission(Notification.permission)
        const asked = localStorage.getItem(PERMISSION_ASKED_KEY)
        if (!asked && Notification.permission === 'default') {
            const t = setTimeout(() => {
                Notification.requestPermission().then(result => {
                    setPermission(result)
                    localStorage.setItem(PERMISSION_ASKED_KEY, 'true')
                })
            }, 5000)
            return () => clearTimeout(t)
        }
    }, [])

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

    const markRead = useCallback((id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }, [])

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }, [])

    const remove = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    const add = useCallback((notification) => {
        // [P19] added: notification sound
        playSound('notification')
        setNotifications(prev => [{ ...notification, id: notification.id || Date.now(), read: false }, ...prev])
    }, [])

    return {
        notifications,
        unreadCount,
        permission,
        markRead,
        markAllRead,
        remove,
        add,
    }
}
