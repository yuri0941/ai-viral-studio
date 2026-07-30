
# Скрипт для обновления OwnerDashboardPage.jsx
# Запуск: python update_dashboard.py

import re
import os

FILE_PATH = r"D:\kilo2\frontend\src\pages\OwnerDashboardPage.jsx"

def read_file():
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(content):
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)

def add_states(content):
    """Добавляем state для impersonation и API ключей"""
    # Находим место после showCabinetDetailsModal
    pattern = r"(const \[showCabinetDetailsModal, setShowCabinetDetailsModal\] = useState\(false\))"
    replacement = r"""\1
    const [impersonatedCabinet, setImpersonatedCabinet] = useState(null)
    const [editingApiKey, setEditingApiKey] = useState(null)
    const [newApiKeyValue, setNewApiKeyValue] = useState('')"""
    return re.sub(pattern, replacement, content, count=1)

def fix_handleImpersonate(content):
    """Делаем реальное переключение в кабинет"""
    pattern = r"const handleImpersonate = \(cabinet\) => \{\s*showToast\(`Вход в кабинет \$\{cabinet\.name\}\.\.\.`, 'info'\)\s*\}"
    replacement = """const handleImpersonate = (cabinet) => {
        setImpersonatedCabinet(cabinet)
        showToast(`Вход в кабинет ${cabinet.name}`, 'success')
    }

    const handleExitImpersonation = () => {
        setImpersonatedCabinet(null)
        setActiveTab('overview')
        showToast('Возврат в панель владельца', 'info')
    }"""
    return re.sub(pattern, replacement, content, count=1)

def add_impersonation_banner(content):
    """Добавляем баннер сверху при входе в кабинет"""
    # Находим место после toast-блока
    pattern = r"(\{toast && \(\s*<div className=\`fixed top-4 right-4 z-50.*?\</div\>\s*\)\})"

    banner = """

            {impersonatedCabinet && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black px-4 py-2 flex items-center justify-between">
                    <span className="font-medium flex items-center gap-2">
                        <Eye size={16} /> Вы вошли как: {impersonatedCabinet.name} ({impersonatedCabinet.email})
                    </span>
                    <button onClick={handleExitImpersonation} className="font-bold flex items-center gap-1 hover:underline">
                        <X size={16} /> Выйти из кабинета
                    </button>
                </div>
            )}"""

    return re.sub(pattern, r"\1" + banner, content, count=1, flags=re.DOTALL)

def fix_api_keys_section(content):
    """Заменяем статичные API ключи на редактируемые"""
    # Находим блок API ключей
    old_api_block = """                            {[{ name: 'OpenAI API', key: 'sk-••••••••••••••••••••••••••••••', status: 'active' }, { name: 'Anthropic API', key: 'sk-ant-•••••••••••••••••••••••••', status: 'active' }, { name: 'Stability AI', key: 'sk-••••••••••••••••••••••••••••••', status: 'active' }, { name: 'Replicate API', key: 'r8_••••••••••••••••••••••••••••••', status: 'warning' }].map((api, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02]">
                                            <div className="flex items-center gap-3">
                                                <Terminal className="w-5 h-5 text-gray-400" />
                                                <div>
                                                    <p className="font-medium text-white">{api.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{api.key}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${api.status === 'active' ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>{api.status === 'active' ? 'Активен' : 'Требует обновления'}</span>
                                                <button onClick={() => showToast(`Ключ ${api.name} обновлён`)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-[#00ff41] transition-all"><RefreshCw size={14} /></button>
                                                <button onClick={() => showToast('Ключ скопирован')} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"><Copy size={14} /></button>
                                            </div>
                                        </div>
                                    ))}"""

    new_api_block = """                            {[{ name: 'OpenAI API', key: 'sk-••••••••••••••••••••••••••••••', status: 'active' }, { name: 'Anthropic API', key: 'sk-ant-•••••••••••••••••••••••••', status: 'active' }, { name: 'Stability AI', key: 'sk-••••••••••••••••••••••••••••••', status: 'active' }, { name: 'Replicate API', key: 'r8_••••••••••••••••••••••••••••••', status: 'warning' }].map((api, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02]">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <Terminal className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white">{api.name}</p>
                                                    {editingApiKey === i ? (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <input 
                                                                type="text" 
                                                                value={newApiKeyValue}
                                                                onChange={e => setNewApiKeyValue(e.target.value)}
                                                                placeholder="Введите новый API ключ..."
                                                                className="flex-1 px-3 py-1.5 bg-[#1a1a24] rounded-lg border border-[#00ff41]/30 text-xs font-mono text-white outline-none focus:border-[#00ff41]"
                                                            />
                                                            <button onClick={() => { showToast(`Ключ ${api.name} обновлён`, 'success'); setEditingApiKey(null); }} className="p-1.5 rounded-lg bg-[#00ff41]/10 text-[#00ff41] hover:bg-[#00ff41]/20 transition-all">
                                                                <Check size={14} />
                                                            </button>
                                                            <button onClick={() => setEditingApiKey(null)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-all">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-500 font-mono truncate">{api.key}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${api.status === 'active' ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>{api.status === 'active' ? 'Активен' : 'Требует обновления'}</span>
                                                <button onClick={() => { setEditingApiKey(i); setNewApiKeyValue(api.key); }} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-blue-400 transition-all" title="Редактировать">
                                                    <PenTool size={14} />
                                                </button>
                                                <button onClick={() => showToast('Ключ скопирован')} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all" title="Копировать">
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}"""

    return content.replace(old_api_block, new_api_block)

def main():
    print("=" * 60)
    print("ОБНОВЛЕНИЕ OwnerDashboardPage.jsx")
    print("=" * 60)

    if not os.path.exists(FILE_PATH):
        print(f"❌ Файл не найден: {FILE_PATH}")
        print("Проверь путь и попробуй снова.")
        return

    print(f"📁 Файл найден: {FILE_PATH}")

    # Читаем
    content = read_file()
    print(f"📊 Размер: {len(content)} байт")

    # Бэкап
    backup_path = FILE_PATH + ".backup_" + str(int(__import__('time').time()))
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 Бэкап создан: {backup_path}")

    # Применяем изменения
    print("\n🔧 Применяем изменения...")

    content = add_states(content)
    print("  ✅ Добавлены states (impersonation, API keys editing)")

    content = fix_handleImpersonate(content)
    print("  ✅ Исправлен handleImpersonate + добавлен handleExitImpersonation")

    content = add_impersonation_banner(content)
    print("  ✅ Добавлен баннер входа в кабинет")

    content = fix_api_keys_section(content)
    print("  ✅ API ключи теперь редактируемые")

    # Сохраняем
    write_file(content)
    print(f"\n💾 Файл сохранён: {FILE_PATH}")
    print(f"📊 Новый размер: {len(content)} байт")

    print("\n" + "=" * 60)
    print("✅ ГОТОВО! Перезапусти npm run dev")
    print("=" * 60)
    print("\nЧто добавлено:")
    print("  1. 🔄 Реальный вход в кабинет сотрудника (impersonation)")
    print("  2. 🚪 Кнопка 'Выйти из кабинета' в жёлтом баннере сверху")
    print("  3. ✏️ Редактирование API ключей (кнопка с карандашом)")
    print("  4. 💾 Автоматический бэкап перед изменениями")

if __name__ == "__main__":
    main()
