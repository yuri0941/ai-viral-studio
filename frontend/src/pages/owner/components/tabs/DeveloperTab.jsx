import { useState, useEffect } from 'react'
import { developerApi } from '../../../../services/api'
import { KeyRound, Plus, Trash2, Copy, Webhook, FileText, RefreshCw, Check } from 'lucide-react'

export function DeveloperTab({ data }) {
    const [keys, setKeys] = useState([])
    const [docs, setDocs] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [newKeyName, setNewKeyName] = useState('')
    const [copied, setCopied] = useState(null)
    const [webhookForm, setWebhookForm] = useState({})

    const load = async () => {
        try {
            setLoading(true)
            const [kRes, dRes] = await Promise.all([developerApi.keys(), developerApi.docs()])
            setKeys(Array.isArray(kRes.data) ? kRes.data : [])
            setDocs(dRes.data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleCreate = async () => {
        if (!newKeyName.trim()) return
        try {
            await developerApi.createKey({ name: newKeyName })
            setNewKeyName('')
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Удалить ключ?')) return
        try {
            await developerApi.deleteKey(id)
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    const copy = (text, id) => {
        navigator.clipboard.writeText(text)
        setCopied(id)
        setTimeout(() => setCopied(null), 1500)
    }

    const addWebhook = async (id) => {
        const url = webhookForm[id]?.url
        if (!url) return
        try {
            await developerApi.addWebhook(id, { url, events: webhookForm[id].events ? webhookForm[id].events.split(',').map(s => s.trim()) : ['*'] })
            setWebhookForm(prev => ({ ...prev, [id]: { url: '' } }))
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    const removeWebhook = async (id, webhookId) => {
        try {
            await developerApi.removeWebhook(id, webhookId)
            load()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text)]">OMEGA API (B2B2B)</h2>
                    <p className="text-sm text-gray-500 mt-1">API для разработчиков: $0.01/запрос + $99/мес базовый. Ключи одобряются владельцем.</p>
                </div>
                <a href={`${docs?.servers?.[0]?.url || ''}/api/v1/omega/docs`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text)] text-sm">
                    <FileText className="w-4 h-4" /> Документация
                </a>
            </div>

            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 text-sm">{error}</div>}

            <div className="rounded-2xl bg-white/[0.03] border border-[var(--border)] p-5">
                <h3 className="text-sm font-medium text-[var(--text)] mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Новый API ключ</h3>
                <div className="flex gap-3">
                    <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Название приложения" className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-sm outline-none focus:border-[#8b5cf6]" />
                    <button type="button" onClick={handleCreate} className="px-4 py-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-[var(--text)] text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Создать</button>
                </div>
            </div>

            <div className="space-y-4">
                {loading && <div className="text-sm text-gray-500">Загрузка...</div>}
                {keys.map(k => (
                    <div key={k._id} className="rounded-2xl bg-white/[0.03] border border-[var(--border)] p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-xl ${k.approved ? 'bg-emerald-500/10' : 'bg-yellow-500/10'}`}>
                                    <KeyRound className={`w-4 h-4 ${k.approved ? 'text-emerald-400' : 'text-yellow-400'}`} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-[var(--text)]">{k.name}</div>
                                    <div className="text-xs text-gray-500">{k.approved ? 'Одобрен' : 'Ожидает одобрения'} · {k.usage} запросов · лимит {k.rateLimit}/ч</div>
                                </div>
                            </div>
                            <button type="button" onClick={() => handleDelete(k._id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <code className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-xs text-[#00ff41] break-all">{k.key}</code>
                            <button type="button" onClick={() => copy(k.key, k._id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">
                                {copied === k._id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="border-t border-[var(--border)] pt-4">
                            <div className="text-xs text-gray-500 mb-2 flex items-center gap-2"><Webhook className="w-3.5 h-3.5" /> Webhooks</div>
                            <div className="flex gap-2 mb-2">
                                <input value={webhookForm[k._id]?.url || ''} onChange={e => setWebhookForm(p => ({ ...p, [k._id]: { ...p[k._id], url: e.target.value } }))} placeholder="https://your.app/webhook" className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-xs outline-none" />
                                <input value={webhookForm[k._id]?.events || ''} onChange={e => setWebhookForm(p => ({ ...p, [k._id]: { ...p[k._id], events: e.target.value } }))} placeholder="chat, generate" className="w-32 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-xs outline-none" />
                                <button type="button" onClick={() => addWebhook(k._id)} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text)] text-xs">Добавить</button>
                            </div>
                            {k.webhooks?.map(w => (
                                <div key={w._id} className="flex items-center justify-between text-xs text-gray-400 py-1">
                                    <span className="truncate">{w.url}</span>
                                    <button type="button" onClick={() => removeWebhook(k._id, w._id)} className="text-red-400 hover:text-red-300">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {docs && (
                <div className="rounded-2xl bg-white/[0.03] border border-[var(--border)] p-5">
                    <h3 className="text-sm font-medium text-[var(--text)] mb-3 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Endpoints</h3>
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex items-center gap-2"><span className="text-emerald-400">GET</span> /api/v1/omega/status</div>
                        <div className="flex items-center gap-2"><span className="text-blue-400">POST</span> /api/v1/omega/chat</div>
                        <div className="flex items-center gap-2"><span className="text-blue-400">POST</span> /api/v1/omega/generate</div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">Authorization: Bearer &lt;your_api_key&gt;</div>
                </div>
            )}
        </div>
    )
}

export default DeveloperTab
