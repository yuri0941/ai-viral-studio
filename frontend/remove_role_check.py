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
print("УБИРАЕМ ПРОВЕРКУ user?.role === 'owner'")
print("=" * 60)

if not os.path.exists(SIDEBAR_FILE):
    print(f"❌ Файл не найден: {SIDEBAR_FILE}")
    exit(1)

c = read_file(SIDEBAR_FILE)
print(f"📊 Размер: {len(c)} байт")

changed = False

# Заменяем user?.role === 'owner' на true
count = c.count("user?.role === 'owner'")
print(f"🔍 Найдено проверок: {count}")

if count > 0:
    c = c.replace("user?.role === 'owner'", "true")
    changed = True
    print("   ✅ Проверки убраны")
else:
    print("⚠️ Проверок не найдено")

if changed:
    write_file(SIDEBAR_FILE, c)
    print(f"💾 Файл сохранен ({len(c)} байт)")
else:
    print("✅ Без изменений")

print("")
print("=" * 60)
print("ГОТОВО! Перезапусти: npm run dev")
print("=" * 60)
