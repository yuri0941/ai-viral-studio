#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import shutil

OWNER_FILE = r"D:\\kilo2\\frontend\\src\\pages\\OwnerDashboardPage.jsx"

def check_braces(content):
    count = 0
    in_string = False
    string_char = None
    escape = False
    for i, ch in enumerate(content):
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if not in_string and ch in ("'", '"'):
            in_string = True
            string_char = ch
            continue
        if in_string and ch == string_char:
            in_string = False
            continue
        if in_string:
            continue
        if ch == "{":
            count += 1
        elif ch == "}":
            count -= 1
            if count < 0:
                return False, i
    return count == 0, None

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("=" * 60)
print("БЕЗОПАСНОЕ ОБНОВЛЕНИЕ")
print("=" * 60)

if not os.path.exists(OWNER_FILE):
    print(f"❌ Файл не найден: {OWNER_FILE}")
    exit(1)

backup = OWNER_FILE + ".safe_backup"
shutil.copy2(OWNER_FILE, backup)
print(f"💾 Бэкап: {backup}")

c = read_file(OWNER_FILE)
print(f"📊 Размер: {len(c)} байт, строк: {c.count(chr(10))}")

ok, pos = check_braces(c)
if not ok:
    print(f"❌ Файл уже сломан! Лишняя }} на позиции {pos}")
    exit(1)
print("✅ Баланс скобок ДО: ОК")

changed = False

if "impersonatedCabinet" not in c:
    print("🔧 Добавляем states...")
    marker = "const [showToast, setShowToast] = useState(false)"
    idx = c.find(marker)
    if idx != -1:
        insert = "\n  const [impersonatedCabinet, setImpersonatedCabinet] = useState(null)\n  const [editingApiKey, setEditingApiKey] = useState(null)\n  const [newApiKeyValue, setNewApiKeyValue] = useState('')"
        c = c[:idx+len(marker)] + insert + c[idx+len(marker):]
        changed = True
        print("   ✅ States добавлены")
    else:
        print("   ❌ Маркер не найден")
else:
    print("⚠️ States уже есть")

if "setImpersonatedCabinet(cabinet)" not in c:
    print("🔧 Исправляем handleImpersonate...")
    old = "const handleImpersonate = (cabinet) => {\n    showToast(`Вход в кабинет ${cabinet.name}`, 'success')\n  }"
    new = "const handleImpersonate = (cabinet) => {\n    setImpersonatedCabinet(cabinet)\n    showToast(`Вход в кабинет ${cabinet.name}`, 'success')\n  }\n\n  const handleExitImpersonation = () => {\n    setImpersonatedCabinet(null)\n    showToast('Возврат в панель владельца', 'info')\n  }"
    if old in c:
        c = c.replace(old, new)
        changed = True
        print("   ✅ handleImpersonate исправлен")
    else:
        print("   ❌ Не найден для замены")
else:
    print("⚠️ handleImpersonate уже исправлен")

if "impersonatedCabinet &&" not in c:
    print("🔧 Добавляем баннер...")
    marker = "{/* Toast */}"
    idx = c.find(marker)
    if idx != -1:
        banner = "{impersonatedCabinet && (\n        <div className=\"fixed top-0 left-0 right-0 z-[60] bg-yellow-500 text-black px-4 py-2 flex items-center justify-between shadow-lg\">\n          <span className=\"font-medium flex items-center gap-2\">\n            <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M15 12a3 3 0 11-6 0 3 3 0 016 0z\" /><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z\" /></svg>\n            Вы вошли как: {impersonatedCabinet.name} ({impersonatedCabinet.role})\n          </span>\n          <button onClick={handleExitImpersonation} className=\"font-bold flex items-center gap-1 hover:bg-black/10 px-2 py-1 rounded transition-colors\">\n            <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M6 18L18 6M6 6l12 12\" /></svg>\n            Выйти из кабинета\n          </button>\n        </div>\n      )}\n      "
        c = c[:idx] + banner + c[idx:]
        changed = True
        print("   ✅ Баннер добавлен")
    else:
        print("   ❌ Маркер Toast не найден")
else:
    print("⚠️ Баннер уже есть")

ok, pos = check_braces(c)
if not ok:
    print(f"❌ Баланс скобок ПОСЛЕ нарушен! Лишняя }} на позиции {pos}")
    print("   Откатываем...")
    shutil.copy2(backup, OWNER_FILE)
    print("   ✅ Восстановлено из бэкапа")
    exit(1)

print("✅ Баланс скобок ПОСЛЕ: ОК")

if changed:
    write_file(OWNER_FILE, c)
    print(f"💾 Файл сохранен ({len(c)} байт)")
else:
    print("✅ Без изменений")

print("\n" + "=" * 60)
print("ГОТОВО! Запусти: npm run dev")
print("=" * 60)
