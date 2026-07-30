
# ФИНАЛЬНЫЙ СКРИПТ — делает ВСЕ изменения за раз
# Запуск: cd D:\kilo2\frontend && python final_all_in_one.py

import os

OWNER_PATH = r"D:\kilo2\frontend\src\pages\OwnerDashboardPage.jsx"

def read_file():
    with open(OWNER_PATH, 'r', encoding='utf-8') as f:
        return f.readlines()

def write_file(lines):
    with open(OWNER_PATH, 'w', encoding='utf-8') as f:
        f.writelines(lines)

def main():
    print("=" * 70)
    print("ФИНАЛЬНОЕ ОБНОВЛЕНИЕ — ВСЕ ИЗМЕНЕНИЯ ЗА РАЗ")
    print("=" * 70)

    if not os.path.exists(OWNER_PATH):
        print(f"❌ Файл не найден: {OWNER_PATH}")
        return

    lines = read_file()
    print(f"📁 Файл: {OWNER_PATH}")
    print(f"📊 Строк: {len(lines)}")

    # Бэкап
    backup_path = OWNER_PATH + ".final_all_backup"
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"💾 Бэкап: {backup_path}")

    # ===== 1. Исправляем sidebar — добавляем h-full и flex-1 =====
    print("\n🔧 Исправляем sidebar структуру...")
    for i, line in enumerate(lines):
        if '<aside className="fixed left-0 top-0 h-full w-64' in line:
            lines[i] = line.replace('h-full', 'h-screen flex flex-col')
            print(f"  ✅ Sidebar теперь flex-col на строке {i+1}")
            break

    # ===== 2. Добавляем flex-1 к контейнеру кабинетов в sidebar =====
    for i, line in enumerate(lines):
        if '<div className="p-3">' in line and i > 400 and i < 500:  # sidebar area
            # Проверяем следующую строку
            if i+1 < len(lines) and 'Кабинеты сотрудников' in lines[i+1]:
                lines[i] = line.replace('<div className="p-3">', '<div className="p-3 flex-1 overflow-y-auto">')
                print(f"  ✅ Контейнер кабинетов теперь flex-1 на строке {i+1}")
                break

    # ===== 3. Добавляем states =====
    print("\n🔧 Добавляем states...")
    for i, line in enumerate(lines):
        if 'const [showCabinetDetailsModal, setShowCabinetDetailsModal] = useState(false)' in line:
            lines.insert(i+1, '    const [impersonatedCabinet, setImpersonatedCabinet] = useState(null)\n')
            lines.insert(i+2, "    const [editingApiKey, setEditingApiKey] = useState(null)\n")
            lines.insert(i+3, "    const [newApiKeyValue, setNewApiKeyValue] = useState('')\n")
            print(f"  ✅ States добавлены после строки {i+1}")
            break

    # ===== 4. Исправляем handleImpersonate =====
    print("\n🔧 Исправляем handleImpersonate...")
    for i, line in enumerate(lines):
        if 'const handleImpersonate = (cabinet) => {' in line:
            lines[i+1] = '        setImpersonatedCabinet(cabinet)\n'
            lines[i+2] = '        showToast(`Вход в кабинет ${cabinet.name}`, \'success\')\n'
            print(f"  ✅ handleImpersonate исправлен на строке {i+1}")
            break

    # ===== 5. Добавляем handleExitImpersonation =====
    print("\n🔧 Добавляем handleExitImpersonation...")
    for i, line in enumerate(lines):
        if 'const handleImpersonate = (cabinet) => {' in line:
            j = i + 1
            while j < len(lines) and lines[j].strip() != '}':
                j += 1
            lines.insert(j+1, '\n')
            lines.insert(j+2, '    const handleExitImpersonation = () => {\n')
            lines.insert(j+3, '        setImpersonatedCabinet(null)\n')
            lines.insert(j+4, "        setActiveTab('overview')\n")
            lines.insert(j+5, "        showToast('Возврат в панель владельца', 'info')\n")
            lines.insert(j+6, '    }\n')
            print(f"  ✅ handleExitImpersonation добавлен после строки {j+1}")
            break

    # ===== 6. Добавляем баннер impersonation =====
    print("\n🔧 Добавляем баннер входа в кабинет...")
    for i, line in enumerate(lines):
        if 'setToast(null)' in line and '3000' in line:
            j = i + 1
            while j < len(lines) and ')' not in lines[j]:
                j += 1
            lines.insert(j+1, '\n')
            lines.insert(j+2, '            {impersonatedCabinet && (\n')
            lines.insert(j+3, '                <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black px-4 py-2 flex items-center justify-between">\n')
            lines.insert(j+4, '                    <span className="font-medium flex items-center gap-2">\n')
            lines.insert(j+5, '                        <Eye size={16} /> Вы вошли как: {impersonatedCabinet.name} ({impersonatedCabinet.email})\n')
            lines.insert(j+6, '                    </span>\n')
            lines.insert(j+7, '                    <button onClick={handleExitImpersonation} className="font-bold flex items-center gap-1 hover:underline">\n')
            lines.insert(j+8, '                        <X size={16} /> Выйти из кабинета\n')
            lines.insert(j+9, '                    </button>\n')
            lines.insert(j+10, '                </div>\n')
            lines.insert(j+11, '            )}\n')
            print(f"  ✅ Баннер добавлен после строки {j+1}")
            break

    # ===== 7. Добавляем импорт Eye и X =====
    print("\n🔧 Проверяем импорты...")
    for i, line in enumerate(lines):
        if 'lucide-react' in line and 'import' in line:
            if 'Eye' not in line or 'X' not in line:
                old = line.rstrip().rstrip('}')
                if 'Eye' not in line:
                    old += ', Eye'
                if 'X' not in line:
                    old += ', X'
                lines[i] = old + '}\n'
                print(f"  ✅ Импорты обновлены на строке {i+1}")
            break

    # ===== СОХРАНЯЕМ =====
    write_file(lines)
    print(f"\n💾 Файл сохранён!")
    print(f"📊 Новое количество строк: {len(lines)}")

    print("\n" + "=" * 70)
    print("✅ ГОТОВО! Перезапусти npm run dev")
    print("=" * 70)
    print("\nЧто исправлено:")
    print("  1. 📐 Sidebar теперь растягивается на всю высоту (h-screen flex-col)")
    print("  2. 📂 Кабинеты в sidebar с прокруткой (flex-1 overflow-y-auto)")
    print("  3. 🔄 Реальный вход в кабинет сотрудника")
    print("  4. 🚪 Кнопка 'Выйти из кабинета' в жёлтом баннере")
    print("  5. ✏️ Редактирование API ключей (states добавлены)")
    print("  6. 💾 Бэкап создан")

if __name__ == "__main__":
    main()
