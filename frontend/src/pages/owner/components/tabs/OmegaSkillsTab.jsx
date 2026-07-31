import { useState } from 'react'
import { Brain, Zap, Shield, TrendingUp, BarChart, MessageSquare, Eye, Code, Bot, Loader2 } from 'lucide-react'

const ICONS = {
    TrendingUp, BarChart, Shield, Zap, MessageSquare, Eye, Code, Bot,
}

const INITIAL_SKILLS = [
    { id: 'pricing', name: 'Pricing Agent', category: 'finance', icon: 'TrendingUp', level: 3, maxLevel: 10, xp: 240, xpToNext: 500, description: 'Анализ цен конкурентов' },
    { id: 'revenue', name: 'Revenue Agent', category: 'finance', icon: 'BarChart', level: 4, maxLevel: 10, xp: 380, xpToNext: 500, description: 'Прогноз доходов' },
    { id: 'security', name: 'Security Agent', category: 'security', icon: 'Shield', level: 5, maxLevel: 10, xp: 420, xpToNext: 500, description: 'Мониторинг угроз' },
    { id: 'growth', name: 'Growth Agent', category: 'marketing', icon: 'Zap', level: 2, maxLevel: 10, xp: 120, xpToNext: 500, description: 'Рекомендации по росту' },
    { id: 'support', name: 'Support Agent', category: 'support', icon: 'MessageSquare', level: 6, maxLevel: 10, xp: 560, xpToNext: 500, description: 'Авто-ответы' },
    { id: 'content', name: 'Content Agent', category: 'content', icon: 'Eye', level: 4, maxLevel: 10, xp: 300, xpToNext: 500, description: 'Модерация контента' },
    { id: 'code', name: 'Code Agent', category: 'dev', icon: 'Code', level: 1, maxLevel: 10, xp: 50, xpToNext: 500, description: 'Генерация кода' },
    { id: 'orchestrator', name: 'Orchestrator', category: 'system', icon: 'Bot', level: 7, maxLevel: 10, xp: 700, xpToNext: 500, description: 'Оркестрация агентов' },
]

const CATEGORIES = [
    { id: 'all', label: 'Все', color: 'gray' },
    { id: 'finance', label: 'Финансы', color: 'emerald' },
    { id: 'security', label: 'Безопасность', color: 'red' },
    { id: 'marketing', label: 'Маркетинг', color: 'purple' },
    { id: 'support', label: 'Поддержка', color: 'blue' },
    { id: 'content', label: 'Контент', color: 'orange' },
    { id: 'dev', label: 'Разработка', color: 'yellow' },
    { id: 'system', label: 'Система', color: 'pink' },
]

const COLORS = {
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    pink: 'bg-pink-500',
    gray: 'bg-gray-500',
}

export function OmegaSkillsTab({ data }) {
    const { showToast } = data
    const [filter, setFilter] = useState('all')
    const [skills, setSkills] = useState(() => {
        try {
            const saved = localStorage.getItem('owner_omega_skills')
            return saved ? JSON.parse(saved) : INITIAL_SKILLS
        } catch {
            return INITIAL_SKILLS
        }
    })
    const [training, setTraining] = useState(null)

    const save = (next) => {
        setSkills(next)
        localStorage.setItem('owner_omega_skills', JSON.stringify(next))
    }

    const train = (id) => {
        if (training) return
        setTraining(id)
        setTimeout(() => {
            save(skills.map(s => {
                if (s.id !== id) return s
                let xp = s.xp + 75
                let level = s.level
                let xpToNext = s.xpToNext
                if (xp >= xpToNext && level < s.maxLevel) {
                    level += 1
                    xp = xp - xpToNext
                    xpToNext = Math.round(xpToNext * 1.2)
                }
                return { ...s, xp, level, xpToNext }
            }))
            setTraining(null)
            showToast?.('Навык улучшен')
        }, 1200)
    }

    const filtered = filter === 'all' ? skills : skills.filter(s => s.category === filter)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Brain size={20} className="text-purple-400" />
                    <h2 className="text-lg font-semibold text-white">OMEGA Skills</h2>
                </div>
                <div className="text-xs text-gray-500">Всего навыков: {skills.length}</div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setFilter(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                            filter === c.id
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            {/* Skills grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {filtered.map(skill => {
                    const Icon = ICONS[skill.icon] || Bot
                    const progress = Math.min(100, Math.round((skill.xp / skill.xpToNext) * 100))
                    return (
                        <div key={skill.id} className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5 hover:border-white/10 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                                    <Icon size={18} className="text-white" />
                                </div>
                                <div className="text-xs text-gray-500">Lv.{skill.level}/{skill.maxLevel}</div>
                            </div>
                            <div className="text-sm font-medium text-white mb-1">{skill.name}</div>
                            <div className="text-[10px] text-gray-500 mb-4">{skill.description}</div>

                            <div className="mb-2">
                                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                                    <span>XP</span>
                                    <span>{skill.xp}/{skill.xpToNext}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${COLORS[CATEGORIES.find(c => c.id === skill.category)?.color || 'gray']} transition-all`} style={{ width: `${progress}%` }} />
                                </div>
                            </div>

                            <button
                                onClick={() => train(skill.id)}
                                disabled={training === skill.id || skill.level >= skill.maxLevel}
                                className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
                            >
                                {training === skill.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                {training === skill.id ? 'Обучение...' : skill.level >= skill.maxLevel ? 'Макс. уровень' : 'Тренировать'}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default OmegaSkillsTab
