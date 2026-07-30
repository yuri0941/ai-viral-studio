import re

file_path = r"D:\kilo2\frontend\src\pages\OwnerDashboardPage.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"📊 Файл: {len(lines)} строк")

# === ИСПРАВЛЕНИЕ 1: Удалить строку с {/* IMPERSONATION PANEL */} и поднять {impersonatedCabinet ===
# Находим паттерн:
#         </div>
#             {/* IMPERSONATION PANEL */ }
#     {
#         impersonatedCabinet && (
# И заменяем на:
#         </div>
#         {impersonatedCabinet && (

for i in range(len(lines) - 3):
    if '</div>' in lines[i] and '{/* IMPERSONATION PANEL */' in lines[i+1] and '{' in lines[i+2] and 'impersonatedCabinet' in lines[i+3]:
        # Удаляем строку с комментарием (i+1)
        # Удаляем строку с одинокой { (i+2)
        # Сдвигаем строку с impersonatedCabinet на место i+1
        lines[i+1] = '        {impersonatedCabinet && (\n'
        del lines[i+2]  # удаляем лишнюю строку с {
        print(f"✅ Исправлено: строка {i+2} — удалён лишний комментарий и скобка")
        break

# === ИСПРАВЛЕНИЕ 2: Удалить лишнюю ) перед закрывающими скобками ===
# Находим паттерн:
#         )
#     }
#
#     )
# }
# И заменяем на:
#         )
#     }
# }

for i in range(len(lines) - 4):
    stripped_i = lines[i].strip()
    stripped_i1 = lines[i+1].strip()
    stripped_i2 = lines[i+2].strip()
    stripped_i3 = lines[i+3].strip()

    if stripped_i == ')' and stripped_i1 == '}' and stripped_i2 == ')' and stripped_i3 == '}':
        # Удаляем строку с лишней )
        del lines[i+2]
        print(f"✅ Исправлено: строка {i+3} — удалена лишняя ')'")
        break

# Сохраняем
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"✅ Файл сохранён: {file_path}")
print("🚀 Запусти: npm run dev")
