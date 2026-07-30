import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Crown, Shield, BarChart3, Bot, Calendar, Settings,
    LogOut, ChevronLeft, ChevronRight, Sparkles, Menu, X,
    Users, CreditCard, Briefcase, Eye
} from 'lucide-react';

function Sidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [cabinets, setCabinets] = useState(() => {
        const saved = localStorage.getItem('owner_cabinets');
        return saved ? JSON.parse(saved) : [
            { id: 1, name: 'Мария Сидорова', email: 'maria.cabinet@ai-viral.com', department: 'support', status: 'active', avatar: 'М', activeNow: true },
            { id: 2, name: 'Алексей Иванов', email: 'alex.cabinet@ai-viral.com', department: 'content', status: 'active', avatar: 'А', activeNow: true },
            { id: 3, name: 'Ольга Козлова', email: 'olga.cabinet@ai-viral.com', department: 'sales', status: 'paused', avatar: 'О', activeNow: false },
            { id: 4, name: 'Дмитрий Смирнов', email: 'dmitry.cabinet@ai-viral.com', department: 'tech', status: 'active', avatar: 'Д', activeNow: true },
        ];
    });
    const [subscriptions, setSubscriptions] = useState(() => {
        const saved = localStorage.getItem('owner_subscriptions');
        return saved ? JSON.parse(saved) : [
            { name: 'Free', price: 0, users: 450, color: '#6b7280' },
            { name: 'Creator', price: 10, users: 280, color: '#2563eb' },
            { name: 'Pro', price: 30, users: 150, color: '#8b5cf6' },
            { name: 'Agency', price: 100, users: 80, color: '#00ff41' },
            { name: 'Enterprise', price: 300, users: 40, color: '#f0883e' },
        ];
    });
    const [editingPrice, setEditingPrice] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth < 1024) {
                setCollapsed(true);
            } else {
                setCollapsed(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const menuItems = [
        { path: '/owner', label: 'Owner Panel', icon: Crown, role: 'owner', color: 'text-yellow-400' },
        { path: '/admin', label: 'Admin Panel', icon: Shield, role: 'admin', color: 'text-blue-400' },
        { path: '/analytics', label: 'Аналитика', icon: BarChart3, role: 'all', color: 'text-emerald-400' },
        { path: '/ai-chat', label: 'AI Chat', icon: Bot, role: 'all', color: 'text-purple-400' },
        { path: '/scheduler', label: 'Планировщик', icon: Calendar, role: 'all', color: 'text-pink-400' },
        { path: '/settings', label: 'Настройки', icon: Settings, role: 'all', color: 'text-gray-400' },
    ];

    const filteredItems = menuItems.filter(item =>
        item.role === 'all' || (user?.role && item.role === user.role)
    );

    const isActive = (path) => location.pathname === path;

    const saveCabinets = (data) => {
        localStorage.setItem('owner_cabinets', JSON.stringify(data));
        setCabinets(data);
    };

    const saveSubscriptions = (data) => {
        localStorage.setItem('owner_subscriptions', JSON.stringify(data));
        setSubscriptions(data);
    };

    const updatePrice = (index, newPrice) => {
        const updated = [...subscriptions];
        updated[index].price = parseFloat(newPrice) || 0;
        saveSubscriptions(updated);
    };

    const handleNav = (path) => {
        navigate(path);
        if (isMobile) setMobileOpen(false);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && isMobile && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Toggle Button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-[#1a1a24] rounded-xl border border-white/10 flex items-center justify-center text-white"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 left-0 h-screen bg-[#0f0f17] border-r border-white/5 z-40 transition-all duration-300 flex flex-col
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-20' : 'w-64'}
        `}
            >
                {/* Logo */}
                <div className={`p-4 border-b border-white/5 ${collapsed ? 'text-center' : ''}`}>
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        {!collapsed && (
                            <div className="hidden lg:block">
                                <div className="font-bold text-lg leading-tight">AI Viral</div>
                                <div className="text-xs text-gray-500">Studio</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Role Badge */}
                {!collapsed && user?.role && (
                    <div className="px-4 py-2">
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider text-center">
                            {user.role}
                        </div>
                    </div>
                )}
                {collapsed && user?.role && (
                    <div className="px-4 py-2 flex justify-center">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                            {user.role.charAt(0).toUpperCase()}
                        </div>
                    </div>
                )}

                {/* Scrollable Area: Navigation + Cabinets + Subscriptions */}
                <div className="flex-1 overflow-y-auto min-h-0">

                    {/* Navigation */}
                    <nav className="px-3 py-4 space-y-1">
                        {filteredItems.map(item => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleNav(item.path)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative
                      ${active
                                            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-white'
                                            : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'
                                        }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                                >
                                    <Icon
                                        size={20}
                                        className={`transition-transform group-hover:scale-110 ${active ? 'text-emerald-400' : item.color}`}
                                    />
                                    {!collapsed && (
                                        <span className="font-medium text-sm hidden lg:block">{item.label}</span>
                                    )}
                                    {active && !collapsed && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 hidden lg:block"></div>
                                    )}

                                    {/* Tooltip for collapsed */}
                                    {collapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a24] rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none border border-white/10 z-50">
                                            {item.label}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Owner Cabinets */}
                    <div className="px-3 py-2 border-t border-white/5">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">Кабинеты</div>
                        <div className="space-y-1">
                            {cabinets.map(cabinet => (
                                <button
                                    key={cabinet.id}
                                    onClick={() => handleNav('/owner/cabinet/' + cabinet.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group text-left"
                                >
                                    <div className="relative">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                                            {cabinet.avatar}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0f0f17] ${cabinet.activeNow ? 'bg-emerald-400' : cabinet.status === 'paused' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
                                    </div>
                                    {!collapsed && (
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-gray-300 truncate">{cabinet.name}</div>
                                            <div className="text-[10px] text-gray-500 capitalize">{cabinet.department}</div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subscriptions */}
                    <div className="px-3 py-2 border-t border-white/5">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">Подписки</div>
                        <div className="space-y-1">
                            {subscriptions.map((sub, idx) => (
                                <div key={sub.name} className="flex items-center justify-between px-3 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                                        <span className="text-sm text-gray-400">{sub.name}</span>
                                    </div>
                                    {!collapsed && (
                                        <div className="flex items-center gap-2">
                                            {editingPrice === idx ? (
                                                <input
                                                    type="number"
                                                    defaultValue={sub.price}
                                                    autoFocus
                                                    onBlur={(e) => { updatePrice(idx, e.target.value); setEditingPrice(null); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { updatePrice(idx, e.target.value); setEditingPrice(null); } }}
                                                    className="w-16 px-1 py-0.5 bg-[#1a1a24] rounded border border-[#00ff41]/30 text-xs font-mono text-[#00ff41] text-right"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => setEditingPrice(idx)}
                                                    className="text-xs font-mono text-[#00ff41] hover:text-[#00cc33] transition-colors"
                                                >
                                                    ${sub.price}
                                                </button>
                                            )}
                                            <span className="text-[10px] text-gray-600">({sub.users})</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="mx-3 mb-2 p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all flex items-center justify-center"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>

                {/* User Profile */}
                <div className="p-3 border-t border-white/5">
                    <button
                        onClick={() => handleNav('/settings')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group
              ${collapsed ? 'justify-center' : ''}
            `}
                    >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white">{user?.name?.charAt(0) || 'U'}</span>
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0 text-left">
                                <div className="text-sm font-medium text-white truncate">{user?.name || 'User'}</div>
                                <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
                            </div>
                        )}
                    </button>

                    <button
                        onClick={logout}
                        className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all group
              ${collapsed ? 'justify-center' : ''}
            `}
                    >
                        <LogOut size={18} />
                        {!collapsed && <span className="text-sm font-medium">Выйти</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
