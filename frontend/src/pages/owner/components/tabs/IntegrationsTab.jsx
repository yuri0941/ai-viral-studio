import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../common/StatusBadge'
import { Plug, RefreshCw, Send, MessageCircle, Hash, FileText, CheckSquare, Trello, ShoppingBag, Globe, Webhook, Plus, Trash2, Check, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { integrationsApi, request } from '../../../../services/api'

function VKIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.033-1.49-1.171-1.744-1.171-.356 0-.458.102-.458.593v1.562c0 .424-.136.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.492 4 8.076c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.779.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.644v3.472c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.644-.22 1.017-2.354 3.988-2.354 3.988-.186.322-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.49-.085.745-.576.745z"/>
    </svg>
  )
}

const INTEGRATIONS = [
    { id: 'whatsapp', name: 'WhatsApp Business', icon: MessageCircle, color: 'text-emerald-400', setup: ['Meta for Developers', 'Business Account', 'Access Token + Phone Number ID'], env: ['WHATSAPP_API_KEY', 'WHATSAPP_PHONE_NUMBER_ID'] },
    { id: 'slack', name: 'Slack', icon: Hash, color: 'text-purple-400', setup: ['api.slack.com/apps', 'Create App', 'Bot User OAuth Token'], env: ['SLACK_BOT_TOKEN'] },
    { id: 'discord', name: 'Discord', icon: Hash, color: 'text-indigo-400', setup: ['Discord Developer Portal', 'New Application → Bot', 'Bot Token + Invite to server'], env: ['DISCORD_BOT_TOKEN'] },
    { id: 'notion', name: 'Notion', icon: FileText, color: 'text-[var(--text)]', setup: ['notion.so/my-integrations', 'Create integration', 'Database ID'], env: ['NOTION_TOKEN'] },
    { id: 'clickup', name: 'ClickUp', icon: CheckSquare, color: 'text-purple-400', setup: ['ClickUp Settings → Apps', 'API Key', 'List ID'], env: ['CLICKUP_API_KEY'] },
    { id: 'trello', name: 'Trello', icon: Trello, color: 'text-blue-400', setup: ['trello.com/app-key', 'API Key + Token', 'List ID'], env: ['TRELLO_API_KEY', 'TRELLO_TOKEN'] },
    { id: 'shopify', name: 'Shopify', icon: ShoppingBag, color: 'text-green-400', setup: ['Shopify Admin → Apps', 'Custom App', 'Store URL + Access Token'], env: ['SHOPIFY_STORE_URL', 'SHOPIFY_ACCESS_TOKEN'] },
]

export function IntegrationsTab({ data }) {
    const { t } = useTranslation()
    const icons = { youtube: '▶️', tiktok: '🎵', instagram: '📷', telegram: '✈️' }
    const [statuses, setStatuses] = useState({})
    const [loading, setLoading] = useState(false)
    const [activeForm, setActiveForm] = useState(null)
    const [form, setForm] = useState({})
    const [result, setResult] = useState(null)
    const [webhooks, setWebhooks] = useState([])
    const [webhookForm, setWebhookForm] = useState({ name: '', url: '', events: ['*'], secret: '' })
    const [creatingWebhook, setCreatingWebhook] = useState(false)
    const [tab, setTab] = useState('social')
    const [vkStatus, setVkStatus] = useState({ configured: false, connected: false })
    const [tgStatus, setTgStatus] = useState({ configured: false, connected: false })
    const [tgLinkLoading, setTgLinkLoading] = useState(false)

    const loadVkStatus = async () => {
        try {
            const data = await request('/vk/status')
            if (data?.success) setVkStatus({ configured: data.configured, connected: data.connected, accountName: data.accountName, setupGuide: data.setupGuide })
        } catch (err) {
            console.warn('[IntegrationsTab] vk status failed:', err.message)
        }
    }

    const loadTgStatus = async () => {
        try {
            const data = await request('/telegram/status')
            if (data?.success) setTgStatus({ configured: data.configured, connected: data.connected, username: data.username })
        } catch (err) {
            console.warn('[IntegrationsTab] telegram status failed:', err.message)
        }
    }

    const connectVK = async () => {
        try {
            const data = await request('/vk/auth-url')
            if (data?.success && data.authUrl) {
                window.open(data.authUrl, '_blank')
            } else {
                toast.error(data?.error || t('vk.authUrlFailed'))
            }
        } catch (err) {
            toast.error(err.message)
        }
    }

    const disconnectVK = async () => {
        try {
            await request('/vk', { method: 'DELETE' })
            setVkStatus({ ...vkStatus, connected: false, accountName: null })
            toast.success(t('vk.disconnectSuccess'))
        } catch (err) {
            toast.error(err.message)
        }
    }

    const connectTelegram = async () => {
        setTgLinkLoading(true)
        try {
            const data = await request('/telegram/connect-link', { method: 'POST' })
            if (data?.success && data.url) {
                window.open(data.url, '_blank')
            } else {
                toast.error(data?.error || t('telegram.connectLinkFailed'))
            }
        } catch (err) {
            toast.error(err.message)
        } finally {
            setTgLinkLoading(false)
        }
    }

    const disconnectTelegram = async () => {
        try {
            await request('/integrations/telegram', { method: 'DELETE' })
            setTgStatus({ configured: tgStatus.configured, connected: false })
            toast.success(t('telegram.disconnected'))
        } catch (err) {
            toast.error(err.message)
        }
    }

    const load = async () => {
        try {
            setLoading(true)
            const res = await integrationsApi.status()
            setStatuses(res.data || {})
            const wh = await integrationsApi.webhooks()
            setWebhooks(wh.data || [])
        } catch (err) {
            console.warn('[IntegrationsTab] load failed:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load(); loadVkStatus(); loadTgStatus() }, [])

    const test = async (id) => {
        setLoading(id)
        setResult(null)
        try {
            let res
            if (id === 'whatsapp') res = await integrationsApi.sendWhatsApp({ phone: form.phone, message: form.message })
            else if (id === 'slack') res = await integrationsApi.sendSlack({ channel: form.channel, text: form.text })
            else if (id === 'discord') res = await integrationsApi.sendDiscord({ channelId: form.channelId, content: form.text })
            else if (id === 'notion') res = await integrationsApi.createNotionPage({ databaseId: form.databaseId, title: form.title, content: form.content, tags: (form.tags || '').split(',').map(s => s.trim()).filter(Boolean) })
            else if (id === 'clickup') res = await integrationsApi.createClickUpTask({ listId: form.listId, name: form.name, description: form.description, dueDate: form.dueDate })
            else if (id === 'trello') res = await integrationsApi.createTrelloCard({ listId: form.listId, name: form.name, desc: form.description })
            else if (id === 'shopify') res = await integrationsApi.getShopifyProducts(form.limit || 5)
            setResult({ id, ...res })
        } catch (err) {
            setResult({ id, error: err.message })
        } finally {
            setLoading(false)
        }
    }

    const createWebhook = async (e) => {
        e.preventDefault()
        setCreatingWebhook(true)
        try {
            await integrationsApi.createWebhook({ ...webhookForm, events: webhookForm.events.split(',').map(s => s.trim()).filter(Boolean) })
            setWebhookForm({ name: '', url: '', events: '*', secret: '' })
            load()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setCreatingWebhook(false)
        }
    }

    const deleteWebhook = async (id) => {
        if (!confirm('Удалить webhook?')) return
        try {
            await integrationsApi.deleteWebhook(id)
            load()
        } catch (err) {
            toast.error(err.message)
        }
    }

    const toggleWebhook = async (wh) => {
        try {
            await integrationsApi.updateWebhook(wh._id, { isActive: !wh.isActive })
            load()
        } catch (err) {
            toast.error(err.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Plug size={18} className="text-blue-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">{t('socials.integrationsTitle')}</h2>
                </div>
                <button type="button" onClick={load} disabled={loading === true} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 disabled:opacity-50"><RefreshCw size={16} className={loading === true ? 'animate-spin' : ''} /></button>
            </div>

            <div className="flex gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto no-scrollbar">
                {['social', 'external', 'webhooks'].map(tabId => (
                    <button type="button" key={tabId} onClick={() => setTab(tabId)} className={`shrink-0 px-4 py-2 text-sm rounded-t-lg ${tab === tabId ? 'text-[var(--text)] border-b-2 border-[#8b5cf6] bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
                        {t(`socials.tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`)}
                    </button>
                ))}
            </div>

            {tab === 'social' && (
                <div className="space-y-4">
                    {/* VK Connect Card */}
                    <div className="glass-card p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#0077FF] flex items-center justify-center text-white font-bold">
                                    <VKIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text)]">{t('vk.title')}</h3>
                                    <p className="text-xs text-[var(--text-muted)]">{t('vk.description')}</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${vkStatus.connected ? 'bg-emerald-500/20 text-emerald-400' : vkStatus.configured ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {vkStatus.connected ? t('vk.connected') : vkStatus.configured ? t('vk.ready') : t('vk.notConfigured')}
                            </div>
                        </div>

                        {vkStatus.connected && vkStatus.accountName && (
                            <p className="text-sm text-[var(--text-muted)] mb-3">{t('vk.account', { name: vkStatus.accountName })}</p>
                        )}

                        {vkStatus.connected ? (
                            <button onClick={disconnectVK} className="w-full px-4 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10 transition flex items-center justify-center gap-2">
                                {t('vk.disconnect')}
                            </button>
                        ) : vkStatus.configured ? (
                            <button onClick={connectVK} className="w-full px-4 py-2 bg-[#0077FF] text-white rounded-lg hover:scale-[1.02] transition flex items-center justify-center gap-2">
                                <ExternalLink size={16} /> {t('vk.connect')}
                            </button>
                        ) : (
                            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-[var(--text-muted)]">
                                {t('vk.configureHint')}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {data.integrations.map(integ => {
                        const isTelegram = integ.id === 'telegram'
                        const handleConnect = () => {
                            if (isTelegram) {
                                connectTelegram()
                                return
                            }
                            data.toggleIntegration(integ.id)
                        }
                        const tgConnected = isTelegram ? tgStatus.connected : integ.connected
                        const tgConfigured = isTelegram ? tgStatus.configured : true
                        const tgUsername = isTelegram ? tgStatus.username : null
                        return (
                            <div key={integ.id} className="group relative p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--primary)]/5 hover:-translate-y-0.5 overflow-hidden">
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${integ.id === 'telegram' ? 'from-blue-400/10 to-cyan-400/5' : 'from-[var(--primary)]/5 to-transparent'}`} />
                                <div className="relative flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integ.id === 'telegram' ? 'from-blue-400 to-cyan-400' : 'from-[var(--primary)] to-fuchsia-500'} flex items-center justify-center text-white shadow-lg`}>
                                            {integ.id === 'telegram' ? <Send size={22} /> : <span className="text-xl">{icons[integ.id] || '🔗'}</span>}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-[var(--text)]">{integ.name}</div>
                                            <div className={`text-xs ${tgConnected ? 'text-emerald-400' : 'text-gray-400'}`}>
                                                {isTelegram
                                                    ? (tgConnected ? t('telegram.connected') : (tgConfigured ? t('telegram.notConnected') : t('telegram.notConfigured')))
                                                    : (integ.connected ? t('vk.connected') : t('vk.notConnected'))}
                                            </div>
                                        </div>
                                    </div>
                                    {isTelegram && tgConnected ? (
                                        <button type="button" onClick={disconnectTelegram} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                                            {t('telegram.disconnect')}
                                        </button>
                                    ) : (
                                        <button type="button" onClick={handleConnect} disabled={isTelegram && !tgConfigured} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${integ.connected || tgConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                            {isTelegram && tgLinkLoading ? '...' : (integ.connected || tgConnected ? t('vk.manage') : t('vk.connect'))}
                                        </button>
                                    )}
                                </div>
                                <p className="relative text-xs text-[var(--text-muted)] mb-3">
                                    {isTelegram
                                        ? (tgConnected && tgUsername ? t('telegram.account', { username: tgUsername }) : t('telegram.description'))
                                        : (integ.id === 'youtube' ? 'Shorts, видео, аналитика' : integ.id === 'tiktok' ? 'Reels, тренды, вирусность' : integ.id === 'instagram' ? 'Посты, Reels, Stories' : 'Социальная сеть')}
                                </p>
                                {integ.connected && (
                                    <div className="relative grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
                                        <div className="text-center"><div className="text-[10px] uppercase tracking-wider text-gray-500">Подписчики</div><div className="text-sm font-semibold text-[var(--text)]">{integ.followers?.toLocaleString()}</div></div>
                                        <div className="text-center"><div className="text-[10px] uppercase tracking-wider text-gray-500">Просмотры</div><div className="text-sm font-semibold text-[var(--text)]">{integ.views}</div></div>
                                        <div className="text-center"><div className="text-[10px] uppercase tracking-wider text-gray-500">Синхронизация</div><div className="text-sm font-semibold text-[var(--text)]">{integ.lastSync}</div></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
            )}

            {tab === 'external' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INTEGRATIONS.map(integ => {
                        const st = statuses[integ.id] || {}
                        const configured = st.status === 'configured'
                        const Icon = integ.icon
                        return (
                            <div key={integ.id} className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border)] transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${integ.color}`}><Icon size={20} /></div>
                                        <div>
                                            <div className="text-sm font-semibold text-[var(--text)]">{integ.name}</div>
                                            <div className={`text-xs ${configured ? 'text-emerald-400' : 'text-red-400'}`}>{configured ? 'Подключено' : 'Не подключено'}</div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setActiveForm(activeForm === integ.id ? null : integ.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-400 hover:bg-white/10 transition-colors">{activeForm === integ.id ? 'Скрыть' : 'Настроить / Тест'}</button>
                                </div>
                                {!configured && (
                                    <div className="text-xs text-gray-500 mb-3">
                                        <div className="font-medium mb-1">Как подключить:</div>
                                        <ol className="list-decimal list-inside space-y-0.5">
                                            {integ.setup.map((s, i) => <li key={i}>{s}</li>)}
                                        </ol>
                                        <div className="mt-2">Env vars: {integ.env.join(', ')}</div>
                                    </div>
                                )}
                                {activeForm === integ.id && (
                                    <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                                        {integ.id === 'whatsapp' && <>
                                            <input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Телефон (79990001122)" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                            <input value={form.message || ''} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Сообщение" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                        </>}
                                        {(integ.id === 'slack' || integ.id === 'discord') && <>
                                            <input value={form.channel || form.channelId || ''} onChange={e => setForm(p => ({ ...p, channel: e.target.value, channelId: e.target.value }))} placeholder={integ.id === 'slack' ? 'Канал (#general)' : 'Channel ID'} className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                            <input value={form.text || ''} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} placeholder="Текст сообщения" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                        </>}
                                        {integ.id === 'notion' && <>
                                            <input value={form.databaseId || ''} onChange={e => setForm(p => ({ ...p, databaseId: e.target.value }))} placeholder="Database ID" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                            <input value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Заголовок страницы" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                            <input value={form.content || ''} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Содержание" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                            <input value={form.tags || ''} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="Теги через запятую" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                        </>}
                                        {(integ.id === 'clickup' || integ.id === 'trello') && <>
                                            <input value={form.listId || ''} onChange={e => setForm(p => ({ ...p, listId: e.target.value }))} placeholder="List ID" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                            <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Название задачи/карточки" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                            <input value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Описание" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                            {integ.id === 'clickup' && <input type="date" value={form.dueDate || ''} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />}
                                        </>}
                                        {integ.id === 'shopify' && <>
                                            <input type="number" value={form.limit || 5} onChange={e => setForm(p => ({ ...p, limit: e.target.value }))} placeholder="Limit" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                                        </>}
                                        <button type="button" onClick={() => test(integ.id)} disabled={loading === integ.id} className="w-full py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-[var(--text)] text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                                            <Send size={14} /> {loading === integ.id ? '...' : 'Отправить тест'}
                                        </button>
                                        {result?.id === integ.id && (
                                            <div className={`text-xs p-2 rounded-lg ${result.error || result.status === 'not_configured' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                {result.error || result.status === 'not_configured' ? (result.message || result.error) : 'Успешно отправлено'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {tab === 'webhooks' && (
                <div className="space-y-4">
                    <form onSubmit={createWebhook} className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] space-y-3">
                        <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2"><Webhook size={16} className="text-[#8b5cf6]" /> Новый webhook (Zapier / Make)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input value={webhookForm.name} onChange={e => setWebhookForm(p => ({ ...p, name: e.target.value }))} placeholder="Название" required className="bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                            <input value={webhookForm.url} onChange={e => setWebhookForm(p => ({ ...p, url: e.target.value }))} placeholder="https://hooks.zapier.com/..." required className="bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                        </div>
                        <input value={webhookForm.events} onChange={e => setWebhookForm(p => ({ ...p, events: e.target.value }))} placeholder="События через запятую: new_post, payment, omega_alert (или *)" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                        <input value={webhookForm.secret} onChange={e => setWebhookForm(p => ({ ...p, secret: e.target.value }))} placeholder="Секрет для подписи (опционально)" className="w-full bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none" />
                        <button type="submit" disabled={creatingWebhook} className="px-4 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-[var(--text)] text-sm font-medium flex items-center gap-2 disabled:opacity-50"><Plus size={16} /> Добавить</button>
                    </form>

                    <div className="space-y-2">
                        {webhooks.map(wh => (
                            <div key={wh._id} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-[var(--text)] truncate">{wh.name}</div>
                                    <div className="text-xs text-gray-500 truncate">{wh.url}</div>
                                    <div className="text-xs text-gray-600 mt-1">events: {wh.events.join(', ')} · last: {wh.lastStatus || '—'} · {wh.isActive ? <span className="text-emerald-400">active</span> : <span className="text-red-400">paused</span>}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => toggleWebhook(wh)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">{wh.isActive ? <X size={14} /> : <Check size={14} />}</button>
                                    <button type="button" onClick={() => integrationsApi.triggerWebhooks('manual', { test: true }).then(() => toast.success('Triggered')).catch(e => toast.error(e.message))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400"><Send size={14} /></button>
                                    <button type="button" onClick={() => deleteWebhook(wh._id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-[var(--border)] text-xs text-gray-400">
                        <div className="font-medium text-[var(--text)] mb-2">Шаблоны Zapier / Make:</div>
                        <div className="space-y-1">
                            <div>• Новый пост → Google Sheets</div>
                            <div>• Новый лид → CRM (Bitrix24/AmoCRM)</div>
                            <div>• Оплата → Telegram-уведомление</div>
                        </div>
                        <div className="mt-2 text-gray-500">Подпись: <code className="text-[#00ff41]">X-Webhook-Signature = HMAC-SHA256(body, secret)</code></div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default IntegrationsTab
