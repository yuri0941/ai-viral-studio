#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

SIDEBAR_FILE = r"D:\\kilo2\\frontend\\src\\components\\layout\\Sidebar.jsx"

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("=" * 60)
print("ИСПРАВЛЕНИЕ CSS СТРУКТУРЫ SIDEBAR")
print("=" * 60)

if not os.path.exists(SIDEBAR_FILE):
    print(f"❌ Файл не найден: {SIDEBAR_FILE}")
    exit(1)

c = read_file(SIDEBAR_FILE)
print(f"📊 Размер: {len(c)} байт")

changed = False

# 1. Убираем flex-1 у nav и делаем его flex-shrink-0
if "<nav className=\"px-3 py-4 space-y-1\">" in c:
    c = c.replace("<nav className=\"px-3 py-4 space-y-1\">", "<nav className=\"px-3 py-4 space-y-1 flex-shrink-0\">")
    changed = True
    print("✅ nav: добавлен flex-shrink-0")

# 2. Исправляем scrollable контейнер
old = "<div className=\"flex-1 overflow-y-auto min-h-0\">"
new = "<div className=\"flex-1 overflow-y-auto\" style={{ minHeight: 0 }}>"
if old in c:
    c = c.replace(old, new)
    changed = True
    print("✅ Scrollable контейнер исправлен")

# 3. Добавляем flex-shrink-0 для профиля
if "{/* User Profile */}" in c:
    c = c.replace("{/* User Profile */}", "{/* User Profile */}\n                <div className=\"flex-shrink-0\">")
    # Закрываем div после профиля
    c = c.replace("</aside>", "</div>\n            </aside>")
    changed = True
    print("✅ Профиль: добавлен flex-shrink-0")

if changed:
    write_file(SIDEBAR_FILE, c)
    print(f"💾 Файл сохранен ({len(c)} байт)")
else:
    print("✅ Без изменений")

print("")
print("=" * 60)
print("ГОТОВО! Перезапусти: npm run dev")
print("=" * 60)
