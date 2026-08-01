import { useState, useCallback, useEffect } from 'react'
import { Key, Eye, EyeOff, Copy, Check, RefreshCw, Shield, Server, Wind, Power } from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'
import { ownerApi } from '../../../../services/api'

const STORAGE_KEY = 'owner_api_keys'
const PLACEHOLDER = '••••••••••••••••'

const DEFAULT_PROVIDERS = [
    { id: 'groq', name: 'Groq', env: 'GROQ_API_KEY', value: '', status: 'missing', enabled: true, type: 'key', lastRotated: null },
    { id: 'openrouter', name: 'OpenRouter', env: 'OPENROUTER_API_KEY', value: '', status: 'missing', enabled: true, type: 'key', lastRotated: null },
    { id: 'gemini', name: 'Google Gemini', env: 'GEMINI_API_KEY', value: '', status: 'missing', enabled: false, type: 'key', lastRotated: null },
    { id: 'github', name: 'GitHub Models', env: 'GITHUB_API_KEY', value: '', status: 'missing', enabled: false, type: 'key', lastRotated: null },
    { id: 'mistral', name: 'Mistral AI', env: 'MISTRAL_API_KEY', value: '', status: 'missing', enabled: false, type: 'key', lastRotated: null },
    { id: 'cohere', name: 'Cohere', env: 'COHERE_API_KEY', value: '', status: 'missing', enabled: false, type: 'key', lastRotated: null },
    { id: 'deepseek', name: 'DeepSeek', env: 'DEEPSEEK_API_KEY', value: '', status: 'missing', enabled: false, type: 'key', lastRotated: null },
    { id: 'replicate', name: 'Replicate', env: 'REPLICATE_API_KEY', value: '', status: 'missing', enabled: false, type: 'key', lastRotated: null },
    { id: 'youtube', name: 'YouTube Data API', env: 'YOUTUBE_API_KEY', value: '', status: 'missing', enabled: false, type: 'key', lastRotated: null },
    { id: 'huggingface', name: 'HuggingFace', env: 'HUGGINGFACE_API_KEY', value: '', status: 'missing', enabled: false, type: 'system', description: 'Отключён по умолчанию (Inference API устарел).' },
    { id: 'cloudflare', name: 'Cloudflare Workers AI', env: 'CLOUDFLARE_API_KEY', value: '', status: 'missing', enabled: false, type: 'system', description: 'Отключён по умолчанию (требует account_id + token).' },
    { id: 'pollinations', name: 'Pollinations AI', env: null, value: '', status: 'missing', enabled: false, type: 'system', description: 'Бесплатный fallback AI. Не требует API-ключа. Временно отключён (431).' },
]

function isPlaceholder(value) {
    return !value || value === PLACEHOLDER || value.replace(/•/g, '').length === 0
}

function isActive(value) {
    return !!value && !isPlaceholder(value) && String(value).length > 10
}

function maskKey(value) {
    if (!value || isPlaceholder(value)) return PLACEHOLDER
    if (value.length <= 8) return value
    return value.slice(0, 4) + '•'.repeat(value.length - 8) + value.slice(-4)
}

function normalizeProviders(saved) {
    if (!Array.isArray(saved)) return DEFAULT_PROVIDERS
    const map = new Map(saved.map(p => [p.id, p]))
    return DEFAULT_PROVIDERS.map(def => {
        const raw = map.get(def.id)
        return {
            ...def,
            value: raw?.value || '',
            status: raw?.status || def.status,
            enabled: raw?.enabled !== undefined ? raw.enabled : def.enabled,
            lastRotated: raw?.lastRotated || null,
        }
    })
}

export function ApiKeysTab({ data }) {
    const { showToast } = data
    const [providers, setProviders] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? normalizeProviders(JSON.parse(saved)) : DEFAULT_PROVIDERS
        } catch {
            return DEFAULT_PROVIDERS
        }
    })
    const [visible, setVisible] = useState({})
    const [copied, setCopied] = useState(null)
    const [editing, setEditing] = useState({})
    const [loadingStatus, setLoadingStatus] = useState(false)
    const [toggling, setToggling] = useState({})

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(providers))
    }, [providers])

    const fetchStatus = useCallback(async () => {
        setLoadingStatus(true)
        try {
            const res = await ownerApi.aiProviderStatus()
            const statuses = res?.data?.data || res?.data || []
            setProviders(prev => prev.map(p => {
                const s = statuses.find(x => x.id === p.id)
                if (!s) return p
                return {
                    ...p,
                    status: s.status,
                    enabled: s.enabled,
                    hasKey: s.hasKey,
                    lastError: s.lastError || p.lastError,
                    lastCheckedAt: s.lastCheckedAt || p.lastCheckedAt,
                }
            }))
        } catch (err) {
            console.warn('[ApiKeysTab] failed to fetch provider status:', err.message)
        } finally {
            setLoadingStatus(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    const saveProviders = useCallback((next) => {
        setProviders(next)
    }, [])

    const updateKey = (id, value) => {
        const trimmed = value.trim()
        saveProviders(providers.map(p => p.id === id ? {
            ...p,
            value: trimmed,
            status: isActive(trimmed) ? 'active' : 'missing',
            lastRotated: isActive(trimmed) ? new Date().toISOString() : p.lastRotated,
        } : p))
    }

    const rotateKey = (id) => {
        if (!window.confirm('Сгенерировать новый ключ? Старый будет недействителен.')) return
        const fakeNewKey = `${id}_key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        updateKey(id, fakeNewKey)
        showToast?.(`${id}: ключ обновлён`)
    }

    const copyKey = async (id) => {
        const p = providers.find(p => p.id === id)
        if (!p?.value || !isActive(p.value)) return
        try {
            await navigator.clipboard.writeText(p.value)
            setCopied(id)
            setTimeout(() => setCopied(null), 1500)
        } catch {
            showToast?.('Не удалось скопировать', 'error')
        }
    }

    const toggleProvider = async (id) => {
        const p = providers.find(p => p.id === id)
        if (!p) return
        const nextEnabled = !p.enabled
        setToggling(prev => ({ ...prev, [id]: true }))
        try {
            await ownerApi.toggleAiProvider(id, nextEnabled)
            showToast?.(`${p.name} ${nextEnabled ? 'включён' : 'отключён'}`)
            setProviders(prev => prev.map(x => x.id === id ? { ...x, enabled: nextEnabled, status: nextEnabled ? (x.status === 'disabled' ? 'missing' : x.status) : 'disabled' } : x))
        } catch (err) {
            console.error('[ApiKeysTab] toggle failed:', err)
            showToast?.(`Не удалось переключить ${p.name}`, 'error')
        } finally {
            setToggling(prev => ({ ...prev, [id]: false }))
        }
    }

    const getBadge = (p) => {
        if (p.status === 'active') return { status: 'active', label: 'Active' }
        if (p.status === 'error') return { status: 'error', label: `Error ${p.lastError ? `(${p.lastError})` : ''}` }
        if (p.status === 'disabled') return { status: 'disabled', label: 'Disabled' }
        return { status: 'missing', label: 'Missing' }
    }

    const activeCount = providers.filter(p => p.status === 'active' && p.enabled).length
    const totalCount = providers.length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">API Keys</h2>
                    <p className="text-xs text-gray-500 mt-1">Управление ключами AI-провайдеров и интеграций</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStatus}
                        disabled={loadingStatus}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={loadingStatus ? 'animate-spin' : ''} />
                        Обновить статус
                    </button>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Активно: <span className="text-emerald-400 font-medium">{activeCount}</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-gray-400">Всего: {totalCount}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {providers.map(provider => {
                    const badge = getBadge(provider)
                    const isPollinations = provider.id === 'pollinations'
                    const isSystem = provider.type === 'system'
                    return (
                    <div key={provider.id} className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    {isPollinations ? <Wind size={18} className="text-emerald-400" /> : isSystem ? <Server size={18} className="text-blue-400" /> : <Key size={18} className="text-purple-400" />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">{provider.name}</div>
                                    <div className="text-[10px] text-gray-500">{provider.env || '—'}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${badge.status === 'active' ? 'bg-emerald-400' : badge.status === 'error' ? 'bg-yellow-400' : badge.status === 'disabled' ? 'bg-gray-400' : 'bg-red-400'}`} />
                                <StatusBadge status={badge.status} label={badge.label} />
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isPollinations ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : isSystem ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-purple-500/10 border-purple-500/20 text-purple-300'}`}>
                                {isPollinations ? <Wind size={14} /> : isSystem ? <Server size={14} /> : <Key size={14} />}
                                {provider.description || (isSystem ? 'Системный провайдер (ключ в .env backend)' : 'AI-провайдер с API-ключом')}
                            </div>
                        </div>

                        {!isSystem && (
                            <div className="mb-4">
                                <label className="text-[10px] text-gray-500 mb-1.5 block">Key value</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type={visible[provider.id] ? 'text' : 'password'}
                                        value={editing[provider.id] !== undefined ? editing[provider.id] : (provider.value || '')}
                                        onChange={e => setEditing({ ...editing, [provider.id]: e.target.value })}
                                        onBlur={() => {
                                            if (editing[provider.id] !== undefined) {
                                                updateKey(provider.id, editing[provider.id])
                                                setEditing(prev => { const n = { ...prev }; delete n[provider.id]; return n })
                                            }
                                        }}
                                        placeholder={PLACEHOLDER}
                                        className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30"
                                    />
                                    <button
                                        onClick={() => setVisible(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                        className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {visible[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                    <button
                                        onClick={() => copyKey(provider.id)}
                                        className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {copied === provider.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                            <span className="flex items-center gap-1"><Shield size={12} /> {isSystem ? 'Ключ управляется на сервере' : (provider.value ? 'Зашифровано в localStorage' : 'Не задано')}</span>
                            <div className="flex items-center gap-2">
                                {!isSystem && (
                                    <button
                                        onClick={() => rotateKey(provider.id)}
                                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        <RefreshCw size={12} /> Обновить
                                    </button>
                                )}
                                <button
                                    onClick={() => toggleProvider(provider.id)}
                                    disabled={toggling[provider.id]}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${provider.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}
                                >
                                    <Power size={12} />
                                    {provider.enabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        </div>
    )
}

export default ApiKeysTab
