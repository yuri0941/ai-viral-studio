#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import shutil

OWNER_FILE = r"D:\\kilo2\\frontend\\src\\pages\\OwnerDashboardPage.jsx"

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("=" * 60)
print("ОБНОВЛЕНИЕ API КЛЮЧЕЙ — ПО СТРОКАМ")
print("=" * 60)

if not os.path.exists(OWNER_FILE):
    print(f"❌ Файл не найден: {OWNER_FILE}")
    exit(1)

backup = OWNER_FILE + ".backup_lines"
shutil.copy2(OWNER_FILE, backup)
print(f"💾 Бэкап: {backup}")

c = read_file(OWNER_FILE)
lines_list = c.split("\n")
print(f"📊 Строк: {len(lines_list)}")

changed = False

# Ищем строку с {api.key}
key_line = None
for i, line in enumerate(lines_list):
    if "{api.key}" in line and "text-xs text-gray-500 font-mono" in line:
        key_line = i
        print(f"   Найдена строка {i+1}: {line.strip()[:60]}")
        break

if key_line is None:
    print("❌ Строка с {api.key} не найдена")
    exit(1)

# Проверяем, не заменено ли уже
if "editingApiKey === i" in c:
    print("⚠️ Редактирование уже добавлено")
else:
    print("🔧 Заменяем блок API ключей...")
    # Находим начало блока (3 строки назад — <div>)
    start = key_line - 1
    # Находим конец блока (</div>)
    end = key_line + 1
    while end < len(lines_list) and "</div>" not in lines_list[end]:
        end += 1
    end += 1  # включаем закрывающий </div>
    
    # Создаем новый блок
    indent = "                                                "
    new_block = [
        indent + "{editingApiKey === i ? (",
        indent + "    <div className=\"flex items-center gap-2 flex-1\">",
        indent + "        <input",
        indent + "            type=\"text\"",
        indent + "            value={newApiKeyValue}",
        indent + "            onChange={(e) => setNewApiKeyValue(e.target.value)}",
        indent + "            placeholder=\"Введите новый ключ...\"",
        indent + "            className=\"flex-1 px-3 py-1.5 bg-[#1a1a24] rounded border border-[#00ff41]/30 text-xs font-mono text-white w-48\"",
        indent + "        />",
        indent + "        <button onClick={() => handleSaveApiKey(i)} className=\"p-1.5 rounded-lg bg-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/30 transition-colors\">",
        indent + "            <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" /></svg>",
        indent + "        </button>",
        indent + "        <button onClick={handleCancelEdit} className=\"p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors\">",
        indent + "            <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M6 18L18 6M6 6l12 12\" /></svg>",
        indent + "        </button>",
        indent + "    </div>",
        indent + ") : (",
        indent + "    <div>",
        indent + "        <p className=\"font-medium text-white\">{api.name}</p>",
        indent + "        <p className=\"text-xs text-gray-500 font-mono\">{api.key}</p>",
        indent + "    </div>",
        indent + ")}",
    ]
    
    # Заменяем строки
    lines_list[start:end+1] = new_block
    changed = True
    print("   ✅ Блок API ключей заменен")

# Ищем кнопку RefreshCw и добавляем карандаш перед ней
refresh_line = None
for i, line in enumerate(lines_list):
    if "RefreshCw" in line and "showToast" in line and "обновлён" in line:
        refresh_line = i
        print(f"   Найдена RefreshCw на строке {i+1}")
        break

if refresh_line is not None and "setEditingApiKey(i)" not in c:
    print("🔧 Добавляем кнопку карандаша...")
    indent = "                                                "
    pen_btn = [
        indent + "<button onClick={() => { setEditingApiKey(i); setNewApiKeyValue(api.key); }} className=\"p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-blue-400 transition-all\" title=\"Редактировать\">",
        indent + "    <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z\" /></svg>",
        indent + "</button>",
    ]
    lines_list[refresh_line:refresh_line] = pen_btn
    changed = True
    print("   ✅ Кнопка карандаша добавлена")
elif "setEditingApiKey(i)" in c:
    print("⚠️ Кнопка карандаша уже есть")
else:
    print("❌ Кнопка RefreshCw не найдена")

if changed:
    new_content = "\n".join(lines_list)
    write_file(OWNER_FILE, new_content)
    print(f"💾 Файл сохранен ({len(new_content)} байт)")
else:
    print("✅ Без изменений")

print("")
print("=" * 60)
print("ГОТОВО! Запусти: npm run dev")
print("=" * 60)
