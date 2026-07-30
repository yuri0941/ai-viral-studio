// ============================================
// OmegaStatusBar — что делает OMEGA сейчас
// ============================================

import { Brain, Activity, Zap, AlertCircle, Server } from 'lucide-react'
import { StatusBadge } from '../../pages/owner/components/common/StatusBadge'

const STATE_META = {
    idle: { label: 'Ожидает', color: 'gray', icon: Brain },
    thinking: { label: 'Думает', color: 'purple', icon: Activity },
    executing: { label: 'Выполняет', color: 'emerald', icon: Zap },
    learning: { label: 'Обучается', color: 'blue', icon: Activity },
    paused: { label: 'Пауза', color: 'yellow', icon: AlertCircle },
    error: { label: 'Ошибка', color: 'red', icon: AlertCircle },
}

export function OmegaStatusBar({ status }) {
    if (!status) return null

    const meta = STATE_META[status.state] || STATE_META.idle
    const Icon = meta.icon

    return (
        <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${meta.color}-500/10`}>
                        <Icon size={18} className={`text-${meta.color}-400`} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-white">OMEGA Core</div>
                        <div className="text-[10px] text-gray-500">
                            Провайдер: <span className="text-gray-300">{status.activeProvider || '—'}</span>
                        </div>
                    </div>
                </div>
                <StatusBadge status={status.state === 'error' ? 'error' : status.state === 'executing' ? 'active' : status.state === 'thinking' ? 'warning' : 'online'} label={meta.label} pulse={status.state === 'thinking' || status.state === 'executing'} />
            </div>

            {/* Current task */}
            {status.currentTask && (
                <div className="mb-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-[10px] text-gray-500 mb-1">Текущая задача</div>
                    <div className="text-xs text-white flex items-center gap-2">
                        <Server size={12} className="text-purple-400" />
                        {status.currentTask.skillId || status.currentTask.toolId}
                    </div>
                </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-white/[0.02]">
                    <div className="text-xs font-medium text-white">{status.metrics?.requestsTotal || 0}</div>
                    <div className="text-[9px] text-gray-500">Запросы</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02]">
                    <div className="text-xs font-medium text-white">{status.metrics?.decisionsTotal || 0}</div>
                    <div className="text-[9px] text-gray-500">Решения</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02]">
                    <div className="text-xs font-medium text-white">{status.metrics?.skillsExecuted || 0}</div>
                    <div className="text-[9px] text-gray-500">Навыки</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02]">
                    <div className="text-xs font-medium text-white">{status.metrics?.errorsTotal || 0}</div>
                    <div className="text-[9px] text-gray-500">Ошибки</div>
                </div>
            </div>
        </div>
    )
}

export default OmegaStatusBar
