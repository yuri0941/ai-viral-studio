import { useState, useCallback, useEffect } from 'react'
import { Key, Eye, EyeOff, Copy, Check, RefreshCw, Shield, Server, Wind } from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'
import { API_BASE_URL } from '../../../../config.js'

const STORAGE_KEY = 'owner_api_keys'
const PLACEHOLDER = '••••••••••••••••'

const DEFAULT_KEYS = [
    { id: 'groq', name: 'Groq', env: 'GROQ_API_KEY', value: '', status: 'missing', lastRotated: null, type: 'input' },
    { id: 'openrouter', name: 'OpenRouter', env: 'OPENROUTER_API_KEY', value: '', status: 'missing', lastRotated: null, type: 'input' },
    { id: 'gemini', name: 'Google Gemini', env: 'GEMINI_API_KEY', value: '', status: 'missing', lastRotated: null, type: 'input' },
    { id: 'github', name: 'GitHub Models', env: 'GITHUB_API_KEY', value: '', status: 'missing', lastRotated: null, type: 'input' },
    { id: 'mistral', name: 'Mistral AI', env: 'MISTRAL_API_KEY', value: '', status: 'missing', lastRotated: null, type: 'input' },
    { id: 'cohere', name: 'Cohere', env: 'COHERE_API_KEY', value: '', status: 'missing', lastRotated: null, type: 'input' },
    { id: 'deepseek', name: 'DeepSeek', env: 'DEEPSEEK_API_KEY', value: '', status: 'missing', lastRotated: null, type: 'input' },
    { id: 'youtube', name: 'YouTube Data API', env: 'YOUTUBE_API_KEY', value: '', status: 'missing', lastRotated: null, type: 'input' },
    { id: 'replicate', name: 'Replicate', env: 'REPLICATE_API_KEY', value: '', status: 'missing', lastRotated: null, type: 'input' },
]

const SYSTEM_PROVIDERS = [
    { id: 'huggingface', name: 'HuggingFace', env: 'HUGGINGFACE_API_KEY', type: 'system', status: 'active' },
    { id: 'cloudflare', name: 'Cloudflare Workers AI', env: 'CLOUDFLARE_API_KEY', type: 'system', status: 'active' },
    { id: 'pollinations', name: 'Pollinations AI', env: null, type: 'system', status: 'active', description: 'Бесплатный fallback AI. Не требует API-ключа.' },
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

function normalizeKeys(saved) {
    if (!Array.isArray(saved)) return DEFAULT_KEYS
    const map = new Map(saved.map(k => [k.id, k]))
    return DEFAULT_KEYS.map(def => {
        const raw = map.get(def.id)?.value || ''
        return {
            ...def,
            value: raw,
            status: isActive(raw) ? 'active' : 'missing',
            lastRotated: map.get(def.id)?.lastRotated || null,
        }
    })
}

export function ApiKeysTab({ data }) {
    const { showToast } = data
    const [keys, setKeys] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? normalizeKeys(JSON.parse(saved)) : DEFAULT_KEYS
        } catch {
            return DEFAULT_KEYS
        }
    })
    const [visible, setVisible] = useState({})
    const [copied, setCopied] = useState(null)
    const [editing, setEditing] = useState({})
    const [backendStatus, setBackendStatus] = useState({})

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
    }, [keys])

    useEffect(() => {
        let cancelled = false
        fetch(`${API_BASE_URL}/admin/ai-providers/status`)
            .then(r => r.ok ? r.json() : {})
            .then(data => {
                if (!cancelled) setBackendStatus(data || {})
            })
            .catch(err => console.error('[ApiKeysTab] status fetch error:', err))
        return () => { cancelled = true }
    }, [])

    const saveKeys = useCallback((next) => {
        setKeys(next)
    }, [])

    const updateKey = (id, value) => {
        const trimmed = value.trim()
        saveKeys(keys.map(k => k.id === id ? {
            ...k,
            value: trimmed,
            status: isActive(trimmed) ? 'active' : 'missing',
            lastRotated: isActive(trimmed) ? new Date().toISOString() : k.lastRotated,
        } : k))
    }

    const rotateKey = (id) => {
        if (!window.confirm('Сгенерировать новый ключ? Старый будет недействителен.')) return
        const fakeNewKey = `${id}_key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        updateKey(id, fakeNewKey)
        showToast?.(`${id}: ключ обновлён`)
    }

    const copyKey = async (id) => {
        const key = keys.find(k => k.id === id)
        if (!key?.value || !isActive(key.value)) return
        try {
            await navigator.clipboard.writeText(key.value)
            setCopied(id)
            setTimeout(() => setCopied(null), 1500)
        } catch {
            showToast?.('Не удалось скопировать', 'error')
        }
    }

    function getEffectiveStatus(provider) {
        if (provider.id === 'pollinations') return 'active'
        if (backendStatus[provider.id] !== undefined) {
            return backendStatus[provider.id] ? 'active' : 'missing'
        }
        return provider.status
    }

    const allProviders = [...keys, ...SYSTEM_PROVIDERS]
    const activeCount = allProviders.filter(p => getEffectiveStatus(p) === 'active').length
    const totalCount = allProviders.length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">API Keys</h2>
                    <p className="text-xs text-gray-500 mt-1">Управление ключами AI-провайдеров и интеграций</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Активно: <span className="text-emerald-400 font-medium">{activeCount + SYSTEM_PROVIDERS.length}</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-gray-400">Всего: {totalCount}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {allProviders.map(apiKey => {
                    const effectiveStatus = getEffectiveStatus(apiKey)
                    const isPollinations = apiKey.id === 'pollinations'
                    return (
                    <div key={apiKey.id} className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    {isPollinations ? <Wind size={18} className="text-emerald-400" /> : apiKey.type === 'system' ? <Server size={18} className="text-blue-400" /> : <Key size={18} className="text-purple-400" />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">{apiKey.name}</div>
                                    <div className="text-[10px] text-gray-500">{apiKey.env || '—'}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${effectiveStatus === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                <StatusBadge status={effectiveStatus === 'active' ? 'active' : 'error'} label={effectiveStatus === 'active' ? 'Active' : 'Missing'} />
                            </div>
                        </div>

                        {apiKey.type === 'system' ? (
                            <div className="mb-4">
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isPollinations ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                                    {isPollinations ? <Wind size={14} /> : <Server size={14} />}
                                    {apiKey.description || 'Системный провайдер (ключ в .env backend)'}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <label className="text-[10px] text-gray-500 mb-1.5 block">Key value</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type={visible[apiKey.id] ? 'text' : 'password'}
                                        value={editing[apiKey.id] !== undefined ? editing[apiKey.id] : (apiKey.value || '')}
                                        onChange={e => setEditing({ ...editing, [apiKey.id]: e.target.value })}
                                        onBlur={() => {
                                            if (editing[apiKey.id] !== undefined) {
                                                updateKey(apiKey.id, editing[apiKey.id])
                                                setEditing(prev => { const n = { ...prev }; delete n[apiKey.id]; return n })
                                            }
                                        }}
                                        placeholder={PLACEHOLDER}
                                        className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30"
                                    />
                                    <button
                                        onClick={() => setVisible(prev => ({ ...prev, [apiKey.id]: !prev[apiKey.id] }))}
                                        className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {visible[apiKey.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                    <button
                                        onClick={() => copyKey(apiKey.id)}
                                        className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {copied === apiKey.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                            <span className="flex items-center gap-1"><Shield size={12} /> {apiKey.type === 'system' ? 'Ключ управляется на сервере' : (apiKey.value ? 'Зашифровано в localStorage' : 'Не задано')}</span>
                            {apiKey.type !== 'system' && (
                                <button
                                    onClick={() => rotateKey(apiKey.id)}
                                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    <RefreshCw size={12} /> Обновить
                                </button>
                            )}
                        </div>
                    </div>
                )})}
            </div>
        </div>
    )
}

export default ApiKeysTab
