# CHAT_CONTEXT.md — Текущее состояние проекта AIVIRAL

> Версия контекста: v9.9.19.14-ctx
> Дата: 2026-08-11 (обновлено после MEMORY-GRAPH-PAYMENT-FIX)
> Мастер-план: @file D:\kilo2\MASTER_PLAN_v9.9.20.md
> ⚠️ Файл называется CHAT_CONTEXT.md (без пробела) — вариант «CHAT_CONTEXT .md» был случайным rename, исправлен.

---

## 📦 ПРОЕКТ

- **Название:** AIVIRAL / OMEGA AI Assistant
- **Backend:** Node.js + Express + MongoDB (ES modules)
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Deploy:** Render (backend), Cloudflare Pages (frontend)
- **Репозиторий:** GitHub main
- **Канал:** @aiviralstudio
- **Боты:** @aiviral_omega_bot (owner), клиентский бот (deep-link)

---

## 📜 ИСТОРИЯ ВЕРСИЙ (эволюция до аудита)

### v9.9.11 — Telegram-бот выполняет команды
- Owner-бот: /post публикует в канал, /status показывает реальный статус, /improve и /report запускают сервисы
- Убраны "пустые" ответы и дубли меню
- i18n ключи telegram.* добавлены в ru/en.json

### v9.9.13 — OMEGA перестала болтать (Intent→Action→Learning Graph)
- Свободный текст "опубликуй пост про кофе" → реальный пост в канал
- "Статус" → реальные цифры MongoDB/uptime/RAM
- "Сделай отчёт" → реальный performance-отчёт
- Клиенты в @aiviral_omega_bot: "поддержка" → тикет, "пост" → публикация
- Дубли приветствий убраны, AI-чат только при Intent = CHAT

### v9.9.14 — DevStudio + Dream Mode + Neural Graph + Voice v2
- DevStudio: генерация кода с preview
- Dream Mode: ночная смена (обучение, оптимизация)
- Neural Graph: визуализация мозга OMEGA
- Voice Mode v2: голосовой ввод и озвучка ответов в OmegaChat
- Auto-Improvement: OMEGA анализирует CTR и улучшает шаблоны
- Rate Limiter 429 устранён
- i18n полный
- 5 тестовых аккаунтов созданы для бета-запуска

### v9.9.16 — Beta Launch
- Продукт протестирован автоматически: backend/frontend 0 ошибок
- Beta Launch открыт: 50 слотов, founding members −30%
- Тестовые аккаунты готовы к ручному тестированию 5 ролей
- Следующий шаг: v9.9.17 — hotfix по feedback первых клиентов

### v9.9.17 — Anti-Fail + Feedback + Daily Report
- Telegram-боты стабильны: webhook + fallback на polling, нет конфликтов
- Anti-Fail Mode: OMEGA следит за собой, алертит при проблемах
- Feedback: клиенты оценивают каждый ответ, собирается статистика
- Daily Report: владелец получает сводку каждое утро в Telegram
- Dream Mode v1: ночная смена + утренние идеи

---

## ✅ ЧТО УЖЕ СДЕЛАНО (факт из PROGRESS_REPORT.md)

### v9.9.19-MASTER-AUDIT-K3 (запушено: e65cfc4c, 114 файлов, +906/−384)
- 47 багов исправлено
- 36 провайдеров в ApiKeysTab с hot-reload
- 5 тестовых аккаунтов (staff/admin/creator/business/advertiser), ROLE_INSTRUCTIONS + ACCESS_MATRIX
- Privacy Firewall активен
- OMEGA: Intent/Action/Learning engines, Neural Graph seed-smm, cron'ы (self-healing 5мин, reflection, autoPilot, morning report 08:00 MSK)
- Telegram owner-бот: полные команды, дубль /menu убран, Churn Guard, эскалация, context memory 10
- Клиентский Telegram Connect по deep-link (карточка в Профиле)
- Все хардкод-fetch заменены на API_BASE_URL
- ~30 alert() → toast
- Адаптив: 20+ модалок max-h-[90vh], touch-targets 44px, FAB safe-area

### v9.9.20 (Growth Engine + Factory + Advertiser + Sales)
- Growth Engine: рефералы, watermark, leaderboard, challenges
- Sales Autopilot: 7-шаг drip, FOMO, Free→Paid лимиты
- Advertiser Suite: /advertise, калькулятор, КП за 30 сек, ROI dashboard
- Support/Tickets: эскалация, source badge, inline reply
- Memory Explorer, Concierge, YouTube AI, Web Search (SerpAPI + DuckDuckGo)
- Factory (базовый): создание сайтов

### v9.9.19.3-TG-BOTS-FIX (сделан)
- extractText() в 45+ файлах — убран response.slice crash
- /posttest команда owner-бота
- Панель owner-бота с реальными цифрами
- /stop реальный
- Публикация в канал работает (после extractText)

---

## 🔄 ЧТО В РАБОТЕ ПРЯМО СЕЙЧАС

**v9.9.19.14-MEMORY-GRAPH-PAYMENT-FIX — ЗАВЕРШЁН и запушен** (2026-08-11)
- 12 слоёв памяти с write-through MongoDB (8 старых + 4 новых), restore/backup/self-diagnosis, лог "[OMEGA] Memory restored"
- Neural Graph: узлы из памяти, позиции в БД (стабильная раскладка), «Пересоздать из БД», drawer с фактами
- ЮKassa: 500 убран (400/502 JSON), тест-кнопка в ApiKeysTab, идемпотентный webhook
- Telegram: validateTelegramHTML (9/9 тестов), plain-fallback на 400 parse, проверка прав getChatMember, честные причины ошибок
- OMEGACoreTab на общем API-клиенте (401-спам убран); BUILD в index.html из package.json (не v7.0)
- Ручная проверка: 8 пунктов в конце PROGRESS_REPORT v9.9.19.14

**Дальше по плану:** 19.4-AUTH-401-FIX (частично закрыт здесь), 19.7-VK-PKCE-FIX, 19.8-KEY-HEALTH-UI (частично закрыт: статус invalid в ApiKeysTab)

**v9.9.19.14.2-SHORTTERM-CAST-FIX — выполнен** (2026-08-11): корень — поле `type: String` в поддокументе entries компилировалось mongoose как [String] → CastError на каждой записи. Фикс: вложенная форма `type: { type: String }`, type guards в write-through, self-heal sanitize при restore, однострочные логи. Repair-скрипт идемпотентен (backend/scripts/repairMemoryEntries.js).

**v9.9.19.14.3-GRAPH-RENDER-FIX — выполнен** (2026-08-11): граф рендерит все узлы. Корни: (A) endpoint не читал CognitiveNode — 300 узлов БД терялись; (B) размер мерялся с внешней панели вместо канваса — узлы рисовались вне видимой области; (C) nx/ny были null — теперь golden-angle спираль на backend. Единый FILTER_GROUPS (типы не выпадают), статистика = видимому массиву, дубли луп убраны, 375px панель в одну строку.

---

## ⏳ ОЧЕРЕДЬ ФИКСОВ (P0 — критично)

| # | Промпт | Модель | Статус |
|---|--------|--------|--------|
| 0.1 | 19.6-OMEGA-AUTONOMY-LUXE | K3 high | ✅ Готово |
| 0.2 | 19.2-UX-HOTFIX + 2.6 + 4.1-б + 4.2 (+ канал-автономия v4) | K2.7 | ✅ Готово (v9.9.19.2-v4) |
| 0.3 | 19.4-AUTH-401-FIX | K2.7 | ⏳ Ожидает |
| 0.4 | 19.7-VK-PKCE-FIX | K2.7 | ✅ Готово |
| 0.5 | 19.8-KEY-HEALTH-UI | K2.7 | ⏳ Ожидает |
| 0.6 | 19.9-ADAPTIVE-DESIGN-AUDIT | K2.7 | ⏳ Ожидает |
| 0.7 | 19.10-DESIGN-POLISH | K2.7 | ⏳ Ожидает |

---

## 🔴 ИЗВЕСТНЫЕ БАГИ (ждут фиксов выше)

| Баг | Где видно | Почему | Какой промпт чинит |
|-----|-----------|--------|-------------------|
| Модалка "Обновление v7.0.0" висит на 20% | Скрин | Version API отдаёт старую версию | 19.2 Шаг 1 |
| Neural Graph: 2 оранжевых узла по углам, пустой канвас | Скрин | Нет fitToView, старая раскладка | 19.2 Шаг 2 / 19.6 Шаг 7 |
| "Поиск узлс" обрезан, дубли луп, каши фильтров | Скрин | Мобильная вёрстка | 19.2 вставка 2.6 / 19.9 |
| AI отвечает слабой моделью (немецкие слова) | Лог | Groq 429 → fallback на 8b | 19.2 Шаг 3 |
| Приоритет ключей: Render побеждает кабинет | Лог | getProviderKey порядок | 19.2 Шаг 4 |
| 401 на /api/omega/self-reflection и /api/owner/settings | Консоль | Прямой fetch без токена | 19.4 |
| VK "Security Error" | Скрин oauth.vk.ru | Нет PKCE, redirect URI | 19.7 |
| Спам vectorizeService code 10001 | Лог | Невалидный Pinecone ключ | 19.2 Шаг 5 |
| AUTO-PUBLISH "published to 0 platforms" | Лог | Нет цели по умолчанию | 19.2 Шаг 5 |
| Ключи не отслеживаются (протух — не знаем) | Опыт | Нет health-ключей | 19.8 |
| Адаптивность: не проверена системно | — | Нет аудита всех страниц | 19.9 |
| Дизайн: эмодзи-квадраты, нет единой системы | Анализ сайта | Нет дизайн-ревью | 19.10 |

---

## 🗝️ КЛЮЧИ (внесены в ApiKeysTab + Render env)

| Ключ | Статус | Где используется |
|------|--------|------------------|
| telegram_bot | ✅ | Клиентский бот, публикации |
| telegram_owner_bot | ✅ | Owner-бот |
| telegram_chat_id | ✅ | Канал @aiviralstudio |
| vk / vk_secret | ✅ | VK OAuth (ждёт 19.7) |
| groq | ✅ | Основная AI-модель |
| deepseek | ✅ | Fallback |
| openai | ✅ | Fallback, Whisper (опционально) |
| yookassa_shop_id / yookassa_secret | ✅ | Платежи |
| vapid_public / vapid_private | ✅ | Push |
| replicate | ✅ | AI-видео |
| serpapi | ✅ | Поиск |
| elevenlabs | ✅ | TTS (опционально) |
| resend / smtp | ✅ | Email |
| stripe / paypal | ⏳ | Если нужны |
| pinecone | ❌ | Vectorize спамит 10001 — in-memory fallback |

---

## 📱 УСТРОЙСТВА ДЛЯ ТЕСТИРОВАНИЯ АДАПТИВНОСТИ

Обязательные брейкпоинты для проверки каждой фичи:
- 375px (iPhone SE / старые Android)
- 414px (iPhone 12/13/14)
- 768px (iPad Mini, портрет)
- 1024px (iPad, пейзаж)
- 1280px (ноутбук)
- 1920px (десктоп)

Критерии: нет горизонтального скролла, touch-target ≥ 44px, текст не обрезается, кнопки не перекрываются клавиатурой, FAB в safe-area.

---

## 📁 ФАЙЛЫ КОНТЕКСТА (читать при старте каждого чата)

1. `@file D:\kilo2\CHAT_CONTEXT.md` — это файл
2. `@file D:\kilo2\MASTER_PLAN_v9.9.20.md` — план по приоритетам
3. `@file D:\kilo2\PROGRESS_REPORT.md` — история версий (последние 60 строк)
4. `@file D:\kilo2\PROJECT_CONTEXT.md` — архитектура
5. `@file D:\kilo2\OMEGA_CONTEXT.md` — ядро OMEGA

---

## 🚪 ГЕЙТ МЕЖДУ ЭТАПАМИ

**P0 закрыт только когда:**
- Логин с телефона (375px) → все табы открываются без горизонтального скролла
- Нет ошибок в консоли (0 штук)
- Бот отвечает мгновенно, без JSON-хвостов
- Пост в канале с фото, HTML-форматированием, рабочими кнопками
- VK подключается без Security Error
- Все ключи показывают статус ✅ в ApiKeysTab

---

## 📌 ПОСЛЕДНИЕ ДЕЙСТВИЯ ВЛАДЕЛЬЦА

1. ✅ 19.14.4 выполнен: все ключи — тихий skip, авто-включение, сводка /keystatus; ЮKassa 400 с причиной
2. ✅ 19.14.5 выполнен: на странице Подписки табы способов оплаты переключаются, кнопка = выбранный метод, RUB → ЮKassa, ненастроенные методы disabled с причиной; ключи ЮKassa сохраняются после F5 (ownerId fix), бейдж честный (Сохранён/Работает/Ошибка), подсказка при ключе от выплат
3. ✅ 19.14.6 выполнен: ключи восстановлены в кабинете — единый owner-scope для GET/POST/DELETE/hot-reload, orphan keys снова видны, upsert исключает E11000, repairApiKeyOwners.js идемпотентно привязывает ownerId; node --check + npm run build ✅
4. ✅ 19.14.7 выполнен: страница Подписки — валюта → метод, кнопка = выбранный метод (i18n), ненастроенные методы disabled с причиной; сырый i18n-ключ `apiKeys.yookassaCardHint` и остальные ключи ApiKeys/Settings переведены ru/en; npm run build ✅
5. ✅ 19.7 выполнен: VK ID PKCE через `id.vk.com` с callback на `aiviral-studio.ru/auth/vk/callback` (Security Error исправлен); Telegram-привязка у всех пользователей через `connect_<token>`; единый `integrationStatus` helper; интеграции устойчивы к отсутствию/сбросу ключей (нет ключа = тихо «Не настроено», ключ вставлен = активируется без рестарта); node --check + npm run build ✅
6. Прокликать по чек-листу из 19.6 (Шаг 9.3)
7. Запустить 19.2 → 19.4 → 19.9 → 19.10 (19.8 поглощён 19.14.4)
8. После каждого: скрин мобильной версии (375px) + скрин консоли
9. Только потом: 20-FACTORY-REAL

---

## 💬 ПРАВИЛО ДЛЯ СЛЕДУЮЩИХ ЧАТОВ

Когда открываете новый чат с Kimi:
1. Сначала: `@file D:\kilo2\CHAT_CONTEXT.md`
2. Затем: `@file D:\kilo2\MASTER_PLAN_v9.9.20.md`
3. Потом: `@file D:\kilo2\PROGRESS_REPORT.md` (последние 60 строк)
4. Задавайте вопрос или просите следующий промпт по плану

**Не нужно:**
- Скидывать старые промпты (все в плане)
- Скидывать скрины старых багов (все в таблице выше)
- Скидывать историю диалогов (вся в PROGRESS_REPORT)
- Скидывать анализ сайта (вошёл в MASTER_PLAN: 19.9 + 19.10 + 25-TARIFF-GATES)

**Нужно:**
- Новые скрины ошибок ПОСЛЕ деплоя
- Логи Render при новых падениях
- Скрины мобильной версии (375px) при проверке адаптивности
- Скрины дизайна если что-то выглядит криво

### v9.9.19.15 — VK wall posting, composer reads user.socials, final i18n, owner unlimited
- Реализована публикация на стену VK (`wall.post`) из композера и планировщика.
- VK OAuth расширен scope `wall`; старые подключения видят кнопку «Разрешить публикацию».
- Композер определяет подключённые соцсети по `user.socials` (VK/Telegram).
- Добавлены реальные i18n-ключи `socials.*`, `vk.*`, `telegram.*`, `discord.*`.
- Владелец/OWNER_EMAIL обходит плановые лимиты через `utils/canUse.js`.

### v9.9.19.15.1 — support tickets 404, telemetry 404, VK scheduler source fix
- Добавлен `GET /api/support/my` для creator SupportTab; `POST /api/telemetry` — sink для телеметрии (200 JSON).
- Планировщик/ручная публикация явно выбирает `+vkUserId`; retry только для временных ошибок, перманентные (`vk_not_connected`, `vk_needs_wall_scope` и др.) → `failed` без бесконечных ретраев.
- Добавлен диагностический лог `[vk:publish]` с деталями подключения VK.

### v9.9.19.15.2 — unified platform check and honest alerts
- Проверка подключённых соцсетей унифицирована в `utils/connectedSocials.js` (источник — `user.socials`).
- `autoPublisher` и `scheduledPosts/:id/publish` используют helper и сообщают честные причины отказа по каждой платформе.
- Алерты владельцу больше не содержат «Integrations» и указывают на страницу Соцсетей / конкретную причину (needs_scope, not_connected и т.д.).
- Добавлен `backend/scripts/requeueVkFailedPosts.js` для разового восстановления постов, убитых багом `vk_not_connected`.

### v9.9.19.16 — log hygiene, zero warning spam
- Старт сервера: платёжки — одна info-строка вместо ⚠️-спама; ChromaClient — deprecation `path`/`auth` убран.
- KEY/cache/keep-alive/bot-skip логи переведены на debug или однократны; safeJSONParse — компактная одна строка.
- VK retry: новые коды причин `not_connected`/`needs_scope`/`no_token`/`no_chat` считаются перманентными → failed без retry.

### v9.9.19.16-FINAL — all Render errors/noise fixed
- Убран двойной init ботов и кэша: owner/omega bot init только из server.js, redis-клиенты lazy/idempotent.
- Платёжные ключи исключены из цикла hot-reload ИИ-провайдеров; старт выводит compact summary.
- Deprecation `path`/`auth` у ChromaClient устранён новым синтаксисом.
- KEY/cache/keep-alive/bot-skip шум переведён на debug/однократный лог; safeJSONParse — компактная одна строка.
- VK retry: новые коды причин `not_connected`/`needs_scope`/`no_token`/`no_chat` = перманентный failed без retry.


### v9.9.19.16.1 — startup webhook autofix final
- Двойной init ботов/кэша: promise-guard в owner/omega bot, `redis.js` делегирует в единый `redisClient.js` → один лог `[Cache]`.
- OMEGA-бот: при 409 на setWebhook ретрай до 3 раз с 20с; fallback в polling + cron каждые 30 мин на возврат webhook.
- autoFixAgent: `AuditLog.processed` — обработанные записи не пересканируются, цикл молчит о старых ошибках.
- autoPublisher: permanent-failed посты получают `retriedAt` и не логируются повторно; добавлен `scope_denied` в перманентные коды.

### v9.9.19.15.4 — VK постит в группу per-user ключом сообщества
- VK ID PKCE не даёт `wall` scope; личная стена закрыта платформой. Рабочий путь: per-user ключ доступа сообщества + `groupId`.
- `user.socials.vk.communityKey`/`groupId`/`groupName`; карточка VK в Соцсетях содержит поля ключа, ID группы, 🧪 проверку и раскрывающуюся инструкцию.
- `vkPublishService.js`: `wall.post owner_id=-groupId from_group=1` + загрузка фото (JPEG через sharp) + видео best effort.
- `connectedSocials.js`: VK `connected` = ключ + числовой groupId; `needsScope` VK ID не блокирует постинг.
- `SchedulerPage`: цель «VK (группа)», медиа загружается через `/api/upload/image` (format=jpeg) перед сохранением.
- `autoPublisher`: перманентные VK-коды (`vk_invalid_token`, `vk_wall_denied` и др.) не retry.
