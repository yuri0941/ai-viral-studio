import re

def check_brackets(code):
    stack = []
    in_string = False
    string_char = None
    i = 0
    while i < len(code):
        ch = code[i]
        if not in_string:
            if ch in '"\'`':
                in_string = True
                string_char = ch
            elif ch == '{':
                stack.append(ch)
            elif ch == '}':
                if not stack:
                    return False
                stack.pop()
        else:
            if ch == string_char and (i == 0 or code[i-1] != '\\'):
                in_string = False
                string_char = None
        i += 1
    return len(stack) == 0

file_path = r"D:\kilo2\frontend\src\pages\OwnerDashboardPage.jsx"
backup_path = file_path + ".backup_final"

# Читаем файл
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"📊 Файл: {len(lines)} строк")

# Проверяем баланс ДО
full_code = ''.join(lines)
if not check_brackets(full_code):
    print("❌ Баланс скобок ДО: СЛОМАН")
    exit(1)
print("✅ Баланс скобок ДО: ОК")

# Создаём бэкап
with open(backup_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f"💾 Бэкап: {backup_path}")

# === ИЗМЕНЕНИЕ 1: Добавить subscriptions state после строки 27 (editingApiKey) ===
# Находим строку с editingApiKey и добавляем после неё
subscriptions_state = """  const [subscriptions, setSubscriptions] = useState(() => {
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
  const [newSubPrice, setNewSubPrice] = useState('')
"""

found_editing = False
for i, line in enumerate(lines):
    if 'const [editingApiKey, setEditingApiKey]' in line and not found_editing:
        lines.insert(i + 1, subscriptions_state)
        found_editing = True
        print("✅ Добавлен subscriptions state")
        break

if not found_editing:
    print("❌ Не найден editingApiKey state")

# Перечитываем после вставки
full_code = ''.join(lines)

# === ИЗМЕНЕНИЕ 2: Добавить функции для подписок после handleCancelEdit ===
# Найдём handleCancelEdit
sub_funcs = """
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
  }
"""

found_cancel = False
for i, line in enumerate(lines):
    if 'const handleCancelEdit' in line and not found_cancel:
        # Найдём конец функции (следующая пустая строка или const/const)
        j = i + 1
        while j < len(lines) and lines[j].strip() and not lines[j].strip().startswith('const '):
            j += 1
        lines.insert(j, sub_funcs)
        found_cancel = True
        print("✅ Добавлены функции подписок")
        break

if not found_cancel:
    print("⚠️ handleCancelEdit не найден, ищем handleSaveApiKey...")
    for i, line in enumerate(lines):
        if 'const handleSaveApiKey' in line:
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith('const '):
                j += 1
            lines.insert(j, sub_funcs)
            found_cancel = True
            print("✅ Добавлены функции подписок (после handleSaveApiKey)")
            break

# === ИЗМЕНЕНИЕ 3: Добавить вкладку Подписки в навигацию ===
# Найдём кнопку Серверы и вставим перед ней
sub_tab = """              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'subscriptions' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <CreditCard size={16} />
                <span>Подписки</span>
              </button>
"""

found_servers_tab = False
for i, line in enumerate(lines):
    if "setActiveTab('servers')" in line and not found_servers_tab:
        # Идём назад до начала кнопки
        j = i
        while j > 0 and '<button' not in lines[j]:
            j -= 1
        lines.insert(j, sub_tab)
        found_servers_tab = True
        print("✅ Добавлена вкладка Подписки")
        break

if not found_servers_tab:
    print("❌ Не найдена кнопка Серверы")

# === ИЗМЕНЕНИЕ 4: Добавить контент вкладки Подписки перед activeTab === 'servers' ===
sub_content = """          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="text-[#00ff41]" size={20} />
                Тарифные планы
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscriptions.map((sub, idx) => (
                  <div key={sub.name} className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5 hover:border-[#00ff41]/30 transition-all">
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button onClick={handleCancelSubEdit} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                          <svg className="w-4 h-4 text-[#00ff41]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

"""

found_servers_content = False
for i, line in enumerate(lines):
    if "{activeTab === 'servers' && (" in line and not found_servers_content:
        lines.insert(i, sub_content)
        found_servers_content = True
        print("✅ Добавлен контент Подписок")
        break

if not found_servers_content:
    print("❌ Не найден контент Серверов")

# === ИЗМЕНЕНИЕ 5: Добавить баннер impersonation перед {toast && ===
banner = """      {impersonatedCabinet && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-yellow-500 text-black px-4 py-2 flex items-center justify-between shadow-lg">
          <span className="font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Вы вошли как: {impersonatedCabinet.name} ({impersonatedCabinet.role})
          </span>
          <button 
            onClick={handleExitImpersonation}
            className="font-bold flex items-center gap-1 hover:bg-black/10 px-2 py-1 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Выйти из кабинета
          </button>
        </div>
      )}

"""

found_toast = False
for i, line in enumerate(lines):
    if '{toast && (' in line and not found_toast:
        lines.insert(i, banner)
        found_toast = True
        print("✅ Добавлен баннер impersonation")
        break

if not found_toast:
    print("❌ Не найден {toast &&")

# === ИЗМЕНЕНИЕ 6: Добавить панель сотрудника (перед закрывающим </div> основного контента) ===
# Найдём последний </div> в файле
impersonation_panel = """      {impersonatedCabinet && (
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
                <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5">
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
                <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5">
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
                <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5">
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
                <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5">
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
"""

# Найдём последний </div> перед export default
last_div_idx = None
for i in range(len(lines) - 1, -1, -1):
    stripped = lines[i].strip()
    if stripped == '</div>' and last_div_idx is None:
        last_div_idx = i
        break

if last_div_idx:
    lines.insert(last_div_idx, impersonation_panel)
    print("✅ Добавлена панель сотрудника")
else:
    print("❌ Не найден закрывающий </div>")

# === СОХРАНЯЕМ ===
new_code = ''.join(lines)

# Проверяем баланс скобок ПОСЛЕ
if not check_brackets(new_code):
    print("❌ Баланс скобок ПОСЛЕ: СЛОМАН — откатываем")
    # Восстанавливаем из бэкапа
    with open(backup_path, 'r', encoding='utf-8') as f:
        old = f.read()
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(old)
    print("♻️ Откат выполнен")
else:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_code)
    print(f"✅ Файл сохранён ({len(new_code)} байт)")
    print("✅ Баланс скобок ПОСЛЕ: ОК")

print("\n============================================================")
print("ГОТОВО! Запусти: npm run dev")
print("============================================================")
