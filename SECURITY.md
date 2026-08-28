# Security Policy — AI Viral Studio

## Как сообщить об уязвимости

Пишите на **support@aiviral-studio.ru** с пометкой «SECURITY» в теме.
Пожалуйста, не публикуйте детали до исправления. Отвечаем в течение 48 часов.

## Что защищено (актуально на 2026-08-28, ветка security-hardening)

- **Вебхуки Telegram** — оба бота (owner + client) принимают обновления только с
  заголовком `X-Telegram-Bot-Api-Secret-Token` (env `TELEGRAM_WEBHOOK_SECRET`),
  чужие запросы → 403. `secret_token` передаётся при каждом `setWebhook`,
  включая hot-reload токенов из кабинета.
- **Вебхуки ЮKassa** — перед начислением/возвратом платёж сверяется GET-запросом
  к API ЮKassa (`verifyWebhookNotification`): статус и metadata должны совпасть.
  Подделка → начисление отклонено + алерт владельцу. Оба обработчика
  (`/api/yookassa/webhook`, `/api/payments/webhook[/yookassa]`).
- **Роли и guard'ы** — автотест `backend/scripts/qaSecurityFlow.js` (39 проверок):
  аноним → 401, client → 403 на owner/admin-эндпоинты, staff не может менять
  PlanConfig/рубильники/выдавать роль owner, IDOR-защита чужих данных,
  регрессия `protect._id`.
- **Секреты** — в репозитории нет значений ключей (только плейсхолдеры в
  `*.env.example`); `.gitignore` покрывает `.env*`, `reports/`, планы;
  логи печатают только источник ключа (`source=env/db`), без значений;
  `JWT_SECRET` без fallback в production (process.exit при отсутствии).
- **Rate-limit / антиабуз** — login (10/15 мин), register (5/ч),
  forgot-password (5/ч), support-тикеты (10/15 мин), AI-чат (50/15 мин),
  общий API-лимитер + autoban (>1000 req/мин). Ответ 429 с текстом RU/EN.
  `helmet` + `express-mongo-sanitize` (NoSQL-инъекции) + CORS whitelist
  (только aiviral-studio.ru и preview-домены, без `*`).
- **Мониторинг** — Sentry backend + frontend (DSN из env, без DSN молча off,
  `beforeSend` вырезает PII/секреты). Критичные события (волна 5xx, сбой
  платёжного вебхука, провал guard-теста) → TG-алерт владельцу через owner-бота,
  кулдаун 10 минут на тип события.

## Политика ротации ключей

- Ключи хранятся в Кабинете владельца (MongoDB) или в env хостинга — никогда в git.
- При компрометации: владелец заменяет ключ в Кабинет → API Ключи
  (hot-reload применяет без деплоя) или обновляет env и перезапускает сервис.
- Key Health Monitor автоматически помечает ключ `invalid` при 401/402/403/quota
  и шлёт алерт владельцу; fallback-цепочка провайдеров продолжает работу.
- Ротация рекомендуется не реже раза в квартал и немедленно после любого инцидента.
