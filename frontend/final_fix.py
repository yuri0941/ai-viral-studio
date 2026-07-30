
# ФИНАЛЬНЫЙ скрипт — вносит ВСЕ изменения в OwnerDashboardPage.jsx
# Запуск: python final_fix.py

import os

FILE_PATH = r"D:\kilo2\frontend\src\pages\OwnerDashboardPage.jsx"

def read_file():
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        return f.readlines()

def write_file(lines):
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.writelines(lines)

def main():
    print("=" * 60)
    print("ФИНАЛЬНОЕ ОБНОВЛЕНИЕ OwnerDashboardPage.jsx")
    print("=" * 60)

    if not os.path.exists(FILE_PATH):
        print(f"❌ Файл не найден: {FILE_PATH}")
        return

    lines = read_file()
    print(f"📁 Файл: {FILE_PATH}")
    print(f"📊 Строк: {len(lines)}")

    # Бэкап
    backup_path = FILE_PATH + ".final_backup"
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"💾 Бэкап: {backup_path}")

    # ===== ИЗМЕНЕНИЕ 1: Добавляем states после showCabinetDetailsModal =====
    print("\n🔧 Добавляем states...")
    for i, line in enumerate(lines):
        if 'const [showCabinetDetailsModal, setShowCabinetDetailsModal] = useState(false)' in line:
            # Вставляем после этой строки
            lines.insert(i+1, '    const [impersonatedCabinet, setImpersonatedCabinet] = useState(null)\n')
            lines.insert(i+2, "    const [editingApiKey, setEditingApiKey] = useState(null)\n")
            lines.insert(i+3, "    const [newApiKeyValue, setNewApiKeyValue] = useState('')\n")
            print(f"  ✅ States добавлены после строки {i+1}")
            break

    # ===== ИЗМЕНЕНИЕ 2: Исправляем handleImpersonate =====
    print("\n🔧 Исправляем handleImpersonate...")
    for i, line in enumerate(lines):
        if 'const handleImpersonate = (cabinet) => {' in line:
            lines[i+1] = '        setImpersonatedCabinet(cabinet)\n'
            lines[i+2] = '        showToast(`Вход в кабинет ${cabinet.name}`, \'success\')\n'
            print(f"  ✅ handleImpersonate исправлен на строке {i+1}")
            break

    # ===== ИЗМЕНЕНИЕ 3: Добавляем handleExitImpersonation после handleImpersonate =====
    print("\n🔧 Добавляем handleExitImpersonation...")
    for i, line in enumerate(lines):
        if 'const handleImpersonate = (cabinet) => {' in line:
            # Находим закрывающую скобку handleImpersonate
            j = i + 1
            while j < len(lines) and lines[j].strip() != '}':
                j += 1
            # Вставляем после закрывающей скобки
            lines.insert(j+1, '\n')
            lines.insert(j+2, '    const handleExitImpersonation = () => {\n')
            lines.insert(j+3, '        setImpersonatedCabinet(null)\n')
            lines.insert(j+4, "        setActiveTab('overview')\n")
            lines.insert(j+5, "        showToast('Возврат в панель владельца', 'info')\n")
            lines.insert(j+6, '    }\n')
            print(f"  ✅ handleExitImpersonation добавлен после строки {j+1}")
            break

    # ===== ИЗМЕНЕНИЕ 4: Добавляем баннер impersonation после toast =====
    print("\n🔧 Добавляем баннер входа в кабинет...")
    for i, line in enumerate(lines):
        if 'setToast(null)' in line and '3000' in line:
            # Находим закрывающий div тоста
            j = i + 1
            while j < len(lines) and ')' not in lines[j]:
                j += 1
            # Вставляем после тоста
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

    # ===== ИЗМЕНЕНИЕ 5: Добавляем импорт Eye и X если их нет =====
    print("\n🔧 Проверяем импорты...")
    for i, line in enumerate(lines):
        if 'lucide-react' in line and 'import' in line:
            if 'Eye' not in line:
                lines[i] = line.rstrip().rstrip('}') + ', Eye}\n'
                print(f"  ✅ Eye добавлен в импорты")
            break

    # ===== СОХРАНЯЕМ =====
    write_file(lines)
    print(f"\n💾 Файл сохранён!")
    print(f"📊 Новое количество строк: {len(lines)}")

    print("\n" + "=" * 60)
    print("✅ ГОТОВО! Перезапусти npm run dev")
    print("=" * 60)
    print("\nЧто добавлено:")
    print("  1. 🔄 Реальный вход в кабинет сотрудника")
    print("  2. 🚪 Кнопка 'Выйти из кабинета' в жёлтом баннере")
    print("  3. 💾 Бэкап создан: OwnerDashboardPage.jsx.final_backup")

if __name__ == "__main__":
    main()
