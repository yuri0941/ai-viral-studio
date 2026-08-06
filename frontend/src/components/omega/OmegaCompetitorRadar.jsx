import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Zap, Shield, Bot, Moon, Wrench, Code, Mic, Globe, Cpu, Sparkles } from 'lucide-react'

const DATA = [
    { axis: 'Автономность', us: 95, chatgpt: 20, claude: 15, kimi: 10, pippit: 30, descript: 25 },
    { axis: 'Память', us: 90, chatgpt: 30, claude: 25, kimi: 20, pippit: 10, descript: 15 },
    { axis: 'Скорость', us: 85, chatgpt: 95, claude: 90, kimi: 85, pippit: 70, descript: 75 },
    { axis: 'Дизайн', us: 95, chatgpt: 60, claude: 65, kimi: 50, pippit: 80, descript: 85 },
    { axis: 'Мобильность', us: 90, chatgpt: 40, claude: 35, kimi: 30, pippit: 75, descript: 60 },
    { axis: 'Цена', us: 80, chatgpt: 70, claude: 75, kimi: 80, pippit: 60, descript: 50 },
]

const COLORS = {
    us: '#8B5CF6',
    chatgpt: '#10a37f',
    claude: '#d97757',
    kimi: '#3b82f6',
    pippit: '#f59e0b',
    descript: '#ef4444',
}

const FEATURES = [
    { icon: Cpu, text: 'OMEGA Neural Graph — 8 слоёв памяти (у конкурентов нет)' },
    { icon: Moon, text: 'Auto-Pilot + Dream Mode — работает ночью (у конкурентов нет)' },
    { icon: Bot, text: 'Swarm AI — 50 агентов (у конкурентов 1)' },
    { icon: Shield, text: 'Self-Healing — чинит сама (у конкурентов нет)' },
    { icon: Code, text: 'DevStudio — пишет код под твой проект (у конкурентов нет)' },
    { icon: Mic, text: 'Voice + Vision + Code Interpreter в одном чате' },
    { icon: Zap, text: '11 AI-провайдеров fallback (у конкурентов 1)' },
    { icon: Globe, text: 'Russia-ready: ЮKassa, 422-ФЗ, GDPR, Telegram' },
]

export function OmegaCompetitorRadar({ compact = false }) {
    return (
        <div className={`glass-card glow-border rounded-2xl p-6 animate-fade-in-up ${compact ? '' : 'max-w-5xl mx-auto'}`}>
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white">Почему мы лучше</h3>
                <p className="text-sm text-gray-400 mt-1">Сравнение AI Viral Studio с ключевыми конкурентами</p>
            </div>

            <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6`}>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={DATA}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis dataKey="axis" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="AI Viral Studio" dataKey="us" stroke={COLORS.us} fill={COLORS.us} fillOpacity={0.35} />
                            <Radar name="ChatGPT" dataKey="chatgpt" stroke={COLORS.chatgpt} fill={COLORS.chatgpt} fillOpacity={0.05} />
                            <Radar name="Claude" dataKey="claude" stroke={COLORS.claude} fill={COLORS.claude} fillOpacity={0.05} />
                            <Radar name="Kimi" dataKey="kimi" stroke={COLORS.kimi} fill={COLORS.kimi} fillOpacity={0.05} />
                            <Radar name="Pippit" dataKey="pippit" stroke={COLORS.pippit} fill={COLORS.pippit} fillOpacity={0.05} />
                            <Radar name="Descript" dataKey="descript" stroke={COLORS.descript} fill={COLORS.descript} fillOpacity={0.05} />
                            <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white mb-3">🚀 Уникальные фичи AI Viral Studio</h4>
                    {FEATURES.map((f, i) => {
                        const Icon = f.icon
                        return (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed">{f.text}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default OmegaCompetitorRadar
