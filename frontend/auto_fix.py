import re

file_path = r"D:\kilo2\frontend\src\pages\OwnerDashboardPage.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"📊 Файл: {len(content)} символов")

# === 1. Добавить subscriptions state после editingApiKey ===
marker1 = "const [editingApiKey, setEditingApiKey] = useState(null)"
if marker1 in content and "const [subscriptions, setSubscriptions]" not in content:
    sub_state = """const [editingApiKey, setEditingApiKey] = useState(null)
    const [subscriptions, setSubscriptions] = useState(() => {
        const saved = localStorage.getItem('owner_subscriptions')
        return saved ? JSON.parse(saved) : [
            { name: 'Free', price: 0, users: 450, color: '#6b7280', features: ['1 проект', 'Базовая аналитика', 'Email поддержка'] },
            { name: 'Creator', price: 10, users: 280, color: '#2563eb', features: ['5 проектов', 'Расширенная аналитика', 'Приоритетная поддержка'] },
            { name: 'Pro', price: 30, users: 150, color: '#8b5cf6', features: ['20 проектов', 'AI генерация', 'API доступ'] },
            { name: 'Agency', price: 100, users: 80, color: '#00ff41', features: ['Безлимит проектов', 'White label', 'Выделенный менеджер'] },
            { name: 'Enterprise', price: 300, users: 40, color: '#f0883e', features: ['Кастом решения', 'On-premise', 'SLA 99.9%'] },
        ]
    })
    const [editingSubPrice, setEditingSubPrice] = useState(null)
    const [newSubPrice, setNewSubPrice] = useState('')"""
    content = content.replace(marker1, sub_state)
    print("✅ Добавлен subscriptions state")
else:
    print("⚠️ subscriptions state уже есть или маркер не найден")

# === 2. Добавить функции подписок после handleCancelEdit ===
marker2 = "    const handleCancelEdit = () => {\n        setEditingApiKey(null)\n        setNewApiKeyValue('')\n    }"
if marker2 in content and "handleUpdateSubPrice" not in content:
    sub_funcs = """    const handleCancelEdit = () => {
        setEditingApiKey(null)
        setNewApiKeyValue('')
    }

    const handleUpdateSubPrice = (index) => {
        const updated = [...subscriptions]
        updated[index].price = parseFloat(newSubPrice) || 0
        setSubscriptions(updated)
        localStorage.setItem('owner_subscriptions', JSON.stringify(updated))
        setEditingSubPrice(null)
        setNewSubPrice('')
        showToast(`Цена тарифа ${updated[index].name} обновлена`, 'success')
    }

    const handleCancelSubEdit = () => {
        setEditingSubPrice(null)
        setNewSubPrice('')
    }"""
    content = content.replace(marker2, sub_funcs)
    print("✅ Добавлены функции подписок")
else:
    print("⚠️ Функции подписок уже есть или маркер не найден")

# === 3. Добавить вкладку Подписки в tabs массив ===
marker3 = "        { id: 'audit', label: 'Аудит', icon: '🔍' },"
if marker3 in content and "'subscriptions'" not in content:
    new_tab = """        { id: 'audit', label: 'Аудит', icon: '🔍' },
        { id: 'subscriptions', label: 'Подписки', icon: '💳' },"""
    content = content.replace(marker3, new_tab)
    print("✅ Добавлена вкладка Подписки")
else:
    print("⚠️ Вкладка уже есть или маркер не найден")

# === 4. Добавить контент вкладки Подписки перед servers ===
marker4 = "                    {/* SERVERS TAB */}"
if marker4 in content and "activeTab === 'subscriptions'" not in content:
    sub_content = """                    {/* SUBSCRIPTIONS TAB */}
                    {activeTab === 'subscriptions' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <CreditCard className="text-[#00ff41]" size={20} />
                                Тарифные планы
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subscriptions.map((sub, idx) => (
                                    <div key={sub.name} className="glass rounded-2xl p-5 border border-white/5 hover:border-[#00ff41]/30 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                                                <h3 className="font-bold text-white text-lg">{sub.name}</h3>
                                            </div>
                                            <span className="text-xs text-gray-500">{sub.users} пользователей</span>
                                        </div>
                                        <div className="mb-4">
                                            {editingSubPrice === idx ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl font-bold text-[#00ff41]">$</span>
                                                    <input
                                                        type="number"
                                                        value={newSubPrice}
                                                        onChange={(e) => setNewSubPrice(e.target.value)}
                                                        autoFocus
                                                        className="w-20 px-2 py-1 bg-[#0f0f17] rounded border border-[#00ff41]/30 text-xl font-bold text-[#00ff41] text-center"
                                                    />
                                                    <button onClick={() => handleUpdateSubPrice(idx)} className="p-1.5 rounded-lg bg-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/30">
                                                        <Check size={16} />
                                                    </button>
                                                    <button onClick={handleCancelSubEdit} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setEditingSubPrice(idx); setNewSubPrice(sub.price.toString()); }} className="text-3xl font-bold text-[#00ff41] hover:text-[#00cc33] transition-colors">
                                                    ${sub.price}<span className="text-gray-500 text-sm font-normal">/мес</span>
                                                </button>
                                            )}
                                        </div>
                                        <ul className="space-y-2">
                                            {sub.features.map((feat, fidx) => (
                                                <li key={fidx} className="flex items-center gap-2 text-sm text-gray-400">
                                                    <Check size={14} className="text-[#00ff41]" />
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SERVERS TAB */}"""
    content = content.replace(marker4, sub_content)
    print("✅ Добавлен контент Подписок")
else:
    print("⚠️ Контент Подписок уже есть или маркер не найден")

# === 5. Добавить панель сотрудника (impersonation) перед закрывающим </div> ===
marker5 = "    )\n}\n\nexport default OwnerDashboard"
if marker5 in content and "impersonatedCabinet && (" not in content.split("export default")[0].split("</main>")[-1]:
    # Найдём </main> и вставим после него, перед закрывающим </div>
    impersonation_panel = """            {/* IMPERSONATION PANEL */}
            {impersonatedCabinet && (
                <div className="fixed inset-0 z-[55] bg-[#0f0f17] overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold text-white">Кабинет: {impersonatedCabinet.name}</h1>
                            <button onClick={handleExitImpersonation} className="px-4 py-2 bg-[#00ff41] text-black rounded-lg font-medium hover:bg-[#00cc33]">
                                Выйти из кабинета
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="glass rounded-2xl p-5 border border-white/5">
                                    <h3 className="font-bold text-white mb-4">Статистика</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-[#0f0f17] rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-[#00ff41]">1.2K</div>
                                            <div className="text-xs text-gray-500">Подписчики</div>
                                        </div>
                                        <div className="bg-[#0f0f17] rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-blue-400">45</div>
                                            <div className="text-xs text-gray-500">Постов</div>
                                        </div>
                                        <div className="bg-[#0f0f17] rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-purple-400">89%</div>
                                            <div className="text-xs text-gray-500">Вовлечённость</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="glass rounded-2xl p-5 border border-white/5">
                                    <h3 className="font-bold text-white mb-4">Последние действия</h3>
                                    <div className="space-y-3">
                                        {['Создан пост', 'Обновлён профиль', 'Добавлен комментарий', 'Запущена кампания'].map((action, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2 bg-[#0f0f17] rounded-lg">
                                                <div className="w-2 h-2 rounded-full bg-[#00ff41]" />
                                                <span className="text-sm text-gray-300">{action}</span>
                                                <span className="text-xs text-gray-500 ml-auto">{i + 1}ч назад</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="glass rounded-2xl p-5 border border-white/5">
                                    <h3 className="font-bold text-white mb-3">Профиль</h3>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                                            {impersonatedCabinet.avatar}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{impersonatedCabinet.name}</div>
                                            <div className="text-xs text-gray-500">{impersonatedCabinet.department}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-400">{impersonatedCabinet.email}</div>
                                </div>
                                <div className="glass rounded-2xl p-5 border border-white/5">
                                    <h3 className="font-bold text-white mb-3">Быстрые действия</h3>
                                    <div className="space-y-2">
                                        <button className="w-full py-2 bg-[#00ff41]/10 text-[#00ff41] rounded-lg text-sm hover:bg-[#00ff41]/20 transition-colors">Новый пост</button>
                                        <button className="w-full py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition-colors">Аналитика</button>
                                        <button className="w-full py-2 bg-purple-500/10 text-purple-400 rounded-lg text-sm hover:bg-purple-500/20 transition-colors">Настройки</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

    )\n}\n\nexport default OwnerDashboard"""
    content = content.replace(marker5, impersonation_panel)
    print("✅ Добавлена панель сотрудника")
else:
    print("⚠️ Панель сотрудника уже есть или маркер не найден")

# Проверяем баланс скобок
open_count = content.count('{')
close_count = content.count('}')
if open_count == close_count:
    print(f"✅ Баланс скобок: {open_count} открывающих, {close_count} закрывающих")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Файл сохранён: {file_path}")
else:
    print(f"❌ Баланс скобок НАРУШЕН: {open_count} открывающих, {close_count} закрывающих")
    print("❌ Изменения НЕ сохранены!")

print("\n🚀 Запусти: cd D:\\kilo2\\frontend && npm run dev")
