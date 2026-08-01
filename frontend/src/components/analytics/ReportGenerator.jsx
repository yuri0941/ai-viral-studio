import { useState } from 'react'
import { FileText, Download, Loader2, AlertCircle, Check } from 'lucide-react'
import { API_BASE_URL } from '../../config.js'

const TYPES = [
    { id: 'weekly', label: 'Еженедельный' },
    { id: 'monthly', label: 'Ежемесячный' },
]

const FORMATS = [
    { id: 'pdf', label: 'PDF' },
    { id: 'excel', label: 'Excel (данные)' },
]

const CHANNELS = [
    { id: 'youtube', label: 'YouTube' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'telegram', label: 'Telegram' },
]

export function ReportGenerator() {
    const [type, setType] = useState('weekly')
    const [format, setFormat] = useState('pdf')
    const [selectedChannels, setSelectedChannels] = useState(['instagram', 'tiktok'])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const toggleChannel = (id) => {
        setSelectedChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
    }

    const generate = async () => {
        setLoading(true)
        setError(null)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/reports/generate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, channels: selectedChannels, format }),
            })
            if (!res.ok) {
                const json = await res.json().catch(() => ({}))
                throw new Error(json.message || 'Ошибка генерации')
            }
            if (format === 'pdf') {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `report-${Date.now()}.pdf`
                a.click()
                window.URL.revokeObjectURL(url)
            } else {
                const json = await res.json()
                console.log('Excel data:', json.data)
                alert('Данные для Excel подготовлены (см. консоль)')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
                <FileText size={18} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Custom Reports</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <div className="text-xs text-gray-500 mb-2">Тип отчёта</div>
                    <div className="flex gap-2">
                        {TYPES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setType(t.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${type === t.id ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 mb-2">Формат</div>
                    <div className="flex gap-2">
                        {FORMATS.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFormat(f.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${format === f.id ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <div className="text-xs text-gray-500 mb-2">Каналы</div>
                <div className="flex flex-wrap gap-2">
                    {CHANNELS.map(c => (
                        <button
                            key={c.id}
                            onClick={() => toggleChannel(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${selectedChannels.includes(c.id) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            {selectedChannels.includes(c.id) && <Check size={12} />}
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            <button
                onClick={generate}
                disabled={loading || selectedChannels.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {format === 'pdf' ? 'Скачать PDF' : 'Сформировать Excel'}
            </button>
        </div>
    )
}

export default ReportGenerator
