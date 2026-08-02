import { useState, useCallback } from 'react'
import { StatusBadge } from '../common/StatusBadge'
import { EmptyState } from '../../../../components/common/EmptyState.jsx'
import { Plus, MoreHorizontal, Calendar, User, CheckSquare, ExternalLink, FileText, CheckSquare as ClickUpIcon, Trello } from 'lucide-react'
import KanbanBoard from '../../../../components/kanban/KanbanBoard'
import { integrationsApi } from '../../../../services/api'

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

    const exportToNotion = async () => {
        const databaseId = window.prompt('Notion Database ID:')
        if (!databaseId) return
        try {
            for (const task of tasks) {
                await integrationsApi.createNotionPage({ databaseId, title: task.title, content: `Status: ${task.status}\nAssignee: ${task.assignee}\nDue: ${task.due}`, tags: [task.tag] })
            }
            showToast?.('Задачи экспортированы в Notion')
        } catch (err) {
            showToast?.('Ошибка Notion: ' + err.message, 'error')
        }
    }

    const exportToClickUp = async () => {
        const listId = window.prompt('ClickUp List ID:')
        if (!listId) return
        try {
            for (const task of tasks) {
                await integrationsApi.createClickUpTask({ listId, name: task.title, description: `Status: ${task.status}\nAssignee: ${task.assignee}`, dueDate: task.due })
            }
            showToast?.('Задачи экспортированы в ClickUp')
        } catch (err) {
            showToast?.('Ошибка ClickUp: ' + err.message, 'error')
        }
    }

    const exportToTrello = async () => {
        const listId = window.prompt('Trello List ID:')
        if (!listId) return
        try {
            for (const task of tasks) {
                await integrationsApi.createTrelloCard({ listId, name: task.title, desc: `Status: ${task.status}\nAssignee: ${task.assignee}\nDue: ${task.due}` })
            }
            showToast?.('Задачи экспортированы в Trello')
        } catch (err) {
            showToast?.('Ошибка Trello: ' + err.message, 'error')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text)]">Задачи и заявки</h2>
                <div className="flex items-center gap-2">
                    <button onClick={exportToNotion} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text)] text-xs flex items-center gap-1.5"><FileText size={14} /> Notion</button>
                    <button onClick={exportToClickUp} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text)] text-xs flex items-center gap-1.5"><ClickUpIcon size={14} /> ClickUp</button>
                    <button onClick={exportToTrello} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text)] text-xs flex items-center gap-1.5"><Trello size={14} /> Trello</button>
                </div>
            </div>

            {/* Ad requests as cards */}
            {campaigns.length > 0 && (
                <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Рекламные заявки</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {campaigns.slice(0, 6).map(c => (
                            <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-[var(--border)] hover:border-[var(--border)] transition-all">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-sm font-medium text-[var(--text)]">{c.name}</span>
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

            {/* Kanban Board */}
            {tasks.length === 0 ? (
                <EmptyState
                    icon={CheckSquare}
                    title="Создайте первую задачу"
                    description="Начните планировать работу: брифы, публикации, проверки — всё в одном месте."
                    actionLabel="Новая задача"
                    onAction={addTask}
                />
            ) : (
                <KanbanBoard />
            )}
        </div>
    )
}

export default TasksTab
