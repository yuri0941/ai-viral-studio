# 📘 SOCIAL_SETUP_GUIDE.md
## Пошаговая инструкция по подключению соцсетей к AI Viral Studio
### Для владельца платформы | Создано: 2026-08-04

---

## 🚀 БЫСТРЫЙ СТАРТ (работает сегодня)

### 1. TELEGRAM — 15 минут ⭐
**Стоимость:** Бесплатно | **Работает сразу:** ✅ Да

**Шаг 1.1 — Создать бота:**
1. Открой Telegram, найди `@BotFather`
2. Напиши `/newbot`
3. Придумай имя (например, `AI Viral Studio Bot`) и username (например, `aiviral_bot`)
4. Получи **Bot Token** — выглядит как `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
5. **Сохрани токен** — он понадобится в AI Viral Studio

**Шаг 1.2 — Получить Chat ID:**
1. Найди бота `@userinfobot`
2. Напиши `/start`
3. Получи свой **Chat ID** (число, например `123456789`)
4. Если нужен ID канала/группы:
   - Создай канал/группу
   - Добавь туда своего бота админом
   - Напиши в канал любое сообщение
   - Открой `https://api.telegram.org/bot<ТВОЙ_ТОКЕН>/getUpdates`
   - Найди `"chat":{"id":-1001234567890` — это Chat ID (начинается с `-100`)

**Шаг 1.3 — Подключить в AI Viral Studio:**
1. Зайди в Settings → Integrations → Telegram
2. Вставь **Bot Token** и **Chat ID**
3. Нажми "Подключить" → статус ✅ Подключено
4. Нажми "Тест" → в канал придёт тестовое сообщение

**Проверка:** Создай пост в Scheduler → выбери Telegram → "Опубликовать сейчас" → пост ушёл в канал.

---

### 2. VK — 20 минут ⭐⭐
**Стоимость:** Бесплатно | **Работает сразу:** ✅ Да

**Шаг 2.1 — Создать приложение VK:**
1. Перейди на [vk.com/dev](https://vk.com/dev)
2. Нажми "Создать приложение" (или "Мои приложения" → "Создать")
3. Выбери тип: **Standalone-приложение**
4. Название: `AI Viral Studio`
5. Подтверди через SMS
6. Открой настройки приложения → "Настройки"

**Шаг 2.2 — Получить ключи:**
1. Скопируй **App ID** (число, например `12345678`)
2. Скопируй **Защищённый ключ** (Secret)
3. В настройках добавь **Доверенный redirect URI**:
   ```
   https://aiviral-studio.ru/integrations/vk/callback
   ```
   (или твой домен)

**Шаг 2.3 — Добавить в AI Viral Studio:**
1. В `.env` на Render добавь:
   ```
   VK_APP_ID=12345678
   VK_APP_SECRET=your_secret_key
   ```
2. Перезапусти сервер (Clear Build Cache & Deploy)
3. В Settings → Integrations → VK нажми "Подключить"
4. Откроется окно VK → введи логин/пароль → "Разрешить"
5. Вернёшься в AI Viral Studio → статус ✅ Подключено

**Проверка:** Создай пост → выбери VK → "Опубликовать" → пост на стене.

---

### 3. DISCORD — 10 минут ⭐
**Стоимость:** Бесплатно | **Работает сразу:** ✅ Да

**Шаг 3.1 — Создать Webhook:**
1. Открой Discord (веб или приложение)
2. Зайди в свой сервер → выбери канал (например, `#general`)
3. Правый клик на канал → "Настройки канала" → "Интеграции" → "Вебхуки"
4. Нажми "Создать вебхук"
5. Назови: `AI Viral Studio`
6. Скопируй **Webhook URL** — выглядит как:
   ```
   https://discord.com/api/webhooks/123456789/abc-def-ghi
   ```

**Шаг 3.2 — Подключить:**
1. В AI Viral Studio Settings → Integrations → Discord
2. Вставь Webhook URL
3. Нажми "Подключить"
4. Нажми "Тест" → в канал придёт сообщение

**Проверка:** Создай пост → выбери Discord → "Опубликовать" → сообщение в канале.

---

## ⏳ ОЖИДАНИЕ МОДЕРАЦИИ (2-4 недели)

### 4. LINKEDIN — 2-4 недели ⭐⭐⭐
**Стоимость:** Бесплатно | **Работает сразу:** ⚠️ Нет, нужен Product Review

**Шаг 4.1 — Создать приложение:**
1. Перейди на [developer.linkedin.com](https://developer.linkedin.com)
2. Нажми "Create app"
3. Название: `AI Viral Studio`
4. Страница LinkedIn: создай страницу компании (если нет)
5. Согласие на Legal terms

**Шаг 4.2 — Получить ключи:**
1. Открой "Auth" → скопируй **Client ID** и **Client Secret**
2. Добавь **Authorized redirect URLs**:
   ```
   https://aiviral-studio.ru/integrations/linkedin/callback
   ```
3. В "Products" добавь:
   - `Sign In with LinkedIn using OpenID Connect`
   - `Share on LinkedIn`

**Шаг 4.3 — Product Review:**
1. Перейди в "Products" → найди `Share on LinkedIn`
2. Нажми "Request access"
3. Заполни форму:
   - Use case: "Our users are content creators who want to publish professional posts to their LinkedIn profiles through our SMM platform"
   - App demo: дай ссылку на AI Viral Studio + скриншоты
4. Жди одобрения (2-4 рабочих дня, иногда неделя)

**Шаг 4.4 — После одобрения:**
1. Добавь `LINKEDIN_CLIENT_ID` и `LINKEDIN_CLIENT_SECRET` в Render env
2. Перезапусти сервер
3. Клиенты смогут подключать LinkedIn

---

### 5. PINTEREST — 1-2 недели ⭐⭐⭐
**Стоимость:** Бесплатно | **Работает сразу:** ⚠️ Нет, нужен App Review

**Шаг 5.1 — Создать приложение:**
1. Перейди на [developers.pinterest.com](https://developers.pinterest.com)
2. Нажми "Create app"
3. Название: `AI Viral Studio`
4. Добавь описание и логотип

**Шаг 5.2 — Получить ключи:**
1. Скопируй **App ID** и **App Secret**
2. Добавь **Redirect URI**:
   ```
   https://aiviral-studio.ru/integrations/pinterest/callback
   ```
3. Запроси доступ к API v5 (OAuth + публикация пинов)

**Шаг 5.3 — App Review:**
1. Заполни форму с описанием use case
2. Жди одобрения (1-2 недели)

---

### 6. FACEBOOK + INSTAGRAM — 2-4 недели ⭐⭐⭐⭐
**Стоимость:** Бесплатно | **Работает сразу:** ⚠️ Нет, нужен Business Verification + App Review

**Шаг 6.1 — Facebook for Developers:**
1. Перейди на [developers.facebook.com](https://developers.facebook.com)
2. Создай приложение → тип: **Business**
3. Название: `AI Viral Studio`
4. Добавь продукт: **Instagram Graph API**

**Шаг 6.2 — Business Verification:**
1. Перейди в [business.facebook.com](https://business.facebook.com)
2. Создай Business Manager (если нет)
3. Подтверди бизнес:
   - Нужен ИП или ООО
   - Загрузи документы (свидетельство о регистрации)
   - Подтверди домен (добавь `aiviral-studio.ru` в Business Manager)
4. Жди верификации (2-4 недели, иногда быстрее)

**Шаг 6.3 — App Review:**
1. В Facebook Developers → "App Review" → "Start a submission"
2. Запроси разрешения:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
3. Заполни use case + скринкаст (видео, как пользователь публикует пост)
4. Жди одобрения (1-2 недели после Business Verification)

**Шаг 6.4 — Instagram Business Account:**
1. Клиент должен иметь Instagram Business Account (не личный!)
2. Подключить Instagram к Facebook Business Manager
3. Тогда AI Viral Studio сможет публиковать от имени этого аккаунта

**Важно:** Без Business Verification Facebook не даст публиковать. Но код в AI Viral Studio уже готов — просто кнопка будет неактивна до одобрения.

---

### 7. TIKTOK — 2-4 недели ⭐⭐⭐⭐
**Стоимость:** Бесплатно | **Работает сразу:** ⚠️ Нет, строгий отбор

**Шаг 7.1 — Регистрация разработчика:**
1. Перейди на [developers.tiktok.com](https://developers.tiktok.com)
2. Создай аккаунт разработчика
3. Заполни форму: название компании, сайт, use case

**Шаг 7.2 — Создать приложение:**
1. Нажми "Create app"
2. Название: `AI Viral Studio`
3. Добавь redirect URI:
   ```
   https://aiviral-studio.ru/integrations/tiktok/callback
   ```
4. Запроси доступ к **Content Publishing API**

**Шаг 7.3 — Ожидание одобрения:**
- TikTok строго отбирает. Нужен рабочий продукт, политика конфиденциальности, terms of service
- Жди 2-4 недели
- Если отказали — можно подать повторно через месяц

---

### 8. YOUTUBE — 1-2 недели ⭐⭐⭐
**Стоимость:** Бесплатно | **Работает сразу:** ⚠️ Нет, нужен OAuth consent screen

**Шаг 8.1 — Google Cloud Console:**
1. Перейди на [console.cloud.google.com](https://console.cloud.google.com)
2. Создай проект: `AI Viral Studio`
3. Включи API: **YouTube Data API v3**

**Шаг 8.2 — OAuth consent screen:**
1. "APIs & Services" → "OAuth consent screen"
2. Выбери "External" (для всех пользователей)
3. Заполни:
   - App name: `AI Viral Studio`
   - User support email: твой email
   - Developer contact: твой email
4. Добавь scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`
5. Добавь test users (если статус "Testing")

**Шаг 8.3 — Получить ключи:**
1. "Credentials" → "Create credentials" → "OAuth client ID"
2. Тип: **Web application**
3. Name: `AI Viral Studio Web`
4. Authorized redirect URIs:
   ```
   https://aiviral-studio.ru/integrations/youtube/callback
   ```
5. Скопируй **Client ID** и **Client Secret**

**Шаг 8.4 — Публикация (необязательно сразу):**
- Если оставить статус "Testing" — работает для 100 test users
- Для всех пользователей — нужно "Publish app" (проверка Google, 1-2 недели)

---

## ❌ ПОКА НЕ ПОДКЛЮЧАЕМ

### 9. TWITTER/X — $100/мес
**Причина:** Twitter API v2 Free позволяет только ЧИТАТЬ посты. Для публикации нужен **Basic** ($100/мес) или **Pro** ($5000/мес).

**Решение:**
- Пока не подключаем
- Когда появятся платящие клиенты — добавим как Premium-фичу
- Или используем обходной путь: клиент копирует текст вручную (кнопка "Скопировать для Twitter")

---

## 📋 ИТОГОВЫЙ ЧЕК-ЛИСТ

| # | Платформа | Статус | Действие | Срок |
|---|-----------|--------|----------|------|
| ☐ 1 | Telegram | ✅ Готово | Создать бота, получить токен | Сегодня |
| ☐ 2 | VK | ✅ Готово | Создать Standalone app | Сегодня |
| ☐ 3 | Discord | ✅ Готово | Создать Webhook | Сегодня |
| ☐ 4 | YouTube | ⚠️ Код готов | Google Cloud Console, OAuth | Неделя |
| ☐ 5 | LinkedIn | ⚠️ Код готов | Product Review | 2-4 недели |
| ☐ 6 | Pinterest | ⚠️ Код готов | App Review | 1-2 недели |
| ☐ 7 | Facebook | ⚠️ Код готов | Business Verification | 2-4 недели |
| ☐ 8 | Instagram | ⚠️ Код готов | Через Facebook Graph API | 2-4 недели |
| ☐ 9 | TikTok | ⚠️ Код готов | Content API approval | 2-4 недели |
| ☐ 10 | Twitter/X | ❌ Нет | $100/мес, пока пропускаем | — |

---

## 💡 СОВЕТ

**Не жди, пока всё подключишь.** Запускай с Telegram + VK + Discord. Это 3 платформы, которые работают сегодня. Клиенты уже будут получать ценность.

Остальные добавляй по мере прохождения модерации. Код в AI Viral Studio уже готов — просто кнопки станут активными, когда ты вставишь API ключи в `.env`.

---

*Инструкция создана: 2026-08-04*  
*Версия: 1.0 для AI Viral Studio v5.1*  
*Файл: SOCIAL_SETUP_GUIDE.md*
