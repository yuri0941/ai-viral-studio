import { useState } from 'react'
import { Instagram, Youtube, Music2, Send, MessageCircle, ArrowRight, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const OAUTH_BUTTONS = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600', soon: false },
    { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'from-cyan-400 to-blue-500', soon: true },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-700', soon: false },
    { id: 'telegram', name: 'Telegram', icon: Send, color: 'from-sky-400 to-blue-600', soon: false },
    { id: 'vk', name: 'VK', icon: MessageCircle, color: 'from-blue-500 to-blue-700', soon: true },
]

function StepConnect({ value = [], onChange, onSkip }) {
    const { user } = useAuth()
    const connect = (id) => {
        if (!value.includes(id)) {
            onChange([...value, id])
        }
    }

    const isTelegramConnected = user?.socialAccounts?.telegram?.connected || user?.socials?.telegram?.enabled
    const isVkConnected = user?.socialAccounts?.vk?.connected || user?.socials?.vk?.enabled

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Подключите соцсети</h2>
                <p className="text-gray-400">Публикация в 1 клик и аналитика в одном окне</p>
            </div>

            {(isTelegramConnected || isVkConnected) && (
                <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-200">
                    <div className="flex items-center gap-2 mb-2 font-medium">
                        <Check className="w-4 h-4" /> Авто-подключение доступно
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {isTelegramConnected && !value.includes('telegram') && (
                            <button
                                type="button"
                                onClick={() => connect('telegram')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 text-xs transition-colors"
                            >
                                + Telegram из профиля
                            </button>
                        )}
                        {isVkConnected && !value.includes('vk') && (
                            <button
                                type="button"
                                onClick={() => connect('vk')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 text-xs transition-colors"
                            >
                                + VK из профиля
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {OAUTH_BUTTONS.map(b => {
                    const Icon = b.icon
                    const connected = value.includes(b.id)
                    return (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => !b.soon && connect(b.id)}
                            disabled={b.soon}
                            className={`relative p-4 rounded-2xl border text-left transition-all ${
                                connected
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : b.soon
                                        ? 'bg-white/[0.03] border-white/5 opacity-50 cursor-not-allowed'
                                        : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                            }`}
                        >
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center mb-2`}>
                                <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="font-medium text-white text-sm flex items-center gap-1">
                                {b.name}
                                {b.soon && <span className="text-[10px] text-gray-500">(soon)</span>}
                            </div>
                            {connected && <div className="text-[10px] text-emerald-400 mt-1">Подключено</div>}
                        </button>
                    )
                })}
            </div>

            <div className="text-center">
                <button
                    type="button"
                    onClick={onSkip}
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Пропустить <ArrowRight size={16} />
                </button>
            </div>
        </div>
    )
}

export default StepConnect
