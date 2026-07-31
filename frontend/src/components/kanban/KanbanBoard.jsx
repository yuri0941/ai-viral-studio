import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Search, User, Calendar, Tag, GripVertical, Trash2, Edit3, Filter } from 'lucide-react';

const COLUMNS = [
    { id: 'todo', label: 'To Do', color: 'bg-gray-500' },
    { id: 'inprogress', label: 'In Progress', color: 'bg-blue-500' },
    { id: 'review', label: 'Review', color: 'bg-purple-500' },
    { id: 'done', label: 'Done', color: 'bg-emerald-500' },
];

const TAGS = {
    urgent: { label: 'Срочно', className: 'bg-red-500/20 text-red-400' },
    normal: { label: 'Обычно', className: 'bg-blue-500/20 text-blue-400' },
    low: { label: 'Низкий приоритет', className: 'bg-gray-500/20 text-gray-400' },
};

function loadTasks() {
    try {
        const raw = localStorage.getItem('kanban_tasks');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveTasks(tasks) {
    try {
        localStorage.setItem('kanban_tasks', JSON.stringify(tasks));
    } catch {}
}

export default function KanbanBoard() {
    const [tasks, setTasks] = useState(loadTasks);
    const [search, setSearch] = useState('');
    const [assigneeFilter, setAssigneeFilter] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', assignee: '', deadline: '', tag: 'normal', column: 'todo' });
    const [draggedTaskId, setDraggedTaskId] = useState(null);

    useEffect(() => {
        saveTasks(tasks);
    }, [tasks]);

    const assignees = useMemo(() => {
        const map = new Map();
        tasks.forEach(t => t.assignee && map.set(t.assignee, true));
        return ['', ...Array.from(map.keys())];
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                t.assignee?.toLowerCase().includes(search.toLowerCase());
            const matchesAssignee = !assigneeFilter || t.assignee === assigneeFilter;
            return matchesSearch && matchesAssignee;
        });
    }, [tasks, search, assigneeFilter]);

    const handleAdd = () => {
        if (!newTask.title.trim()) return;
        const task = {
            id: `task_${Date.now()}`,
            ...newTask,
            createdAt: new Date().toISOString(),
        };
        setTasks(prev => [...prev, task]);
        setNewTask({ title: '', assignee: '', deadline: '', tag: 'normal', column: 'todo' });
        setShowAdd(false);
    };

    const handleDelete = (id) => {
        if (window.confirm('Удалить задачу?')) {
            setTasks(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleDragStart = (e, taskId) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, columnId) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId') || draggedTaskId;
        setDraggedTaskId(null);
        if (!taskId) return;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column: columnId } : t));
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <GripVertical className="w-5 h-5 text-gray-500" /> Kanban доска
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-[#1a1a24] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-[#8B5CF6]"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select
                            value={assigneeFilter}
                            onChange={(e) => setAssigneeFilter(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-[#1a1a24] border border-white/10 rounded-lg text-sm text-white outline-none focus:border-[#8B5CF6] appearance-none"
                        >
                            <option value="">Все исполнители</option>
                            {assignees.filter(Boolean).map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-medium rounded-lg transition-colors"
                    >
                        <Plus size={16} /> Задача
                    </button>
                </div>
            </div>

            {/* Add task modal */}
            {showAdd && (
                <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white">Новая задача</h3>
                        <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                            type="text"
                            placeholder="Название задачи"
                            value={newTask.title}
                            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                            className="px-3 py-2 bg-[#0f0f1a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-[#8B5CF6]"
                        />
                        <input
                            type="text"
                            placeholder="Исполнитель"
                            value={newTask.assignee}
                            onChange={(e) => setNewTask(prev => ({ ...prev, assignee: e.target.value }))}
                            className="px-3 py-2 bg-[#0f0f1a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-[#8B5CF6]"
                        />
                        <input
                            type="date"
                            value={newTask.deadline}
                            onChange={(e) => setNewTask(prev => ({ ...prev, deadline: e.target.value }))}
                            className="px-3 py-2 bg-[#0f0f1a] border border-white/10 rounded-lg text-sm text-white outline-none focus:border-[#8B5CF6]"
                        />
                        <select
                            value={newTask.tag}
                            onChange={(e) => setNewTask(prev => ({ ...prev, tag: e.target.value }))}
                            className="px-3 py-2 bg-[#0f0f1a] border border-white/10 rounded-lg text-sm text-white outline-none focus:border-[#8B5CF6]"
                        >
                            {Object.entries(TAGS).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Отмена</button>
                        <button onClick={handleAdd} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-medium rounded-lg transition-colors">Добавить</button>
                    </div>
                </div>
            )}

            {/* Columns */}
            <div className="flex gap-4 overflow-x-auto pb-2">
                {COLUMNS.map(column => {
                    const columnTasks = filteredTasks.filter(t => t.column === column.id);
                    return (
                        <div
                            key={column.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                            className="min-w-[280px] w-[280px] flex-shrink-0 bg-[#0f0f1a]/80 border border-white/5 rounded-xl p-3 flex flex-col gap-3"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${column.color}`} />
                                    <span className="text-sm font-medium text-white">{column.label}</span>
                                </div>
                                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                {columnTasks.map(task => {
                                    const tag = TAGS[task.tag] || TAGS.normal;
                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            className="group bg-white/10 hover:bg-white/[0.14] border border-white/5 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:scale-[1.01]"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-sm font-medium text-white leading-tight">{task.title}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleDelete(task.id)} className="p-1 rounded hover:bg-red-500/20 text-red-400">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${tag.className} flex items-center gap-1`}>
                                                    <Tag size={10} /> {tag.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between mt-3 text-[11px] text-gray-400">
                                                {task.assignee ? (
                                                    <span className="flex items-center gap-1">
                                                        <User size={10} /> {task.assignee}
                                                    </span>
                                                ) : <span />}
                                                {task.deadline && (
                                                    <span className={`flex items-center gap-1 ${new Date(task.deadline) < new Date() && column.id !== 'done' ? 'text-red-400' : ''}`}>
                                                        <Calendar size={10} /> {task.deadline}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
