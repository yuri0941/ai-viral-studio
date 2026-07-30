import { useState, useEffect, useCallback } from 'react'

import { API_BASE_URL } from '../config.js'

const FALLBACK_DATA = {
    overview: {
        totalUsers: 0,
        mrr: 0,
        activeServers: 0,
        totalServers: 0,
        totalStaff: 0,
        activeCabinets: 0,
        income: 0,
        expense: 0,
        profit: 0,
        recentActivity: []
    },
    finance: { payments: [], income: 0, expense: 0, profit: 0 },
    team: { staff: [], cabinets: [] },
    servers: { servers: [] },
    subscriptions: { subscriptions: [] }
}

const ENDPOINTS = {
    overview: `${API_BASE_URL}/owner/overview`,
    finance: `${API_BASE_URL}/owner/finance`,
    team: `${API_BASE_URL}/owner/team`,
    servers: `${API_BASE_URL}/owner/servers`,
    subscriptions: `${API_BASE_URL}/owner/subscriptions`
}

export function useDashboardData(key, options = {}) {
    const { fallback = FALLBACK_DATA[key] || null, immediate = true } = options
    const [data, setData] = useState(() => {
        try {
            const cached = localStorage.getItem(`dashboard_${key}`)
            return cached ? JSON.parse(cached) : fallback
        } catch {
            return fallback
        }
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const fetchData = useCallback(async () => {
        const url = ENDPOINTS[key]
        if (!url) {
            setError(`Unknown dashboard key: ${key}`)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }
            const result = await response.json()
            const payload = result.data || result
            setData(payload)
            try {
                localStorage.setItem(`dashboard_${key}`, JSON.stringify(payload))
            } catch {
                // ignore quota errors
            }
        } catch (err) {
            console.warn(`[useDashboardData] ${key} fetch failed:`, err.message)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [key])

    const refetch = useCallback(() => fetchData(), [fetchData])

    useEffect(() => {
        if (immediate) {
            fetchData()
        }
    }, [immediate, fetchData])

    return { data, loading, error, refetch }
}
