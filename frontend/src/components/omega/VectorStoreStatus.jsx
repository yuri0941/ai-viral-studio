import { useEffect, useState } from 'react'
import { Database, AlertCircle } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

export function VectorStoreStatus() {
    const [status, setStatus] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        fetch(`${API_BASE_URL}/analytics/vector-store/status`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') setStatus(data.data)
            })
            .catch(err => setError(err.message))
    }, [])

    if (error || !status) return null

    if (status.configured) {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <Database size={14} />
                Vector DB: {status.backend}
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
            <AlertCircle size={16} />
            <div className="flex-1">
                <div className="font-medium">Vector DB: In-Memory (ограничено {status.limit} записей)</div>
                <div className="text-yellow-500/80 mt-0.5">Подключите ChromaDB для безлимитной памяти</div>
            </div>
            <button
                onClick={() => window.open('https://docs.trychroma.com/', '_blank')}
                className="px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-colors"
            >
                Инструкция
            </button>
        </div>
    )
}

export default VectorStoreStatus
