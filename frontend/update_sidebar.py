#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import shutil

SIDEBAR_FILE = r"D:\\kilo2\\frontend\\src\\components\\layout\\Sidebar.jsx"

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("=" * 60)
print("ОБНОВЛЕНИЕ SIDEBAR — Кабинеты + Подписки")
print("=" * 60)

if not os.path.exists(SIDEBAR_FILE):
    print(f"❌ Файл не найден: {SIDEBAR_FILE}")
    exit(1)

backup = SIDEBAR_FILE + ".backup_sidebar"
shutil.copy2(SIDEBAR_FILE, backup)
print(f"💾 Бэкап: {backup}")

c = read_file(SIDEBAR_FILE)
print(f"📊 Размер: {len(c)} байт")

changed = False

# Добавляем импорт useState если нет
if "useState" not in c:
    print("🔧 Добавляем useState...")
    c = c.replace("import { Link } from 'react-router-dom'", "import { Link } from 'react-router-dom'\nimport { useState } from 'react'")
    changed = True
    print("   ✅ useState добавлен")

# Добавляем данные кабинетов и подписок
if "cabinets" not in c:
    print("🔧 Добавляем данные...")
    marker = "const Sidebar = () => {"
    idx = c.find(marker)
    if idx != -1:
        insert = "\n  const [cabinets] = useState([\n    { id: 1, name: 'Мария Сидорова', role: 'staff', online: true, avatar: 'М' },\n    { id: 2, name: 'Алексей Иванов', role: 'staff', online: false, avatar: 'А' },\n    { id: 3, name: 'Ольга Козлова', role: 'staff', online: true, avatar: 'О' },\n    { id: 4, name: 'Дмитрий Смирнов', role: 'staff', online: false, avatar: 'Д' }\n  ])\n\n  const [subscriptions] = useState([\n    { id: 'free', name: 'Free', price: 0, users: 450 },\n    { id: 'creator', name: 'Creator', price: 10, users: 280 },\n    { id: 'pro', name: 'Pro', price: 30, users: 150 },\n    { id: 'agency', name: 'Agency', price: 100, users: 80 },\n    { id: 'enterprise', name: 'Enterprise', price: 300, users: 40 }\n  ])\n"
        c = c[:idx+len(marker)] + insert + c[idx+len(marker):]
        changed = True
        print("   ✅ Данные добавлены")
    else:
        print("   ❌ Маркер Sidebar не найден")
else:
    print("⚠️ Данные уже есть")

# Добавляем блок кабинетов перед профилем
if "Кабинеты сотрудников" not in c:
    print("🔧 Добавляем кабинеты...")
    marker = "{/* Профиль */}"
    idx = c.find(marker)
    if idx != -1:
        insert = "{/* Кабинеты сотрудников */}\n        <div className=\"px-3 py-2\">\n          <p className=\"text-xs font-semibold text-gray-500 uppercase mb-2\">Кабинеты</p>\n          <div className=\"space-y-1\">\n            {cabinets.map(cab => (\n              <Link\n                key={cab.id}\n                to={`/dashboard/staff/${cab.id}`}\n                className=\"w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-sm text-gray-300 transition-colors\"\n              >\n                <div className=\"w-6 h-6 rounded-full bg-gradient-to-br from-[#00ff41] to-[#00cc33] flex items-center justify-center text-[10px] font-bold text-black\">\n                  {cab.avatar}\n                </div>\n                <span className=\"truncate\">{cab.name}</span>\n                {cab.online && <span className=\"w-1.5 h-1.5 rounded-full bg-green-500 ml-auto\" />}\n              </Link>\n            ))}\n          </div>\n        </div>\n\n        {/* Подписки */}\n        <div className=\"px-3 py-2\">\n          <p className=\"text-xs font-semibold text-gray-500 uppercase mb-2\">Подписки</p>\n          <div className=\"space-y-1\">\n            {subscriptions.map(sub => (\n              <div key={sub.id} className=\"flex items-center justify-between px-2 py-1 text-sm\">\n                <span className=\"text-gray-400\">{sub.name}</span>\n                <span className=\"text-[#00ff41] font-mono\">${sub.price}</span>\n              </div>\n            ))}\n          </div>\n        </div>\n\n        "
        c = c[:idx] + insert + c[idx:]
        changed = True
        print("   ✅ Кабинеты и Подписки добавлены")
    else:
        print("   ❌ Маркер Профиль не найден")
else:
    print("⚠️ Кабинеты уже есть")

if changed:
    write_file(SIDEBAR_FILE, c)
    print(f"💾 Файл сохранен ({len(c)} байт)")
else:
    print("✅ Без изменений")

print("")
print("=" * 60)
print("ГОТОВО! Перезапусти: npm run dev")
print("=" * 60)
print("")
print("📋 ЧТО ДОБАВЛЕНО В SIDEBAR:")
print("  1. 📂 Кабинеты сотрудников (с аватарками, статусом)")
print("  2. 👑 Подписки (Free, Creator, Pro, Agency, Enterprise)")
print("  3. 🔗 Ссылки на кабинеты /dashboard/staff/:id")
