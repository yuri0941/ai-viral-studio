# CHAT_CONTEXT — AI Viral Studio (чаты, боты, формат ответов AI)

## Версия: v9.9.19.3-TG-BOTS-FIX | Дата: 2026-08-10

## ⚠️ ГЛАВНОЕ ПРАВИЛО: chatWithAI() возвращает ОБЪЕКТ
`chatWithAI(message, history, lang, options)` → `{ success, reply, provider, usage, ... }` — НИКОГДА строку.
Любое использование результата как строки без извлечения = crash (`slice is not a function`) или сырой JSON в чате.

### Решение: extractText()
`backend/services/aiService.js` экспортирует `extractText(response)`:
- строка → как есть
- объект → `reply || response || content || text || message` (включая nested `content.content`)
- null/undefined → `''`

**Правило:** любой текст от chatWithAI — только через `extractText()`. Покрыто 45+ файлов (боты, публикаторы, factory, predictive, repurposing, boardroom, concierge и т.д.).

## Telegram-боты

### Owner Bot (@aiviral_alerts_bot) — backend/services/ownerBot.js
- Команды: /start /menu /status /stats /tickets /omega /exec /feature /improve /factory /stop /resume /report /post /posttest /channel /calendar /adprice /discount /video /adorders
- /post [тема] — генерация → публикация в канал → ответ со ССЫЛКОЙ на пост (t.me/<channel>/<messageId>)
- /posttest — скрытая диагностика канала: тестовый пост + ссылка или понятная ошибка (бот не админ / нет chat_id / невалидный токен)
- /stop — РЕАЛЬНЫЙ emergency stop (setEmergencyStop из routes/admin.js), /resume — снятие
- Панель (callback_query): owner:tickets/conversations/adorders/prices — реальные данные БД; owner:stats — реальные подписчики+тикеты+заявки; owner:toggle — реальный toggle AI; answerCallbackQuery на всех кнопках
- singleton + deleteWebhook перед polling/webhook, игнор 409
- Голосовые → Whisper STT (Groq → OpenAI) → текстовый поток

### Client Bot (@aiviral_omega_bot) — backend/services/omegaBot.js
- Свободный текст → AI-диалог (chatWithAI + extractText), НЕ меню
- Churn Guard (OMEGACHURN30), Auto-Escalation → тикет, Context Memory 10 сообщений
- /start <user_id> — привязка telegramId к аккаунту (Telegram Connect из профиля)
- Privacy Firewall: паттерны запрещённых тем для клиентов
- Голосовые → Whisper STT, без ключа — вежливая заглушка

### Канал @aiviralstudio
- Публикатор: telegramChannelManager.publishToChannel — hot-reload токена/канала (env → cache → MongoDB), ссылка-доказательство, friendly-ошибки
- AUTO-PUBLISH (autoPublisher.js, 5 мин): platforms пуст → пост уходит в Telegram-канал владельца; 0 платформ = warning + ОДИН алерт владельцу
- Логи: `[AUTO-PUBLISH] to=channel result=ok id=<messageId>`

## Web-чат (OmegaChat)
- Backend: POST /api/omega/chat → omegaController → chatWithAI → ответ `{ data: { response } }`
- Privacy Firewall фильтрует по роли (ACCESS_MATRIX, ROLE_INSTRUCTIONS в ai/omega/contextEngine.js)
- Smart Quota: info/help-запросы не тратят токены (omegaController → consumeGeneration isInfoQuery)

## Известные грабли (не повторять)
1. chatWithAI как строка → crash/JSON в чате. Только extractText.
2. options-объект вторым аргументом (вместо history) — сигнатура (message, history, lang, options).
3. JSON.parse на сыром ответе — сначала extractText + strip ```json fences + regex-извлечение `{...}`.
4. Дубли onText-регулярок в ботах — все совпавшие handler'ы срабатывают (дубли ответов).
5. Мок-цифры в ответах владельцу запрещены — реальные данные БД или честное «нет данных».
