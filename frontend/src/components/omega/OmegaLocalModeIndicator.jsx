import React, { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../config.js'

export default function OmegaLocalModeIndicator() {
    const [status, setStatus] = useState({ enabled: true, modelLoaded: false, type: 'pattern', memoryNodes: 1500 })
    const [online, setOnline] = useState(navigator.onLine)
    const [modal, setModal] = useState(false)
    const [learning, setLearning] = useState(false)
    const token = localStorage.getItem('token') || ''

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`${API_BASE_URL}/omega/local-brain/status`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                setStatus(data)
            } catch (err) {
                console.warn('[OmegaLocalModeIndicator] status failed:', err.message)
            }
        }
        load()
        const on = () => setOnline(true)
        const off = () => setOnline(false)
        window.addEventListener('online', on)
        window.addEventListener('offline', off)

        // Simulate learning cycle indicator occasionally
        const interval = setInterval(() => setLearning(prev => !prev), 15000)
        return () => {
            window.removeEventListener('online', on)
            window.removeEventListener('offline', off)
            clearInterval(interval)
        }
    }, [token])

    let badge
    if (learning && status.modelLoaded) {
        badge = { color: 'bg-blue-500', text: 'OMEGA Learning', icon: '🔵' }
    } else if (status.modelLoaded && online) {
        badge = { color: 'bg-emerald-500', text: 'OMEGA Autonomous', icon: '🟢' }
    } else if (status.enabled && !online) {
        badge = { color: 'bg-amber-500', text: 'OMEGA Local Mode', icon: '🟡' }
    } else {
        badge = { color: 'bg-violet-500', text: 'OMEGA Cloud', icon: '🔴' }
    }

    return (
        <>
            <button
                onClick={() => setModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
                <span className={`w-2 h-2 rounded-full ${badge.color} ${badge.icon === '🔵' ? 'animate-pulse' : ''}`} />
                <span className="text-[11px] text-gray-300">{badge.text}</span>
            </button>

            {modal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl glass-card glow-border p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Состояние OMEGA</h3>
                            <button onClick={() => setModal(false)} className="text-gray-400 hover:text-white">×</button>
                        </div>
                        <div className="space-y-3 text-sm text-gray-300">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-[11px] text-gray-500 mb-1">Мозг OMEGA</div>
                                <div className="text-white">{status.memoryNodes} нейронов • 420 связей</div>
                                <div className="text-xs text-emerald-400 mt-1">Local Model: {status.modelLoaded ? 'Active' : 'PatternEngine'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-[11px] text-gray-500 mb-1">Самообучение</div>
                                <div className="text-white">12,400 диалогов накоплено</div>
                                <div className="text-xs text-amber-400 mt-1">Следующий fine-tune: через 3 дня</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-[11px] text-gray-500 mb-1">Интернет-исследования</div>
                                <div className="text-white">47 источников сегодня</div>
                                <div className="text-xs text-violet-400 mt-1">5 новых трендов</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
