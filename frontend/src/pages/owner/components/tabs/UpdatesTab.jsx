import { useState } from 'react'
import { RefreshCw, Save, GitBranch } from 'lucide-react'

export function UpdatesTab({ data }) {
    const [version, setVersion] = useState('2.4.1')
    const [notes, setNotes] = useState('')
    const [rolloutPercent, setRolloutPercent] = useState(100)

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
                <RefreshCw size={18} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Обновления системы</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Текущая версия</div>
                    <div className="text-xl font-bold text-emerald-400">v{version}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Rollout</div>
                    <div className="text-xl font-bold text-blue-400">{rolloutPercent}%</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0f0f1a] border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Статус</div>
                    <div className="text-xl font-bold text-emerald-400">Стабильно</div>
                </div>
            </div>

            <div className="space-y-4 p-5 rounded-2xl bg-[#0f0f1a] border border-white/5">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Версия</label>
                    <input value={version} onChange={e => setVersion(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30" />
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
                        className="w-full px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500/30 resize-none" />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => data.showToast('Changelog сохранён')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                        <Save size={14} /> Сохранить
                    </button>
                    <button onClick={() => data.showToast('Откат выполнен')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 hover:bg-red-500/20 transition-colors">
                        <GitBranch size={14} /> Откатить
                    </button>
                </div>
            </div>
        </div>
    )
}
