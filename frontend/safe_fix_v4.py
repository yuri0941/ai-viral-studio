#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import shutil

OWNER_FILE = r"D:\\kilo2\\frontend\\src\\pages\\OwnerDashboardPage.jsx"
SIDEBAR_FILE = r"D:\\kilo2\\frontend\\src\\components\\layout\\Sidebar.jsx"

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
print("ОБНОВЛЕНИЕ v4 — API ключи, Подписки, Sidebar")
print("=" * 60)

if not os.path.exists(OWNER_FILE):
    print(f"❌ Файл не найден: {OWNER_FILE}")
    exit(1)

backup = OWNER_FILE + ".backup_v4"
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

# 1. Добавляем handleSaveApiKey
if "handleSaveApiKey" not in c:
    print("🔧 Добавляем handleSaveApiKey...")
    marker = "const handleExitImpersonation = () => {"
    idx = c.find(marker)
    if idx != -1:
        # Находим конец функции handleExitImpersonation
        end_idx = c.find("}", idx + len(marker))
        if end_idx != -1:
            insert = "\n\n  const handleSaveApiKey = (index) => {\n    setApiKeys(prev => prev.map((k, i) => i === index ? { ...k, key: newApiKeyValue } : k))\n    setEditingApiKey(null)\n    setNewApiKeyValue('')\n    showToast('API ключ обновлен', 'success')\n  }\n\n  const handleCancelEdit = () => {\n    setEditingApiKey(null)\n    setNewApiKeyValue('')\n  }"
            c = c[:end_idx+1] + insert + c[end_idx+1:]
            changed = True
            print("   ✅ handleSaveApiKey добавлен")
        else:
            print("   ❌ Конец handleExitImpersonation не найден")
    else:
        print("   ❌ Маркер handleExitImpersonation не найден")
else:
    print("⚠️ handleSaveApiKey уже есть")

# 2. Исправляем API ключи — добавляем кнопку редактирования
# Ищем блок API ключей и заменяем отображение ключа
if "editingApiKey === i" not in c:
    print("🔧 Добавляем редактирование API ключей...")
    # Находим типичный блок API ключа
    old_api = "<p className=\"text-xs text-gray-500 font-mono\">{api.key}</p>\n                  </div>\n                </div>\n                <div className=\"flex items-center gap-2\">\n                  <button"
    new_api = "{editingApiKey === i ? (\n                    <div className=\"flex items-center gap-2\">\n                      <input\n                        type=\"text\"\n                        value={newApiKeyValue}\n                        onChange={(e) => setNewApiKeyValue(e.target.value)}\n                        placeholder=\"Введите новый ключ...\"\n                        className=\"flex-1 px-3 py-1.5 bg-[#1a1a24] rounded border border-[#00ff41]/30 text-xs font-mono text-white\"\n                      />\n                      <button onClick={() => handleSaveApiKey(i)} className=\"p-1.5 rounded-lg bg-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/30 transition-colors\">\n                        <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" /></svg>\n                      </button>\n                      <button onClick={handleCancelEdit} className=\"p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors\">\n                        <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M6 18L18 6M6 6l12 12\" /></svg>\n                      </button>\n                    </div>\n                  ) : (\n                    <p className=\"text-xs text-gray-500 font-mono\">{api.key}</p>\n                  )}\n                  </div>\n                </div>\n                <div className=\"flex items-center gap-2\">\n                  <button"
    if old_api in c:
        c = c.replace(old_api, new_api)
        changed = True
        print("   ✅ Редактирование API ключей добавлено")
    else:
        print("   ❌ Блок API ключей не найден для замены")
else:
    print("⚠️ Редактирование API ключей уже есть")

# 3. Добавляем кнопку PenTool в API ключи
if "onClick={() => { setEditingApiKey(i)" not in c:
    print("🔧 Добавляем кнопку PenTool...")
    old_btn = "title=\"Обновить ключ\"\n                    >\n                      <RefreshCw"
    new_btn = "title=\"Редактировать ключ\"\n                    >\n                      <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z\" /></svg>\n                    </button>\n                    <button\n                      onClick={() => { setEditingApiKey(i); setNewApiKeyValue(api.key); }}\n                      className=\"p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-blue-400 transition-colors\"\n                      title=\"Редактировать ключ\"\n                    >\n                      <RefreshCw"
    if old_btn in c:
        c = c.replace(old_btn, new_btn)
        changed = True
        print("   ✅ Кнопка PenTool добавлена")
    else:
        print("   ❌ Кнопка RefreshCw не найдена")
else:
    print("⚠️ Кнопка редактирования уже есть")

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

print("")
print("=" * 60)
print("ГОТОВО! Запусти: npm run dev")
print("=" * 60)
print("")
print("📋 ЧТО ДОБАВЛЕНО:")
print("  1. ✏️ Редактирование API ключей (кнопка с карандашом)")
print("  2. 💾 Сохранение нового ключа (галочка)")
print("  3. ❌ Отмена редактирования (крестик)")
print("")
print("⚠️ Для полного функционала (sidebar с кабинетами, подписки):")
print("   Нужно обновить Sidebar.jsx отдельно")
