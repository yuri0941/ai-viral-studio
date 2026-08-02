import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
    Shield, Users, Activity, Star, AlertTriangle, FileText,
    Settings, DollarSign, Search, Plus, Pencil, Lock, Unlock,
    Trash2, Check, X, AlertCircle, Eye, EyeOff, Save,
    LogOut, BarChart, Terminal, Wrench, TrendingUp, Filter,
    CheckSquare, Square
} from 'lucide-react'
import { VirtualTable } from '../components/shared/VirtualTable'

const MODERATION_REPORTS = [
    { id: 1, user: 'user1@mail.com', content: 'Нецензурный контент', platform: 'YouTube', date: '10 мин назад', status: 'pending' },
    { id: 2, user: 'creator99@mail.com', content: 'Спам в комментариях', platform: 'TikTok', date: '1 час назад', status: 'pending' },
    { id: 3, user: 'biz@company.com', content: 'Нарушение авторских прав', platform: 'Instagram', date: '3 часа назад', status: 'reviewed' },
    { id: 4, user: 'test@mail.com', content: 'Фейковые просмотры', platform: 'YouTube', date: 'Вчера', status: 'pending' },
    { id: 5, user: 'spam@bot.ru', content: 'Массовая рассылка', platform: 'Telegram', date: 'Вчера', status: 'pending' },
]

const SYSTEM_LOGS = [
    { time: '09:42:15', level: 'error', message: 'Connection timeout to Groq API', service: 'AI Chat' },
    { time: '09:38:22', level: 'warning', message: 'High memory usage: 87%', service: 'Backend' },
    { time: '09:35:01', level: 'info', message: 'User login: admin@ai-viral.com', service: 'Auth' },
    { time: '09:30:45', level: 'error', message: 'Failed to upload video: timeout', service: 'Scheduler' },
    { time: '09:28:12', level: 'info', message: 'Daily backup completed', service: 'Database' },
    { time: '09:25:33', level: 'warning', message: 'Rate limit approaching: 850/1000', service: 'YouTube API' },
]

const PLATFORM_DEFAULTS = {
    apiRateLimit: 1000,
    maxFileSize: 500,
    allowedFormats: ['jpg', 'png', 'mp4', 'mov'],
    defaultQuota: 50,
    maintenanceMode: false,
}

const FINANCE_DATA = {
    totalRevenue: 15400,
    pendingPayouts: 3200,
    thisMonth: 8400,
    lastMonth: 7200,
    topClients: [
        { name: 'ООО Реклама', amount: 4500 },
        { name: 'Иван Петров', amount: 2800 },
        { name: 'Мария Сидорова', amount: 1900 },
    ]
}

function AdminDashboardPage() {
    const { user } = useAuth()
    const [toast, setToast] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    // --- USERS STATE ---
    const [users, setUsers] = useState([
        { id: 1, name: 'Иван Петров', email: 'ivan@mail.com', role: 'creator', status: 'active', posts: 45, joined: '2026-06-15' },
        { id: 2, name: 'Мария Сидорова', email: 'maria@mail.com', role: 'business', status: 'active', posts: 128, joined: '2026-05-20' },
        { id: 3, name: 'ООО Реклама', email: 'ads@company.ru', role: 'advertiser', status: 'banned', posts: 12, joined: '2026-07-01' },
        { id: 4, name: 'Алексей К.', email: 'alex@mail.com', role: 'creator', status: 'active', posts: 8, joined: '2026-07-10' },
        { id: 5, name: 'Test User', email: 'test@test.com', role: 'creator', status: 'pending', posts: 0, joined: '2026-07-20' }
    ])

    // --- MODALS ---
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [showModerationModal, setShowModerationModal] = useState(false)
    const [showLogsModal, setShowLogsModal] = useState(false)
    const [showPlatformSettingsModal, setShowPlatformSettingsModal] = useState(false)
    const [showFinanceModal, setShowFinanceModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [showPassword, setShowPassword] = useState(false)

    // --- FORMS ---
    const [addForm, setAddForm] = useState({ name: '', email: '', role: 'creator', password: '', status: 'active' })
    const [editForm, setEditForm] = useState({ name: '', email: '', role: 'creator', status: 'active' })

    const [reports, setReports] = useState(MODERATION_REPORTS)
    const [settings, setSettings] = useState(PLATFORM_DEFAULTS)
    const [settingsForm, setSettingsForm] = useState({ ...PLATFORM_DEFAULTS })
    const [maintenanceMode, setMaintenanceMode] = useState(PLATFORM_DEFAULTS.maintenanceMode)
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [sortBy, setSortBy] = useState('joined')
    const [sortOrder, setSortOrder] = useState('desc')
    const [selectedIds, setSelectedIds] = useState([])
    const [reportFilter, setReportFilter] = useState('all')

    const liveStats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        bannedUsers: users.filter(u => u.status === 'banned').length,
        pendingUsers: users.filter(u => u.status === 'pending').length,
        activeToday: Math.round(users.length * 0.12),
        newToday: Math.round(users.length * 0.03),
        reportsPending: reports.filter(r => r.status === 'pending').length,
        totalPosts: users.reduce((s, u) => s + u.posts, 0),
        revenue: FINANCE_DATA.totalRevenue
    }

    // --- TOAST ---
    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // --- FILTERED USERS ---
    const filteredUsers = users.filter(u =>
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (roleFilter === 'all' || u.role === roleFilter) &&
        (statusFilter === 'all' || u.status === statusFilter)
    ).sort((a, b) => {
        let valA = a[sortBy], valB = b[sortBy]
        if (sortBy === 'joined') { valA = new Date(valA); valB = new Date(valB) }
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
    })

    const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    const toggleAll = () => setSelectedIds(selectedIds.length === filteredUsers.length && filteredUsers.length > 0 ? [] : filteredUsers.map(u => u.id))
    const isSelected = (id) => selectedIds.includes(id)

    const bulkBan = () => {
        setUsers(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, status: 'banned' } : u))
        showToast(`${selectedIds.length} пользователей заблокировано`, 'error')
        setSelectedIds([])
    }
    const bulkActivate = () => {
        setUsers(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, status: 'active' } : u))
        showToast(`${selectedIds.length} пользователей активировано`)
        setSelectedIds([])
    }
    const bulkDelete = () => {
        setUsers(prev => prev.filter(u => !selectedIds.includes(u.id)))
        showToast(`${selectedIds.length} пользователей удалено`, 'error')
        setSelectedIds([])
    }

    const handleChangeRole = (userId, newRole) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
        showToast(`Роль изменена`)
    }

    const handleReportAction = (reportId, action) => {
        const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'reviewed'
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: nextStatus } : r))
        showToast(action === 'approve' ? 'Жалоба одобрена' : action === 'reject' ? 'Жалоба отклонена' : 'Жалоба на рассмотрении')
    }

    const handleSaveSettings = () => {
        setSettings({ ...settingsForm })
        setMaintenanceMode(settingsForm.maintenanceMode)
        setShowPlatformSettingsModal(false)
        showToast('Настройки платформы сохранены')
    }

    // --- ROLE/STYLES ---
    const getRoleColor = (role) => {
        switch (role) {
            case 'owner': return 'bg-[var(--accent-warm)]/20 text-[var(--accent-warm)] border-yellow-500/30'
            case 'admin': return 'bg-[var(--danger)]/20 text-[var(--danger)] border-red-500/30'
            case 'staff': return 'bg-[var(--accent)]/20 text-[var(--accent)] border-blue-500/30'
            case 'advertiser': return 'bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/30'
            case 'business': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            default: return 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30'
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-[var(--success)]'
            case 'banned': return 'text-[var(--danger)]'
            case 'pending': return 'text-[var(--accent-warm)]'
            default: return 'text-[var(--text-muted)]'
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active': return <Check size={14} className="text-[var(--success)]" />
            case 'banned': return <X size={14} className="text-[var(--danger)]" />
            case 'pending': return <AlertCircle size={14} className="text-[var(--accent-warm)]" />
            default: return null
        }
    }

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return 'Активен'
            case 'banned': return 'Заблокирован'
            case 'pending': return 'На модерации'
            default: return status
        }
    }

    const getLogLevelClass = (level) => {
        const base = 'flex-shrink-0 px-1.5 py-0.5 rounded text-xs '
        switch (level) {
            case 'error': return base + 'bg-[var(--danger)]/10 text-[var(--danger)]'
            case 'warning': return base + 'bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]'
            default: return base + 'bg-[var(--accent)]/10 text-[var(--accent)]'
        }
    }

    const getReportStatusDotClass = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-400'
            case 'approved': return 'bg-[var(--success)]'
            case 'rejected': return 'bg-red-400'
            default: return 'bg-blue-400'
        }
    }

    const getReportStatusBadgeClass = (status) => {
        switch (status) {
            case 'pending': return 'bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] border-yellow-500/20'
            case 'approved': return 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
            case 'rejected': return 'bg-[var(--danger)]/10 text-[var(--danger)] border-red-500/20'
            default: return 'bg-[var(--accent)]/10 text-[var(--accent)] border-blue-500/20'
        }
    }

    const getReportStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'В очереди'
            case 'approved': return 'Одобрена'
            case 'rejected': return 'Отклонена'
            default: return 'Просмотрена'
        }
    }

    const userColumns = useMemo(() => [
        {
            key: 'selected',
            header: (
                <button onClick={toggleAll} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    {selectedIds.length === filteredUsers.length && filteredUsers.length > 0 ? <CheckSquare size={18} className="text-[var(--success)]" /> : <Square size={18} />}
                </button>
            ),
            width: '60px',
            sortable: false,
            cell: (u) => (
                <button onClick={() => toggleSelect(u.id)} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    {isSelected(u.id) ? <CheckSquare size={18} className="text-[var(--success)]" /> : <Square size={18} />}
                </button>
            ),
        },
        { key: 'id', header: 'ID', width: '80px', cell: (u) => <span className="text-[var(--text-muted)]">#{u.id}</span> },
        { key: 'name', header: 'Имя', width: '1.5fr', cell: (u) => <span className="text-[var(--text)] font-medium">{u.name}</span> },
        { key: 'email', header: 'Email', width: '1.5fr', cell: (u) => <span className="text-[var(--text)]">{u.email}</span> },
        {
            key: 'role',
            header: 'Роль',
            width: '130px',
            cell: (u) => (
                <select
                    value={u.role}
                    onChange={e => handleChangeRole(u.id, e.target.value)}
                    className={`px-2.5 py-1 rounded-full text-xs border bg-transparent outline-none ${getRoleColor(u.role)}`}
                >
                    <option value="creator" className="bg-[var(--card)]">Creator</option>
                    <option value="business" className="bg-[var(--card)]">Business</option>
                    <option value="advertiser" className="bg-[var(--card)]">Advertiser</option>
                    <option value="staff" className="bg-[var(--card)]">Staff</option>
                    <option value="admin" className="bg-[var(--card)]">Admin</option>
                </select>
            ),
        },
        {
            key: 'status',
            header: 'Статус',
            width: '130px',
            cell: (u) => (
                <span className={`flex items-center gap-1.5 text-sm font-medium ${getStatusColor(u.status)}`}>
                    {getStatusIcon(u.status)}
                    {getStatusLabel(u.status)}
                </span>
            ),
        },
        { key: 'posts', header: 'Постов', width: '90px', cell: (u) => <span className="text-[var(--text)]">{u.posts}</span> },
        { key: 'joined', header: 'Дата регистрации', width: '150px', cell: (u) => <span className="text-[var(--text-muted)] text-sm">{u.joined}</span> },
        {
            key: 'actions',
            header: 'Действия',
            width: '150px',
            sortable: false,
            cell: (u) => (
                <div className="flex gap-1 justify-end">
                    <button
                        onClick={() => openEditModal(u)}
                        className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
                        title="Редактировать"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={`p-2 rounded-lg transition-colors ${u.status === 'active'
                            ? 'bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] hover:bg-[var(--accent-warm)]/20'
                            : 'bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20'
                            }`}
                        title={u.status === 'active' ? 'Заблокировать' : 'Разблокировать'}
                    >
                        {u.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                    <button
                        onClick={() => openDeleteModal(u)}
                        className="p-2 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors"
                        title="Удалить"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        },
    ], [selectedIds.length, filteredUsers.length, selectedIds, isSelected, toggleAll, toggleSelect, handleChangeRole, getRoleColor, getStatusColor, getStatusIcon, getStatusLabel, openEditModal, handleToggleStatus, openDeleteModal])

    const getFilterButtonClass = (id, current) => {
        return id === current
            ? 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20'
            : 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--border-strong)] border border-transparent'
    }

    // --- ACTIONS ---
    const handleAddUser = () => {
        if (!addForm.name || !addForm.email || !addForm.password) {
            showToast('Заполните все поля', 'error')
            return
        }
        const newUser = {
            id: Date.now(),
            name: addForm.name,
            email: addForm.email,
            role: addForm.role,
            status: addForm.status,
            posts: 0,
            joined: new Date().toISOString().split('T')[0]
        }
        setUsers([...users, newUser])
        setAddForm({ name: '', email: '', role: 'creator', password: '', status: 'active' })
        setShowAddModal(false)
        showToast(`Пользователь ${newUser.name} добавлен`)
    }

    const handleEditUser = () => {
        if (!editForm.name || !editForm.email) {
            showToast('Заполните все поля', 'error')
            return
        }
        setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...editForm } : u))
        setShowEditModal(false)
        setSelectedUser(null)
        showToast('Изменения сохранены')
    }

    const handleToggleStatus = (userId) => {
        setUsers(users.map(u => {
            if (u.id === userId) {
                const newStatus = u.status === 'active' ? 'banned' : 'active'
                showToast(`Статус изменён на "${getStatusLabel(newStatus)}"`)
                return { ...u, status: newStatus }
            }
            return u
        }))
    }

    const handleDeleteUser = () => {
        setUsers(users.filter(u => u.id !== selectedUser.id))
        setShowDeleteModal(false)
        showToast(`Пользователь ${selectedUser.name} удалён`)
        setSelectedUser(null)
    }

    const openEditModal = (user) => {
        setSelectedUser(user)
        setEditForm({ name: user.name, email: user.email, role: user.role, status: user.status })
        setShowEditModal(true)
    }

    const openDeleteModal = (user) => {
        setSelectedUser(user)
        setShowDeleteModal(true)
    }

    // --- STATS CARDS ---
    const statsCards = [
        { label: 'Всего пользователей', value: liveStats.totalUsers.toLocaleString(), sub: `${liveStats.activeUsers} активны · ${liveStats.bannedUsers} заблокированы · ${liveStats.pendingUsers} на модерации`, icon: Users, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10' },
        { label: 'Активны сегодня', value: liveStats.activeToday, icon: Activity, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10' },
        { label: 'Новых сегодня', value: `+${liveStats.newToday}`, icon: Star, color: 'text-[var(--accent-warm)]', bg: 'bg-[var(--accent-warm)]/10' },
        { label: 'Жалобы', value: liveStats.reportsPending, icon: AlertTriangle, color: 'text-[var(--danger)]', bg: 'bg-[var(--danger)]/10' },
        { label: 'Всего постов', value: liveStats.totalPosts.toLocaleString(), icon: FileText, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10' },
        { label: 'Доход', value: `$${liveStats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10' }
    ]

    // --- QUICK ACTIONS ---
    const quickActions = [
        { label: 'Модерация контента', icon: Shield, desc: `${liveStats.reportsPending} жалоб на рассмотрении`, color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/20', onClick: () => setShowModerationModal(true) },
        { label: 'Системные логи', icon: Terminal, desc: 'Последние ошибки', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20', onClick: () => setShowLogsModal(true) },
        { label: 'Настройки платформы', icon: Wrench, desc: maintenanceMode ? 'Режим обслуживания ВКЛ' : 'API, лимиты, роли', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-[var(--success)]/20', onClick: () => setShowPlatformSettingsModal(true) },
        { label: 'Финансы', icon: TrendingUp, desc: `$${FINANCE_DATA.totalRevenue.toLocaleString()} доход · $${FINANCE_DATA.pendingPayouts.toLocaleString()} выплаты`, color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/20', onClick: () => setShowFinanceModal(true) }
    ]

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg transition-all ${toast.type === 'error' ? 'bg-red-500/90 text-[var(--text)]' : 'bg-emerald-500/90 text-[var(--text-inverse)]'
                    }`}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Shield size={24} className="text-[var(--accent)]" />
                        <h1 className="text-3xl font-bold">Admin Panel</h1>
                    </div>
                    <p className="text-[var(--text-muted)]">Управление платформой и пользователями</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-full bg-[var(--danger)]/20 text-[var(--danger)] text-sm font-semibold border border-red-500/20">
                        {user?.name || 'Admin'}
                    </span>
                    <button
                        onClick={() => setShowSettingsModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[var(--text-inverse)] font-semibold text-sm transition-all hover:scale-105"
                    >
                        <Settings size={16} /> Настройки
                    </button>
                </div>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {statsCards.map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className={`${stat.bg} border border-[var(--border-strong)] rounded-2xl p-4 text-center hover:border-[var(--border-strong)] transition-all hover:scale-[1.02]`}>
                            <Icon size={20} className={`mx-auto mb-2 ${stat.color}`} />
                            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</p>
                            {stat.sub && <p className="text-[10px] text-[var(--text-muted)] mt-1">{stat.sub}</p>}
                        </div>
                    )
                })}
            </div>

            {/* Users Management */}
            <div className="bg-[var(--card)] border border-[var(--border-strong)] rounded-2xl overflow-hidden mb-8">
                <div className="p-6 border-b border-[var(--border-strong)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Users size={20} className="text-[var(--accent)]" /> Пользователи
                    </h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Поиск..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--success)]/30"
                            />
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[var(--text-inverse)] text-sm font-semibold transition-all hover:scale-105"
                        >
                            <Plus size={16} /> Добавить
                        </button>
                    </div>
                </div>

                <div className="p-4 border-b border-[var(--border-strong)] flex flex-col sm:flex-row items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                        <Filter size={16} className="text-[var(--text-muted)]" />
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none"
                        >
                            <option value="all">Все роли</option>
                            <option value="creator">Creator</option>
                            <option value="business">Business</option>
                            <option value="advertiser">Advertiser</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none"
                        >
                            <option value="all">Все статусы</option>
                            <option value="active">Активные</option>
                            <option value="pending">На модерации</option>
                            <option value="banned">Заблокированные</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none"
                        >
                            <option value="joined">По дате регистрации</option>
                            <option value="posts">По постам</option>
                            <option value="name">По имени</option>
                            <option value="role">По роли</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text)] text-sm hover:bg-[var(--surface)] transition-colors"
                            title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
                        >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                        <button
                            onClick={() => { setSearchQuery(''); setRoleFilter('all'); setStatusFilter('all'); setSortBy('joined'); setSortOrder('desc'); setSelectedIds([]) }}
                            className="px-3 py-2 rounded-lg bg-[var(--surface)] text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors"
                        >
                            Сбросить
                        </button>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className="px-4 py-2 border-b border-[var(--border-strong)] bg-[var(--success)]/5 flex items-center justify-between gap-3">
                        <span className="text-sm text-[var(--success)]">Выбрано: {selectedIds.length}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={bulkActivate} className="px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] text-xs hover:bg-[var(--success)]/20 transition-colors">Активировать</button>
                            <button onClick={bulkBan} className="px-3 py-1.5 rounded-lg bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] text-xs hover:bg-[var(--accent-warm)]/20 transition-colors">Заблокировать</button>
                            <button onClick={bulkDelete} className="px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-xs hover:bg-[var(--danger)]/20 transition-colors">Удалить</button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <VirtualTable
                        data={filteredUsers}
                        columns={userColumns}
                        rowHeight={60}
                        maxHeight={600}
                        striped
                        keyExtractor={(u) => u.id}
                        emptyMessage={
                            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                <Search size={32} className="mb-3 opacity-50" />
                                <p>Пользователи не найдены</p>
                            </div>
                        }
                    />
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, i) => {
                    const Icon = action.icon
                    return (
                        <button
                            key={i}
                            onClick={action.onClick}
                            className={`group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${action.color} border ${action.border} hover:border-white/30 transition-all hover:scale-[1.02] text-left`}
                        >
                            <Icon size={28} className="mb-3 text-[var(--text)]/80" />
                            <h3 className="text-[var(--text)] font-semibold mb-1">{action.label}</h3>
                            <p className="text-[var(--text-muted)] text-sm">{action.desc}</p>
                        </button>
                    )
                })}
            </div>

            {/* ===== MODALS ===== */}

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Plus size={20} /> Добавить пользователя</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-[var(--text-muted)] mb-1 block">Имя</label>
                                    <input type="text" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Иван Иванов" className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--text-muted)] mb-1 block">Email</label>
                                    <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="ivan@ai-viral.com" className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-emerald-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm text-[var(--text-muted)] mb-1 block">Роль</label>
                                        <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-emerald-500 outline-none">
                                            <option value="creator">Creator</option>
                                            <option value="advertiser">Advertiser</option>
                                            <option value="business">Business</option>
                                            <option value="staff">Staff</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-[var(--text-muted)] mb-1 block">Статус</label>
                                        <select value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })} className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-emerald-500 outline-none">
                                            <option value="active">Активен</option>
                                            <option value="pending">На модерации</option>
                                            <option value="banned">Заблокирован</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--text-muted)] mb-1 block">Пароль</label>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} placeholder="Минимум 6 символов" className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-emerald-500 outline-none pr-10" />
                                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-[var(--surface)] rounded-lg hover:bg-[#303040] transition-colors">Отмена</button>
                                <button onClick={handleAddUser} disabled={!addForm.name || !addForm.email || !addForm.password} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-[var(--text-inverse)] font-medium rounded-lg transition-all">Добавить</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Pencil size={20} /> Редактировать пользователя</h2>
                                <button onClick={() => setShowEditModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-[var(--text-muted)] mb-1 block">Имя</label>
                                    <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--text-muted)] mb-1 block">Email</label>
                                    <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-emerald-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm text-[var(--text-muted)] mb-1 block">Роль</label>
                                        <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-emerald-500 outline-none">
                                            <option value="creator">Creator</option>
                                            <option value="advertiser">Advertiser</option>
                                            <option value="business">Business</option>
                                            <option value="staff">Staff</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-[var(--text-muted)] mb-1 block">Статус</label>
                                        <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-4 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-strong)] focus:border-emerald-500 outline-none">
                                            <option value="active">Активен</option>
                                            <option value="pending">На модерации</option>
                                            <option value="banned">Заблокирован</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 bg-[var(--surface)] rounded-lg hover:bg-[#303040] transition-colors">Отмена</button>
                                <button onClick={handleEditUser} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-[var(--text-inverse)] font-medium rounded-lg transition-all">Сохранить</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Modal */}
            {showDeleteModal && selectedUser && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-sm">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-[var(--danger)]/10 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} className="text-[var(--danger)]" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Удалить пользователя?</h2>
                            <p className="text-[var(--text-muted)] text-sm mb-6">{selectedUser.name} ({selectedUser.email}) будет удалён безвозвратно.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 bg-[var(--surface)] rounded-lg hover:bg-[#303040] transition-colors">Отмена</button>
                                <button onClick={handleDeleteUser} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-[var(--text)] font-medium rounded-lg transition-all">Удалить</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-lg max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} /> Настройки платформы</h2>
                                <button onClick={() => setShowSettingsModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart size={16} className="text-[var(--accent)]" /> API Лимиты</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1"><span className="text-[var(--text-muted)]">Запросов в минуту</span><span>850 / 1000</span></div>
                                            <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div></div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1"><span className="text-[var(--text-muted)]">AI генераций в день</span><span>320 / 500</span></div>
                                            <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: '64%' }}></div></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield size={16} className="text-[var(--danger)]" /> Безопасность</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">2FA для админов</span>
                                            <span className="text-xs px-2 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)]">Включено</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Логирование действий</span>
                                            <span className="text-xs px-2 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)]">Включено</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Режим обслуживания</span>
                                            <button
                                                onClick={() => setMaintenanceMode(m => !m)}
                                                className={maintenanceMode
                                                    ? 'text-xs px-2 py-1 rounded-full transition-colors bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20'
                                                    : 'text-xs px-2 py-1 rounded-full transition-colors bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20'
                                                }
                                            >
                                                {maintenanceMode ? 'Включён' : 'Выключен'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Moderation Modal */}
            {showModerationModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Shield size={20} className="text-[var(--danger)]" /> Модерация контента</h2>
                                <button onClick={() => setShowModerationModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <Filter size={16} className="text-[var(--text-muted)]" />
                                {[
                                    { id: 'all', label: 'Все' },
                                    { id: 'pending', label: 'В очереди' },
                                    { id: 'approved', label: 'Одобрены' },
                                    { id: 'rejected', label: 'Отклонены' },
                                    { id: 'reviewed', label: 'Просмотрены' },
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setReportFilter(f.id)}
                                        className={getFilterButtonClass(f.id, reportFilter)}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-3">
                                {reports.filter(r => reportFilter === 'all' || r.status === reportFilter).length === 0 && (
                                    <p className="text-center text-[var(--text-muted)] py-8">Нет жалоб с выбранным статусом</p>
                                )}
                                {reports.filter(r => reportFilter === 'all' || r.status === reportFilter).map(report => {
                                    const borderColor = report.status === 'pending' ? 'border-l-[var(--accent-warm)]' : report.status === 'approved' ? 'border-l-[var(--success)]' : report.status === 'rejected' ? 'border-l-[var(--danger)]' : 'border-l-[var(--accent)]'
                                    return (
                                    <div key={report.id} className={`bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] border-l-4 ${borderColor} flex items-start gap-4`}>
                                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getReportStatusDotClass(report.status)}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm">{report.user}</span>
                                                <span className="text-xs text-[var(--text-muted)]">{report.platform}</span>
                                                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getReportStatusBadgeClass(report.status)}`}>
                                                    {getReportStatusLabel(report.status)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-muted)]">{report.content}</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">{report.date}</p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleReportAction(report.id, 'approve')}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] text-xs hover:bg-[var(--success)]/20 transition-colors"
                                            >
                                                Одобрить
                                            </button>
                                            <button
                                                onClick={() => handleReportAction(report.id, 'reject')}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-xs hover:bg-[var(--danger)]/20 transition-colors"
                                            >
                                                Отклонить
                                            </button>
                                            <button
                                                onClick={() => handleReportAction(report.id, 'review')}
                                                className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-xs hover:bg-[var(--accent)]/20 transition-colors"
                                            >
                                                Просмотр
                                            </button>
                                        </div>
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Modal */}
            {showLogsModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Terminal size={20} className="text-[var(--accent)]" /> Системные логи</h2>
                                <button onClick={() => setShowLogsModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-2 font-mono text-sm">
                                {SYSTEM_LOGS.map((log, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                                        <span className="text-[var(--text-muted)] flex-shrink-0">{log.time}</span>
                                        <span className={getLogLevelClass(log.level)}>{log.level}</span>
                                        <span className="text-[var(--text-muted)] flex-shrink-0">[{log.service}]</span>
                                        <span className="text-[var(--text)]">{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Platform Settings Modal */}
            {showPlatformSettingsModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-lg max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Wrench size={20} className="text-[var(--success)]" /> Настройки платформы</h2>
                                <button onClick={() => setShowPlatformSettingsModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: 'Лимит API запросов/мин', key: 'apiRateLimit', unit: '' },
                                    { label: 'Макс. размер файла', key: 'maxFileSize', unit: 'MB' },
                                    { label: 'Квота постов (Free)', key: 'defaultQuota', unit: '/мес' },
                                ].map((setting) => (
                                    <div key={setting.key} className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                                        <span className="text-sm">{setting.label}</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={settingsForm[setting.key]}
                                                onChange={e => setSettingsForm({ ...settingsForm, [setting.key]: parseInt(e.target.value) || 0 })}
                                                className="w-24 px-2 py-1 rounded bg-[var(--card)] border border-[var(--border-strong)] text-[var(--text)] text-sm text-right focus:outline-none focus:border-[var(--success)]/30"
                                            />
                                            <span className="text-xs text-[var(--text-muted)] w-10">{setting.unit}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm">Разрешённые форматы</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={settingsForm.allowedFormats.join(', ')}
                                        onChange={e => setSettingsForm({ ...settingsForm, allowedFormats: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                        className="w-full px-3 py-2 rounded bg-[var(--card)] border border-[var(--border-strong)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--success)]/30"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                                    <span className="text-sm">Режим обслуживания</span>
                                    <button
                                        onClick={() => setSettingsForm({ ...settingsForm, maintenanceMode: !settingsForm.maintenanceMode })}
                                        className={settingsForm.maintenanceMode
                                            ? 'px-3 py-1 rounded-full text-xs font-medium transition-colors bg-[var(--danger)]/10 text-[var(--danger)] border border-red-500/20'
                                            : 'px-3 py-1 rounded-full text-xs font-medium transition-colors bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20'
                                        }
                                    >
                                        {settingsForm.maintenanceMode ? 'Включён' : 'Выключен'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowPlatformSettingsModal(false)} className="flex-1 px-4 py-2 bg-[var(--surface)] rounded-lg hover:bg-[#303040] transition-colors">Отмена</button>
                                <button onClick={handleSaveSettings} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-[var(--text-inverse)] font-medium rounded-lg transition-all flex items-center justify-center gap-2">
                                    <Save size={16} /> Сохранить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Finance Modal */}
            {showFinanceModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-strong)] w-full max-w-lg">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp size={20} className="text-[var(--accent-warm)]" /> Финансы платформы</h2>
                                <button onClick={() => setShowFinanceModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Общий доход</p>
                                    <p className="text-xl font-bold text-[var(--success)]">${FINANCE_DATA.totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Выплаты в обработке</p>
                                    <p className="text-xl font-bold text-[var(--accent-warm)]">${FINANCE_DATA.pendingPayouts.toLocaleString()}</p>
                                </div>
                                <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Этот месяц</p>
                                    <p className="text-xl font-bold text-[var(--accent)]">${FINANCE_DATA.thisMonth.toLocaleString()}</p>
                                </div>
                                <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Прошлый месяц</p>
                                    <p className="text-xl font-bold text-[var(--text-muted)]">${FINANCE_DATA.lastMonth.toLocaleString()}</p>
                                </div>
                            </div>
                            <h3 className="font-semibold mb-3">Топ клиентов</h3>
                            <div className="space-y-2">
                                {FINANCE_DATA.topClients.map((client, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                                        <span className="text-sm">{client.name}</span>
                                        <span className="font-medium text-[var(--success)]">${client.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminDashboardPage