import { useState } from 'react'
import { Code2, Rocket, Layout, Bot, Globe, Cpu, CheckCircle, ChevronRight, Terminal } from 'lucide-react'
import { StatusBadge } from '../common/StatusBadge'

const STORAGE_KEY = 'owner_devstudio_projects'

const TEMPLATES = [
    { id: 'webapp', name: 'Веб-приложение', icon: Layout, color: 'blue', description: 'React + Node.js + MongoDB' },
    { id: 'landing', name: 'Лендинг', icon: Globe, color: 'emerald', description: 'Vite + Tailwind + анимации' },
    { id: 'telegram', name: 'Telegram-бот', icon: Bot, color: 'purple', description: 'Node.js + Telegraf' },
    { id: 'api', name: 'API-сервис', icon: Cpu, color: 'orange', description: 'Express + OpenAPI' },
    { id: 'extension', name: 'Chrome Extension', icon: Code2, color: 'yellow', description: 'Manifest V3 + React' },
]

const PHASES = [
    { id: 'research', label: 'Исследование', description: 'Анализ требований и рынка' },
    { id: 'concept', label: 'Концепция', description: 'Архитектура и дизайн' },
    { id: 'approval', label: 'Одобрение', description: 'Утверждение у Owner' },
    { id: 'dev', label: 'Разработка', description: 'Спринты и итерации' },
    { id: 'preview', label: 'Превью', description: 'Демо и тестирование' },
    { id: 'deploy', label: 'Деплой', description: 'Запуск в продакшн' },
]

export function DevStudioTab({ data }) {
    const { showToast } = data
    const [projects, setProjects] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    })
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [activeProject, setActiveProject] = useState(null)

    const save = (next) => {
        setProjects(next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }

    const createProject = (e) => {
        e.preventDefault()
        if (!name.trim()) return
        const template = TEMPLATES.find(t => t.id === selectedTemplate)
        const newProject = {
            id: Date.now().toString(),
            name: name.trim(),
            description: description.trim(),
            template,
            phaseIndex: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
            logs: [`[${new Date().toLocaleTimeString('ru-RU')}] Проект создан из шаблона «${template.name}»`],
        }
        save([newProject, ...projects])
        setName('')
        setDescription('')
        setActiveProject(newProject.id)
        showToast?.('Проект создан')
    }

    const advancePhase = (projectId) => {
        save(projects.map(p => {
            if (p.id !== projectId) return p
            const nextIndex = Math.min(PHASES.length - 1, p.phaseIndex + 1)
            return {
                ...p,
                phaseIndex: nextIndex,
                logs: [...p.logs, `[${new Date().toLocaleTimeString('ru-RU')}] Этап завершён: ${PHASES[p.phaseIndex].label}`],
            }
        }))
    }

    const currentProject = projects.find(p => p.id === activeProject)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Rocket size={20} className="text-purple-400" />
                <h2 className="text-lg font-semibold text-white">DevStudio</h2>
            </div>

            {/* Create form */}
            <form onSubmit={createProject} className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Создать приложение</h3>

                <div>
                    <label className="text-[10px] text-gray-500 mb-2 block">Шаблон</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {TEMPLATES.map(t => {
                            const Icon = t.icon
                            const active = selectedTemplate === t.id
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSelectedTemplate(t.id)}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        active
                                            ? 'bg-purple-500/10 border-purple-500/30'
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                                    }`}
                                >
                                    <Icon size={18} className={`mb-2 text-${t.color}-400`} />
                                    <div className="text-xs font-medium text-white">{t.name}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">{t.description}</div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-gray-500 mb-1.5 block">Название проекта</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Например, AI Landing 2.0"
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 mb-1.5 block">Описание</label>
                        <input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Краткое описание..."
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!name.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                >
                    <Code2 size={14} /> Создать проект
                </button>
            </form>

            {/* Projects list */}
            {projects.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 space-y-3">
                        <h3 className="text-sm font-semibold text-white">Проекты</h3>
                        {projects.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setActiveProject(p.id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${
                                    activeProject === p.id
                                        ? 'bg-purple-500/10 border-purple-500/30'
                                        : 'bg-[#0f0f1a] border-white/5 hover:border-white/15'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <p.template.icon size={14} className={`text-${p.template.color}-400`} />
                                    <span className="text-sm font-medium text-white">{p.name}</span>
                                </div>
                                <div className="text-[10px] text-gray-500">{p.template.name} • {PHASES[p.phaseIndex].label}</div>
                            </button>
                        ))}
                    </div>

                    {currentProject && (
                        <div className="lg:col-span-2 rounded-2xl bg-[#0f0f1a] border border-white/5 p-5 space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-white">{currentProject.name}</div>
                                    <div className="text-xs text-gray-500">{currentProject.description}</div>
                                </div>
                                <StatusBadge status="active" label={currentProject.template.name} />
                            </div>

                            {/* Phases */}
                            <div className="flex items-center gap-1">
                                {PHASES.map((phase, idx) => (
                                    <div key={phase.id} className="flex-1 flex items-center gap-1">
                                        <div className={`h-2 flex-1 rounded-full ${
                                            idx <= currentProject.phaseIndex ? 'bg-emerald-400' : 'bg-white/10'
                                        }`} />
                                        {idx < PHASES.length - 1 && <ChevronRight size={12} className="text-gray-600" />}
                                    </div>
                                ))}
                            </div>
                            <div className="text-xs text-white font-medium">{PHASES[currentProject.phaseIndex].label}</div>
                            <div className="text-[10px] text-gray-500">{PHASES[currentProject.phaseIndex].description}</div>

                            {currentProject.phaseIndex < PHASES.length - 1 && (
                                <button
                                    onClick={() => advancePhase(currentProject.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
                                >
                                    <CheckCircle size={12} /> Завершить этап
                                </button>
                            )}

                            {/* Logs */}
                            <div>
                                <h4 className="text-xs font-medium text-white mb-2 flex items-center gap-1.5"><Terminal size={12} /> Логи</h4>
                                <div className="h-32 overflow-y-auto rounded-xl bg-black/30 border border-white/5 p-3 font-mono text-[10px] space-y-1">
                                    {currentProject.logs.map((log, i) => (
                                        <div key={i} className="text-gray-400">{log}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default DevStudioTab
