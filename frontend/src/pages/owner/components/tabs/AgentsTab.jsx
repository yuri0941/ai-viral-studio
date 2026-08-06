import { useState } from 'react'
import { Bot, Plus, Power, Settings, Trash2, MessageSquare, Play, Pause } from 'lucide-react'

export function AgentsTab({ data }) {
    const { agents, toggleAgent, addAgent, removeAgent, startChat } = data
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ name: '', role: '', description: '' })

    const online = agents.filter(a => a.status === 'active').length

    return (
        <div className="space-y-6">
            {/* [v6.0] added: hero */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                        AI Агенты
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">{online} агентов онлайн</p>
                </div>
                <button type="button" onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-sm text-violet-300 font-medium hover:bg-violet-500/30 transition-colors">
                    <Plus size={16} /> Добавить агента
                </button>
            </div>

            {showAdd && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--text)]">Новый AI Агент</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Название" className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-[var(--text)] outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all" />
                        <input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Роль (например: Аналитика)" className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-[var(--text)] outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all" />
                        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Описание" className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-[var(--text)] outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 transition-all" />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs text-gray-300 hover:bg-white/5 transition">Отмена</button>
                        <button type="button" onClick={() => { addAgent(form); setShowAdd(false); setForm({ name: '', role: '', description: '' }) }} className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-xs text-violet-300 hover:bg-violet-500/30 transition">Создать</button>
                    </div>
                </div>
            )}

            {/* [v6.0] added: agents grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map(agent => {
                    const isActive = agent.status === 'active'
                    return (
                        <div key={agent.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-violet-500/10 hover:shadow-violet-500/30 hover:-translate-y-1 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                                        <Bot size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-[var(--text)]">{agent.name}</div>
                                        <div className="text-xs text-gray-400">{agent.role}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                    {isActive ? (
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                        </span>
                                    ) : (
                                        <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
                                    )}
                                    {isActive ? '🟢 Активен' : '⚪ Ожидание'}
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2 mb-4">{agent.description}</p>
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={() => toggleAgent(agent.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition">
                                    {isActive ? <Pause size={14} /> : <Play size={14} />}
                                    {isActive ? 'Остановить' : 'Запустить'}
                                </button>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => startChat('ai', agent.id, agent.name)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors" title="Чат">
                                        <MessageSquare size={14} />
                                    </button>
                                    <button type="button" onClick={() => toggleAgent(agent.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors" title="Вкл/Выкл">
                                        <Power size={14} />
                                    </button>
                                    <button type="button" onClick={() => removeAgent(agent.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors" title="Удалить">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* [v6.0] added: terminal/log placeholder */}
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 font-mono text-xs text-emerald-400/90 space-y-1">
                <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <Settings size={14} /> <span>AI Agent Logs</span>
                </div>
                <p>[12:34:05] Pricing Agent :: анализ конкурентов завершён</p>
                <p>[12:34:12] Revenue Agent :: прогноз MRR обновлён</p>
                <p>[12:34:18] Security Agent :: активность в норме</p>
                <p>[12:34:25] Support Agent :: обработано 7 тикетов</p>
                <p className="text-gray-500">_</p>
            </div>
        </div>
    )
}

export default AgentsTab
