import { useEffect, useState } from 'react'

function isEmpty(value) {
    if (value === null || value === undefined) return true
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
}

export function useSmartData(apiUrl, demoData, token) {
    const [realData, setRealData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        setLoading(true)

        const headers = {}
        if (token) headers.Authorization = `Bearer ${token}`

        fetch(apiUrl, { headers })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (cancelled) return
                let extracted = data
                if (!Array.isArray(data) && data && typeof data === 'object') {
                    extracted = data.data || data.items || data.plans || data.history || data.entries || data
                }
                setRealData(isEmpty(extracted) ? null : extracted)
                setLoading(false)
            })
            .catch(() => {
                if (cancelled) return
                setRealData(null)
                setLoading(false)
            })

        return () => { cancelled = true }
    }, [apiUrl, token])

    const hasReal = !isEmpty(realData)
    return { data: hasReal ? realData : demoData, isDemo: !hasReal && !loading, loading }
}

export default useSmartData
