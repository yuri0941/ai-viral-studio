import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { API_URL } from '../config.js'
import { Shield, Download, Trash2, AlertTriangle, Check } from 'lucide-react'

export function GDPRPage() {
    const { t } = useTranslation()
    const [loadingExport, setLoadingExport] = useState(false)
    const [loadingDelete, setLoadingDelete] = useState(false)
    const [deleted, setDeleted] = useState(false)

    const getToken = () => localStorage.getItem('token') || ''

    const handleExport = async () => {
        try {
            setLoadingExport(true)
            const res = await fetch(`${API_URL}/users/me/export`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            if (!res.ok) throw new Error('Export failed')
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'my-data-export.json'
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            alert(err.message)
        } finally {
            setLoadingExport(false)
        }
    }

    const handleDelete = async () => {
        if (!window.confirm(t('gdpr.deleteConfirm'))) return
        try {
            setLoadingDelete(true)
            const res = await fetch(`${API_URL}/users/me/data`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
            })
            if (!res.ok) throw new Error('Delete failed')
            setDeleted(true)
        } catch (err) {
            alert(err.message)
        } finally {
            setLoadingDelete(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center">
                    <Shield className="w-10 h-10 text-[#8b5cf6] mx-auto mb-3" />
                    <h1 className="text-2xl font-bold">{t('gdpr.title')}</h1>
                    <p className="text-gray-400 text-sm mt-1">{t('gdpr.subtitle')}</p>
                </div>

                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-blue-500/10"><Download className="w-5 h-5 text-blue-400" /></div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold">{t('gdpr.exportTitle')}</h2>
                            <p className="text-sm text-gray-500 mt-1">{t('gdpr.exportDescription')}</p>
                            <button onClick={handleExport} disabled={loadingExport} className="mt-4 px-4 py-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm disabled:opacity-50 flex items-center gap-2">
                                <Download className="w-4 h-4" /> {loadingExport ? '...' : t('gdpr.exportButton')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-white/[0.03] border border-red-500/20 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-red-500/10"><Trash2 className="w-5 h-5 text-red-400" /></div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-red-400">{t('gdpr.deleteTitle')}</h2>
                            <p className="text-sm text-gray-500 mt-1">{t('gdpr.deleteDescription')}</p>
                            {deleted ? (
                                <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm"><Check className="w-4 h-4" /> {t('gdpr.deleted')}</div>
                            ) : (
                                <button onClick={handleDelete} disabled={loadingDelete} className="mt-4 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm disabled:opacity-50 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> {loadingDelete ? '...' : t('gdpr.deleteButton')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GDPRPage
