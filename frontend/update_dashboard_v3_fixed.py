
# Скрипт для обновления Sidebar.jsx + OwnerDashboardPage.jsx — ВЕРСИЯ 3 FIXED
# Правильный путь: src/components/layout/Sidebar.jsx
# Запуск: python update_dashboard_v3_fixed.py

import os
import re

SIDEBAR_PATH = r"D:\kilo2\frontend\src\components\layout\Sidebar.jsx"
OWNER_PATH = r"D:\kilo2\frontend\src\pages\OwnerDashboardPage.jsx"

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def backup(path):
    backup_path = path + ".backup_v3fix_" + str(int(__import__('time').time()))
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(read_file(path))
    return backup_path

def update_sidebar():
    """Обновляем Sidebar.jsx — добавляем кабинеты и подписки"""

    if not os.path.exists(SIDEBAR_PATH):
        print(f"❌ Sidebar.jsx не найден: {SIDEBAR_PATH}")
        return False

    content = read_file(SIDEBAR_PATH)
    print(f"📁 Sidebar.jsx найден ({len(content)} байт)")

    backup_path = backup(SIDEBAR_PATH)
    print(f"💾 Бэкап: {backup_path}")

    # Добавляем импорты
    old_imports = "import {\n    Crown, Shield, BarChart3, Bot, Calendar, Settings,\n    LogOut, ChevronLeft, ChevronRight, Sparkles, Menu, X\n} from 'lucide-react';"

    new_imports = """import {
    Crown, Shield, BarChart3, Bot, Calendar, Settings,
    LogOut, ChevronLeft, ChevronRight, Sparkles, Menu, X,
    Users, CreditCard, Briefcase, Eye
} from 'lucide-react';"""

    content = content.replace(old_imports, new_imports)

    # Добавляем useState для кабинетов и подписок
    old_state = "const [collapsed, setCollapsed] = useState(false);"
    new_state = """const [collapsed, setCollapsed] = useState(false);
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
    const [editingPrice, setEditingPrice] = useState(null);"""

    content = content.replace(old_state, new_state)

    # Добавляем функции сохранения
    old_nav = "const handleNav = (path) => {"
    new_nav = """const saveCabinets = (data) => {
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

    const handleNav = (path) => {"""

    content = content.replace(old_nav, new_nav)

    # Добавляем секцию кабинетов и подписок перед User Profile
    old_user_profile = "{/* User Profile */}"

    new_sections = """{/* Owner Cabinets */}
                {user?.role === 'owner' && (
                    <div className="px-3 py-2">
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
                )}

                {/* Subscriptions */}
                {user?.role === 'owner' && (
                    <div className="px-3 py-2 border-t border-white/5">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-3">Подписки</div>
                        <div className="space-y-1">
                            {subscriptions.map((sub, i) => (
                                <div key={sub.name} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                                    {!collapsed ? (
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-300">{sub.name}</span>
                                                {editingPrice === i ? (
                                                    <input
                                                        type="number"
                                                        defaultValue={sub.price}
                                                        onBlur={(e) => { updatePrice(i, e.target.value); setEditingPrice(null); }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { updatePrice(i, e.target.value); setEditingPrice(null); } }}
                                                        className="w-16 px-1 py-0.5 bg-[#1a1a24] rounded text-xs text-emerald-400 border border-emerald-500/30 outline-none"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <button onClick={() => setEditingPrice(i)} className="text-xs text-emerald-400 hover:underline">
                                                        ${sub.price}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-gray-500">{sub.users} пользователей</div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">${sub.price}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* User Profile */}"""

    content = content.replace(old_user_profile, new_sections)

    write_file(SIDEBAR_PATH, content)
    print(f"✅ Sidebar.jsx обновлён ({len(content)} байт)")
    return True

def update_owner_page():
    """Удаляем встроенный sidebar из OwnerDashboardPage.jsx"""

    if not os.path.exists(OWNER_PATH):
        print(f"❌ OwnerDashboardPage.jsx не найден: {OWNER_PATH}")
        return False

    content = read_file(OWNER_PATH)
    print(f"📁 OwnerDashboardPage.jsx найден ({len(content)} байт)")

    backup_path = backup(OWNER_PATH)
    print(f"💾 Бэкап: {backup_path}")

    # Удаляем встроенный sidebar (от {/* SIDEBAR */} до </aside>)
    pattern = r'\s*\{/?\* SIDEBAR.*?\*/?\}\s*<aside.*?</aside>\s*'
    content = re.sub(pattern, '\n', content, flags=re.DOTALL)

    # Удаляем старые данные cabinets (теперь они в Sidebar.jsx + localStorage)
    # Но оставляем для совместимости — просто добавляем загрузку из localStorage
    old_cabinets = "const [cabinets, setCabinets] = useState(["
    new_cabinets = """const [cabinets, setCabinets] = useState(() => {
        const saved = localStorage.getItem('owner_cabinets');
        if (saved) return JSON.parse(saved);
        return ["""

    content = content.replace(old_cabinets, new_cabinets)

    write_file(OWNER_PATH, content)
    print(f"✅ OwnerDashboardPage.jsx обновлён ({len(content)} байт)")
    return True

def main():
    print("=" * 70)
    print("ОБНОВЛЕНИЕ SIDEBAR + OWNER DASHBOARD — ВЕРСИЯ 3 FIXED")
    print("=" * 70)
    print()

    success1 = update_sidebar()
    print()
    success2 = update_owner_page()
    print()

    if success1 and success2:
        print("=" * 70)
        print("✅ ГОТОВО! Перезапусти npm run dev")
        print("=" * 70)
        print()
        print("Что добавлено:")
        print("  1. 📂 Кабинеты сотрудников в Sidebar (с аватарками, статусом онлайн)")
        print("  2. 👑 Подписки в Sidebar (Free, Creator, Pro, Agency, Enterprise)")
        print("  3. 💰 Редактирование цен подписок (кликни на цену → введи новую)")
        print("  4. 💾 localStorage — данные сохраняются при обновлении страницы!")
        print("  5. 🗑️ Убран дублирующий sidebar из OwnerDashboardPage")
        print()
        print("ВАЖНО:")
        print("  • Данные кабинетов и подписок теперь в localStorage")
        print("  • При первом запуске создаются mock-данные")
        print("  • Все изменения сохраняются автоматически")
    else:
        print("❌ Ошибка при обновлении!")

if __name__ == "__main__":
    main()
