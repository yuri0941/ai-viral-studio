import { useState, useEffect } from 'react'
import { StatusBadge } from '../common/StatusBadge'
import { Plug, RefreshCw, Send, MessageCircle, Hash, FileText, CheckSquare, Trello, ShoppingBag, Globe, Webhook, Plus, Trash2, Check, X, ExternalLink } from 'lucide-react'
import { integrationsApi } from '../../../../services/api'

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
    const icons = { youtube: '▶️', tiktok: '🎵', instagram: '📷', telegram: '✈️' }
    const [statuses, setStatuses] = useState({})
    const [loading, setLoading] = useState(false)
    const [activeForm, setActiveForm] = useState(null)
    const [form, setForm] = useState({})
    const [result, setResult] = useState(null)
    const [webhooks, setWebhooks] = useState([])
    const [webhookForm, setWebhookForm] = useState({ name: '', url: '', events: ['*'], secret: '' })
    const [tab, setTab] = useState('social')

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

    useEffect(() => { load() }, [])

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
        try {
            await integrationsApi.createWebhook({ ...webhookForm, events: webhookForm.events.split(',').map(s => s.trim()).filter(Boolean) })
            setWebhookForm({ name: '', url: '', events: '*', secret: '' })
            load()
        } catch (err) {
            alert(err.message)
        }
    }

    const deleteWebhook = async (id) => {
        if (!confirm('Удалить webhook?')) return
        try {
            await integrationsApi.deleteWebhook(id)
            load()
        } catch (err) {
            alert(err.message)
        }
    }

    const toggleWebhook = async (wh) => {
        try {
            await integrationsApi.updateWebhook(wh._id, { isActive: !wh.isActive })
            load()
        } catch (err) {
            alert(err.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Plug size={18} className="text-blue-400" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">Интеграции</h2>
                </div>
                <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            </div>

            <div className="flex gap-2 border-b border-[var(--border)] pb-2">
                {['social', 'external', 'webhooks'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm rounded-t-lg ${tab === t ? 'text-[var(--text)] border-b-2 border-[#8b5cf6] bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
                        {t === 'social' ? 'Соцсети' : t === 'external' ? 'Внешние сервисы' : 'Webhooks / Zapier'}
                    </button>
                ))}
            </div>

            {tab === 'social' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.integrations.map(integ => (
                        <div key={integ.id} className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border)] transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">{icons[integ.id] || '🔗'}</div>
                                    <div>
                                        <div className="text-sm font-semibold text-[var(--text)]">{integ.name}</div>
                                        <StatusBadge status={integ.status} pulse={integ.status === 'active'} />
                                    </div>
                                </div>
                                <button onClick={() => data.toggleIntegration(integ.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${integ.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-[var(--border)]'}`}>{integ.connected ? 'Подключено' : 'Подключить'}</button>
                            </div>
                            {integ.connected && (
                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
                                    <div className="text-center"><div className="text-xs text-gray-500">Подписчики</div><div className="text-sm font-medium text-[var(--text)]">{integ.followers?.toLocaleString()}</div></div>
                                    <div className="text-center"><div className="text-xs text-gray-500">Просмотры</div><div className="text-sm font-medium text-[var(--text)]">{integ.views}</div></div>
                                    <div className="text-center"><div className="text-xs text-gray-500">Синхронизация</div><div className="text-sm font-medium text-[var(--text)]">{integ.lastSync}</div></div>
                                </div>
                            )}
                        </div>
                    ))}
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
                                    <button onClick={() => setActiveForm(activeForm === integ.id ? null : integ.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-400 hover:bg-white/10 transition-colors">{activeForm === integ.id ? 'Скрыть' : 'Настроить / Тест'}</button>
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
                                        <button onClick={() => test(integ.id)} disabled={loading === integ.id} className="w-full py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-[var(--text)] text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
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
                        <button type="submit" className="px-4 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-[var(--text)] text-sm font-medium flex items-center gap-2"><Plus size={16} /> Добавить</button>
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
                                    <button onClick={() => toggleWebhook(wh)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">{wh.isActive ? <X size={14} /> : <Check size={14} />}</button>
                                    <button onClick={() => integrationsApi.triggerWebhooks('manual', { test: true }).then(() => alert('Triggered')).catch(e => alert(e.message))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400"><Send size={14} /></button>
                                    <button onClick={() => deleteWebhook(wh._id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
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
