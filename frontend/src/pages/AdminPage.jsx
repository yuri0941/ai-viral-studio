import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Shield, Users, Star, AlertTriangle, FileText, DollarSign,
    Plus, Search, Edit3, Lock, Trash2, Check, X, Settings,
    TrendingUp, Activity, MessageSquare, Ban
} from 'lucide-react';

function AdminPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [saved, setSaved] = useState(false);

    const [users, setUsers] = useState([
        { id: 1, name: 'Иван Петров', email: 'ivan@mail.com', role: 'creator', status: 'active', posts: 45, registered: '2026-06-15' },
        { id: 2, name: 'Мария Сидорова', email: 'maria@mail.com', role: 'business', status: 'active', posts: 128, registered: '2026-05-20' },
        { id: 3, name: 'ООО Реклама', email: 'ads@company.ru', role: 'advertiser', status: 'blocked', posts: 12, registered: '2026-07-01' },
        { id: 4, name: 'Алексей К.', email: 'alex@mail.com', role: 'creator', status: 'active', posts: 8, registered: '2026-07-10' },
        { id: 5, name: 'Test User', email: 'test@test.com', role: 'creator', status: 'moderation', posts: 0, registered: '2026-07-20' },
    ]);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: 'creator',
        status: 'active'
    });

    const stats = [
        { label: 'Всего пользователей', value: '1247', icon: Users, color: 'text-purple-400', change: '+12' },
        { label: 'Активны сегодня', value: '89', icon: Activity, color: 'text-emerald-400', change: '+5' },
        { label: 'Новых сегодня', value: '+12', icon: TrendingUp, color: 'text-yellow-400', change: '' },
        { label: 'Жалобы', value: '5', icon: AlertTriangle, color: 'text-red-400', change: '-2' },
        { label: 'Всего постов', value: '45 620', icon: FileText, color: 'text-blue-400', change: '+234' },
        { label: 'Доход', value: '$15 400', icon: DollarSign, color: 'text-emerald-400', change: '+8%' },
    ];

    const getRoleBadge = (role) => {
        const styles = {
            creator: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            business: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            advertiser: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        };
        return styles[role] || styles.creator;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return { text: 'Активен', color: 'text-emerald-400', icon: Check };
            case 'blocked': return { text: 'Заблокирован', color: 'text-red-400', icon: Ban };
            case 'moderation': return { text: 'На модерации', color: 'text-yellow-400', icon: AlertTriangle };
            default: return { text: status, color: 'text-gray-400', icon: Activity };
        }
    };

    const handleAddUser = () => {
        if (!newUser.name.trim() || !newUser.email.trim()) return;
        const user = {
            id: Date.now(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            posts: 0,
            registered: new Date().toISOString().split('T')[0]
        };
        setUsers([...users, user]);
        setNewUser({ name: '', email: '', role: 'creator', status: 'active' });
        setShowAddModal(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold">Admin Panel</h1>
                        <Shield size={24} className="text-blue-400" />
                    </div>
                    <p className="text-gray-400 text-sm">Управление платформой и пользователями</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/settings')}
                        className="px-4 py-2 bg-[#1a1a24] border border-white/10 rounded-lg text-sm hover:bg-[#252530] transition-colors"
                    >
                        Настройки
                    </button>
                    <button className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium">
                        Owner
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-[#1a1a24] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all">
                            <Icon size={20} className={`mb-2 ${stat.color}`} />
                            <div className="text-xl font-bold">{stat.value}</div>
                            <div className="text-xs text-gray-400">{stat.label}</div>
                            {stat.change && (
                                <div className="text-xs text-emerald-400 mt-1">{stat.change}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Users Table */}
            <div className="bg-[#1a1a24] rounded-xl border border-white/5 overflow-hidden mb-6">
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="font-semibold text-lg">Пользователи</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Поиск..."
                                className="pl-9 pr-4 py-2 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none text-sm w-48"
                            />
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-all hover:scale-105"
                        >
                            <Plus size={16} /> Добавить
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-400 border-b border-white/5">
                                <th className="px-4 py-3 font-medium">ID</th>
                                <th className="px-4 py-3 font-medium">Имя</th>
                                <th className="px-4 py-3 font-medium">Email</th>
                                <th className="px-4 py-3 font-medium">Роль</th>
                                <th className="px-4 py-3 font-medium">Статус</th>
                                <th className="px-4 py-3 font-medium">Постов</th>
                                <th className="px-4 py-3 font-medium">Дата регистрации</th>
                                <th className="px-4 py-3 font-medium text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => {
                                const status = getStatusBadge(user.status);
                                const StatusIcon = status.icon;
                                return (
                                    <tr key={user.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-4 text-sm text-gray-400">#{user.id}</td>
                                        <td className="px-4 py-4 font-medium">{user.name}</td>
                                        <td className="px-4 py-4 text-sm text-gray-400">{user.email}</td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRoleBadge(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className={`flex items-center gap-1.5 text-sm ${status.color}`}>
                                                <StatusIcon size={14} /> {status.text}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-medium">{user.posts}</td>
                                        <td className="px-4 py-4 text-sm text-gray-400">{user.registered}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                                                    <Edit3 size={14} />
                                                </button>
                                                <button className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                                                    <Lock size={14} />
                                                </button>
                                                <button className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { title: 'Модерация контента', desc: '5 жалоб на рассмотрении', icon: Shield, color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/20' },
                    { title: 'Системные логи', desc: 'Последние ошибки', icon: FileText, color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20' },
                    { title: 'Настройки платформы', desc: 'API, лимиты, роли', icon: Settings, color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20' },
                    { title: 'Финансы', desc: 'Доходы и выплаты', icon: DollarSign, color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/20' },
                ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div key={i} className={`bg-gradient-to-br ${card.color} rounded-xl p-5 border ${card.border} hover:border-opacity-50 transition-all cursor-pointer hover:scale-[1.02]`}>
                            <Icon size={24} className="mb-3 text-white/80" />
                            <h4 className="font-semibold mb-1">{card.title}</h4>
                            <p className="text-sm text-gray-300">{card.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a24] rounded-2xl border border-white/10 w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Добавить пользователя</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Имя</label>
                                <input
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="Иван Петров"
                                    className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Email</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="ivan@mail.com"
                                    className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Роль</label>
                                    <select
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none"
                                    >
                                        <option value="creator">Creator</option>
                                        <option value="business">Business</option>
                                        <option value="advertiser">Advertiser</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Статус</label>
                                    <select
                                        value={newUser.status}
                                        onChange={e => setNewUser({ ...newUser, status: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[#252530] rounded-lg border border-white/10 focus:border-emerald-500 outline-none"
                                    >
                                        <option value="active">Активен</option>
                                        <option value="moderation">На модерации</option>
                                        <option value="blocked">Заблокирован</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-[#252530] rounded-lg hover:bg-[#303040] transition-colors">
                                    Отмена
                                </button>
                                <button
                                    onClick={handleAddUser}
                                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {saved ? <><Check size={16} /> Добавлен!</> : <><Plus size={16} /> Добавить</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPage;