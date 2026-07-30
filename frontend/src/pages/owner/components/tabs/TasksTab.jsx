import { useState, useCallback } from 'react'
import { StatusBadge } from '../common/StatusBadge'
import { Plus, MoreHorizontal, Calendar, User } from 'lucide-react'

const COLUMNS = [
    { id: 'todo', label: 'To Do', color: 'gray' },
    { id: 'in_progress', label: 'In Progress', color: 'blue' },
    { id: 'review', label: 'Review', color: 'yellow' },
    { id: 'done', label: 'Done', color: 'emerald' },
]

const INITIAL_TASKS = [
    { id: '1', title: 'Подготовить бриф для TechBrand', status: 'todo', priority: 'high', assignee: 'Анна', due: '2026-07-30', tag: 'реклама' },
    { id: '2', title: 'Обновить цены Pro', status: 'in_progress', priority: 'medium', assignee: 'Иван', due: '2026-07-29', tag: 'finance' },
    { id: '3', title: 'Проверить AI Worker #2', status: 'review', priority: 'high', assignee: 'Дмитрий', due: '2026-07-28', tag: 'infra' },
    { id: '4', title: 'Опубликовать новость о запуске', status: 'done', priority: 'low', assignee: 'Мария', due: '2026-07-27', tag: 'content' },
]

export function TasksTab({ data }) {
    const { campaigns = [], setModal, showToast } = data
    const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem('owner_tasks')
        return saved ? JSON.parse(saved) : INITIAL_TASKS
    })
    const [draggedId, setDraggedId] = useState(null)

    const saveTasks = useCallback((next) => {
        setTasks(next)
        localStorage.setItem('owner_tasks', JSON.stringify(next))
    }, [])

    const onDragStart = (id) => setDraggedId(id)
    const onDragOver = (e) => e.preventDefault()
    const onDrop = (columnId) => {
        if (!draggedId) return
        saveTasks(tasks.map(t => t.id === draggedId ? { ...t, status: columnId } : t))
        setDraggedId(null)
        showToast?.(`Задача перемещена в ${COLUMNS.find(c => c.id === columnId)?.label}`)
    }

    const addTask = () => {
        const title = window.prompt('Название задачи:')
        if (!title) return
        const newTask = {
            id: Date.now().toString(),
            title,
            status: 'todo',
            priority: 'medium',
            assignee: 'Owner',
            due: new Date().toISOString().slice(0, 10),
            tag: 'general',
        }
        saveTasks([...tasks, newTask])
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Задачи и заявки</h2>
                <button
                    onClick={addTask}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors"
                >
                    <Plus size={14} /> Новая задача
                </button>
            </div>

            {/* Ad requests as cards */}
            {campaigns.length > 0 && (
                <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Рекламные заявки</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {campaigns.slice(0, 6).map(c => (
                            <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-sm font-medium text-white">{c.name}</span>
                                    <StatusBadge status={c.status} />
                                </div>
                                <div className="text-xs text-gray-500 mb-3">{c.client}</div>
                                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                    <span className="flex items-center gap-1"><User size={10} /> {c.platform || '—'}</span>
                                    <span className="flex items-center gap-1"><Calendar size={10} /> {c.endDate || '—'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {COLUMNS.map(col => (
                    <div
                        key={col.id}
                        className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-4 min-h-[300px]"
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(col.id)}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white">{col.label}</h3>
                            <span className="text-xs text-gray-500">{tasks.filter(t => t.status === col.id).length}</span>
                        </div>
                        <div className="space-y-3">
                            {tasks.filter(t => t.status === col.id).map(task => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={() => onDragStart(task.id)}
                                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 cursor-grab active:cursor-grabbing transition-all"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="text-xs text-white">{task.title}</span>
                                        <MoreHorizontal size={14} className="text-gray-500 shrink-0" />
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <StatusBadge status={task.priority} label={task.priority} />
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{task.tag}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                                        <span className="flex items-center gap-1"><User size={10} /> {task.assignee}</span>
                                        <span className="flex items-center gap-1"><Calendar size={10} /> {task.due}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TasksTab
