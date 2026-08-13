# YouTube API Audit Checklist

Чек-лист для вывода приложения Google из Testing в Production и включения public-загрузок.

## Этап 1 — Подготовка OAuth consent screen
- [ ] App name: AI Viral Studio
- [ ] User support email: указан рабочий email владельца
- [ ] Developer contact email: указан
- [ ] App logo: загружено (1200×1200)
- [ ] Privacy Policy URL: опубликована и доступна без авторизации
- [ ] Terms of Service URL: опубликована и доступна без авторизации
- [ ] Authorized domains: `aiviral-studio.ru` (или актуальный домен)

## Этап 2 — Scopes
- [ ] Запрошен только scope `https://www.googleapis.com/auth/youtube`
- [ ] Sensitive scopes обоснованы (upload videos, manage playlists)
- [ ] В описании scope указано: «Загрузка видео на YouTube из кабинета пользователя»

## Этап 3 — Test users (Testing mode)
Пока приложение не прошло аудит, подключить канал могут только test users (лимит 100).

**Инструкция для владельца:**
1. Открыть [Google Cloud Console](https://console.cloud.google.com/).
2. Выбрать проект с YouTube Data API v3.
3. Перейти: **APIs & Services → OAuth consent screen → Audience**.
4. В разделе **Test users** нажать **+ Add users**.
5. Ввести Gmail клиента (например, `client@gmail.com`).
6. Сохранить. Клиент сможет подключить YouTube через кабинет AI Viral Studio.

**Если клиент видит ошибку `access_denied`:**
- Причина: его Gmail не добавлен в Test users.
- Действие: попросить владельца выполнить шаги выше.

## Этап 4 — Verification
- [ ] Заполнена форма verification в Google Cloud Console
- [ ] Снято видео демонстрации (как пользователь подключает канал и загружает видео)
- [ ] Описание use case: «AI Viral Studio позволяет авторам планировать и публиковать видео на собственный YouTube-канал»
- [ ] Ответ от Google получен (обычно 2–6 недель)

## Этап 5 — После аудита
- [ ] `ENABLE_YOUTUBE_PUBLIC=true` в env (без деплоя, hot-reload через RuntimeConfig)
- [ ] `publishAt` (YouTube-native scheduled publish) активируется автоматически
- [ ] Testing mode → Production в OAuth consent screen
- [ ] Лимит 100 test users снят

## Полезные ссылки
- OAuth consent screen: https://console.cloud.google.com/apis/credentials/consent
- YouTube Data API quota: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
- Verification help: https://support.google.com/cloud/answer/9110914
