import { StatusBadge } from '../common/StatusBadge'
import { Plug, RefreshCw } from 'lucide-react'

export function IntegrationsTab({ data }) {
    const icons = {
        youtube: '▶️', tiktok: '🎵', instagram: '📷', telegram: '✈️'
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Plug size={18} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Интеграции</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.integrations.map(integ => (
                    <div key={integ.id} className="p-5 rounded-2xl bg-[#0f0f1a] border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">{icons[integ.id] || '🔗'}</div>
                                <div>
                                    <div className="text-sm font-semibold text-white">{integ.name}</div>
                                    <StatusBadge status={integ.status} pulse={integ.status === 'active'} />
                                </div>
                            </div>
                            <button
                                onClick={() => data.toggleIntegration(integ.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${integ.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                            >
                                {integ.connected ? 'Подключено' : 'Подключить'}
                            </button>
                        </div>
                        {integ.connected && (
                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                                <div className="text-center"><div className="text-xs text-gray-500">Подписчики</div><div className="text-sm font-medium text-white">{integ.followers?.toLocaleString()}</div></div>
                                <div className="text-center"><div className="text-xs text-gray-500">Просмотры</div><div className="text-sm font-medium text-white">{integ.views}</div></div>
                                <div className="text-center"><div className="text-xs text-gray-500">Синхронизация</div><div className="text-sm font-medium text-white">{integ.lastSync}</div></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
