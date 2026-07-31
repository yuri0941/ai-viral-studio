import { useState, useEffect } from 'react'

export function useSmartData(apiUrl, demoData, options = {}) {
    const [realData, setRealData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)

        fetch(apiUrl)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json()
            })
            .then(payload => {
                if (cancelled) return
                const data = payload.data !== undefined ? payload.data : payload
                setRealData(data)
                setLoading(false)
            })
            .catch(err => {
                if (cancelled) return
                setError(err)
                setRealData(null)
                setLoading(false)
            })

        return () => { cancelled = true }
    }, [apiUrl])

    const hasRealData = Array.isArray(realData)
        ? realData.length > 0
        : realData !== null && Object.keys(realData || {}).length > 0

    const displayData = hasRealData ? realData : demoData
    const isDemo = !hasRealData && !loading && !error

    return { data: displayData, realData, loading, error, isDemo }
}
