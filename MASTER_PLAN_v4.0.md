# AI VIRAL STUDIO — MASTER PLAN v4.0
## Единый документ развития | Заменяет: POST_RELEASE_ROADMAP, OMEGA_MASTER_ROADMAP, OMEGA_v5_Blueprint, ДопФичи, CONTEXT_v3.0
### Дата: 2026-08-02 | Статус: Готов к релизу (осталось 15% доработок)

---

## 📌 ПРАВИЛО РАБОТЫ ДЛЯ KIMI CODE

1. **Перед созданием любого файла** — проверить `exists()` через терминал или поиск по проекту.
2. **Если файл существует** — показать diff и доработать, НЕ пересоздавать.
3. **Если файла нет** — создать с нуля, следуя спецификации ниже.
4. **После КАЖДОГО файла** — обновить `PROGRESS_REPORT.md` (дата, файлы, проверка).
5. **Backend**: только ES modules (`import/export`).
6. **Frontend**: React 18 + Vite + Tailwind, отдельные компоненты, не inline.
7. **Сборка**: `npm run build` (frontend) + `node --check` (backend) после каждого этапа.
8. **Git push** после каждого завершённого блока.
9. **Один файл за раз**. Ждать "Дальше".

---

## ✅ ЧТО УЖЕ РЕАЛИЗОВАНО (не трогать, только поддерживать)

### Инфраструктура
- [x] React 18 + Vite + Tailwind + Node.js + Express + MongoDB
- [x] ES modules, proxy `/api` → `localhost:5000`
- [x] MongoDB Atlas + Render backend + Cloudflare Pages frontend
- [x] CORS, rate limiting, helmet, JWT auth
- [x] PWA: manifest, service worker, offline.html, push notifications
- [x] i18n: RU/EN полная локализация
- [x] Тёмная/светлая тема с CSS-переменными
- [x] Code splitting (React.lazy, manualChunks)
- [x] Socket.io real-time (уведомления, чат, задачи)
- [x] Redis fallback (in-memory + Upstash-ready)

### OMEGA Core (Backend)
- [x] 8 слоёв памяти (short-term, working, long-term, semantic, procedural, episodic, owner_profile, emotional)
- [x] 10+ агентов в реестре (TrendScout, CompetitorSpy, ContentForge, ViralPredictor и др.)
- [x] AI Gateway: единый шлюз, логирование, rate limit 100 req/min
- [x] Fallback-цепочка: Groq → OpenRouter → Gemini → GitHub → HuggingFace → Cloudflare → Fireworks → Mistral → Cohere → DeepSeek → Pollinations → Smart Demo Mode
- [x] In-memory кэш AI-ответов (TTL 1 час)
- [x] Vector memory: Chroma Cloud / in-memory fallback (RAG)
- [x] Self-Healing: мониторинг каждые 5 мин, авто-переключение провайдеров
- [x] AutoPilot: публикация по расписанию, Telegram алерты
- [x] OMEGA Guard: блокировка запрещённых тем (422-ФЗ), маркировка рекламы
- [x] Brand Voice v2: AI-анализ тона, сохранение в БД, применение в чате

### OMEGA UI
- [x] OmegaChat: пузыри, аватары, typing indicator, 👍/👎, источники (Brain/Web/AI/Шаблон)
- [x] OmegaChatWidget: плавающий виджет в правом нижнем углу
- [x] OMEGACoreTab: карточки агентов, графики, логи, провайдеры
- [x] OmegaSkillsTab: древо навыков, прогресс, категории
- [x] OmegaMemoryTab: 8 слоёв, поиск, timeline
- [x] Voice input: Web Speech API в чате

### Dashboards & Roles
- [x] Owner Dashboard: 20+ табов, sidebar, Command Palette (Cmd+K), BentoGrid
- [x] Admin Dashboard: data-grid, модерация, массовые действия
- [x] Staff Dashboard: Kanban тикетов, быстрые ответы
- [x] Advertiser Dashboard: фильтры, аналитика кампаний, переговоры
- [x] Creator/Business Dashboard: портфолио, вирусность, монетизация
- [x] Role switcher в хедере

### Content & Scheduler
- [x] ContentAnalyzer: YouTube/TikTok/Insta/Twitter regex, AI-разбор, сравнение с конкурентом
- [x] Scheduler: Visual Calendar, drag & drop, медиа-очередь, full-screen preview (zoom/pan)
- [x] 50 AI-шаблонов (хуки, AIDA, PAS, email, shorts)
- [x] AI-обложки: Pollinations/Replicate генерация
- [x] Best Time to Post: AI-рекомендация через Groq/OpenRouter
- [x] Post Preview: макеты Instagram/Telegram/YouTube/TikTok
- [x] A/B Tests: генерация 2 вариантов, выбор, AI-обучение

### Monetization
- [x] Тарифы: Free, Creator ($10), Pro ($43), Agency ($143), Enterprise ($475)
- [x] ЮKassa: создание платежей, вебхуки, тестовый режим
- [x] Stripe: подготовлен, выключен по умолчанию
- [x] PayPal: создан сервис и роуты
- [x] Pay-per-Generation: квоты, оверейдж, топ-ап
- [x] Invoices: создание, оплата, статусы
- [x] Owner Requisites: ИНН, КПП, банковские реквизиты, валюта

### Legal & Security
- [x] 422-ФЗ compliance: согласия при регистрации, маркировка AI, запрещённые темы
- [x] GDPR: Cookie Consent, право на забвение (`DELETE /api/users/me/data`), data export
- [x] Динамические legal-страницы: Privacy, Terms, Consent (подстановка из БД)
- [x] Turnstile: временно отключён для aiviral-studio.ru
- [x] Rate limiting: 5 регистраций/час, 10 логинов/15 мин
- [x] Emergency Stop: флаг в admin, проверка в aiService, кнопка в UI

### Integrations
- [x] WhatsApp Business API (отправка, webhook)
- [x] Slack/Discord (уведомления, embed)
- [x] Notion/ClickUp/Trello (экспорт задач)
- [x] Shopify (импорт товаров, генерация постов)
- [x] Webhooks: HMAC подпись, шаблоны Zapier/Make
- [x] YouTube AI: анализ канала, Shorts-сценарии, авто-титры

### Advanced Features
- [x] Referral 2.0: тиры, кредиты, Agentic Mode, affiliate 40%
- [x] Case Study Auto-Generator: рост >20% → AI пишет кейс
- [x] Custom Reports + PDF (pdfkit)
- [x] Gamification: Predictions, AI vs Human, Leaderboard
- [x] AI Boardroom: 5 агентов (CEO/CMO/CTO/CFO/CHRO), голосование
- [x] Business Spawning: генерация лендинга, брендбука, контент-плана за 48ч
- [x] Template Evolution: авто-анализ CTR, Gold Base, Archive
- [x] Churn Prediction: скор оттока, авто-бонусы, exit-опрос
- [x] Niche Intelligence: детекция ниши, агрегация CTR, кросс-тренды
- [x] Crisis Management: sentiment analysis, авто-ответ, пауза AutoPilot
- [x] Self-Reflection: анализ логов 24ч, утренний репорт в Telegram
- [x] White-Label: Agency может скрыть бренд, CNAME, логотип
- [x] OMEGA API (B2B2B): ключи, rate limits, OpenAPI docs
- [x] Multi-Project Workspaces: переключатель в хедере
- [x] Physical World: QR-генератор, печать, бронирование студий, доставка
- [x] Franchise Kit: генерация брендбука, SOP, ZIP
- [x] Fleet Management: Emergency Stop для всего флота

### Mobile & Desktop
- [x] Capacitor: Android-платформа, camera, push, biometric
- [x] Tauri: Desktop <5MB, system tray, hotkeys, always-on-top
- [x] Owner App: Command Center, Team Pulse, Approval Stream, OMEGA Voice
- [x] ResponsiveAdBanner: desktop + mobile

---

## 🔴 ЭТАП 1: PRE-LAUNCH FOMO (1–2 недели до релиза)
**Цель: собрать базу желающих ДО открытия регистрации**

### 1.1 Waitlist с Геймификацией
**Проверить существование:**
- `frontend/src/pages/landing/WaitlistSection.jsx`
- `backend/models/Waitlist.js`
- `backend/routes/launch.js`

**Если нет — создать:**
- **Backend**: модель `Waitlist` (email, niche, businessSize, position, referrals, points, badge, createdAt)
- **API**: `POST /api/launch/waitlist`, `GET /api/launch/waitlist/count`, `POST /api/launch/waitlist/referral`
- **Frontend**: секция на лендинге
  - Поля: email + ниша (dropdown) + размер бизнеса
  - После отправки: "Вы № {position} в очереди. Осталось ~{days} дней"
  - Геймификация:
    - Пригласи друга → +50 мест вперёд
    - Подписка на Telegram → +20 мест
    - Подписка на TikTok → +15 мест
    - Заполнить опрос (3 вопроса) → +10 мест
  - Топ-100: Founding Member Badge (золотой) + -30% навсегда
  - Email-уведомления: "Вы продвинулись с 1247 на 892 место!"

### 1.2 Viral Demo Generator (без регистрации)
**Проверить существование:**
- `frontend/src/pages/landing/ViralDemo.jsx`
- `backend/routes/demo.js`

**Если нет — создать:**
- Блок на лендинге: "Попробуй OMEGA бесплатно за 10 секунд"
- Поле: "Ваша ниша" (кофейня, бьюти, автобизнес, IT, одежда...)
- OMEGA генерирует 3 хука + скрипт 15 сек прямо на сайте (через `/api/omega/chat` с промптом-шаблоном)
- После генерации: "Хочешь полную версию? Встань в очередь →" (редирект в waitlist)
- Лимит: 3 демо с одного IP, потом требует email
- Backend: rate limiting, кэш ниш (не тратить API на повторы)

### 1.3 Founding Member Program
**Проверить существование:**
- Поле `isFoundingMember` в `backend/models/User.js`
- UI бейджа в профиле

**Если нет — создать:**
- Первые 100 из waitlist → автоматически `isFoundingMember: true`
- Золотой бейдж "Founder" навсегда
- -30% на все тарифы навсегда
- Имя/логотип в разделе "Основатели" (публично, по желанию)
- Доступ к закрытому Telegram-чату с разработчиками
- Ранний доступ к новым фичам (Beta Tester)

### 1.4 Public Roadmap + Голосование
**Проверить существование:**
- `frontend/src/pages/landing/PublicRoadmap.jsx`
- `backend/models/RoadmapVote.js`

**Если нет — создать:**
- Страница `/roadmap`
- Колонки: "В разработке", "Тестирование", "Запущено", "Запланировано"
- Каждая фича — карточка с голосами (👍)
- Пользователи голосуют (1 голос на фичу)
- Топ-5 фичей по голосам — приоритет для следующего спринта
- OMEGA пишет обновления: "OMEGA Voice — 847 голосов, начинаем разработку!"

### 1.5 Beta Slots Scarcity
**Проверить существование:**
- Компонент счётчика на лендинге

**Если нет — создать:**
- На лендинге: "Открываем 50 слотов на бета-тест. Осталось: {count}"
- Обновление в реальном времени (Socket.io или polling)
- Когда слоты кончились: "Следующая волна через 7 дней. Встань в очередь."
- FOMO: таймер обратного отсчёта до следующей волны

---

## 🟠 ЭТАП 2: OMEGA NEURAL v5.1 (2–3 недели)
**Цель: сделать OMEGA лучше ChatGPT/Claude/DeepSeek**

### 2.1 Нейронный Граф Знаний (замена перебора файлов)
**Новый модуль**: `backend/ai/omega/neuralGraph.js`

**Проблема**: Сейчас OMEGA перебирает файлы (`fs.readdir`) и шаблоны. Это линейный поиск.
**Решение**: Графовая структура знаний.

```javascript
// Структура узла
Node {
  id: "uuid",
  type: "project|client|idea|error|skill|trend|decision|memory",
  label: "Кофейня Друзья",
  data: { ... },
  edges: [
    { to: "uuid2", relation: "belongs_to", weight: 0.95 },
    { to: "uuid3", relation: "similar_to", weight: 0.82 }
  ],
  embedding: [0.12, -0.05, ...], // для векторного поиска
  timestamp: Date,
  accessLevel: "owner|client|staff|public"
}
```

**Функции:**
- `addNode(type, data, edges)` — добавить узел
- `findPath(fromId, toId)` — найти связь между двумя сущностями
- `getContext(query, depth=3)` — собрать контекст из графа (вместо перебора файлов)
- `pruneOldNodes(maxAge=90days)` — очистка старых узлов
- `exportGraph()` — JSON для бэкапа

**Интеграция:**
- `omegaCore.js` → вместо `fs.readFile` использовать `neuralGraph.getContext()`
- `responseSelector.js` → графовый поиск релевантной памяти
- Визуализация в `OmegaMemoryTab`: D3.js force-directed graph

### 2.2 Контекстуальное Ядро: Who Am I Talking To?
**Новый модуль**: `backend/ai/omega/contextEngine.js`

**Уровни доступа:**
```javascript
const ACCESS_MATRIX = {
  owner: {
    canSee: ['all_finance', 'all_clients', 'all_staff', 'strategy', 'mrr', 'server_costs'],
    canModify: ['everything']
  },
  client: {
    canSee: ['own_project', 'own_analytics', 'own_posts'],
    canModify: ['own_content', 'own_settings'],
    cannotSee: ['other_clients', 'platform_mrr', 'server_costs', 'staff_salaries']
  },
  staff: {
    canSee: ['assigned_tasks', 'team_chat', 'knowledge_base'],
    canModify: ['assigned_tasks'],
    cannotSee: ['finance', 'strategy', 'other_staff_private']
  },
  guest: {
    canSee: ['public_info', 'landing'],
    canModify: []
  }
}
```

**Правила:**
- OMEGA проверяет `user.role` перед КАЖДЫМ ответом
- Если клиент спрашивает про "других клиентов" → "У меня нет доступа к чужим проектам"
- Если клиент спрашивает про "доход владельца" → "Это конфиденциальная информация"
- OMEGA подписывает свою роль: "Я OMEGA, ваш AI-ассистент. Могу помочь с вашим проектом [Название]"

### 2.3 Privacy Firewall (Конфиденциальность)
**Новый файл**: `backend/ai/omega/privacyFirewall.js`

**Жёсткие правила (hardcoded):**
```javascript
const PRIVACY_RULES = [
  {
    id: 'owner_name',
    pattern: /владелец|создатель|основатель|имя владельца/i,
    allowedFor: ['owner', 'admin'],
    responseForOthers: 'Информация о владельце платформы является конфиденциальной.'
  },
  {
    id: 'mrr_platform',
    pattern: /доход платформы|mrr|общий доход|сколько зарабатывает/i,
    allowedFor: ['owner'],
    responseForOthers: 'Финансовые показатели платформы доступны только владельцу.'
  },
  {
    id: 'client_data',
    pattern: /другие клиенты|чужой проект|данные клиента/i,
    allowedFor: ['owner', 'admin'],
    responseForOthers: 'Я не могу раскрывать информацию о других клиентах из соображений конфиденциальности.'
  },
  {
    id: 'tech_stack',
    pattern: /какой стек|на чём написано|исходный код|архитектура/i,
    allowedFor: ['owner'],
    responseForOthers: 'Технические детали платформы являются коммерческой тайной.'
  },
  {
    id: 'ai_marking',
    pattern: /реклама|продвижение|партнёрство/i,
    action: 'append_disclaimer',
    disclaimer: '⚠️ Это AI-генерированный контент. Если это реклама — требуется маркировка по 422-ФЗ.'
  }
]
```

**Процесс:**
1. Пользователь отправляет сообщение
2. OMEGA генерирует черновик ответа
3. `privacyFirewall.scan(draft, user.role)` → проверка по правилам
4. Если нарушение → заменить на `responseForOthers` или добавить дисклеймер
5. Логгировать попытки несанкционированного доступа в `AuditLog`

### 2.4 OMEGA Code Interpreter
**Новые файлы:**
- `backend/ai/omega/codeInterpreter.js`
- `frontend/src/components/omega/CodeInterpreter.jsx`

**Функционал:**
- Загрузка Excel/CSV → `papaparse` на фронте → отправка на бэкенд
- OMEGA анализирует данные:
  - Считает метрики (среднее, медиана, корреляция)
  - Строит рекомендации
  - Генерирует JSON для графиков
- Frontend: визуализация через Recharts (графики, таблицы)
- Экспорт: PDF-отчёт или скачивание Excel с результатами

**Пример:**
```
Пользователь: "Вот мои продажи за 3 месяца" [загружает sales.xlsx]
OMEGA: "Вижу рост на 23% во 2-м месяце. Пик продаж — пятницы 18:00. 
        Рекомендую увеличить бюджет на рекламу в четверг вечером. 
        [График: продажи по дням недели]"
```

### 2.5 OMEGA Vision (Анализ изображений)
**Новые файлы:**
- `backend/ai/omega/visionCore.js`
- `frontend/src/components/omega/VisionUploader.jsx`

**Функционал:**
- Загрузка скриншота поста конкурента
- Vision-модель (Replicate API / Pollinations vision / OpenRouter vision):
  - OCR: извлечение текста
  - Анализ: цветовая палитра, шрифты, композиция
  - AI-вывод: "Этот пост использует красный CTA внизу, хук в первые 2 сек, 
               длительность 45 сек. Рекомендую адаптировать для вашей ниши."
- Сравнение: загрузить 2 скриншота → OMEGA сравнивает
- Генерация: "Сделай похожий пост для моей кофейни"

### 2.6 Real-time Internet Search
**Новые файлы:**
- `backend/ai/omega/webSearch.js` (уже есть, но доработать)
- `backend/ai/omega/trendScanner.js` (уже есть, но усилить)

**Улучшения:**
- Интеграция **SerpAPI** (Google Search API) — добавить в fallback-цепочку
- DuckDuckGo RSS + парсинг (уже есть)
- Reddit API: сканирование сабреддитов по нишам
- Twitter/X API (если доступен) или nitter.net fallback
- TikTok trending (неофициальные API или скрапинг)

**Процесс:**
1. Пользователь спрашивает про тренд
2. OMEGA: `webSearch.search("trending coffee marketing 2026")`
3. Результаты → краткое summary + источники
4. Генерация поста на основе тренда

### 2.7 Self-Reflection Loop (Самоанализ)
**Новый файл**: `backend/ai/omega/selfReflection.js`

**Цикл:**
```javascript
// Каждые 6 часов
async function reflectionCycle() {
  // 1. Собрать последние действия
  const actions = await getRecentActions(6); // hours

  // 2. Найти ошибки
  const errors = actions.filter(a => a.result === 'error' || a.feedback === 'negative');

  // 3. Анализ
  for (const error of errors) {
    const analysis = await chatWithAI(`
      Действие: ${error.action}
      Ожидание: ${error.expected}
      Реальность: ${error.actual}
      Почему произошло? Как избежать в будущем?
    `);

    // 4. Сохранить в граф знаний
    await neuralGraph.addNode('error_lesson', {
      action: error.action,
      lesson: analysis,
      timestamp: new Date()
    });
  }

  // 5. Корректировка промптов
  await updateSystemPrompts(analysis);
}
```

**UI:**
- В `OmegaMemoryTab` вкладка "Уроки" — список ошибок и выводов
- Кнопка "Применить корректировку" (для owner)

---

## 🟡 ЭТАП 3: OMEGA AUTONOMY v5.2 (2–3 недели)
**Цель: OMEGA работает 24/7, самообучается, самомодифицируется**

### 3.1 OMEGA Coder (Самомодификация)
**Новые файлы:**
- `backend/ai/omega/omegaCoder.js`
- `backend/ai/omega/sandbox.js`
- `frontend/src/components/omega/SandboxPanel.jsx`

**Правила безопасности:**
- OMEGA может изменять ТОЛЬКО файлы в `backend/ai/omega/` и `frontend/src/ai/omega/`
- Изменения других модулей — только через `OmegaApprovalModal` (owner должен одобрить)
- Все изменения проходят через sandbox (Node.js VM2 или isolated-vm)

**Процесс:**
1. OMEGA анализирует свой код (раз в сутки)
2. Находит оптимизацию (например, "эту функцию можно ускорить через мемоизацию")
3. Генерирует diff (патч)
4. Выполняет в sandbox: `node --check` + 3 теста
5. Если тесты прошли → кладёт в `ApprovalQueue` с меткой `autonomous: true`
6. Owner видит: "OMEGA предлагает оптимизацию: [описание]" → [✅ Одобрить] [⛔ Отклонить]
7. После одобрения — `git commit` + `git push`

**Запрещено менять:**
- `backend/routes/auth.js` (безопасность)
- `backend/models/User.js` (данные пользователей)
- `backend/server.js` порт и CORS
- Любые env-переменные
- Платёжные модули

### 3.2 Иерархия Агентов (Swarm v2)
**Новая структура:**

```
OMEGA-Director (1 шт.)
├── OMEGA-Lead: Content (1 шт.)
│   ├── OMEGA-Agent: Writer (N шт.)
│   ├── OMEGA-Agent: Designer (N шт.)
│   └── OMEGA-Agent: SEO (N шт.)
├── OMEGA-Lead: Analytics (1 шт.)
│   ├── OMEGA-Agent: Data Analyst
│   ├── OMEGA-Agent: Predictor
│   └── OMEGA-Agent: Reporter
├── OMEGA-Lead: Client Success (1 шт.)
│   ├── OMEGA-Agent: Onboarding
│   ├── OMEGA-Agent: Support
│   └── OMEGA-Agent: Retention
└── OMEGA-Lead: Tech (1 шт.)
    ├── OMEGA-Agent: DevOps
    ├── OMEGA-Agent: Security
    └── OMEGA-Agent: QA
```

**Каждый агент имеет:**
- Собственную `memoryStore` (память только по своей специализации)
- Собственный `skillTree` (навыки релевантные роли)
- `autonomyLevel`: 1–5 (1 = советует, 5 = действует сам)
- `reportTo`: ID Lead-агента
- Ежечасный отчёт Lead'у

**Коммуникация:**
- Агенты общаются через внутренний message bus (Redis pub/sub)
- Lead агрегирует отчёты и докладывает Director
- Director принимает стратегические решения

### 3.3 OMEGA Dream Mode (Ночная смена)
**Новый файл**: `backend/ai/omega/dreamMode.js`

**Что происходит ночью (02:00–06:00):**
1. **Анализ глобальных трендов** — сканирование 50+ источников
2. **Генерация идей** — 10 идей постов на завтра для каждого активного клиента
3. **Обучение** — fine-tuning на данных платформы (если доступно GPU)
4. **Рефакторинг** — анализ кода, предложение оптимизаций
5. **Прогнозирование** — обновление моделей оттока, вирусности, дохода
6. **Утренний брифинг** — в 8:00 отправка owner'у: "Breakfast Briefing ready"

**UI:**
- В `OMEGACoreTab` индикатор "Dream Mode Active" (луна 🌙)
- Лог ночных операций
- Кнопка "Просмотреть сгенерированные идеи"

### 3.4 Predictive Engine 2.0
**Улучшения:**
- **Viral Score до публикации**: "Этот пост наберёт 50K ±15% просмотров"
- **Churn Prediction за 14 дней**: раньше было 7, теперь 14
- **Best Time per Client**: индивидуально под аудиторию (не общий)
- **Revenue Forecast**: прогноз MRR на 90 дней вперёд
- **Auto-budgeting**: "Свободно $5K → рекомендую инвестировать в TikTok Ads (прогноз ROI 340%)"

---

## 🟢 ЭТАП 4: CLIENT EXPERIENCE (1–2 недели)
**Цель: клиенты влюбляются в продукт с первого касания**

### 4.1 Smart Onboarding Wizard
**Новые файлы:**
- `frontend/src/components/onboarding/OnboardingWizard.jsx`
- `frontend/src/components/onboarding/StepNiche.jsx`
- `frontend/src/components/onboarding/StepSocials.jsx`
- `frontend/src/components/onboarding/StepStyle.jsx`
- `frontend/src/components/onboarding/StepConnect.jsx`
- `frontend/src/components/onboarding/StepFirstPost.jsx`

**5 шагов:**
1. **Ниша** — выбор из 50+ категорий или ввод своей
2. **Соцсети** — toggle: Instagram, TikTok, YouTube, Telegram, VK, Twitter/X, LinkedIn
3. **Стиль** — выбор тона (профессиональный, дружелюбный, ироничный, мотивационный) + OMEGA анализирует 3 примера постов если загружены
4. **Подключение** — OAuth или "Пропустить и сделать позже"
5. **Первый пост** — OMEGA генерирует 3 варианта → клиент выбирает → "Запланировать"

**Прогресс-бар**: 5 шагов, анимация заполнения
**Награда**: после завершения — бейдж "First Step" + 50 бонусных генераций

### 4.2 One-Click Publish
**Новый компонент**: `frontend/src/components/scheduler/OneClickPublish.jsx`

**Функционал:**
- Кнопка "Опубликовать везде" в Scheduler
- Превью под каждую платформу (Instagram 1:1, TikTok 9:16, YouTube 16:9, Telegram текст)
- Авто-адаптация:
  - Instagram: добавить хэштеги + CTA
  - TikTok: сократить до 60 сек, добавить трендовый звук (placeholder)
  - Telegram: убрать хэштеги, добавить кнопки
  - Twitter/X: уложиться в 280 символов
- Подтверждение: "Вы уверены? Это опубликует в 4 соцсети одновременно"
- Отмена в течение 5 секунд (toast с таймером)

### 4.3 Client Mobile App (упрощённая версия)
**Новая папка**: `frontend/src/client-app/`

**Экраны:**
- **Главная**: мои посты, статистика за неделю, быстрые действия
- **Посты**: список с превью, статусами, кнопкой "Создать новый"
- **Статистика**: простые графики (просмотры, лайки, подписчики)
- **Чат**: переписка с менеджером / OMEGA
- **Настройки**: профиль, соцсети, уведомления

**Технически**: тот же Capacitor-проект, но с отдельным entry-point и упрощённым роутингом

### 4.4 Smart Templates (не список, а умный выбор)
**Улучшение**: `frontend/src/pages/owner/components/tabs/TemplatesTab.jsx`

**Вместо**: 50 шаблонов в сетке
**Делаем**:
- OMEGA спрашивает: "Какая цель?" (продажи / узнаваемость / подписчики / engagement)
- Потом: "Какой формат?" (Reels / Stories / Карусель / Пост)
- OMEGA предлагает ТОП-3 шаблона под эту комбинацию с обоснованием
- Кнопка "Почему этот?" → OMEGA объясняет на основе данных платформы

---

## 🔵 ЭТАП 5: PERFORMANCE & POLISH (1 неделя)
**Цель: приложение летает и выглядит премиально**

### 5.1 Virtual Scrolling
**Проверить**: используется ли `react-window` или `@tanstack/react-virtual` в таблицах
**Если нет**:
- `frontend/src/components/shared/VirtualTable.jsx`
- Применить в: Admin Dashboard (пользователи), Analytics (логи), Staff (тикеты)
- 10K строк — 60 FPS

### 5.2 CDN + Image Optimization
**Проверить**: есть ли `sharp` в backend
**Если нет**:
- `backend/services/imageOptimizer.js` — авто-конвертация в WebP/AVIF
- `frontend`: `srcset` для responsive images
- Lazy-loading: `loading="lazy"` + `IntersectionObserver`

### 5.3 Bundle Analyzer
**Проверить**: есть ли `rollup-plugin-visualizer`
**Если нет**:
- Добавить в `vite.config.js`
- Лимит: warning при >500KB main chunk
- Tree-shaking проверка

### 5.4 Микро-анимации (не похоже на "сделано ИИ")
**Новый файл**: `frontend/src/styles/animations.css`

**Что добавить:**
- **Spring-физика** кнопок: `transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)`
- **Hover-парение** карточек: `translateY(-4px)` + `box-shadow` градиент
- **Skeleton loaders**: shimmer-эффект (не просто серые блоки)
- **Page transitions**: Framer Motion `AnimatePresence` с `slide` + `fade`
- **Toast notifications**: slide from right + progress bar
- **Custom cursor**: в зонах drag-and-drop курсор меняется на `grab`/`grabbing`

### 5.5 Звуковой дизайн
**Новая папка**: `frontend/public/sounds/`

**Звуки (тихие, опциональные):**
- `omega-activate.mp3` — включение OMEGA (soft chime)
- `message-sent.mp3` — отправка сообщения (light pop)
- `notification.mp3` — уведомление (gentle ding)
- `success.mp3` — успешное действие (ascending notes)
- `error.mp3` — ошибка (low buzz)
- Вкл/выкл в настройках

### 5.6 Typography & Colors
**Улучшения:**
- Шрифт: **Inter** (body) + **JetBrains Mono** (OMEGA-логи, код)
- Меньше кислотного `#00ff41`, больше глубоких градиентов
- Glassmorphism: `backdrop-filter: blur(20px) saturate(180%)`
- Новые акценты: фиолетовый `#8B5CF6`, бирюзовый `#06B6D4`, коралловый `#F97316`
- Dark mode: не просто чёрный, а глубокий синий `#0a0a1f` с фиолетовыми оттенками

---

## 🟣 ЭТАП 6: POST-LAUNCH GROWTH (после релиза, 0–2 мес)

### 6.1 "Сделано в OMEGA" Watermark
- На каждом экспортируемом видео/посте — маленький логотип + ссылка
- Можно отключить: Pro+ ($10/мес) или Enterprise
- Настройки: позиция, прозрачность

### 6.2 Viral Leaderboard
- Топ клиентов по вирусности (анонимно по умолчанию)
- Периоды: неделя/месяц/всё время
- Категории по нишам
- Призы: топ-3 — бесплатные кредиты

### 6.3 OMEGA Challenge (ежемесячный)
- Тема месяца: "Лучший вирусный пост про лето"
- OMEGA оценивает: вирусность, креатив, вовлечённость
- Призы: 1 место — 3 мес бесплатно
- Авто-генерация кейса победителя

### 6.4 Revenue Share на рекламе
- OMEGA создаёт ad creative
- Клиент запускает через Meta/Google Ads
- Платформа берёт 5% от ad spend
- Дашборд: spend, earned, ROI

### 6.5 Data Intelligence Reports
- OMEGA агрегирует анонимные данные
- Отчёты: "Аналитика TikTok для кофеен Москвы — Q3 2026"
- Цена: $49–149
- Подписка: $19/мес

---

## ⚫ ЭТАП 7: OMEGA FUTURE (3–12 мес)

### 7.1 Chain-of-Thought Reasoning
- OMEGA "думает вслух": "Шаг 1: анализирую нишу... Шаг 2: ищу тренды..."
- Видно в UI: expandable блок "Как OMEGA пришла к этому выводу"
- Повышает доверие и точность

### 7.2 Fine-tuning на данных платформы
- Сбор 100K+ диалогов
- Fine-tune через HuggingFace / Unsloth
- OMEGA пишет как SMM-эксперт, а не как ChatGPT

### 7.3 AI-видео (Shorts/Reels из текста)
- Интеграция Pictory / InVideo / HeyGen API
- Текст → сценарий → озвучка (ElevenLabs) → видео с субтитрами
- Цена: входит в Agency+, остальные — pay-per-video ($5)

### 7.4 Voice Mode (полноценный)
- Разговор с OMEGA голосом
- Whisper API (STT) + ElevenLabs (TTS)
- Hands-free: "Омега, запланируй пост про кофе на завтра в 9"

### 7.5 Dynamic Pricing AI
- Uber-like: спрос высокий → цена +20%
- Персональные скидки неактивным
- Если дизайнеры загружены на 95% → новые заказы дороже на 30%

### 7.6 Neuro-Sales (психотипы)
- Анализ психотипа клиента по переписке
- Контент под психотип:
  - Логик: цифры, ROI
  - Эмоционал: истории, боли
  - Дефицит: "Только 2 места"
  - Социальное доказательство: "500+ агентств"

---

## 🛡️ КОНФИДЕНЦИАЛЬНОСТЬ И БЕЗОПАСНОСТЬ (встроено во все этапы)

### Правила для OMEGA (hardcoded)
1. **Никогда** не называть имя владельца в чате с клиентом
2. **Никогда** не раскрывать MRR, количество клиентов, технический стек
3. **Никогда** не показывать чужие проекты
4. **Всегда** маркировать AI-контент если это реклама (422-ФЗ)
5. **Всегда** предупреждать о сборе данных (GDPR)
6. **Всегда** логгировать попытки несанкционированного доступа
7. **Emergency Stop** — работает всегда, без исключений
8. **PIN-код** для возобновления после Emergency Stop

### Уровни доступа (реализовать в `contextEngine`)
| Роль | Видит | Не видит | Может изменять |
|------|-------|----------|----------------|
| Owner | Всё | — | Всё |
| Admin | Всё кроме финансов владельца | Финансы платформы | Пользователи, модерация |
| Staff | Свои задачи, база знаний | Финансы, чужие задачи | Свои тикеты |
| Client | Свой проект, своя аналитика | Чужие проекты, MRR, стек | Свой контент |
| Guest | Лендинг, демо | Всё остальное | — |

---

## 📊 ПРИОРИТЕТНАЯ ОЧЕРЕДЬ (итоговая)

### Неделя 1–2: Pre-Launch FOMO
1. Waitlist + геймификация
2. Viral Demo Generator
3. Founding Member Program
4. Public Roadmap + голосование
5. Beta Slots Scarcity

### Неделя 3–4: OMEGA Neural
6. Нейронный Граф Знаний
7. Context Engine (Who Am I Talking To?)
8. Privacy Firewall
9. Code Interpreter
10. Vision Core

### Неделя 5–6: OMEGA Autonomy
11. Real-time Search (SerpAPI)
12. Self-Reflection Loop
13. OMEGA Coder (самомодификация)
14. Иерархия Агентов (Director → Leads → Agents)
15. Dream Mode (ночная смена)

### Неделя 7–8: Client Experience
16. Smart Onboarding Wizard
17. One-Click Publish
18. Client Mobile App
19. Smart Templates

### Неделя 9: Performance
20. Virtual Scrolling
21. CDN + Image Optimization
22. Bundle Analyzer
23. Микро-анимации + звук
24. Typography & Colors v2

### После релиза:
25. Watermark
26. Viral Leaderboard
27. OMEGA Challenge
28. Revenue Share
29. Data Intelligence Reports
30. Chain-of-Thought
31. Fine-tuning
32. AI-видео
33. Voice Mode
34. Dynamic Pricing
35. Neuro-Sales

---

## 🔧 ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ (для новых модулей)

### Env-переменные (добавить в Render)
```env
# Search
SERPAPI_KEY=your_key

# Vision
REPLICATE_API_KEY=your_key
ELEVENLABS_API_KEY=your_key

# Neural Graph (если используем Neo4j, иначе in-memory)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Fine-tuning (HuggingFace)
HF_TOKEN=your_token

# Reddit API
REDDIT_CLIENT_ID=your_id
REDDIT_CLIENT_SECRET=your_secret
```

### Новые npm-пакеты
```bash
# Backend
npm install neo4j-driver  # или оставить in-memory graph
npm install isolated-vm   # для sandbox
npm install papaparse     # CSV парсинг
npm install sharp          # Image optimization

# Frontend
npm install react-window @tanstack/react-virtual  # Virtual scrolling
npm install framer-motion  # уже есть, но проверить версию
npm install d3           # Graph visualization
npm install papaparse      # CSV в браузере
npm install @ elevenlabs/elevenlabs-js  # Voice
```

---

## 📝 ПРАВИЛО ПРОВЕРКИ ПЕРЕД СОЗДАНИЕМ (для Kimi)

**Перед каждым новым файлом Kimi ДОЛЖЕН:**

1. Выполнить поиск: `find backend/ frontend/ -name "*filename*" -o -name "*similar*"`
2. Если файл найден — показать его содержимое и предложить diff
3. Если не найден — показать: "Файл не существует. Создаю с нуля."
4. После создания — `node --check` (backend) или `npm run build` (frontend)
5. Записать в `PROGRESS_REPORT.md`:
   ```markdown
   ### [Дата] — [Название задачи]
   - **Файлы**: `path/to/file.js`, `path/to/file2.jsx`
   - **Статус**: ✅ Создано / ✅ Доработано
   - **Проверка**: `node --check` ✅ / `npm run build` ✅
   - **Git**: запушено ✅
   ```

---

## 🎯 ФИНАЛЬНАЯ ЦЕЛЬ

**Через 3 месяца после старта этого плана:**

1. **OMEGA** — лучше ChatGPT для SMM: помнит всё, видит картинки, ищет в интернете, пишет код, самообучается, работает 24/7
2. **Приложение** — не похоже на "сделано ИИ": физика анимаций, звук, кастомный курсор, glassmorphism, spring-эффекты
3. **Клиенты** — влюбляются в onboarding, остаются из-за OMEGA, платят за дополнительные генерации
4. **Владелец** — управляет всем с телефона, получает утренние брифинги, жмёт только "Одобрить"
5. **Бизнес** — растёт через viral watermark, referrals, leaderboard, data reports

**OMEGA становится не инструментом, а партнёром.**

---

*Файл создан: 2026-08-02*
*Версия: 4.0 — Master Plan (единый)*
*Заменяет: POST_RELEASE_ROADMAP.md, OMEGA_MASTER_ROADMAP.md, OMEGA_v5_Blueprint.md, Дополнительные_фичи.md, CONTEXT_v3.0.md*
*Следующее обновление: по мере выполнения этапов*
