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
                    <h2 className="text-lg font-semibold text-[var(--text)]">API Keys</h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Управление ключами AI-провайдеров и интеграций</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStatus}
                        disabled={loadingStatus}
                        className="magnetic-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all disabled:opacity-50" // [P16-CONTINUE] added
                    >
                        <RefreshCw size={12} className={loadingStatus ? 'animate-spin' : ''} />
                        Обновить статус
                    </button>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] glass px-3 py-1.5 rounded-full"> // [P16-CONTINUE] added
                        <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                        Активно: <span className="text-[var(--success)] font-medium">{activeCount}</span>
                        <span className="text-[var(--border-strong)]">/</span>
                        <span className="text-[var(--text-muted)]">Всего: {totalCount}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {providers.map(provider => {
                    const badge = getBadge(provider)
                    const isPollinations = provider.id === 'pollinations'
                    const isSystem = provider.type === 'system'
                    return (
                    <div key={provider.id} className="glass-card p-5 rounded-[var(--radius-xl)] hover:scale-[1.02] transition-all duration-300 group"> // [P16-CONTINUE] added
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl glass flex items-center justify-center"> // [P16-CONTINUE] added
                                    {isPollinations ? <Wind size={18} className="text-[var(--success)]" /> : isSystem ? <Server size={18} className="text-[var(--info)]" /> : <Key size={18} className="text-[var(--primary)]" />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-[var(--text)]">{provider.name}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">{provider.env || '—'}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${badge.status === 'active' ? 'bg-[var(--success)] animate-pulse' : badge.status === 'error' ? 'bg-[var(--warning)]' : badge.status === 'disabled' ? 'bg-[var(--text-muted)]' : 'bg-[var(--danger)]'}`} /> // [P16-CONTINUE] added
                                <StatusBadge status={badge.status} label={badge.label} />
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isPollinations ? 'bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]' : isSystem ? 'bg-[var(--info)]/10 border-[var(--info)]/20 text-[var(--info)]' : 'bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]'}`}> // [P16-CONTINUE] added
                                {isPollinations ? <Wind size={14} /> : isSystem ? <Server size={14} /> : <Key size={14} />}
                                {provider.description || (isSystem ? 'Системный провайдер (ключ в .env backend)' : 'AI-провайдер с API-ключом')}
                            </div>
                        </div>

                        {!isSystem && (
                            <div className="mb-4">
                                <label className="text-[10px] text-[var(--text-muted)] mb-1.5 block">Key value</label>
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
                                        className="flex-1 glass border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)]/50 outline-none focus:border-[var(--primary)]/30 transition-colors" // [P16-CONTINUE] added
                                    />
                                    <button
                                        onClick={() => setVisible(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                        className="min-w-[44px] min-h-[44px] rounded-xl glass text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center justify-center" // [P16-CONTINUE] added
                                        aria-label="Toggle visibility"
                                    >
                                        {visible[provider.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button
                                        onClick={() => copyKey(provider.id)}
                                        className="min-w-[44px] min-h-[44px] rounded-xl glass text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center justify-center" // [P16-CONTINUE] added
                                        aria-label="Copy key"
                                    >
                                        {copied === provider.id ? <Check size={16} className="text-[var(--success)]" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                            <span className="flex items-center gap-1"><Shield size={12} /> {isSystem ? 'Ключ управляется на сервере' : (provider.value ? 'Зашифровано в localStorage' : 'Не задано')}</span>
                            <div className="flex items-center gap-2">
                                {!isSystem && (
                                    <button
                                        onClick={() => rotateKey(provider.id)}
                                        className="magnetic-btn flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--surface)]" // [P16-CONTINUE] added
                                    >
                                        <RefreshCw size={12} /> Обновить
                                    </button>
                                )}
                                <button
                                    onClick={() => toggleProvider(provider.id)}
                                    disabled={toggling[provider.id]}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 disabled:opacity-50 ${provider.enabled ? 'bg-[var(--success)]' : 'bg-[var(--surface)]'}`} // [P16-CONTINUE] added: custom toggle
                                    aria-label={provider.enabled ? 'Выключить' : 'Включить'}
                                >
                                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[var(--text-inverse)] shadow-md transition-transform duration-300 ${provider.enabled ? 'translate-x-5' : ''}`} />
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
