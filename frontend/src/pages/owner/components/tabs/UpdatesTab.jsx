import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Save, GitBranch, Plus, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ownerChangelogApi } from '../../../../services/api.js'

// [OWNER-OMEGA] редактор changelog модалки обновлений: записи из БД заменяют встроенный changelog.json
const EMPTY_ITEM = { audience: 'all', titleRu: '', titleEn: '', bodyRu: '', bodyEn: '' }

function ChangelogEditor() {
    const { t } = useTranslation()
    const [entries, setEntries] = useState(null)
    const [version, setVersion] = useState('')
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [draft, setDraft] = useState(EMPTY_ITEM)
    const [busy, setBusy] = useState(false)

    const load = () => {
        ownerChangelogApi.list()
            .then(res => setEntries(res?.entries || []))
            .catch(() => setEntries([]))
    }
    useEffect(load, [])

    const addEntry = async () => {
        if (!version.trim() || busy) return
        const hasItem = draft.titleRu.trim() || draft.bodyRu.trim() || draft.titleEn.trim() || draft.bodyEn.trim()
        setBusy(true)
        try {
            await ownerChangelogApi.create({
                version: version.trim(),
                date,
                items: hasItem ? [{
                    audience: draft.audience,
                    title: { ru: draft.titleRu.trim(), en: draft.titleEn.trim() },
                    body: { ru: draft.bodyRu.trim(), en: draft.bodyEn.trim() },
                }] : [],
            })
            toast.success(t('owner.changelog.saved'))
            setVersion('')
            setDraft(EMPTY_ITEM)
            load()
        } catch (e) {
            toast.error(e.message || t('owner.control.error'))
        } finally {
            setBusy(false)
        }
    }

    const removeEntry = async (id) => {
        if (busy) return
        setBusy(true)
        try {
            await ownerChangelogApi.remove(id)
            toast.success(t('owner.changelog.deleted'))
            load()
        } catch (e) {
            toast.error(e.message || t('owner.control.error'))
        } finally {
            setBusy(false)
        }
    }

    const inp = 'w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-violet-500/30'

    return (
        <div className="space-y-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">{t('owner.changelog.title')}</h3>
                <p className="text-xs text-gray-500 mt-1">{t('owner.changelog.liveHint')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={version} onChange={e => setVersion(e.target.value)} placeholder={t('owner.changelog.version')} className={inp} />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={draft.titleRu} onChange={e => setDraft({ ...draft, titleRu: e.target.value })} placeholder={t('owner.changelog.itemTitleRu')} className={inp} />
                <input value={draft.titleEn} onChange={e => setDraft({ ...draft, titleEn: e.target.value })} placeholder={t('owner.changelog.itemTitleEn')} className={inp} />
                <textarea value={draft.bodyRu} onChange={e => setDraft({ ...draft, bodyRu: e.target.value })} rows={2} placeholder={t('owner.changelog.itemBodyRu')} className={`${inp} resize-none`} />
                <textarea value={draft.bodyEn} onChange={e => setDraft({ ...draft, bodyEn: e.target.value })} rows={2} placeholder={t('owner.changelog.itemBodyEn')} className={`${inp} resize-none`} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <select value={draft.audience} onChange={e => setDraft({ ...draft, audience: e.target.value })} className={inp} style={{ width: 'auto' }}>
                    <option value="all">{t('owner.changelog.audAll')}</option>
                    <option value="client">{t('owner.changelog.audClient')}</option>
                    <option value="owner">{t('owner.changelog.audOwner')}</option>
                </select>
                <button type="button" onClick={addEntry} disabled={busy || !version.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm transition-colors">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {t('owner.changelog.addVersion')}
                </button>
            </div>

            {/* Список версий из БД */}
            {entries === null && <div className="h-16 shimmer rounded-2xl" />}
            {entries && entries.length === 0 && (
                <div className="text-xs text-gray-500">{t('owner.changelog.empty')}</div>
            )}
            {entries && entries.length > 0 && (
                <div className="space-y-2">
                    {entries.map(e => (
                        <div key={e._id} className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm text-[var(--text)] font-medium break-words">v{e.version} · {e.date}</div>
                                <button type="button" onClick={() => removeEntry(e._id)} aria-label={t('owner.changelog.delete')}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {(e.items || []).map((it, i) => (
                                <div key={i} className="text-xs text-gray-400 mt-1 break-words">
                                    [{it.audience}] {it.title?.ru || it.title?.en} — {(it.body?.ru || it.body?.en || '').slice(0, 80)}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export function UpdatesTab({ data }) {
    const [version, setVersion] = useState('2.4.1')
    const [notes, setNotes] = useState('')
    const [rolloutPercent, setRolloutPercent] = useState(100)

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
                <RefreshCw size={18} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-[var(--text)]">Обновления системы</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                    <div className="text-xs text-gray-500 mb-1">Текущая версия</div>
                    <div className="text-xl font-bold text-emerald-400">v{version}</div>
                </div>
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                    <div className="text-xs text-gray-500 mb-1">Rollout</div>
                    <div className="text-xl font-bold text-blue-400">{rolloutPercent}%</div>
                </div>
                <div className="glass-luxury glass-luxury-hover rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg hover:shadow-violet-500/10">
                    <div className="text-xs text-gray-500 mb-1">Статус</div>
                    <div className="text-xl font-bold text-emerald-400">Стабильно</div>
                </div>
            </div>

            <div className="space-y-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Версия</label>
                    <input value={version} onChange={e => setVersion(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-emerald-500/30" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Rollout % (Canary)</label>
                    <input type="range" min="0" max="100" value={rolloutPercent} onChange={e => setRolloutPercent(parseInt(e.target.value))}
                        className="w-full accent-emerald-500" />
                    <div className="text-xs text-gray-500 mt-1">{rolloutPercent}% пользователей получат обновление</div>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Changelog</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} placeholder="Что нового в этой версии..."
                        className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-gray-600 outline-none focus:border-emerald-500/30 resize-none" />
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={() => data.showToast('Changelog сохранён')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                        <Save size={14} /> Сохранить
                    </button>
                    <button type="button" onClick={() => data.showToast('Откат выполнен')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 hover:bg-red-500/20 transition-colors">
                        <GitBranch size={14} /> Откатить
                    </button>
                </div>
            </div>

            <ChangelogEditor />
        </div>
    )
}
