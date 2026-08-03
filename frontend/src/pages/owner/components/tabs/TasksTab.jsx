import { useState, useMemo, useCallback, useEffect } from 'react'
import {
    Plus, Search, Calendar, MessageSquare, Paperclip, Filter, ArrowUpDown,
    X, CheckSquare, MoreHorizontal, Clock, Tag, User, Bot, CheckCircle2,
    AlertCircle, Layout, SlidersHorizontal
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const COLUMNS = [
    { id: 'todo', label: 'To Do', color: 'border-l-gray-400', bg: 'bg-gray-400/5' },
    { id: 'in_progress', label: 'In Progress', color: 'border-l-blue-400', bg: 'bg-blue-400/5' },
    { id: 'review', label: 'Review', color: 'border-l-amber-400', bg: 'bg-amber-400/5' },
    { id: 'done', label: 'Done', color: 'border-l-emerald-400', bg: 'bg-emerald-400/5' },
]

const PRIORITY_COLORS = {
    urgent: 'border-l-red-500',
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-blue-500',
}

const PRIORITY_BADGES = {
    urgent: 'bg-red-500/10 text-red-400',
    high: 'bg-red-500/10 text-red-400',
    medium: 'bg-amber-500/10 text-amber-400',
    low: 'bg-blue-500/10 text-blue-400',
}

const INITIAL_TASKS = [
    { id: '1', title: 'Подготовить бриф для TechBrand', description: 'Собрать референсы, написать ТЗ и согласовать с клиентом.', status: 'todo', priority: 'urgent', assignees: ['А', 'И'], due: '2026-08-05', tags: ['реклама', 'бриф'], commentsCount: 4, filesCount: 2, checklist: [{ label: 'Референсы', done: true }, { label: 'ТЗ', done: false }] },
    { id: '2', title: 'Обновить цены Pro', description: 'Пересчитать стоимость с учётом новых лимитов генераций.', status: 'in_progress', priority: 'medium', assignees: ['И'], due: '2026-08-02', tags: ['finance'], commentsCount: 1, filesCount: 0, checklist: [{ label: 'Анализ', done: true }] },
    { id: '3', title: 'Проверить AI Worker #2', description: 'CPU выше 90%, нужно разобраться с нагрузкой.', status: 'review', priority: 'urgent', assignees: ['Д'], due: '2026-07-30', tags: ['infra'], commentsCount: 7, filesCount: 3, checklist: [] },
    { id: '4', title: 'Опубликовать новость о запуске', description: 'Подготовить пост и разослать по каналам.', status: 'done', priority: 'low', assignees: ['М'], due: '2026-07-28', tags: ['content'], commentsCount: 0, filesCount: 1, checklist: [{ label: 'Текст', done: true }, { label: 'Публикация', done: true }] },
    { id: '5', title: 'AI-аудит Brand Voice', description: 'Проанализировать 20 постов клиента и выдать рекомендации.', status: 'todo', priority: 'medium', assignees: ['Е', 'А'], due: '2026-08-07', tags: ['ai', 'brand'], commentsCount: 2, filesCount: 0, checklist: [] },
]

const TAG_COLORS = {
    'реклама': 'bg-purple-500/10 text-purple-400',
    'finance': 'bg-emerald-500/10 text-emerald-400',
    'infra': 'bg-blue-500/10 text-blue-400',
    'content': 'bg-pink-500/10 text-pink-400',
    'ai': 'bg-cyan-500/10 text-cyan-400',
    'brand': 'bg-amber-500/10 text-amber-400',
}

export function TasksTab({ data }) {
    const { showToast } = data || {}
    const [tasks, setTasks] = useState(() => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('owner_tasks_v2') : null
        return saved ? JSON.parse(saved) : INITIAL_TASKS
    })
    const [search, setSearch] = useState('')
    const [filterPriority, setFilterPriority] = useState('all')
    const [filterAssignee, setFilterAssignee] = useState('all')
    const [filterTag, setFilterTag] = useState('all')
    const [sortBy, setSortBy] = useState('due')
    const [selectedTask, setSelectedTask] = useState(null)
    const [draggedId, setDraggedId] = useState(null)
    const [dragOverColumn, setDragOverColumn] = useState(null)
    const [fabOpen, setFabOpen] = useState(false)

    useEffect(() => {
        localStorage.setItem('owner_tasks_v2', JSON.stringify(tasks))
    }, [tasks])

    const allAssignees = useMemo(() => {
        const set = new Set()
        tasks.forEach(t => t.assignees.forEach(a => set.add(a)))
        return Array.from(set)
    }, [tasks])

    const allTags = useMemo(() => {
        const set = new Set()
        tasks.forEach(t => t.tags.forEach(tag => set.add(tag)))
        return Array.from(set)
    }, [tasks])

    const filteredTasks = useMemo(() => {
        let list = tasks.filter(t => {
            const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
            const matchesPriority = filterPriority === 'all' || t.priority === filterPriority
            const matchesAssignee = filterAssignee === 'all' || t.assignees.includes(filterAssignee)
            const matchesTag = filterTag === 'all' || t.tags.includes(filterTag)
            return matchesSearch && matchesPriority && matchesAssignee && matchesTag
        })
        list = [...list].sort((a, b) => {
            if (sortBy === 'due') return new Date(a.due) - new Date(b.due)
            if (sortBy === 'priority') {
                const order = { urgent: 0, high: 0, medium: 1, low: 2 }
                return order[a.priority] - order[b.priority]
            }
            if (sortBy === 'title') return a.title.localeCompare(b.title)
            return 0
        })
        return list
    }, [tasks, search, filterPriority, filterAssignee, filterTag, sortBy])

    const addTask = () => {
        const title = window.prompt('Название задачи:')
        if (!title) return
        const newTask = {
            id: Date.now().toString(),
            title,
            description: '',
            status: 'todo',
            priority: 'medium',
            assignees: ['Я'],
            due: new Date().toISOString().split('T')[0],
            tags: ['general'],
            commentsCount: 0,
            filesCount: 0,
            checklist: [],
        }
        setTasks(prev => [...prev, newTask])
        showToast?.('Задача создана')
    }

    const askOmega = () => {
        showToast?.('OMEGA: создайте задачу с приоритетом urgent, чтобы я взяла её в работу первой', 'info')
    }

    const toggleChecklist = (taskId, idx) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t
            const next = [...(t.checklist || [])]
            next[idx] = { ...next[idx], done: !next[idx].done }
            return { ...t, checklist: next }
        }))
    }

    const isOverdue = (due) => new Date(due) < new Date(new Date().setHours(0, 0, 0, 0))

    const handleDragStart = (e, id) => {
        setDraggedId(id)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e, columnId) => {
        e.preventDefault()
        setDragOverColumn(columnId)
    }

    const handleDragLeave = () => {
        setDragOverColumn(null)
    }

    const handleDrop = (e, columnId) => {
        e.preventDefault()
        if (!draggedId) return
        setTasks(prev => prev.map(t => t.id === draggedId ? { ...t, status: columnId } : t))
        setDraggedId(null)
        setDragOverColumn(null)
        showToast?.(`Задача перемещена в ${COLUMNS.find(c => c.id === columnId)?.label}`)
    }

    return (
        <div className="space-y-4 relative min-h-[60vh]">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Layout size={20} className="text-[var(--primary)]" />
                    <h2 className="text-lg font-semibold text-[var(--text)]">Задачи и Kanban</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Поиск задач…"
                            className="pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs outline-none focus:border-[var(--primary)]/50 w-48"
                        />
                    </div>
                    <select
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs outline-none"
                    >
                        <option value="all">Все приоритеты</option>
                        <option value="urgent">Urgent</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                    <select
                        value={filterAssignee}
                        onChange={e => setFilterAssignee(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs outline-none"
                    >
                        <option value="all">Все assignee</option>
                        {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select
                        value={filterTag}
                        onChange={e => setFilterTag(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs outline-none"
                    >
                        <option value="all">Все теги</option>
                        {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs outline-none"
                    >
                        <option value="due">По дате</option>
                        <option value="priority">По приоритету</option>
                        <option value="title">По названию</option>
                    </select>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                    <CheckSquare size={48} className="mb-4 opacity-30" />
                    <h3 className="text-[var(--text)] font-medium mb-1">Нет задач</h3>
                    <p className="text-sm mb-4">Создайте первую задачу, чтобы начать работу.</p>
                    <button onClick={addTask} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm hover:opacity-90">
                        Создать задачу
                    </button>
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {COLUMNS.map(col => {
                        const colTasks = filteredTasks.filter(t => t.status === col.id)
                        const isOver = dragOverColumn === col.id
                        return (
                            <div
                                key={col.id}
                                onDragOver={e => handleDragOver(e, col.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={e => handleDrop(e, col.id)}
                                className={`flex-shrink-0 w-80 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm p-3 transition-colors ${isOver ? 'ring-2 ring-[var(--primary)]/30 bg-[var(--primary)]/5' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${col.id === 'todo' ? 'bg-gray-400' : col.id === 'in_progress' ? 'bg-blue-400' : col.id === 'review' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                        <span className="text-sm font-medium text-[var(--text)]">{col.label}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg)] text-[var(--text-muted)]">{colTasks.length}</span>
                                    </div>
                                    <button onClick={addTask} className="p-1 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)]">
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="space-y-3 min-h-[80px]">
                                    {colTasks.map(task => {
                                        const overdue = isOverdue(task.due)
                                        return (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={e => handleDragStart(e, task.id)}
                                                onClick={() => setSelectedTask(task)}
                                                className={`group cursor-pointer rounded-xl border-l-4 ${PRIORITY_COLORS[task.priority] || 'border-l-gray-400'} bg-[var(--bg)] border border-[var(--border)] p-3 shadow-sm hover:shadow-md transition-all ${draggedId === task.id ? 'opacity-90 rotate-2 shadow-xl' : ''}`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <h3 className="text-sm font-medium text-[var(--text)] line-clamp-2">{task.title}</h3>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${PRIORITY_BADGES[task.priority]}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{task.description}</p>
                                                <div className="flex flex-wrap gap-1.5 mb-3">
                                                    {task.tags.map(tag => (
                                                        <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full ${TAG_COLORS[tag] || 'bg-[var(--surface)] text-[var(--text-muted)]'}`}>
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                                                    <div className="flex -space-x-2">
                                                        {task.assignees.map((a, i) => (
                                                            <div key={i} className="w-6 h-6 rounded-full bg-[var(--primary)]/20 border border-[var(--bg-secondary)] flex items-center justify-center text-[10px] text-[var(--primary)]">
                                                                {a}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                                                            <Calendar size={12} />
                                                            {task.due}
                                                        </span>
                                                        {task.commentsCount > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <MessageSquare size={12} /> {task.commentsCount}
                                                            </span>
                                                        )}
                                                        {task.filesCount > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <Paperclip size={12} /> {task.filesCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Quick view sidebar */}
            <AnimatePresence>
                {selectedTask && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTask(null)}
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 bg-[var(--bg-secondary)] border-l border-[var(--border)] shadow-2xl overflow-y-auto"
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${PRIORITY_BADGES[selectedTask.priority]}`}>{selectedTask.priority}</span>
                                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><Clock size={10} /> {selectedTask.status.replace('_', ' ')}</span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-[var(--text)]">{selectedTask.title}</h3>
                                    </div>
                                    <button onClick={() => setSelectedTask(null)} className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)]">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div>
                                    <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Описание</label>
                                    <p className="text-sm text-[var(--text)] mt-1 leading-relaxed">{selectedTask.description || 'Нет описания'}</p>
                                </div>

                                <div className="flex flex-wrap gap-4 text-sm">
                                    <div>
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Дедлайн</div>
                                        <div className={`flex items-center gap-1 ${isOverdue(selectedTask.due) ? 'text-red-400' : 'text-[var(--text)]'}`}>
                                            <Calendar size={14} /> {selectedTask.due}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Assignees</div>
                                        <div className="flex -space-x-2">
                                            {selectedTask.assignees.map((a, i) => (
                                                <div key={i} className="w-7 h-7 rounded-full bg-[var(--primary)]/20 border border-[var(--bg-secondary)] flex items-center justify-center text-[10px] text-[var(--primary)]">{a}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-[var(--text-muted)] mb-1">Теги</div>
                                        <div className="flex gap-1">
                                            {selectedTask.tags.map(tag => (
                                                <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full ${TAG_COLORS[tag] || 'bg-[var(--surface)] text-[var(--text-muted)]'}`}>{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Чеклист</label>
                                    <div className="mt-2 space-y-2">
                                        {(selectedTask.checklist || []).map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => toggleChecklist(selectedTask.id, idx)}
                                                className="w-full flex items-center gap-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)] p-2 rounded-lg transition-colors"
                                            >
                                                <span className={`w-4 h-4 rounded border flex items-center justify-center ${item.done ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border-strong)]'}`}>
                                                    {item.done && <CheckCircle2 size={12} className="text-white" />}
                                                </span>
                                                <span className={item.done ? 'line-through text-[var(--text-muted)]' : ''}>{item.label}</span>
                                            </button>
                                        ))}
                                        {(selectedTask.checklist || []).length === 0 && (
                                            <div className="text-xs text-[var(--text-muted)]">Нет пунктов</div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Комментарии</label>
                                    <div className="mt-2 space-y-3">
                                        <div className="flex gap-3">
                                            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[10px] text-[var(--primary)]">О</div>
                                            <div className="flex-1">
                                                <div className="text-xs text-[var(--text)] font-medium">OMEGA</div>
                                                <div className="text-xs text-[var(--text-muted)]">Задача в фокусе. Нужен статус к дедлайну.</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-7 h-7 rounded-full bg-[var(--surface)] flex items-center justify-center text-[10px] text-[var(--text-muted)]">Я</div>
                                            <div className="flex-1">
                                                <div className="text-xs text-[var(--text)] font-medium">Вы</div>
                                                <div className="text-xs text-[var(--text-muted)]">Обновлю сегодня вечером.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Активность</label>
                                    <div className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-2">
                                        <AlertCircle size={12} /> Создана {new Date().toLocaleDateString('ru-RU')}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* FAB */}
            <div className="fixed bottom-6 right-6 z-30">
                <AnimatePresence>
                    {fabOpen && (
                        <div className="absolute bottom-16 right-0 flex flex-col items-end gap-3">
                            {[
                                { label: 'Новая задача', icon: Plus, action: addTask, color: 'bg-[var(--primary)]' },
                                { label: '@omega', icon: Bot, action: askOmega, color: 'bg-cyan-500' },
                                { label: 'Фильтр', icon: SlidersHorizontal, action: () => setFabOpen(false), color: 'bg-amber-500' },
                                { label: 'Сортировка', icon: ArrowUpDown, action: () => setFabOpen(false), color: 'bg-emerald-500' },
                            ].map((item, i) => (
                                <motion.button
                                    key={item.label}
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => { item.action(); if (item.label !== 'Фильтр' && item.label !== 'Сортировка') setFabOpen(false) }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-white text-xs shadow-lg ${item.color} hover:opacity-90`}
                                >
                                    <item.icon size={14} /> {item.label}
                                </motion.button>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
                <button
                    onClick={() => setFabOpen(o => !o)}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105"
                >
                    <Plus size={24} className={`transition-transform ${fabOpen ? 'rotate-45' : ''}`} />
                </button>
            </div>
        </div>
    )
}

export default TasksTab
