import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    MessageSquare, Check, X, Archive, Search, Filter,
    DollarSign, Building2, Mail, Phone, Clock, ArrowLeft,
    Send, User, Calendar, Tag, Star, AlertCircle
} from 'lucide-react'

function AdvertiserRequestsPage() {
    const navigate = useNavigate()
    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRequest, setSelectedRequest] = useState(null)

    const [requests, setRequests] = useState([
        { id: 1, name: 'Алексей Петров', company: 'TechCorp', email: 'alex@techcorp.com', phone: '+7 (999) 111-22-33', budget: '$5,000', description: 'Рекламная кампания в TikTok для продвижения нового продукта. Целевая аудитория: 18-35 лет.', status: 'new', date: '22.07.2026', priority: 'high' },
        { id: 2, name: 'Мария Иванова', company: 'StyleShop', email: 'maria@styleshop.ru', phone: '+7 (999) 222-33-44', budget: '$12,000', description: 'Интеграция с блогерами в Instagram и YouTube. Нужно 10 инфлюенсеров.', status: 'in_progress', date: '21.07.2026', priority: 'medium' },
        { id: 3, name: 'Дмитрий Смирнов', company: 'GameDev Studio', email: 'dmitry@gamedev.io', phone: '+7 (999) 333-44-55', budget: '$25,000', description: 'Продвижение мобильной игры через рекламные сети и нативную интеграцию.', status: 'completed', date: '20.07.2026', priority: 'high' },
        { id: 4, name: 'Анна Козлова', company: 'FitLife', email: 'anna@fitlife.com', phone: '+7 (999) 444-55-66', budget: '$8,500', description: 'Реклама фитнес-приложения. Таргетированная реклама в соцсетях.', status: 'new', date: '22.07.2026', priority: 'medium' },
        { id: 5, name: 'Сергей Волков', company: 'EduPro', email: 'sergey@edupro.ru', phone: '+7 (999) 555-66-77', budget: '$3,200', description: 'Продвижение онлайн-курсов. Email-маркетинг + контекстная реклама.', status: 'archived', date: '18.07.2026', priority: 'low' },
    ])

    const handleAccept = (id) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'in_progress' } : r))
    }

    const handleReject = (id) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'archived' } : r))
    }

    const handleComplete = (id) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' } : r))
    }

    const filteredRequests = requests.filter(r => {
        if (filter !== 'all' && r.status !== filter) return false
        if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase()) && !r.company.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
    })

    const getStatusColor = (status) => {
        switch (status) {
            case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            case 'in_progress': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
            case 'completed': return 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/20'
            case 'archived': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            default: return 'bg-gray-500/10 text-gray-400'
        }
    }

    const getStatusText = (status) => {
        switch (status) {
            case 'new': return 'Новая'
            case 'in_progress': return 'В работе'
            case 'completed': return 'Завершена'
            case 'archived': return 'Архив'
            default: return status
        }
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'text-red-400'
            case 'medium': return 'text-yellow-400'
            case 'low': return 'text-gray-400'
            default: return 'text-gray-400'
        }
    }

    const stats = {
        total: requests.length,
        new: requests.filter(r => r.status === 'new').length,
        inProgress: requests.filter(r => r.status === 'in_progress').length,
        completed: requests.filter(r => r.status === 'completed').length,
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            <main className="lg:ml-64 min-h-screen">
                <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <button onClick={() => navigate('/owner')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3 transition-colors">
                                <ArrowLeft size={16} /> Назад к панели владельца
                            </button>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-400 to-red-500 text-black text-xs font-bold">ADS</span>
                                <h1 className="text-3xl font-bold">Заявки на рекламу</h1>
                            </div>
                            <p className="text-gray-400 mt-1">Управление рекламными заявками от клиентов</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="glass rounded-2xl p-5 border border-white/5">
                            <div className="flex items-center gap-2 mb-2"><MessageSquare className="w-5 h-5 text-blue-400" /><p className="text-sm text-gray-400">Всего заявок</p></div>
                            <p className="text-2xl font-black text-white">{stats.total}</p>
                        </div>
                        <div className="glass rounded-2xl p-5 border border-white/5">
                            <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-5 h-5 text-blue-400" /><p className="text-sm text-gray-400">Новых</p></div>
                            <p className="text-2xl font-black text-blue-400">{stats.new}</p>
                        </div>
                        <div className="glass rounded-2xl p-5 border border-white/5">
                            <div className="flex items-center gap-2 mb-2"><Clock className="w-5 h-5 text-yellow-400" /><p className="text-sm text-gray-400">В работе</p></div>
                            <p className="text-2xl font-black text-yellow-400">{stats.inProgress}</p>
                        </div>
                        <div className="glass rounded-2xl p-5 border border-white/5">
                            <div className="flex items-center gap-2 mb-2"><Check className="w-5 h-5 text-[#00ff41]" /><p className="text-sm text-gray-400">Завершённых</p></div>
                            <p className="text-2xl font-black text-[#00ff41]">{stats.completed}</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по имени или компании..." className="pl-10 pr-4 py-2 bg-[#1a1a24] rounded-xl border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-[#00ff41]/30 w-72" />
                            </div>
                            <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 bg-[#1a1a24] rounded-xl border border-white/10 text-sm text-white outline-none focus:border-[#00ff41]/30">
                                <option value="all">Все статусы</option>
                                <option value="new">Новые</option>
                                <option value="in_progress">В работе</option>
                                <option value="completed">Завершённые</option>
                                <option value="archived">Архив</option>
                            </select>
                        </div>
                    </div>

                    {/* Requests List */}
                    <div className="space-y-4">
                        {filteredRequests.map(req => (
                            <div key={req.id} className="glass rounded-2xl p-5 border border-white/5 hover:border-white/[0.1] transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-lg font-bold">
                                            {req.name[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-white">{req.name}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(req.status)}`}>{getStatusText(req.status)}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="w-3 h-3" /> {req.company}</span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {req.email}</span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {req.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-[#00ff41]">{req.budget}</p>
                                        <p className="text-xs text-gray-500">{req.date}</p>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-400 mb-4">{req.description}</p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs flex items-center gap-1 ${getPriorityColor(req.priority)}`}>
                                            <Star className="w-3 h-3" />
                                            {req.priority === 'high' ? 'Высокий приоритет' : req.priority === 'medium' ? 'Средний приоритет' : 'Низкий приоритет'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {req.status === 'new' && (
                                            <>
                                                <button onClick={() => handleAccept(req.id)} className="flex items-center gap-2 px-4 py-2 bg-[#00ff41] hover:bg-[#00cc33] text-black font-medium rounded-lg transition-all text-sm">
                                                    <Check size={14} /> Принять
                                                </button>
                                                <button onClick={() => handleReject(req.id)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all text-sm">
                                                    <X size={14} /> Отклонить
                                                </button>
                                            </>
                                        )}
                                        {req.status === 'in_progress' && (
                                            <>
                                                <button onClick={() => handleComplete(req.id)} className="flex items-center gap-2 px-4 py-2 bg-[#00ff41] hover:bg-[#00cc33] text-black font-medium rounded-lg transition-all text-sm">
                                                    <Check size={14} /> Завершить
                                                </button>
                                                <button onClick={() => handleReject(req.id)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all text-sm">
                                                    <Archive size={14} /> В архив
                                                </button>
                                            </>
                                        )}
                                        {req.status === 'completed' && (
                                            <span className="text-xs text-[#00ff41] flex items-center gap-1"><Check size={14} /> Заявка завершена</span>
                                        )}
                                        {req.status === 'archived' && (
                                            <button onClick={() => handleAccept(req.id)} className="flex items-center gap-2 px-4 py-2 bg-[#252530] hover:bg-[#303040] text-gray-400 rounded-lg transition-all text-sm">
                                                <Send size={14} /> Восстановить
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredRequests.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Заявки не найдены</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default AdvertiserRequestsPage