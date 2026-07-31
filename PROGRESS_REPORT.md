### 2026-07-31 — VisualCalendar + Kanban + 50 Templates + BrandVoice
- [x] VisualCalendar.jsx: миниатюры, цветные плашки, drag&drop, статусы draft/scheduled/published
- [x] SchedulerPage.jsx: заменён старый grid на VisualCalendar
- [x] KanbanBoard.jsx: ToDo/InProgress/Review/Done, drag&drop, фильтры поиск/исполнитель, localStorage
- [x] TasksTab.jsx: интегрирован KanbanBoard
- [x] templatesLibrary.js: 50 шаблонов (hooks, AIDA, PAS, email, shorts)
- [x] /api/omega/generate-template endpoint + /api/omega/templates
- [x] brandVoice.js: анализ стиля через AI + локальные эвристики, сохранение в User.brandVoice
- [x] OMEGA chat: brandVoice prompt добавляется в контекст
- [x] Build frontend: успешно ✅
- [x] Backend node --check: успешно ✅
- [x] Git push: выполнен ✅

### 2026-07-31 — HOTFIX: /api/health endpoint + sidebar hover/toggle
- [x] /api/health endpoint для UptimeRobot (backend/server.js)
- [x] Sidebar: hover-разворачивание (260px ↔ 60px), кнопка << / >> toggle, localStorage sidebar_expanded, z-50
- [x] Build frontend: успешно ✅
- [x] Backend node --check: успешно ✅
- [x] Git push: выполнен ✅

### 2026-07-31 — Security: Telegram bot + Rollbar + RateLimit + EmergencyStop
- [x] Telegram-бот: backend/services/ownerBot.js (/start, /status, alertOwner)
- [x] Алерты владельцу: регистрация (authController.js), оплата (paymentController.js), ошибки 500 (server.js)
- [x] Rollbar: backend/services/rollbarService.js + frontend/src/main.jsx Rollbar.init
- [x] Rate Limiting: backend/middleware/rateLimiter.js + замена inline-лимитов в server.js
- [x] Emergency Stop: backend/routes/admin.js + проверка в aiService.js + кнопка 🛑 STOP в DashboardHeader.jsx
- [x] PaymentProviders: backend/models/PaymentProvider.js + /api/admin/payment-providers endpoints
- [x] Build frontend: успешно ✅
- [x] Backend node --check: успешно ✅
- [x] Git push: выполнен ✅

### 2026-07-31 — HOTFIX: emailService sendEmail export
- [x] Проверен emailService.js: sendEmail уже экспортирован (object signature)
- [x] Проверен emailController.js: импорты соответствуют exports
- [x] Backend запускается локально: node --check server.js ✅, node server.js + /health ✅
- [x] Git push: выполнен ✅

### 2026-07-31 — OMEGA Agents + WebSearch + Vectorize + SelfImprovement + Voice
- [x] agentsRegistry.js: TrendScout, CompetitorSpy, ContentForge, ViralPredictor
- [x] agentRunner.js: анализ запроса → выбор агента → результат в prompt
- [x] skillsSystem.js: level up 10/50/100
- [x] webSearch.js: DuckDuckGo/RSS парсинг, интеграция в OMEGA
- [x] Self-Improvement: авто-анализ 24ч, авто-прокачка, autonomyScore
- [x] vectorizeService.js: Cloudflare Vectorize, индекс omega-memory, upsert/search
- [x] aiGatewayService.js: единый шлюз AI, логирование, rate limit 100 req/min
- [x] Workers AI fallback: llama-3.1-8b-instruct (provider 'workersai' в цепочке)
- [x] Omega Chat UI: 👍/👎, бейджи источников (Brain/Web/AI/Шаблон), голосовой ввод 🎤, озвучка ответа
- [x] emailService.js: добавлены недостающие exports (sendEmail, sendPaymentSuccess и др.) — backend стартует
- [x] Build frontend: успешно ✅
- [x] Backend node --check: успешно ✅
- [x] curl /api/omega/stats: успешно ✅
- [x] Git push: выполнен ✅

### 2026-07-31 — OMEGA Brain + Mobile polish
- [x] memoryStore.js: omega_memories коллекция (OmegaBrainMemory)
- [x] contextEngine.js: контекст перед ответом
- [x] responseSelector.js: приоритет Brain → AI → Шаблон
- [x] templates.js: 55 шаблонов с переменными {name}, {niche}
- [x] OmegaChat UI: 👍/👎, источник ответа (🧠 Brain / 🤖 AI / 📋 Шаблон), typing indicator "OMEGA думает"
- [x] Mobile: touch targets 44px, PWA manifest.json + sw.js + регистрация, index.html link manifest
- [x] Build frontend: успешно ✅
- [x] Backend node --check: успешно ✅
- [x] Git push: выполнен ✅

### 2026-07-31 — HOTFIX: 3 критических ошибки
- [x] emailService.js: добавлен getEmailStatus export
- [x] AnalyticsPage.jsx: исправлен порядок инициализации (Cannot access 'y')
- [x] SubscriptionsTab.jsx: добавлена Array.isArray защита (.map crash)
- [x] Build frontend: успешно ✅
- [x] Backend node --check: успешно ✅
- [x] Git push: выполнен ✅

## ✅ ВЫПОЛНЕННЫЕ ЗАДАЧИ — 2026-07-31

### UX v2: Sidebar + Command Palette + Bento + Mobile + Lang + Omega fix
- [x] Статус: ВЫПОЛНЕНО
- [x] Что реализовано:
  - AppSidebar.jsx: вертикальный sidebar 260px, группы (ОБЗОР, OMEGA, ФИНАНСЫ, КОМАНДА, КОНТЕНТ, НАСТРОЙКИ), сворачивающиеся группы, pin 📌, active индикатор #8B5CF6, состояние в localStorage
  - DashboardShell.jsx: убраны горизонтальные табы, вставлен AppSidebar слева
  - CommandPalette.jsx: Cmd+K overlay, поиск, быстрые действия, недавние, все разделы, ↑↓/Enter/Escape
  - App.jsx: глобальный горячий вызов CommandPalette через Cmd/Ctrl+K
  - OverviewTab.jsx: BentoGrid 8 виджетов (Доход, Команда, OMEGA, Планировщик, Аналитика, Уведомления, API Keys, Быстрые действия), glassmorphism, hover scale-[1.02], приветствие по времени суток
  - DashboardHeader.jsx: dropdown RU/EN 🌐 с сохранением в localStorage, мобильная кнопка ☰ уже в хедере
  - OwnerDashboardPage.jsx: удалён inline-таббар, активная вкладка синхронизируется с URL `?tab=...` для бокового меню
  - Bento адаптивен: 1 колонка на мобильном, 2 на планшете, 3 на десктопе
  - Сборка: npm run build ✅
  - Backend: node --check server.js ✅
- [x] Изменённые файлы:
  - frontend/src/components/layout/AppSidebar.jsx
  - frontend/src/components/layout/DashboardShell.jsx
  - frontend/src/components/layout/CommandPalette.jsx
  - frontend/src/components/layout/DashboardHeader.jsx
  - frontend/src/App.jsx
  - frontend/src/pages/owner/OwnerDashboardPage.jsx
  - frontend/src/pages/owner/components/tabs/OverviewTab.jsx
- [x] Что НЕ получилось / TODO:
  - Нет

# PROGRESS REPORT — AI Viral Studio (kilo2)
# Автообновляется Kimi Code после каждого этапа

## 📋 СТАТУС ПРОЕКТА

| Этап | Статус | Дата | Примечание |
|------|--------|------|------------|
| P0.1 Invalid Date | ✅ Выполнен | 2026-07-28 | Добавлен parseDate() в helpers.js, заменены new Date() в AuditTab, NewsTab, FinanceTab, SecurityTab |
| P0.2 Доходы $0 | ✅ Выполнен | 2026-07-28 | loadArrayFromStorage fallback, кнопка «Сбросить демо-данные» в FinanceTab |
| P0.3 Free=$122 | ✅ Выполнен | 2026-07-28 | Free.price=0 при загрузке, запрет редактирования, UI «Free» |
| P0.4 Дубли табов | ✅ Выполнен | 2026-07-28 | Удалены inline-табы, OwnerDashboardPage — только импорты и switch |
| P0.5 Backend proxy | ✅ Выполнен | 2026-07-28 | Создан /api/owner с mock-данными, proxy уже работал |
| P0.6 AI API | ✅ Выполнен | 2026-07-28 | process.env + fallback, retry на 403/429, авто-переключение |
| P0.7 YouTube regex | ✅ Выполнен | 2026-07-28 | Regex поддерживает youtube.com/shorts и youtu.be |
| P1 Модульность | ✅ Выполнен | 2026-07-28 | Shared components, hooks, AppSidebar, DashboardShell, App.jsx refactored |
| P2 OMEGA Core | ✅ Выполнен | 2026-07-29 | OMEGACoreTab, навигация, архитектура v5 frontend/backend, хуки, UI-компоненты, OmegaPanel в OverviewTab |
| P3 Backend API | ✅ Выполнен | 2026-07-29 | Модели, controllers, routes, frontend API-слой, seed-данные. Проверено /api/owner/overview. |
| P4 Новые табы | ✅ Выполнен | 2026-07-29 | 9 табов, 5 модалок, OmegaChatWidget, языковой переключатель, backend-проверка |
| P5 — Улучшения по ролям | ✅ Выполнен | 2026-07-29 | Advertiser ✅, Admin ✅, Staff ✅, OmegaChat Anti-Fail ✅, Creator/Business ✅ |
| P6 — Интерактивный чат | ✅ Выполнен | 2026-07-29 | P6.1 ChatTab ✅, P6.2 ClientChatWidget + AdRequests API ✅ |
| P7 — Анализ контента + AI Chat | ✅ Выполнен | 2026-07-29 | ContentAnalyzerPage: regex, разбор, сравнение, SEO, AI-ассистент |
| P8 — Планировщик | ✅ Выполнен | 2026-07-29 | SchedulerPage: drag & drop, медиа-очередь, автопубликация, AI-время, шаблоны |
| P9-P11 Остальное | ⏳ Не начат | — | |

## ✅ ВЫПОЛНЕННЫЕ ЗАДАЧИ (Kimi Code пишет сюда)

### P0.1 — Исправление Invalid Date
- **Дата:** 2026-07-28
- **Что сделано:** Добавлена функция `parseDate()` в `helpers.js`, поддерживающая форматы `YYYY-MM-DD`, `YYYY-MM-DD HH:mm:ss`, `DD.MM.YYYY`, `DD.MM.YYYY HH:mm:ss`. Заменены вызовы `new Date()` на `formatDate()` / `formatDateTime()` в `AuditTab`, `NewsTab`, `FinanceTab`, `SecurityTab`.
- **Файлы изменены:** `frontend/src/pages/owner/utils/helpers.js`, `frontend/src/pages/owner/components/tabs/AuditTab.jsx`, `NewsTab.jsx`, `FinanceTab.jsx`, `SecurityTab.jsx`.
- **Проверено в браузере:** Нет
- **Баги остались:** —

### P0.2 — Исправление доходов $0
- **Дата:** 2026-07-28
- **Что сделано:** Добавлена `loadArrayFromStorage()` для валидации массивов. При пустом/битом `owner_payments` в `localStorage` используется `INITIAL_PAYMENTS`. Добавлен `resetDemoData()` — сбрасывает все owner-ключи `localStorage` и перезагружает страницу. Кнопка «Сбросить демо-данные» добавлена в `FinanceTab`.
- **Файлы изменены:** `frontend/src/pages/owner/hooks/useOwnerData.js`, `frontend/src/pages/owner/components/tabs/FinanceTab.jsx`.
- **Проверено в браузере:** Нет
- **Баги остались:** —

### P0.3 — Исправление Free=$122
- **Дата:** 2026-07-28
- **Что сделано:** Добавлена нормализация `subscriptions` при загрузке: у тарифа `Free` форсируется `price=0`. В `updateSubPrice` и `Sidebar` запрещено редактирование цены Free. В `SubscriptionsTab` и `Sidebar` для Free отображается текст «Free» вместо «$0».
- **Файлы изменены:** `frontend/src/pages/owner/hooks/useOwnerData.js`, `frontend/src/pages/owner/components/tabs/SubscriptionsTab.jsx`, `frontend/src/components/layout/Sidebar .jsx`.
- **Проверено в браузере:** Нет
- **Баги остались:** —

### P0.4 — Удаление inline-табов
- **Дата:** 2026-07-28
- **Что сделано:** Из `OwnerDashboardPage.jsx` удалены inline-определения табов (`LegalTab`, `AuditTab`, `ServersTab`, `UpdatesTab`, `PromoTab`, `NewsTab`, `ReferralsTab`, `IntegrationsTab`, `AIAnalyticsTab`, `LogsTab`). Теперь все табы импортируются из `components/tabs/*`. Файл содержит только импорты, `TAB_ICONS`, `switch(activeTab)` и оболочку (модалки, toasts).
- **Файлы изменены:** `frontend/src/pages/owner/OwnerDashboardPage.jsx`.
- **Проверено в браузере:** Нет
- **Баги остались:** —

### P0.5 — Backend proxy + Owner routes
- **Дата:** 2026-07-28
- **Что сделано:** Создан `backend/data/ownerMockData.js` с мок-данными. Создан `backend/routes/owner.js` с GET-эндпоинтами `/api/owner/overview`, `/api/owner/finance`, `/api/owner/team`, `/api/owner/servers`, `/api/owner/subscriptions`. Подключен в `backend/server.js`. Проверено: `/health` и `/api/owner/overview` отвечают. Proxy в `vite.config.js` уже был настроен на `/api` → `http://localhost:5000`.
- **Файлы изменены:** `backend/data/ownerMockData.js`, `backend/routes/owner.js`, `backend/server.js`.
- **Проверено в браузере:** Частично (curl)
- **Баги остались:** —

### P0.6 — AI API авто-переключение провайдеров
- **Дата:** 2026-07-28
- **Что сделано:**
  - В `backend/services/aiService.js` заменены хардкодные ключи на чтение из `process.env` с fallback-значениями.
  - Провайдеры активируются только при наличии ключа и флага `*_ENABLED`.
  - Добавлен `RETRYABLE_STATUSES = [429, 403, 401, 500, 502, 503, 504]`: при таких ошибках происходит fallback Groq → OpenRouter → DeepSeek. При non-retryable ошибке цепочка останавливается.
  - Создан `backend/config/env.js`, импортирован первым в `backend/server.js`, чтобы `process.env` заполнялся ДО загрузки `aiService` (ES modules import hoisting).
  - Исправлен `backend/routes/payments.js`: `Stripe(...)` → `new Stripe(...)`.
  - Backend перезапущен и отвечает на `/health` и `/api/owner/overview`.
- **Файлы изменены:** `backend/services/aiService.js`, `backend/config/env.js`, `backend/server.js`, `backend/routes/payments.js`.
- **Проверено в браузере:** Частично (curl health/owner)
- **Баги остались:** —

### P0.7 — YouTube regex в ContentAnalyzerPage
- **Дата:** 2026-07-28
- **Что сделано:** В `frontend/src/pages/ContentAnalyzerPage.jsx` обновлена валидация URL: регулярное выражение теперь поддерживает `youtube.com/shorts`, `youtu.be`, `x.com`, а также обычные ссылки YouTube/TikTok/Instagram/Twitter.
- **Файлы изменены:** `frontend/src/pages/ContentAnalyzerPage.jsx`.
- **Проверено в браузере:** Нет
- **Баги остались:** —

### Проверка сборки после P0
- **Дата:** 2026-07-28
- **Команда:** `npm run build` в `frontend/`
- **Результат:** ✅ Сборка успешна. Ошибок нет.
- **Исправлено во время сборки:** Дублирующий импорт `formatDateTime` в `frontend/src/pages/owner/components/tabs/SecurityTab.jsx` удалён.
- **Предупреждения:** размер чанка >500 kB.

### P1 — Модульность
- **Дата:** 2026-07-28
- **Что сделано:**
  - Созданы shared-компоненты: `components/shared/Modal.jsx`, `ToastContainer.jsx`, `EmptyState.jsx`, `LoadingSkeleton.jsx`.
  - Созданы универсальные хуки: `hooks/useDashboardData.js`, `hooks/useNotifications.js`, `hooks/useTheme.js`.
  - Создан универсальный `components/layout/AppSidebar.jsx` для всех ролей (owner/admin/staff/advertiser/creator/business) с уведомлениями, кабинетами (owner/admin) и подписками (owner).
  - Созданы `components/layout/DashboardHeader.jsx`, `TabNavigation.jsx`, `DashboardShell.jsx` и вынесен `MobileNotificationDrawer.jsx`.
  - `frontend/src/App.jsx` полностью переписан: удалены inline-`Sidebar` и `MobileNotificationDrawer`, теперь используется `DashboardShell` + `AppSidebar` + `useNotifications`.
  - Убран динамический импорт `helpers.js` в `useOwnerData.js` (теперь статический).
- **Файлы изменены:** `frontend/src/components/shared/*`, `frontend/src/components/layout/AppSidebar.jsx`, `DashboardHeader.jsx`, `DashboardShell.jsx`, `TabNavigation.jsx`, `MobileNotificationDrawer.jsx`, `frontend/src/hooks/*`, `frontend/src/App.jsx`, `frontend/src/pages/owner/hooks/useOwnerData.js`.
- **Проверено в браузере:** Нет
- **Баги остались:** —

### Проверка сборки после P1
- **Дата:** 2026-07-28
- **Команда:** `npm run build` в `frontend/`
- **Результат:** ✅ Сборка успешна. Ошибок нет.
- **Предупреждения:** размер чанка >500 kB.

### P2 — OMEGA Core (Lite)
- **Дата:** 2026-07-29
- **Статус:** 🔄 В процессе
- **Что сделано:**
  - P2.1: Создан `frontend/src/pages/owner/components/tabs/OMEGACoreTab.jsx` — карточки 6 агентов с цветовым статусом и пульсацией, график загрузки серверов (Recharts), консоль логов с автоскроллом, AI-провайдеры (Groq/OpenRouter/DeepSeek) с индикатором статуса, быстрые действия (перезапуск агента, очистка логов, пересчёт прогноза, тест API, генерация отчёта), алерты по агентам/серверам.
  - P2.2: Добавлен таб `omega` в навигацию: `TAB_LABELS` («Ω OMEGA Core»), `TAB_ICONS` (`Brain`), `TABS_ORDER`, `case 'omega'` в `OwnerDashboardPage.jsx`.
  - P2.3: Создана архитектура OMEGA v5:
    - `frontend/src/ai/omega/omegaCore.js` — ядро (роутинг моделей, принятие решений, оркестрация).
    - `frontend/src/ai/omega/omegaMemory.js` — 8-уровневая память (short-term, working, long-term, semantic, procedural, episodic, owner_profile, emotional).
    - `frontend/src/ai/omega/omegaSkills.js` — 10 built-in навыков.
    - `frontend/src/ai/omega/omegaTools.js` — 20 инструментов.
    - `frontend/src/ai/omega/omegaAutonomy.js` — уровень автономности + approval flow.
    - `frontend/src/ai/omega/omegaLearning.js` — 5 уровней самообучения.
    - `frontend/src/ai/omega/omegaCommunication.js` — адаптация стиля, эмоциональный интеллект.
    - `frontend/src/ai/omega/index.js` — баррель-экспорт + фабрика `createOmega`.
    - `backend/ai/omega/omegaCore.js` — backend-версия ядра.
    - `backend/ai/omega/index.js` — фабрика `createOmegaBackend`.
    - `backend/routes/omega.js` — роуты `/api/omega/status`, `/api/omega/chat`, `/api/omega/command`.
    - `backend/server.js` — подключен `app.use('/api/omega', omegaRoutes)`.
  - P2.4: Созданы хуки OMEGA:
    - `frontend/src/hooks/useOmega.js` — главный хук.
    - `frontend/src/hooks/useOmegaChat.js` — чат с историей и статусом «печатает».
    - `frontend/src/hooks/useOmegaMemory.js` — работа с 8 уровнями памяти.
  - P2.5: Созданы UI-компоненты OMEGA:
    - `frontend/src/components/omega/OmegaChat.jsx` — чат-интерфейс.
    - `frontend/src/components/omega/OmegaStatusBar.jsx` — статус ядра.
    - `frontend/src/components/omega/OmegaPanel.jsx` — виджет для Owner Overview.
    - `OmegaPanel` подключён в `frontend/src/pages/owner/components/tabs/OverviewTab.jsx`.
- **Файлы изменены:** `frontend/src/pages/owner/components/tabs/OMEGACoreTab.jsx`, `frontend/src/pages/owner/components/tabs/OverviewTab.jsx`, `frontend/src/pages/owner/utils/constants.js`, `frontend/src/pages/owner/data/initialData.js`, `frontend/src/pages/owner/OwnerDashboardPage.jsx`, `frontend/src/ai/omega/*`, `frontend/src/hooks/useOmega.js`, `useOmegaChat.js`, `useOmegaMemory.js`, `frontend/src/components/omega/OmegaChat.jsx`, `OmegaStatusBar.jsx`, `OmegaPanel.jsx`, `backend/ai/omega/*`, `backend/routes/omega.js`, `backend/server.js`.

### Проверка сборки после P2
- **Дата:** 2026-07-29
- **Команда:** `npm run build` в `frontend/`
- **Результат:** ✅ Сборка успешна. Ошибок нет.
- **Исправлено во время сборки:** Путь к `StatusBadge` в `frontend/src/components/omega/OmegaStatusBar.jsx` исправлен на `../../pages/owner/components/common/StatusBadge`.
- **Предупреждения:** размер чанка >500 kB.

### Проверка backend
- **Дата:** 2026-07-29
- **Команды:** `curl /health`, `curl /api/omega/status`, `curl -X POST /api/omega/chat`
- **Результат:** ✅ Backend отвечает. `/api/omega/status` возвращает состояние OMEGA, провайдеры (`groq`, `openrouter`, `deepseek`), метрики.
- **Баги остались:** —

### P3 — Backend API
- **Дата:** 2026-07-29
- **Статус:** 🔄 В процессе
- **Что сделано:**
  - P3.1: Созданы модели MongoDB в `backend/models/`: `Payment.js`, `Campaign.js`, `SubscriptionPlan.js`, `AuditLog.js`, `Server.js`, `Integration.js`, `AIAgent.js`, `Promo.js`, `News.js`, `ChatMessage.js`, `Banner.js`, `AdRequest.js`, `Notification.js`, `OmegaMemory.js`, `OmegaSkill.js`, `OmegaTransaction.js`. Добавлен `backend/models/index.js`.
  - P3.2: Создан `backend/controllers/ownerController.js` с методами `getOverview`, `getFinance`, `getTeam`, `getServers`, `getIntegrations`, `getAudit`, `getAgents`, `getPromos`, `getNews`, `getSubscriptions`, `createEntity`, `updateEntity`, `deleteEntity`. `backend/routes/owner.js` переписан на использование контроллера. Добавлены мок-данные в `backend/data/ownerMockData.js`.
  - P3.3: Создан `backend/controllers/omegaController.js` и переписан `backend/routes/omega.js` на контроллеры. Эндпоинты: `/status`, `/chat`, `/memory`, `/skills`, `/skills/learn`, `/command`.
  - Исправлен `safeFind`: при пустом результате из MongoDB используется fallback-мок.
- **Файлы изменены:** `backend/models/*`, `backend/models/index.js`, `backend/controllers/ownerController.js`, `backend/controllers/omegaController.js`, `backend/routes/owner.js`, `backend/routes/omega.js`, `backend/data/ownerMockData.js`.
- **Проверка backend:** ✅ `/health`, `/api/owner/overview`, `/api/owner/finance`, `/api/omega/status` отвечают с мок-данными.
- **Баги остались:** —

### Проверка сборки после P3.1–P3.3
- **Дата:** 2026-07-29
- **Команда:** `npm run build` в `frontend/`
- **Результат:** ✅ Сборка успешна. Ошибок нет.
- **Предупреждения:** размер чанка >500 kB.

### P3.4 — Frontend API-слой
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `frontend/src/services/api.js` с `ownerApi` (overview, finance, team, servers, integrations, audit, agents, promos, news, subscriptions, create/update/delete) и `omegaApi` (status, chat, memory, skills, learnSkill, command).
  - Обновлён `frontend/src/pages/owner/hooks/useOwnerData.js`: добавлен `loadFromApi()` с `Promise.allSettled`, `isLoading`, `error`, `refetch()`. При ошибке API используется fallback на localStorage/INITIAL_DATA.

### Seed-данные
- **Дата:** 2026-07-29
- **Что сделано:** Создан `backend/scripts/seed.js` и запущен. В MongoDB `ai_viral_studio` добавлены: 7 платежей, 5 подписок, 6 аудит-логов, 5 серверов, 4 интеграции, 3 промокода, 3 новости, 6 AI-агентов.
- **Проверка:** `GET /api/owner/overview` возвращает: `totalUsers: 1000`, `mrr: 39690`, `activeServers: 3`, `income: 32300`, `expense: 7600`, `profit: 24700`.
- **Исправлено:** Дублирующий индекс в `backend/models/Promo.js`; путь к `api.js` в `useOwnerData.js`.

### Проверка сборки после P3
- **Дата:** 2026-07-29
- **Команда:** `npm run build` в `frontend/`
- **Результат:** ✅ Сборка успешна. Ошибок нет.
- **Предупреждения:** размер чанка >500 kB.

### P4 — Новые табы и компоненты ✅
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - P4.1: Созданы 9 новых табов:
    - `frontend/src/pages/owner/components/tabs/TasksTab.jsx` — задачи и Kanban-доска.
    - `frontend/src/pages/owner/components/tabs/ApiKeysTab.jsx` — управление API-ключами (Groq, OpenRouter, YouTube, Replicate).
    - `frontend/src/pages/owner/components/tabs/NotificationsTab.jsx` — центр уведомлений.
    - `frontend/src/pages/owner/components/tabs/HelpTab.jsx` — FAQ и документация.
    - `frontend/src/pages/owner/components/tabs/FeedbackTab.jsx` — обратная связь.
    - `frontend/src/pages/owner/components/tabs/DevStudioTab.jsx` — генератор приложений с шаблонами и фазами.
    - `frontend/src/pages/owner/components/tabs/OmegaFinanceTab.jsx` — OMEGA Finance.
    - `frontend/src/pages/owner/components/tabs/OmegaSkillsTab.jsx` — древо навыков OMEGA.
    - `frontend/src/pages/owner/components/tabs/OmegaMemoryTab.jsx` — 8 слоёв памяти OMEGA.
  - P4.2: Созданы 5 модалок:
    - `AddTaskModal.jsx` — создание задачи.
    - `AddAPIKeyModal.jsx` — добавление API-ключа.
    - `CreateAgentModal.jsx` — создание AI-агента.
    - `SendEmailModal.jsx` — отправка email.
    - `OmegaApprovalModal.jsx` — одобрение действия OMEGA.
  - P4.3: Обновлены `frontend/src/pages/owner/utils/constants.js` (`TABS_ORDER`, новые иконки/константы) и `frontend/src/pages/owner/data/initialData.js` (`TAB_LABELS`).
  - P4.4: `frontend/src/pages/owner/OwnerDashboardPage.jsx` — добавлены импорты 9 табов, иконки Lucide, `TAB_ICONS` и `case` для каждого таба. Создан плавающий виджет `frontend/src/components/omega/OmegaChatWidget.jsx` и подключён на всех экранах дашборда.
  - P4.5: Модалки подключены в `OwnerDashboardPage.jsx`, а в `useOwnerData.js` добавлены хранилища и обработчики для tasks, apiKeys, approvalRequests, email.
  - P4.6: OmegaChat виджет — доработан: подключение к backend через `omegaApi.chat` в `frontend/src/hooks/useOmega.js`, `backend/controllers/omegaController.js` теперь вызывает `chatWithAI` из `aiService.js` (перебирает Groq → OpenRouter → DeepSeek). В `OmegaChat.jsx` добавлен экран «Нет активного API-ключа» с кнопкой перехода в ApiKeysTab, поле ввода блокируется при отсутствии ключей. `OmegaChatWidget` читает ключи из `localStorage` и передаёт в чат.
  - P4.7: Добавлен переключатель языка RU/EN в `DashboardHeader.jsx`. Язык сохраняется в `localStorage` (`app_language`) и в профиль пользователя (`user.preferences.language`) через `updateUser` в `AuthContext`. Управление состоянием языка — в `DashboardShell`.
- **Файлы изменены:** `frontend/src/pages/owner/components/tabs/TasksTab.jsx`, `ApiKeysTab.jsx`, `NotificationsTab.jsx`, `HelpTab.jsx`, `FeedbackTab.jsx`, `DevStudioTab.jsx`, `OmegaFinanceTab.jsx`, `OmegaSkillsTab.jsx`, `OmegaMemoryTab.jsx`, `frontend/src/pages/owner/OwnerDashboardPage.jsx`, `frontend/src/components/omega/OmegaChatWidget.jsx`, `frontend/src/components/omega/OmegaChat.jsx`, `frontend/src/hooks/useOmega.js`, `frontend/src/pages/owner/utils/constants.js`, `frontend/src/pages/owner/data/initialData.js`, `frontend/src/pages/owner/components/modals/AddTaskModal.jsx`, `AddAPIKeyModal.jsx`, `CreateAgentModal.jsx`, `SendEmailModal.jsx`, `OmegaApprovalModal.jsx`, `frontend/src/pages/owner/hooks/useOwnerData.js`, `frontend/src/components/layout/DashboardHeader.jsx`, `DashboardShell.jsx`, `frontend/src/context/AuthContext.jsx`, `backend/controllers/omegaController.js`.
- **Проверка сборки:** ✅ `npm run build` прошёл успешно (2026-07-29).
- **Проверка backend:** ✅ `/health` отвечает, `/api/omega/chat` отвечает (POST, вызывает `chatWithAI` и перебирает провайдеров). Все fallback-ключи недействительны (Groq 403, OpenRouter 403, DeepSeek 402) — для получения реального ответа нужны валидные API-ключи. Без ключей виджет показывает «Нет активного API-ключа» с ссылкой на ApiKeysTab.
- **Что осталось:** P5 — улучшения по ролям (Advertiser, Admin, Staff, Creator). В P5/P6 добавить валидацию API-ключей (тестовый запрос при сохранении) в `ApiKeysTab`.

### P5 — Улучшения по ролям (в процессе)
- **Дата:** 2026-07-29
- **Статус:** 🔄 В процессе
- **Что сделано:**
  - P5.0: Добавлен переключатель ролей в `DashboardHeader.jsx`. Owner может переключаться между Owner/Admin/Staff/Advertiser/Creator/Business; Admin — Admin/Staff/Creator; Staff — Staff/Creator; Advertiser — Advertiser/Creator; Creator/Business — Creator/Business. При смене роли обновляется `user.role` через `updateUser` в `AuthContext` и происходит редирект на соответствующий дашборд.
- **Файлы изменены:** `frontend/src/components/layout/DashboardHeader.jsx`.
- **Проверка сборки:** ✅ `npm run build` прошёл успешно (2026-07-29).

## 🔄 КРИТИЧЕСКИЙ ФИКС: OMEGA + API-провайдеры (в процессе)
- **Дата:** 2026-07-29
- **Статус:** 🔄 В процессе
- **Что сделано:**
  - Создана модель `backend/models/ApiKey.js` для хранения ключей AI-провайдеров в MongoDB.
  - `backend/models/index.js` экспортирует `ApiKey`.
  - `backend/scripts/seed.js` обновлён: добавлены seed-данные для API-ключей (Groq, OpenRouter, Gemini, YouTube, GitHub Models). Seed запущен, 5 ключей сохранены в MongoDB.
- **Файлы изменены:** `backend/models/ApiKey.js`, `backend/models/index.js`.

## 🐞 ИЗВЕСТНЫЕ ПРОБЛЕМЫ

- 

## 💡 УТОЧНЕНИЯ ОТ ПОЛЬЗОВАТЕЛЯ

- DevStudio: генератор приложений
- Анимации: Framer Motion (fade, slide, hover-scale)
- Цвета: #0a0a0f фон, #00ff41 акцент
- Backend: mock-ответы если ключи не работают
- Адаптив: sidebar → drawer на &lt;1024px
### P5 — критический фикс перед ролями (OmegaChat + backend route)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `frontend/src/components/omega/OmegaChat.jsx` убраны `disabled` у поля ввода и кнопки отправки, основанные на отсутствии локальных ключей. Баннер-предупреждение оставлен, но теперь чат работает через серверные fallback-провайдеры (Groq → OpenRouter → Gemini → GitHub Models → Mistral → Cohere → DeepSeek → Demo Mode).
  - Из `backend/routes/omega.js` удалён импорт и маршрут `/validate-key`, которые ссылались на несуществующий `validateKey` controller и могли привести к падению сервера при перезапуске.
  - Сборка фронтенда прошла успешно.
- **Файлы изменены:** `frontend/src/components/omega/OmegaChat.jsx`, `backend/routes/omega.js`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P5.1 — Улучшение Advertiser Panel
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `frontend/src/pages/AdvertiserDashboardPage.jsx` добавлены фильтры по статусу и поиск по кампании/клиенту.
  - Добавлено переключение статуса кампании (активна ↔ пауза) и кнопка аналитики в таблице.
  - Создан модал аналитики кампании (Campaign Analytics Modal) с бюджетом, CTR, ROI, прогресс-баром использования бюджета и графиком по дням.
  - Вкладка «Переговоры» переделана в двухколоночный интерфейс: список заказчиков слева (из кампаний), переписка справа с фильтрацией по выбранному клиенту, счётчиком непрочитанных и кнопкой «Отметить прочитанным».
  - В отчётах заменены хардкод-цифры на реальные агрегаты из `totalStats` (общий охват, клики, конверсии, стоимость клика).
- **Файлы изменены:** `frontend/src/pages/AdvertiserDashboardPage.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P5.2 — Улучшение Admin Panel
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `frontend/src/pages/AdminDashboardPage.jsx` метрики стали динамическими: `liveStats` считает пользователей, активных/забаненных/на модерации, посты, доход, жалобы из текущих state.
  - Добавлены фильтры по роли и статусу, сортировка по дате/постам/имени/роли, массовые действия (выделение чекбоксами, активировать/заблокировать/удалить выбранных).
  - Роль пользователя теперь меняется inline через `<select>` с сохранением в state.
  - Модальное окно модерации: фильтр по статусам, обработка жалоб (одобрить/отклонить/просмотр), цветовые бейджи.
  - Настройки платформы: редактируемые поля API-лимитов, размера файла, квоты, форматов, maintenance mode; кнопка «Сохранить» с toasts.
  - Режим обслуживания в быстрых настройках теперь переключает state.
  - Исправлена синтаксическая ошибка, возникшая при редактировании: в JSX-шаблоне статусного бейджа закрывающий backtick был заменён на кавычку; исправлено через Python-скрипт, после чего сборка прошла успешно.
- **Файлы изменены:** `frontend/src/pages/AdminDashboardPage.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P5.3 — Улучшение Staff Panel
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `frontend/src/pages/StaffDashboardPage.jsx` добавлен переключатель вида «Таблица / Kanban» (иконки `List`, `Layout`).
  - Фильтр тикетов расширен статусом «Ожидают»; добавлен счётчик найденных тикетов.
  - Kanban-доска: 4 колонки (Открытые, В работе, Ожидают, Закрытые), карточки с темой, пользователем, приоритетом, временем.
  - Таблица тикетов: inline `<select>` для смены приоритета и статуса, столбец «Назначен».
  - В карточке тикета добавлены `<select>` статуса/приоритета, кнопка «Назначить на меня», быстрые ответы (приветствие, решено, нужны данные).
  - Ответ сотрудника теперь переводит тикет в статус «Ожидает ответа» (если не закрыт).
  - Метрики стали динамическими: openTickets, inProgressTickets, closedTickets.
- **Файлы изменены:** `frontend/src/pages/StaffDashboardPage.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P5.4 — Проверка OmegaChat: реальные ответы + Anti-Fail Mode
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Проверено, что `OmegaChatWidget` подключён в `OwnerDashboardPage.jsx` (`<OmegaChatWidget onOpenApiKeys={() => setActiveTab('apiKeys')} />`).
  - В `frontend/src/hooks/useOmega.js` при ошибке OMEGA теперь выбрасывается исключение (`throw err`), а не возвращается `null`.
  - В `frontend/src/hooks/useOmegaChat.js` добавлен Demo Mode fallback: при ошибке всех AI-провайдеров генерируется ответ по ключевым словам.
  - В `frontend/src/components/omega/OmegaChat.jsx` добавлена поддержка `demoMode`: в хедере отображается «DEMO MODE», demo-сообщения выделены жёлтым бейджем, сообщения об ошибках — красным.
  - В `backend/services/aiService.js` добавлены 4 новых fallback-провайдера после GitHub Models:
    - HuggingFace (`api-inference.huggingface.co`) с моделями Llama-3.2-3B-Instruct и Mistral-7B-Instruct-v0.3.
    - Cloudflare Workers AI (`api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/meta/llama-3.1-8b-instruct`).
    - Fireworks AI (`api.fireworks.ai/inference/v1/chat/completions`).
    - Pollinations.ai (`text.pollinations.ai/{prompt}`) — без ключа.
  - Обновлена цепочка провайдеров: Groq → OpenRouter → Gemini → GitHub → HuggingFace → Cloudflare → Fireworks → Mistral → Cohere → DeepSeek → Pollinations → Smart Demo Mode.
  - Создан `backend/data/omegaTemplates.json` с 50+ шаблонами (viral_ideas, scripts, hooks, analytics, competitors, content_plan, thumbnails, hashtags, seo, monetization, team, finance, tech, motivation, niches, formats, legal). Реализован Smart Demo Mode: выбор шаблона по ключевым словам, без фразы «я в демо-режиме».
  - Добавлено in-memory кэширование ответов OMEGA: ключ — хэш вопроса + язык, TTL 1 час. Повторный вопрос возвращается из кэша без расхода API.
  - В `backend/controllers/omegaController.js` эндпоинт `/api/omega/chat` передаёт язык из тела запроса в `chatWithAI`.
  - Проверка backend: `POST /api/omega/chat` с `{"message":"привет","history":[]}` возвращает реальный ответ от провайдера `github` (GitHub Models fallback). Сборка фронтенда прошла успешно.
- **Файлы изменены:** `frontend/src/hooks/useOmega.js`, `frontend/src/hooks/useOmegaChat.js`, `frontend/src/components/omega/OmegaChat.jsx`, `frontend/src/pages/owner/OwnerDashboardPage.jsx` (интеграция уже была), `backend/services/aiService.js`, `backend/controllers/omegaController.js`, `backend/data/omegaTemplates.json`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Проверка backend:** ✅ `node --check` прошёл для `aiService.js` и `omegaController.js`. Backend не перезапускался по требованию пользователя.
- **Баги остались:** —

### P5.5 — Creator/Business Dashboard
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Полностью переписан `frontend/src/pages/CreatorDashboardPage.jsx`.
  - Добавлена панель метрик: постов, просмотров, подписчиков, вовлечённость, приблизительный доход.
  - Быстрые действия: «Создать пост», «Запланировать», «Анализ конкурента», «AI Chat».
  - Портфолио работ с превью, метриками (просмотры, лайки, комментарии, engagement), статусами (viral/trending/stable) и фильтром по площадкам.
  - График вирусности за неделю/месяц (Recharts AreaChart) с переключателем периода.
  - Распределение аудитории по площадкам (Recharts PieChart).
  - Блок монетизации с разбивкой дохода по источникам (AdSense/Creator Fund, спонсорства, продукты, донаты) и прогресс-барами.
  - Блоки последней активности и AI-рекомендаций.
- **Файлы изменены:** `frontend/src/pages/CreatorDashboardPage.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P5 — ИТОГО
- **Статус:** ✅ Выполнен
- **Дата:** 2026-07-29
- **Подэтапы:** P5.1 Advertiser ✅, P5.2 Admin ✅, P5.3 Staff ✅, P5.4 OmegaChat Anti-Fail ✅, P5.5 Creator/Business ✅.

### P6.1 — Интерактивный чат сотрудников (ChatTab.jsx)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Переписан `frontend/src/pages/owner/components/tabs/ChatTab.jsx` с современным UI: пузыри сообщений, аватары, индикатор «печатает», статусы прочтения, время.
  - Drag & Drop файлов (изображения, видео, документы) в область чата + кнопка скрепки для выбора файлов. Вложения отображаются с иконкой, именем и размером.
  - Поиск по сообщениям активного чата и поиск по списку чатов.
  - Закреплённые сообщения: кнопка «pin/unpin» на сообщении, панель закреплённых сообщений в хедере.
  - Реакции на сообщения (эмодзи): панель выбора появляется при наведении, выбранные реакции отображаются под сообщением.
  - Impersonation: Owner/Admin могут писать от имени любого сотрудника через выпадающий список в хедере.
  - @omega в чате: если сообщение содержит `@omega`, отправляется запрос на `/api/omega/chat` и ответ OMEGA появляется в чате с индикатором «печатает».
  - Поддержка типов чатов: команда (staff), AI-агенты, клиенты (client).
- **Файлы изменены:** `frontend/src/pages/owner/components/tabs/ChatTab.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P6.2 — Клиентский чат на лендинге (ClientChatWidget + AdRequests API)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан плавающий виджет `frontend/src/components/chat/ClientChatWidget.jsx` с AI-ассистентом на лендинге.
  - AI пошагово собирает: бюджет, площадку (быстрые кнопки), целевую аудиторию, сроки, материалы (drag & drop / кнопка), канал связи (онлайн-чат / email / Telegram).
  - Индикатор прогресса заявки и статус в хедере виджета.
  - История чата, прикреплённые файлы и форма сохраняются в `localStorage`.
  - После сбора всех данных заявка отправляется на `POST /api/ad-requests`.
  - По завершении появляется блок оценки (1-5 звёзд) и сообщение о возможности попадания кейса в портфолио.
  - Виджет подключён в `frontend/src/pages/LandingPage.jsx`.
  - Создан backend-роут `backend/routes/adRequests.js` с эндпоинтами GET / POST / PATCH / DELETE `/api/ad-requests`.
  - Роут подключён в `backend/server.js`.
- **Файлы изменены:** `frontend/src/components/chat/ClientChatWidget.jsx`, `frontend/src/pages/LandingPage.jsx`, `backend/routes/adRequests.js`, `backend/server.js`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Проверка backend:** ✅ `node --check backend/server.js` и `node --check backend/routes/adRequests.js` прошли. Backend не перезапускался.
- **Баги остались:** —

### P6 — ИТОГО
- **Статус:** ✅ Выполнен
- **Дата:** 2026-07-29
- **Подэтапы:** P6.1 ChatTab ✅, P6.2 ClientChatWidget + AdRequests API ✅.

### P7 — Анализ контента + AI Chat
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Полностью переписан `frontend/src/pages/ContentAnalyzerPage.jsx`.
  - Улучшенная валидация ссылок: поддержка `youtube.com/watch?v=`, `youtube.com/shorts/`, `youtu.be/`, TikTok, Instagram Reels, Twitter/X. Добавлена функция `extractVideoId` для получения ID и платформы.
  - Добавлены поля «Ниша» и «Язык» (RU/EN/ES/ZH) перед анализом.
  - Добавлено поле для сравнения с конкурентом (вторая ссылка). При наличии двух ссылок выводится блок сравнения по AI-оценке, вирусности, engagement и досмотру.
  - Расширена карточка результатов:
    - Хуки (первые 3 сек).
    - Динамика монтажа.
    - CTA: текст, место, сила.
    - Вирусные моменты с таймкодами.
  - AI-помощник встроен в страницу с 4 вкладками:
    - SEO + хештеги (генерация описания и хештегов на выбранном языке через `/api/omega/chat`).
    - Названия — 5 вариантов с кликбейт-оценкой.
    - Теги — мультиязычные списки RU/EN/ES/ZH.
    - AI Chat — произвольные вопросы по видео/нише/идеям через OMEGA Core.
  - Все AI-генерации интегрированы с `omegaApi.chat` (fallback-провайдеры / Demo Mode).
  - Сохранена история анализа, действия «Переанализировать», «Скачать PDF», «Копировать ссылку».
- **Файлы изменены:** `frontend/src/pages/ContentAnalyzerPage.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P8 — Планировщик (улучшения)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Полностью переписан `frontend/src/pages/SchedulerPage.jsx`.
  - Drag & Drop постов между днями: карточки постов draggable, при бросании на другой день дата поста меняется.
  - Медиа-очередь внизу страницы: карусель загруженных файлов (видео/изображения). Hover — предпросмотр (видео проигрывается), клик — полноэкранный просмотр.
  - Автопубликация: toggle «Автопубликация» в хедере; интервал каждые 30 секунд переводит запланированные посты, время которых наступило, в статус `published`. При включённом автоудалении после публикации появляется запрос на удаление из очереди.
  - AI-рекомендация лучшего времени публикации: кнопка «AI время» в модалке поста вызывает `/api/omega/chat` и подставляет полученное время.
  - Шаблоны постов: «Топ-5», «Обзор», «Мифы», «Закулисье» — быстрое заполнение названия, описания и тегов.
  - Улучшенная статистика: всего / запланировано / черновики / опубликовано / автопубликация.
  - Цветовая кодировка платформ в календаре сохранена.
- **Файлы изменены:** `frontend/src/pages/SchedulerPage.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P8.1 — Доработка медиа-очереди (full-screen preview, zoom/pan)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Увеличены карточки медиа-очереди: `160x120` / `200x150`, `rounded-xl`, `gap-4`, hover `shadow-lg scale-105`.
  - Для видео добавлен градиент-заглушка с иконкой Play; hover/touch запускает muted loop inline-воспроизведение.
  - Под карточкой: имя файла (truncate + tooltip), badge «Видео/Изображение», размер файла, длительность видео.
  - Пустое состояние с иконкой загрузки и кнопкой «Загрузить».
  - Полноэкранный просмотр: затемнённый фон, закрытие по Escape/клику/✕, навигация стрелками ← →.
  - Видео в модалке: controls, autoplay, loop, playsInline.
  - Изображение в модалке: wheel zoom (1x–5x), drag to pan, double-click — сброс.
  - Добавлены `size` и `duration` к объектам `mediaQueue`; длительность видео вычисляется асинхронно при загрузке.
- **Файлы изменены:** `frontend/src/pages/SchedulerPage.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P8.2 — Дополнительные fallback AI-провайдеры (HuggingFace + Cloudflare)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `backend/.env` добавлены ключи: `HUGGINGFACE_API_KEY`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`.
  - В `backend/services/aiService.js` уже реализованы провайдеры `chatWithHuggingFace` (модели `meta-llama/Llama-3.2-3B-Instruct`, `mistralai/Mistral-7B-Instruct-v0.3`) и `chatWithCloudflare` (модель `@cf/meta/llama-3.1-8b-instruct`).
  - Цепочка fallback: Groq → OpenRouter → Gemini → GitHub → HuggingFace → Cloudflare → Fireworks → Mistral → Cohere → DeepSeek → Pollinations → Smart Demo Mode.
  - Проверена синтаксическая корректность `aiService.js` (`node --check`) и сборка фронтенда.
- **Файлы изменены:** `backend/.env`, `backend/services/aiService.js`.
- **Проверка:** `node --check backend/services/aiService.js` ✅, `npm run build` ✅.
- **Баги остались:** —

### Backend fix — старт на порту 5000 без падений
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - `backend/config/database.js`: убран `process.exit(1)` при ошибке подключения к MongoDB. Теперь сервер продолжает работать в MOCK/DEMO режиме и возвращает fallback-данные через `safeFind`.
  - `backend/.env` дополнен: `MONGO_URI`, `JWT_SECRET`, `YOUTUBE_API_KEY`, `GITHUB_API_KEY`, и флаги `GROQ_ENABLED=false`, `OPENROUTER_ENABLED=false`, `DEEPSEEK_ENABLED=false`, `GEMINI_ENABLED=false`, `HF_ENABLED=true`, `CLOUDFLARE_ENABLED=true`.
  - Освобождён порт 5000 (завершён зависший процесс), backend перезапущен `npm run dev`.
  - Проверено: `GET /health` → `{"status":"ok"}`; `POST /api/omega/chat` с сообщением "привет" → реальный ответ от GitHub Models (`provider: github`).
- **Файлы изменены:** `backend/config/database.js`, `backend/.env`.
- **Проверка backend:** ✅ Порт 5000 слушается, `/health` отвечает, `/api/omega/chat` возвращает ответ.
- **Баги остались:** —

### P9 — Темы, UI/UX, адаптив, PWA

#### P9.1 — CSS-переменные для светлой/тёмной темы (`frontend/src/styles/globals.css`)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Добавлены CSS-переменные `--bg`, `--bg-secondary`, `--card`, `--card-hover`, `--text`, `--text-muted`, `--border`, `--glass`, `--primary` для `:root` (светлая тема) и `.dark` (тёмная тема).
  - `body` теперь использует `var(--bg)` и `var(--text)` с плавным transition 0.3s.
- **Файлы изменены:** `frontend/src/styles/globals.css`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.2 — `useTheme.js`: экспорт `setTheme` для синхронизации с профилем
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Хук `useTheme.js` теперь возвращает `setTheme`, чтобы внешние компоненты могли устанавливать тему из `user.preferences.theme`.
- **Файлы изменены:** `frontend/src/hooks/useTheme.js`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.3 — `DashboardShell.jsx`: инициализация темы и фон
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Подключён `useTheme`.
  - Добавлена синхронизация темы с `user.preferences.theme` (чтение и запись через `updateUser`).
  - Корневой `div` дашборда теперь использует `bg-[var(--bg)] text-[var(--text)]` с `transition-colors`.
  - В `DashboardHeader` переданы `isDark` и `onThemeToggle`.
- **Файлы изменены:** `frontend/src/components/layout/DashboardShell.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.4 — `DashboardHeader.jsx`: кнопка переключения темы
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Добавлены пропсы `isDark` и `onThemeToggle`.
  - Импортированы иконки `Sun`/`Moon` из `lucide-react`.
  - Добавлена кнопка переключения светлой/тёмной темы в хедере (рядом с языковым переключателем).
  - Фон и граница хедера теперь используют CSS-переменные `var(--bg)` и `var(--border)`.
- **Файлы изменены:** `frontend/src/components/layout/DashboardHeader.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.5 — `TabNavigation.jsx`: mobile-first адаптив + CSS-переменные
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Фон и граница переключателя табов используют `var(--bg)` и `var(--border)`.
  - Добавлен `touch-pan-x` для горизонтального свайпа на мобильных.
  - Цвета неактивных табов переведены на `var(--text-muted)` / `var(--text)`.
- **Файлы изменены:** `frontend/src/components/layout/TabNavigation.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.6 — `main.jsx`: фикс warning React Router future flags
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `BrowserRouter` добавлены future-флаги `v7_startTransition` и `v7_relativeSplatPath`, чтобы убрать deprecation warning React Router v6.
- **Файлы изменены:** `frontend/src/main.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.7 — `OverviewTab.jsx`: CSS-переменные + fallback keys
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Карточки Overview переведены на `bg-[var(--bg-secondary)]`, `border-[var(--border)]`, `text-[var(--text)]`, `text-[var(--text-muted)]`.
  - SVG-диаграмма использует `var(--card-hover)` для фонового круга.
  - Добавлены fallback-ключи для `auditLogs` и `recommendations` (`log.id ?? log.timestamp ?? idx`, `rec.id ?? rec.title ?? idx`), чтобы избежать React key warning при отсутствии `id`.
- **Файлы изменены:** `frontend/src/pages/owner/components/tabs/OverviewTab.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.8 — `PWAInstallButton.jsx`: компонент установки PWA
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан компонент `frontend/src/components/pwa/PWAInstallButton.jsx`.
  - Отслеживает событие `beforeinstallprompt`, хранит deferred prompt.
  - По клику вызывает нативный диалог установки (`prompt()` + `userChoice`).
  - После установки показывает состояние «Установлено».
- **Файлы изменены:** `frontend/src/components/pwa/PWAInstallButton.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.9 — `LandingPage.jsx`: кнопка установки PWA
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Импортирован и добавлен `PWAInstallButton` в навигацию лендинга (рядом с кнопками «Вход/Регистрация»).
- **Файлы изменены:** `frontend/src/pages/LandingPage.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.10 — Иконки PWA (`frontend/public/icons/`)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Созданы PNG-иконки `icon-192x192.png` и `icon-512x512.png` в `frontend/public/icons/` с помощью Pillow (временный `.pwa-tools`, удалён после генерации).
  - Иконки содержат фирменные цвета платформы (#0a0a0f, #00ff41, #2563eb) и звездообразный символ.
- **Файлы изменены:** `frontend/public/icons/icon-192x192.png`, `frontend/public/icons/icon-512x512.png`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, precache теперь включает иконки (7 entries).
- **Баги остались:** —

#### P9.11 — `index.html`: убраны hardcoded тёмные классы
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Убран `class="dark"` у `<html>` и `class="bg-dark-950 text-white"` у `<body>`, чтобы тема управлялась `useTheme` без вспышек и конфликтов.
- **Файлы изменены:** `frontend/index.html`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.12 — `ChatTab.jsx`: fullscreen-режим чата
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Добавлены иконки `Maximize2` / `Minimize2`.
  - Добавлен state `isFullscreen`.
  - Корневой контейнер чата переключается в `fixed inset-0 z-50` при fullscreen.
  - В хедере активного чата добавлена кнопка разворачивания на весь экран.
- **Файлы изменены:** `frontend/src/pages/owner/components/tabs/ChatTab.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

#### P9.13 — Срочный фикс `DashboardShell.jsx`: убран цикл обновлений темы
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Убраны useEffect'ы, которые вызывали `setTheme` и `updateUser` в цикле (Maximum update depth exceeded).
  - Добавлен `useRef` для однократной начальной синхронизации темы из `user.preferences.theme`.
  - Переключение темы теперь выполняется через `handleThemeToggle` (callback), который один раз обновляет и localStorage через `useTheme`, и профиль через `updateUser`.
- **Файлы изменены:** `frontend/src/components/layout/DashboardShell.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно, ошибок нет.
- **Баги остались:** —

### P9 — ИТОГО
- **Статус:** ✅ Выполнен
- **Дата:** 2026-07-29
- **Подэтапы:**
  - P9.1 CSS-переменные светлой/тёмной темы ✅
  - P9.2 `useTheme.js` экспорт `setTheme` ✅
  - P9.3 `DashboardShell.jsx` синхронизация темы с профилем ✅
  - P9.4 `DashboardHeader.jsx` кнопка переключения темы ✅
  - P9.5 `TabNavigation.jsx` mobile scroll + CSS vars ✅
  - P9.6 `main.jsx` фикс React Router future flags ✅
  - P9.7 `OverviewTab.jsx` CSS vars + fallback keys ✅
  - P9.8–P9.10 PWA: `PWAInstallButton`, кнопка на лендинге, иконки 192/512 ✅
  - P9.11 `index.html` без hardcoded тёмных классов ✅
  - P9.12 `ChatTab.jsx` fullscreen-режим ✅
- **Сборка:** ✅ `npm run build` (frontend) успешно.
- **Backend:** ✅ Работает на порту 5000.

### P10 — Подписки, оплата, email, реквизиты (в процессе)

#### P10.1 — Модель MongoDB `Subscription.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создана модель `backend/models/Subscription.js` со схемой подписок (userId, plan, status, price, currency, interval, startDate/endDate, trialEndsAt, autoRenew, paymentMethod, provider, providerPaymentId, isTrial, metadata).
  - Добавлены индексы по `userId + status` и `endDate`.
- **Файлы изменены:** `backend/models/Subscription.js`.
- **Проверка сборки:** — (backend-модель, проверка после создания всех моделей P10).
- **Баги остались:** —

#### P10.2 — Модель MongoDB `Invoice.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создана модель `backend/models/Invoice.js` для счетов/инвойсов.
  - Поля: ownerId, clientId, subscriptionId, invoiceNumber, amount, currency, status, type, items (name/qty/price/total), requisites snapshot, dueDate, paidAt, provider, paymentUrl.
  - Добавлен `pre('save')` хук для авто-расчёта суммы по позициям.
  - Индексы по `ownerId + status`, `dueDate`, `createdAt`.
- **Файлы изменены:** `backend/models/Invoice.js`.
- **Проверка сборки:** — (backend-модель, проверка после создания всех моделей P10).
- **Баги остались:** —

#### P10.3 — Модель MongoDB `OwnerRequisites.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создана модель `backend/models/OwnerRequisites.js` для реквизитов владельца/компании.
  - Поля: ownerId (unique), type, name, inn, kpp, ogrn, accountNumber, bank, bik, corrAccount, address, email, phone, director, currency, vatRate, isDefault.
  - Индексы по `ownerId` и `inn`.
- **Файлы изменены:** `backend/models/OwnerRequisites.js`.
- **Проверка сборки:** — (backend-модель, проверка после создания всех моделей P10).
- **Баги остались:** —

#### P10.4 — Обновление `backend/models/index.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Добавлены экспорты новых моделей: `Subscription`, `Invoice`, `OwnerRequisites`.
  - Модели теперь регистрируются при импорте `backend/models/index.js`.
- **Файлы изменены:** `backend/models/index.js`.
- **Проверка сборки:** — (backend-модель, проверка после создания всех моделей P10).
- **Баги остались:** —

#### P10.5 — Контроллер подписок `subscriptionController.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `backend/controllers/subscriptionController.js` с методами:
    - `getPlans` — список тарифов с ценами в выбранной валюте и скидкой за год.
    - `getCurrentSubscription` — текущая подписка пользователя (fallback на Free).
    - `getSubscriptionHistory` — история подписок.
    - `createSubscription` — создание подписки, авто-деактивация предыдущих.
    - `updateSubscription` — обновление статуса/автообновления/провайдера.
    - `cancelSubscription` — отмена активной подписки.
    - `checkTrialEnding` — проверка подписок, у которых триал заканчивается через ≤3 дня.
- **Файлы изменены:** `backend/controllers/subscriptionController.js`.
- **Проверка сборки:** — (проверка backend после подключения роутов).
- **Баги остались:** —

#### P10.5 — Роуты подписок `subscriptions.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `backend/routes/subscriptions.js` с эндпоинтами:
    - `GET /api/subscriptions/plans`
    - `GET /api/subscriptions/current`
    - `GET /api/subscriptions/history`
    - `POST /api/subscriptions`
    - `PATCH /api/subscriptions/:id`
    - `DELETE /api/subscriptions/:id/cancel`
    - `GET /api/subscriptions/trial-ending`
  - Все приватные эндпоинты защищены middleware `protect`.
- **Файлы изменены:** `backend/routes/subscriptions.js`.
- **Проверка сборки:** — (проверка backend после подключения роутов в `server.js`).
- **Баги остались:** —

#### P10.6 — Контроллер и роуты счетов `invoiceController.js` / `invoices.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `backend/controllers/invoiceController.js` с методами:
    - `getMyInvoices` — список счетов владельца с пагинацией и фильтрами по статусу/типу.
    - `getInvoiceById` — получение одного счёта.
    - `createInvoice` — создание счёта с авто-нумерацией и подстановкой реквизитов владельца из `OwnerRequisites`.
    - `updateInvoice` — обновление статуса/срока/ссылки и пр.
    - `markInvoicePaid` — ручная/вебхук-отметка об оплате.
    - `deleteInvoice` — удаление черновика.
  - Создан `backend/routes/invoices.js` с эндпоинтами `GET /api/invoices`, `GET /api/invoices/:id`, `POST /api/invoices`, `PATCH /api/invoices/:id`, `POST /api/invoices/:id/pay`, `DELETE /api/invoices/:id`.
- **Файлы изменены:** `backend/controllers/invoiceController.js`, `backend/routes/invoices.js`.
- **Проверка сборки:** — (проверка backend после подключения роутов в `server.js`).
- **Баги остались:** —

#### P10.7 — Контроллер и роуты реквизитов `ownerRequisitesController.js` / `ownerRequisites.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `backend/controllers/ownerRequisitesController.js` с методами:
    - `getMyRequisites` — получение реквизитов владельца (fallback пустой объект, если не заполнены).
    - `createOrUpdateRequisites` — создание/обновление реквизитов с валидацией названия и валюты.
    - `deleteRequisites` — удаление реквизитов.
  - Создан `backend/routes/ownerRequisites.js` с эндпоинтами `GET /api/owner-requisites`, `POST /api/owner-requisites`, `PUT /api/owner-requisites`, `DELETE /api/owner-requisites`.
- **Файлы изменены:** `backend/controllers/ownerRequisitesController.js`, `backend/routes/ownerRequisites.js`.
- **Проверка сборки:** — (проверка backend после подключения роутов в `server.js`).
- **Баги остались:** —

#### P10.8 — Подключение роутов в `backend/server.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Импортированы и подключены роуты:
    - `/api/subscriptions` — подписки.
    - `/api/invoices` — счета/инвойсы.
    - `/api/owner-requisites` — реквизиты владельца.
  - Проверена синтаксическая корректность `server.js` через `node --check` ✅.
- **Файлы изменены:** `backend/server.js`.
- **Проверка сборки:** `node --check backend/server.js` ✅.
- **Баги остались:** —

#### P10.9 — Сервис ЮKassa `yookassaService.js`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `backend/services/yookassaService.js` для работы с API ЮKassa.
  - `createPayment` — создание платежа через `POST /v3/payments` с Basic Auth и Idempotence-Key. В тестовом/не-продакшен окружении включается флаг `test: true`.
  - `checkPayment` — проверка статуса платежа.
  - `handleWebhook` — разбор webhook-событий (`payment.succeeded`, `payment.canceled`, `payment.waiting_for_capture`, `refund.succeeded`).
  - `createInvoicePayment` — обёртка для оплаты конкретного счёта с `metadata.invoiceId`.
- **Файлы изменены:** `backend/services/yookassaService.js`.
- **Проверка сборки:** — (проверка после создания контроллера/роутов).
- **Баги остались:** —

#### P10.10 — Контроллер и роуты ЮKassa
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `backend/controllers/yookassaController.js`:
    - `createSubscriptionPayment` — создание подписки + счёта + платежа ЮKassa, возвращает `paymentUrl`.
    - `createInvoicePaymentLink` — генерация ссылки для оплаты существующего счёта.
    - `checkPaymentStatus` — проверка статуса платежа по `paymentId`.
    - `yookassaWebhook` — обработка webhook: обновляет `Invoice` и `Subscription` при `payment.succeeded` / `payment.canceled`.
  - Создан `backend/routes/yookassa.js` с эндпоинтами:
    - `POST /api/yookassa/webhook`
    - `POST /api/yookassa/pay/subscription`
    - `POST /api/yookassa/pay/invoice/:invoiceId`
    - `GET /api/yookassa/check/:paymentId`
  - Роуты подключены в `backend/server.js` (`/api/yookassa`).
  - Проверка синтаксиса: `node --check backend/server.js` ✅.
- **Файлы изменены:** `backend/controllers/yookassaController.js`, `backend/routes/yookassa.js`, `backend/server.js`.
- **Проверка сборки:** `node --check backend/server.js` ✅.
- **Баги остались:** —

#### P10.11 — Stripe: подготовка, выключена по умолчанию
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `backend/services/stripeService.js`:
    - `isStripeEnabled()` — активен только при `STRIPE_ENABLED=true` + `STRIPE_SECRET_KEY`.
    - `createPaymentIntent`, `createStripeSubscription`, `constructWebhookEvent`, `handleStripeWebhook`.
    - Динамический `import('stripe')` — пакет не требуется при выключенном режиме.
  - Создан `backend/controllers/stripeController.js`:
    - `status` — статус Stripe.
    - `createSubscriptionIntent` — создание подписки Stripe (disabled-ответ, если выключено).
    - `createInvoicePayment` — оплата счёта через Stripe.
    - `webhook` — обработка webhook-событий с обновлением `Invoice` / `Subscription`.
  - Создан `backend/routes/stripe.js` с эндпоинтами:
    - `GET /api/stripe/status`
    - `POST /api/stripe/pay/subscription`
    - `POST /api/stripe/pay/invoice/:invoiceId`
    - `POST /api/stripe/webhook`
  - Роуты подключены в `backend/server.js` (`/api/stripe`).
  - Проверка синтаксиса: `node --check backend/server.js` ✅.
- **Файлы изменены:** `backend/services/stripeService.js`, `backend/controllers/stripeController.js`, `backend/routes/stripe.js`, `backend/server.js`.
- **Проверка сборки:** `node --check backend/server.js` ✅.
- **Баги остались:** —

#### P10.12 — Email-сервис (Nodemailer)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `backend/services/emailService.js`:
    - `sendEmail` — отправка через Nodemailer с fallback-логом, если SMTP не настроен.
    - `sendVerificationEmail` — подтверждение регистрации.
    - `sendPasswordReset` — ссылка на `/reset-password/:token`.
    - `sendPaymentSuccess` — уведомление об успешной оплате.
    - `sendTrialEnding` — уведомление за 3 дня до окончания триала.
    - `sendNewTicket` — уведомление о новом тикете.
    - `getEmailStatus` — проверка конфигурации SMTP.
  - Создан `backend/controllers/emailController.js` — статус SMTP, тестовая отправка, ручной триггер `sendTrialEnding`.
  - Создан `backend/routes/email.js` — `GET /api/email/status`, `POST /api/email/test`, `POST /api/email/trial-ending`.
  - Роуты подключены в `backend/server.js` (`/api/email`).
  - Проверка синтаксиса: `node --check backend/server.js` ✅.
- **Файлы изменены:** `backend/services/emailService.js`, `backend/controllers/emailController.js`, `backend/routes/email.js`, `backend/server.js`.
- **Проверка сборки:** `node --check backend/server.js` ✅.
- **Баги остались:** —

#### P10.13 — Frontend API-слой (`frontend/src/services/api.js`)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `request` добавлен `Authorization: Bearer <token>` из `localStorage` — теперь защищённые backend-эндпоинты работают из фронтенда.
  - Добавлены API-модули:
    - `subscriptionsApi` — `/subscriptions/*`
    - `invoicesApi` — `/invoices/*`
    - `ownerRequisitesApi` — `/owner-requisites/*`
    - `yookassaApi` — `/yookassa/*`
    - `stripeApi` — `/stripe/*`
    - `emailApi` — `/email/*`
  - Проверена сборка фронтенда: `npm run build` ✅.
- **Файлы изменены:** `frontend/src/services/api.js`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно.
- **Баги остались:** —

#### P10.14 — Frontend: таб «Мои реквизиты» `OwnerRequisitesTab.jsx`
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `frontend/src/pages/owner/components/tabs/OwnerRequisitesTab.jsx`.
  - Форма с полями: тип плательщика, название/ФИО, ИНН, КПП, ОГРН, email, телефон, директор, адрес, банк, расчётный счёт, БИК, корреспондентский счёт, валюта по умолчанию, ставка НДС.
  - Загрузка существующих реквизитов через `ownerRequisitesApi.get()`.
  - Сохранение/удаление через `ownerRequisitesApi.save()` / `delete()`.
  - UI на CSS-переменных темы, адаптивная сетка, toast-уведомления.
- **Файлы изменены:** `frontend/src/pages/owner/components/tabs/OwnerRequisitesTab.jsx`.
- **Проверка сборки:** — (сборка после подключения таба в `OwnerDashboardPage`).
- **Баги остались:** —

#### P10.14 — Подключение таба «Реквизиты» в дашборд
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `OwnerDashboardPage.jsx` добавлен импорт `OwnerRequisitesTab`.
  - В `TAB_ICONS` добавлена иконка `Building2` для таба `requisites`.
  - В `switch(activeTab)` добавлен `case 'requisites'`.
  - В `constants.js` (`TABS_ORDER`) добавлен `requisites` после `subscriptions`.
  - В `initialData.js` (`TAB_LABELS`) добавлена метка `'🏢 Реквизиты'`.
  - Проверена сборка фронтенда: `npm run build` ✅.
- **Файлы изменены:** `frontend/src/pages/owner/OwnerDashboardPage.jsx`, `frontend/src/pages/owner/utils/constants.js`, `frontend/src/pages/owner/data/initialData.js`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно.
- **Баги остались:** —

#### P10.15 — Обновление `SubscriptionsTab.jsx` (API + оплата)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Переписан `frontend/src/pages/owner/components/tabs/SubscriptionsTab.jsx`:
    - Загрузка планов с backend (`subscriptionsApi.plans()`).
    - Загрузка текущей подписки (`subscriptionsApi.current()`) с отображением статуса, цены, даты окончания, автообновления.
    - Загрузка истории подписок (`subscriptionsApi.history()`).
    - Переключатель месяц/год с учётом скидки −20%.
    - Кнопка «Оформить» для каждого тарифа → вызов `yookassaApi.paySubscription()` → редирект на `paymentUrl`.
    - Fallback на Stripe (`stripeApi`) с сообщением, если ЮKassa недоступна.
    - UI на CSS-переменных темы, адаптивная сетка, таблица истории.
  - Проверена сборка фронтенда: `npm run build` ✅.
- **Файлы изменены:** `frontend/src/pages/owner/components/tabs/SubscriptionsTab.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно.
- **Баги остались:** —

#### P10.16 — Обновление `FinanceTab.jsx` (счета + оплата)
- **Дата:** 2026-07-29
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `FinanceTab.jsx` добавлен раздел «Счета и инвойсы»:
    - Загрузка счетов через `invoicesApi.list()`.
    - Фильтр по статусу (все / черновики / ожидают / оплачены / отменены).
    - Форма создания нового счёта (описание, сумма, валюта).
    - Кнопка «Оплатить» для неоплаченных счетов → `yookassaApi.payInvoice()` → редирект на `paymentUrl`.
    - Отображение номера, описания, суммы, статуса, даты, ссылки на оплату.
    - UI на CSS-переменных темы.
  - Проверена сборка фронтенда: `npm run build` ✅.
- **Файлы изменены:** `frontend/src/pages/owner/components/tabs/FinanceTab.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно.
- **Баги остались:** —

### P10 — ИТОГО
- **Статус:** ✅ Выполнен
- **Дата:** 2026-07-29
- **Подэтапы:** P10.1–P10.16 ✅
- **Сборка:** ✅ `npm run build` (frontend) успешно.
- **Backend:** `node --check backend/server.js` ✅.
- **Следующий этап:** P11 — Landing Page полировка.

### P10 Bugfix — исправление критических багов перед P11
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - **Backend роут `invoices.js`:** файл отсутствовал (потерян при сбросе сессии) — пересоздан `backend/routes/invoices.js`.
  - **Duplicate schema index warning:** убраны дублирующие `index: true` во всех моделях, где ниже есть `schema.index({ ownerId: ... })`. Убран лишний `ownerRequisitesSchema.index({ ownerId: 1 })`, так как `unique: true` уже создаёт индекс.
  - **Rate limiter:** в development-режиме лимит увеличен с 100 до 10000 запросов на 15 минут (чтобы тестирование не блокировало).
  - **DashboardShell.jsx:** убран циклический `useEffect` для языка. Добавлен `handleLanguageChange` callback, который обновляет `localStorage` и профиль через `updateUser` только при ручном переключении.
  - **Backend перезапущен** на порту 5000, больше нет `EADDRINUSE` и duplicate-index warning.
  - **Проверены login/register:** `POST /api/auth/register` и `POST /api/auth/login` возвращают токен и пользователя.
  - **Проверен OMEGA Chat:** `POST /api/omega/chat` возвращает реальный ответ от GitHub Models (`provider: github`).
  - **Сборка:** `npm run build` ✅.
- **Файлы изменены:** `backend/routes/invoices.js`, `backend/models/OwnerRequisites.js`, `backend/models/Subscription.js`, `backend/models/Invoice.js`, `backend/models/OmegaMemory.js`, `backend/models/AIAgent.js`, `backend/models/Campaign.js`, `backend/models/AuditLog.js`, `backend/models/Banner.js`, `backend/models/AdRequest.js`, `backend/models/Integration.js`, `backend/models/News.js`, `backend/models/Notification.js`, `backend/models/OmegaSkill.js`, `backend/models/OmegaTransaction.js`, `backend/models/Payment.js`, `backend/models/Promo.js`, `backend/models/Server.js`, `backend/server.js`, `frontend/src/components/layout/DashboardShell.jsx`.
- **Проверка backend:** ✅ порт 5000, `/health` отвечает, логи чистые (нет duplicate index warning).
- **Баги остались:** —

#### P10 Bugfix — SubscriptionsTab.jsx `.split` error
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Исправлена ошибка в `frontend/src/pages/owner/components/tabs/SubscriptionsTab.jsx` строка ~219: `(FEATURES[plan.id] || plan.description || "").split is not a function`.
  - Заменён прямой вызов `.split(', ')` на IIFE, которая нормализует значение в массив:
    - Если `raw` — массив, используется как есть.
    - Иначе `String(raw).split(', ').filter(Boolean)`.
  - Это предотвращает краш при `plan.description` не-строкового типа (например, массива или объекта).
  - Проверена сборка фронтенда: `npm run build` ✅.
- **Файлы изменены:** `frontend/src/pages/owner/components/tabs/SubscriptionsTab.jsx`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно.
- **Баги остались:** —

#### P10 — Юридический щит (динамические настройки владельца, согласия, фильтр AI)
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создана модель `OwnerLegalInfo` (`backend/models/OwnerLegalInfo.js`) и контроллер/роуты (`backend/controllers/ownerLegalInfoController.js`, `backend/routes/ownerLegalInfo.js`).
  - Добавлены эндпоинты:
    - `GET /api/owner/legal-info` — для владельца (auth).
    - `PUT /api/owner/legal-info` — сохранение/обновление (auth).
    - `GET /api/public/legal-info` — публичный endpoint для legal-страниц и Footer.
  - Подключены роуты в `backend/server.js`.
  - Создан `LegalSettingsTab.jsx` в Owner Dashboard для редактирования юридических данных.
  - Исправлен `ApiKeysTab.jsx`: статус Active/Missing, счётчик, системные HuggingFace/Cloudflare.
  - Исправлена валюта в `SubscriptionsTab.jsx` + backend `subscriptionController.js`: переключатель ₽/$/€, цены Starter 2900/29/29, Pro 7900/79/79, Agency 19900/199/199, `isStripeEnabled=false`, USD/EUR → сообщение о недоступности.
  - Добавлена вкладка «Зарубежный счёт» в `OwnerRequisitesTab.jsx` + поле `foreignAccount` в модели `OwnerRequisites`.
  - Исправлена тема: `useTheme.js` + inline-script в `index.html`, ключ `ai-viral-theme`.
  - Обновлена модель `User.js` (`preferences`, `acceptedTerms/Privacy/Consent`, `isAdult`, `acceptedAt`, `defaultAddAiLabel`, verification/reset tokens).
  - Переписан `backend/routes/auth.js`: регистрация с 4 обязательными галочками, login, `/me`, `/verify-email/:token`, `/forgot-password`, `/reset-password/:token`.
  - Обновлён `frontend/src/components/auth/RegisterForm.jsx` с 4 чекбоксами и ссылками на legal-страницы.
  - Добавлен middleware `backend/middleware/checkConsent.js` + подключение к `subscriptions.js`.
  - Создан `backend/ai/omega/omegaGuard.js` и интегрирован в `omegaController.js`. Запрещённые темы блокируются (проверено: «сделай пост про выборы» → 403).
  - Исправлено логирование блокировок в `AuditLog` (поле `user` обязательно, `metadata` для details).
  - Созданы динамические legal-страницы: `PrivacyPolicyPage.jsx`, `TermsOfServicePage.jsx`, `ConsentPage.jsx` (`frontend/src/pages/legal/LegalPage.jsx`) + роуты в `App.jsx`. Подстановка `[OPERATOR_NAME]`, `[CONTACT_EMAIL]`, `[OPERATOR_ADDRESS]`, `[SITE_URL]` из `/api/public/legal-info`.
  - Добавлена маркировка AI (`defaultAddAiLabel`) и предупреждение о рекламе в `omegaGuard.js` / `omegaController.js`.
  - Обновлен `backend/services/emailService.js`: шаблоны с подстановкой `OwnerLegalInfo`, verify/reset/payment/trial/cancel/refund/ticket.
  - Обновлен `LandingPage.jsx`: динамический Footer (operatorName/contactEmail), disclaimer.
  - Добавлен rate limiting в `backend/server.js`: `/api/auth/register` 5/час, `/api/auth/login` 10/15 мин.
  - Backend стабильно работает на порту 5000. Регистрация и login возвращают токен. OMEGA Chat отвечает через GitHub Models и блокирует запрещённые темы.
  - `npm run build` (frontend) ✅.
- **Файлы изменены:** `backend/models/OwnerLegalInfo.js`, `backend/controllers/ownerLegalInfoController.js`, `backend/routes/ownerLegalInfo.js`, `backend/server.js`, `backend/models/User.js`, `backend/routes/auth.js`, `backend/middleware/checkConsent.js`, `backend/ai/omega/omegaGuard.js`, `backend/controllers/omegaController.js`, `backend/services/emailService.js`, `frontend/src/pages/owner/components/tabs/LegalSettingsTab.jsx`, `frontend/src/pages/owner/components/tabs/ApiKeysTab.jsx`, `frontend/src/pages/owner/components/tabs/SubscriptionsTab.jsx`, `frontend/src/pages/owner/components/tabs/OwnerRequisitesTab.jsx`, `frontend/src/hooks/useTheme.js`, `frontend/index.html`, `frontend/src/components/auth/RegisterForm.jsx`, `frontend/src/pages/legal/LegalPage.jsx`, `frontend/src/App.jsx`, `frontend/src/pages/landing/LandingPage.jsx`, `backend/models/OwnerRequisites.js`.
- **Проверка сборки:** ✅ `npm run build` (frontend) успешно.
- **Проверка backend:** ✅ порт 5000, регистрация, login, `/api/public/legal-info`, OMEGA Guard работают.
- **Баги остались:** —

### P10 — ИТОГО (обновлено)
- **Статус:** ✅ Выполнен
- **Дата:** 2026-07-30
- **Подэтапы:** P10.1–P10.16 + 4 багфикса + Юридический щит ✅
- **Сборка:** ✅ `npm run build` (frontend) успешно.
- **Backend:** ✅ порт 5000, регистрация, login, `/api/public/legal-info`, OMEGA Guard работают.
- **Следующий этап:** P11 — Деплой и релиз (требуется подтверждение/учётные данные Render/Vercel/MongoDB Atlas).

#### P11 — Hotfix: порядок подключения MongoDB в server.js
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `backend/server.js` изменён порядок: `await connectDB()` теперь вызывается ДО `app.listen()`.
  - Это устраняет ошибку на Render: `Cannot call ownerlegalinfos.findOne() before initial connection is complete if bufferCommands = false`.
  - Изменения запушены в GitHub: `main`.
- **Файлы изменены:** `backend/server.js`.
- **Проверка:** `node --check backend/server.js` ✅, `git push origin main` ✅.
- **Баги остались:** —

#### P11 — Hotfix: CORS для Cloudflare Pages
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `backend/server.js` обновлена настройка CORS:
    - Добавлены явные origin'ы: `http://localhost:3000`, `http://localhost:5173`, `https://ai-viral-studio.pages.dev`, а также `process.env.FRONTEND_URL`.
    - Добавлена динамическая проверка `*.pages.dev`.
    - Сохранено `credentials: true`.
  - Изменения запушены в GitHub: `main`.
- **Файлы изменены:** `backend/server.js`.
- **Проверка:** `node --check backend/server.js` ✅, `git push origin main` ✅.
- **Баги остались:** —

#### P11 — Hotfix: 405 ошибка на /api/auth/login (CORS preflight)
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - В `backend/server.js` обновлён порядок middleware:
    - `cors` настроен ДО всех роутов с `methods`, `allowedHeaders`, `credentials: true`.
    - Добавлен `app.options('*', cors())` для обработки preflight-запросов.
    - `express.json()` и парсеры тела перенесены ДО rate limiters и роутов.
  - В `backend/routes/auth.js` добавлен `console.log('Login attempt:', email)` для диагностики.
  - Изменения запушены в GitHub: `main`.
- **Файлы изменены:** `backend/server.js`, `backend/routes/auth.js`.
- **Проверка:** `node --check backend/server.js` ✅, `node --check backend/routes/auth.js` ✅, `git push origin main` ✅.
- **Баги остались:** —

#### P11 — Security fix: убрана возможность выбора роли при регистрации
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - `backend/routes/auth.js`:
    - Убран `role` из деструктуризации `req.body`.
    - Все новые регистрации принудительно получают `role = 'creator'`.
    - Добавлена проверка: если клиент всё же передаёт `role` в `['owner', 'admin', 'staff']` — возвращается 403 `Forbidden role`.
  - `frontend/src/components/auth/RegisterForm.jsx`:
    - Удалён выпадающий список ролей.
    - Удалён `role` из вызова `register`.
    - Форма содержит только: Имя, Email, Пароль, Подтверждение пароля, согласия.
  - `frontend/src/context/AuthContext.jsx`:
    - Убран параметр `role` из функции `register`.
  - `npm run build` (frontend) ✅.
  - Изменения запушены в GitHub: `main`.
- **Файлы изменены:** `backend/routes/auth.js`, `frontend/src/components/auth/RegisterForm.jsx`, `frontend/src/context/AuthContext.jsx`.
- **Проверка:** `node --check backend/routes/auth.js` ✅, `node --check backend/server.js` ✅, `npm run build` ✅, `git push origin main` ✅.
- **Баги остались:** —

#### P11 — Production audit: CORS, auth role security, MongoDB Atlas, endpoints
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - `backend/server.js`:
    - CORS middleware перемещён ПЕРВЫМ, до `helmet()` и роутов.
    - Добавлены origins: `localhost:3000`, `localhost:5173`, `https://ai-viral-studio.pages.dev`, `process.env.FRONTEND_URL`, `*.pages.dev`.
    - Добавлен `app.options('*', cors())` для preflight.
    - Указаны `methods`, `allowedHeaders`, `credentials: true`.
    - `helmet()` теперь после CORS, чтобы не блокировать preflight.
    - Добавлена проверка `isConnected` после `connectDB()`: в production сервер не стартует без MongoDB.
    - Добавлено логирование `Server started on port X` и `MongoDB connected: Yes/No`.
  - `backend/routes/auth.js`:
    - `role` принудительно `creator` для всех новых регистраций.
    - Попытка передать `owner`/`admin`/`staff` возвращает 403 `Forbidden role`.
  - `frontend/.gitignore` создан: исключает `node_modules`, `dist`, `.env`, логи.
  - Проверка production backend:
    - `GET https://aiviral-backend.onrender.com/health` → `{"status":"ok"}`.
    - `GET /api/public/legal-info` → returns fallback legal info.
    - `OPTIONS /api/auth/login` → 204 с CORS-заголовками.
    - `POST /api/auth/login` (owner@ai-viral.com) → token, role=owner.
    - `POST /api/auth/register` (liveclient2026@example.com) → token, role=creator.
    - `POST /api/omega/chat` → ответ OMEGA (provider=demo, т.к. API keys не настроены на Render).
  - Изменения запушены в GitHub: `main`.
- **Файлы изменены:** `backend/server.js`, `frontend/.gitignore`, `PROGRESS_REPORT.md`.
- **Проверка:** `node --check backend/server.js` ✅, `git push origin main` ✅, production curl tests ✅.
- **Баги остались / требуют ручной настройки:**
  - OMEGA отвечает в demo-режиме — нужно добавить API-ключи в Environment Variables Render (Groq/OpenRouter/Gemini/GitHub) или в коллекцию `apikeys` Atlas.

#### P11 — Critical fix: все API-запросы frontend теперь идут на Render backend
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - Создан `frontend/src/config.js`:
    - `export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://aiviral-backend.onrender.com/api'`
    - `export const API_URL = API_BASE_URL`
    - `export const APP_URL = import.meta.env.VITE_APP_URL || 'https://ai-viral-studio.pages.dev'`
  - Исправлены ВСЕ места с относительными API-запросами и хардкодом `localhost:5000`:
    - `frontend/src/services/api.js` — `API_BASE` теперь `API_URL` (полный URL).
    - `frontend/src/context/AuthContext.jsx` — `/api/auth/me`, `/api/auth/login`, `/api/auth/register`, `/api/users/me` заменены на `${API_URL}/...`.
    - `frontend/src/services/authService.js` — убран хардкод `http://localhost:5000/api/auth`, используется `API_URL`.
    - `frontend/src/hooks/useDashboardData.js` — ENDPOINTS теперь полные URL.
    - `frontend/src/components/chat/ClientChatWidget.jsx` — `/api/ad-requests` → `${API_URL}/ad-requests`.
    - `frontend/src/context/AdContext.jsx` — `/api/ads/impression`, `/api/ads/click/...` → полные URL.
    - `frontend/src/pages/SettingsPage.jsx` — `/api/payments/...` → полные URL.
    - `frontend/src/ai/omega/omegaTools.js` — default endpoint `/api/health` → полный URL.
  - Убраны все вхождения `localhost:5000` из frontend/src.
  - `npm run build` (frontend) ✅.
  - Изменения запушены в GitHub: `main`.
- **Файлы изменены:** `frontend/src/config.js`, `frontend/src/services/api.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/services/authService.js`, `frontend/src/hooks/useDashboardData.js`, `frontend/src/components/chat/ClientChatWidget.jsx`, `frontend/src/context/AdContext.jsx`, `frontend/src/pages/SettingsPage.jsx`, `frontend/src/ai/omega/omegaTools.js`.
- **Проверка:** `npm run build` ✅, `git push origin main` ✅, Grep по `['/"]\s*/api` и `localhost:5000` в `frontend/src` — совпадений нет.
- **Баги остались:** —
- **Ручные действия, необходимые для Cloudflare Pages:**
  - В `dash.cloudflare.com → Workers & Pages → ai-viral-studio → Settings → Environment variables` добавить `VITE_API_URL = https://aiviral-backend.onrender.com/api`.
  - Пересобрать/ redeploy frontend.

#### P11 — Mobile auth UI fix: глазик пароля, ошибки не сдвигают форму, табы Вход/Регистрация
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - `frontend/src/components/auth/LoginForm.jsx`:
    - Добавлена кнопка-глазик (Eye/EyeOff) внутри поля пароля (44×44px touch target).
    - Добавлен `showPassword` state с переключением `type="password" ↔ type="text"`.
    - Блок ошибки обёрнут в `min-h-[3rem]` — форма не прыгает при появлении ошибки.
    - Текст ошибки `text-xs`, красный на тёмном фоне.
  - `frontend/src/components/auth/RegisterForm.jsx`:
    - Глазик добавлен для полей "Пароль" и "Подтвердите пароль".
    - `showPassword` / `showConfirmPassword` states.
    - Блок ошибки с `min-h-[3rem]`.
    - Увеличены отступы `mb-1.5` между label и input.
    - Поля `w-full max-w-full` — не выходят за экран.
  - Создан `frontend/src/components/auth/AuthModal.jsx`:
    - Единая модалка с табами [Вход] [Регистрация].
    - Активная таба — зелёная (#00ff41), неактивная — полупрозрачная.
    - Переключение без перезагрузки.
    - Модалка адаптирована под мобильные: `max-w-md`, `max-h-[90vh]`, `overflow-y-auto`, paddings.
  - `frontend/src/pages/LandingPage.jsx`:
    - Удалены два отдельных модальных окна (Login / Register).
    - Вместо них используется `<AuthModal />` с `authModalOpen` и `authModalMode`.
    - Все кнопки "Войти" / "Регистрация" теперь открывают AuthModal в нужном режиме.
  - `npm run build` (frontend) ✅.
  - Изменения запушены в GitHub: `main`.
- **Файлы изменены:** `frontend/src/components/auth/LoginForm.jsx`, `frontend/src/components/auth/RegisterForm.jsx`, `frontend/src/components/auth/AuthModal.jsx`, `frontend/src/pages/LandingPage.jsx`.
- **Проверка:** `npm run build` ✅, `git push origin main` ✅.
- **Баги остались:** —

#### P11 — Задачи 1–4: глазик смены пароля, change-password endpoint, AI env check
- **Дата:** 2026-07-30
- **Статус:** ✅ Выполнен
- **Что сделано:**
  - **Задача 1 — Глазик в настройках безопасности (`frontend/src/pages/SettingsPage.jsx`):**
    - Добавлены кнопки-глазики (Eye/EyeOff) для полей "Текущий пароль", "Новый пароль", "Подтвердите пароль".
    - Touch target 44×44px, иконка 20px, позиционирование справа внутри input (`pr-12`).
    - Переключение `type="password" ↔ type="text"`.
  - **Задача 2 — Смена пароля backend + frontend:**
    - `backend/controllers/userController.js`: добавлен `changePassword` — проверяет текущий пароль через `bcrypt.compare`, валидирует новый пароль (min 6), сохраняет хеш.
    - `backend/routes/users.js`: добавлен `POST /api/users/change-password` (защищён `protect`).
    - `frontend/src/pages/SettingsPage.jsx`: форма смены пароля теперь state-driven, валидирует совпадение/длину, шлёт запрос на `${API_BASE_URL}/users/change-password`, показывает success/error сообщения.
  - **Задача 3 — AI Keys env check (`backend/server.js`):**
    - Добавлен `console.log('🤖 AI ENV CHECK:', {...})` с флагами наличия ключей: groq, openrouter, deepseek, gemini, github, huggingface, cloudflare, fireworks, mistral, cohere.
    - dotenv загружается через `config/env.js` ДО старта сервера.
    - Убедились, что `aiService.js` читает `process.env.{PROVIDER}_API_KEY`.
  - **Задача 4 — OMEGA не demo-режим:**
    - `aiService.js` уже использует живую цепочку провайдеров (`PROVIDER_CHAIN`) и падает в demo только при полном отказе всех провайдеров.
    - После redeploy на Render логи `AI ENV CHECK` покажут, какие ключи действительно подхвачены.
  - `npm run build` (frontend) ✅.
  - Изменения запушены в GitHub: `main`.
- **Файлы изменены:** `frontend/src/pages/SettingsPage.jsx`, `backend/controllers/userController.js`, `backend/routes/users.js`, `backend/server.js`.
- **Проверка:** `node --check` для backend файлов ✅, `npm run build` ✅, `git push origin main` ✅.
- **Баги остались:** —
- **Ручные действия:**
  - В Render Environment Variables добавьте рабочие AI-ключи (Groq/OpenRouter/Gemini/GitHub/HuggingFace/Cloudflare) и redeploy backend.
  - После redeploy проверьте логи Render: блок `AI ENV CHECK` должен показывать `true` для используемых провайдеров.

## 🚀 Critical Fix — 2026-07-31

| Блок | Статус | Описание |
|------|--------|----------|
| Smart Data (Finance, Analytics, Subscriptions, OMEGA Memory) | ✅ Выполнен | useSmartData hook, демо-данные с бейджами, загрузка реальных данных |
| AI Keys статус + Pollinations | ✅ Выполнен | GET /api/admin/ai-providers/status, карточка Pollinations AI |
| Смена email | ✅ Выполнен | POST /api/users/change-email, UI в SettingsPage |
| ЮKassa тестовый платёж | ✅ Выполнен | paymentController.js, Payment model, /api/payments/create, /api/payments/webhook, PaymentSuccess.jsx |
| Resend email | ✅ Выполнен | emailService.js, письмо после регистрации и оплаты, повторная отправка |
| Сборка frontend | ✅ Выполнен | `npm run build` прошёл успешно |

| Hotfix Payment.js named export | ✅ Выполнен | 2026-07-31 | Исправлен export в models/Payment.js под models/index.js; синтаксис backend проверен |
