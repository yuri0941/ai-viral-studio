// ============================================
// OmegaPanel — виджет OMEGA в OverviewTab
// ============================================

import { useState } from 'react'
import { Brain, Zap, MessageSquare, TrendingUp, Shield } from 'lucide-react'
import { useOmega } from '../../hooks/useOmega.js'
import { OmegaChatContainer } from './OmegaChat.jsx'
import { OmegaStatusBar } from './OmegaStatusBar.jsx'

export function OmegaPanel() {
    const omega = useOmega()
    const [expanded, setExpanded] = useState(false)

    const quickActions = [
        { id: 'revenue_forecast', label: 'Прогноз', icon: TrendingUp },
        { id: 'security_monitor', label: 'Безопасность', icon: Shield },
        { id: 'campaign_optimizer', label: 'Реклама', icon: Zap },
    ]

    const runSkill = async (skillId) => {
        await omega.executeSkill(skillId, {
            payments: [],
            campaigns: [],
            logs: [],
        })
    }

    return (
        <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                        <Brain size={20} className="text-white" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white">OMEGA Core</div>
                        <div className="text-[10px] text-gray-500">AI-ассистент платформы</div>
                    </div>
                </div>
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                    {expanded ? 'Свернуть' : 'Развернуть'}
                </button>
            </div>

            <OmegaStatusBar status={omega.status} />

            <div className="flex items-center gap-2 mt-4">
                {quickActions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => runSkill(action.id)}
                        disabled={omega.isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <action.icon size={12} /> {action.label}
                    </button>
                ))}
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-xs text-purple-400 hover:bg-purple-500/20 transition-colors">
                    <MessageSquare size={12} /> Чат
                </button>
            </div>

            {expanded && (
                <div className="mt-4 h-[360px]">
                    <OmegaChatContainer />
                </div>
            )}
        </div>
    )
}

export default OmegaPanel
