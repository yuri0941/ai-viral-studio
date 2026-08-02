import { Instagram, Youtube, Music2, MessageCircle, Send } from 'lucide-react'

const PLATFORMS = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
    { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'from-cyan-400 to-blue-500' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-700' },
    { id: 'telegram', name: 'Telegram', icon: Send, color: 'from-sky-400 to-blue-600' },
    { id: 'vk', name: 'VK', icon: MessageCircle, color: 'from-blue-500 to-blue-700' },
]

function StepSocials({ value = [], onChange }) {
    const toggle = (id) => {
        const next = value.includes(id) ? value.filter(p => p !== id) : [...value, id]
        onChange(next)
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Где публикуете?</h2>
                <p className="text-gray-400">OMEGA адаптирует контент под каждую площадку</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {PLATFORMS.map(p => {
                    const Icon = p.icon
                    const selected = value.includes(p.id)
                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => toggle(p.id)}
                            className={`relative p-5 rounded-2xl border transition-all text-left ${
                                selected
                                    ? 'bg-white/10 border-[#8B5CF6]/50'
                                    : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-3`}>
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="font-medium text-white text-sm">{p.name}</div>
                            {selected && (
                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            <p className="text-center text-xs text-gray-500">Можно выбрать несколько или пропустить шаг</p>
        </div>
    )
}

export default StepSocials
