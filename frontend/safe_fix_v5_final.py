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
print("ОБНОВЛЕНИЕ v5 FINAL — API ключи")
print("=" * 60)

if not os.path.exists(OWNER_FILE):
    print(f"❌ Файл не найден: {OWNER_FILE}")
    exit(1)

backup = OWNER_FILE + ".backup_v5final"
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

# 1. handleSaveApiKey + handleCancelEdit
if "handleSaveApiKey" not in c:
    print("🔧 Добавляем handleSaveApiKey...")
    marker = "const handleExitImpersonation = () => {"
    idx = c.find(marker)
    if idx != -1:
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

# 2. Редактирование API ключей — заменяем отображение ключа
if "editingApiKey === i" not in c:
    print("🔧 Добавляем редактирование API ключей...")
    old_api = "<p className=\"text-xs text-gray-500 font-mono\">{api.key}</p>\n                                                </div>\n                                            </div>\n                                            <div className=\"flex items-center gap-2\">\n                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${api.status === 'active' ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>{api.status === 'active' ? 'РђРєС‚РёРІРµРЅ' : 'РўСЂРµР±СѓРµС‚ РѕР±РЅРѕРІР»РµРЅРёСЏ'}</span>"
    new_api = "{editingApiKey === i ? (\n                                                <div className=\"flex items-center gap-2 flex-1\">\n                                                    <input\n                                                        type=\"text\"\n                                                        value={newApiKeyValue}\n                                                        onChange={(e) => setNewApiKeyValue(e.target.value)}\n                                                        placeholder=\"Р’РІРµРґРёС‚Рµ РЅРѕРІС‹Р№ РєР»СЋС‡...\"\n                                                        className=\"flex-1 px-3 py-1.5 bg-[#1a1a24] rounded border border-[#00ff41]/30 text-xs font-mono text-white w-48\"\n                                                    />\n                                                    <button onClick={() => handleSaveApiKey(i)} className=\"p-1.5 rounded-lg bg-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/30 transition-colors\">\n                                                        <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M5 13l4 4L19 7\" /></svg>\n                                                    </button>\n                                                    <button onClick={handleCancelEdit} className=\"p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors\">\n                                                        <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M6 18L18 6M6 6l12 12\" /></svg>\n                                                    </button>\n                                                </div>\n                                            ) : (\n                                                <div>\n                                                    <p className=\"font-medium text-white\">{api.name}</p>\n                                                    <p className=\"text-xs text-gray-500 font-mono\">{api.key}</p>\n                                                </div>\n                                            )}\n                                            </div>\n                                        </div>\n                                        <div className=\"flex items-center gap-2\">\n                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${api.status === 'active' ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>{api.status === 'active' ? 'РђРєС‚РёРІРµРЅ' : 'РўСЂРµР±СѓРµС‚ РѕР±РЅРѕРІР»РµРЅРёСЏ'}</span>"
    if old_api in c:
        c = c.replace(old_api, new_api)
        changed = True
        print("   ✅ Редактирование API ключей добавлено")
    else:
        print("   ❌ Блок API ключей не найден (структура другая)")
else:
    print("⚠️ Редактирование API ключей уже есть")

# 3. Кнопка PenTool (редактирование)
if "setEditingApiKey(i)" not in c:
    print("🔧 Добавляем кнопку PenTool...")
    old_btn = "<button onClick={() => showToast(`РљР»СЋС‡ ${api.name} РѕР±РЅРѕРІР»С‘РЅ`)} className=\"p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-[#00ff41] transition-all\"><RefreshCw size={14} /></button>\n                                                <button onClick={() => showToast('РљР»СЋС‡ СЃРєРѕРїРёСЂРѕРІР°РЅ')} className=\"p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all\"><Copy size={14} /></button>"
    new_btn = "<button onClick={() => { setEditingApiKey(i); setNewApiKeyValue(api.key); }} className=\"p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-blue-400 transition-all\" title=\"Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ\">\n                                                    <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z\" /></svg>\n                                                </button>\n                                                <button onClick={() => showToast(`РљР»СЋС‡ ${api.name} РѕР±РЅРѕРІР»С‘РЅ`)} className=\"p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-[#00ff41] transition-all\"><RefreshCw size={14} /></button>\n                                                <button onClick={() => showToast('РљР»СЋС‡ СЃРєРѕРїРёСЂРѕРІР°РЅ')} className=\"p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all\"><Copy size={14} /></button>"
    if old_btn in c:
        c = c.replace(old_btn, new_btn)
        changed = True
        print("   ✅ Кнопка PenTool добавлена")
    else:
        print("   ❌ Кнопки RefreshCw/Copy не найдены")
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
print("  1. ✏️ Редактирование API ключей")
print("  2. 💾 Сохранение/отмена ключа")
print("  3. 🔄 Кнопка обновления ключа")
