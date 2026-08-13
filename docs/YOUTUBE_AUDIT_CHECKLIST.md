# YouTube API Audit Checklist (19.17.6-AUDIT-PREP)

Чек-лист для перевода OAuth-приложения из Testing в Production и прохождения аудита Google.

## 1. Consent screen → Production

- [ ] OAuth consent screen: App name, User support email, Developer contact email заполнены.
- [ ] Логотип приложения загружен (512×512, прозрачный фон).
- [ ] Authorized domains: `aiviral-studio.ru`, `aiviral-backend.onrender.com`.
- [ ] Privacy Policy URL: `https://aiviral-studio.ru/privacy`.
- [ ] Terms of Service URL: `https://aiviral-studio.ru/terms`.
- [ ] Scopes: только `https://www.googleapis.com/auth/youtube` (upload + delete + управление).
- [ ] Test users удалены, статус переведён в **Production**.

## 2. Обоснование scope `auth/youtube`

- **Что делаем:** загрузка видео на канал пользователя (`videos.insert`), удаление видео (`videos.delete`), чтение списка видео (`channels.list`, `playlistItems.list`, `videos.list`), установка обложки (`thumbnails.set`).
- **Почему именно этот scope:** `youtube.upload` не позволяет удалять видео, а задача требует полного управления загруженным контентом (пользователь может удалить видео из кабинета). Один scope `auth/youtube` покрывает все необходимые операции без запроса избыточных прав (каналы/плейлисты/подписки не запрашиваются).
- **Минимальность:** используем только данные, необходимые для выполнения явной команды пользователя (загрузить/удалить видео).

## 3. Demo-video script для Google

Сценарий демонстрационного видео (записать 60–90 секунд, без сокращений):

1. Открыть AI Viral Studio → Настройки → YouTube.
2. Нажать «Подключить YouTube» → Google OAuth → выбрать тестовый аккаунт → разрешить доступ.
3. Вернуться в кабинет, увидеть имя канала и дату подключения.
4. Перейти в Планировщик → секция YouTube.
5. Выбрать 5-секундный MP4, ввести заголовок, описание, теги, выбрать `private`.
6. Нажать «Загрузить» → дождаться успешного ответа с `videoId`.
7. Проверить в YouTube Studio: видео приватное, заголовок/описание совпадают.
8. Вернуться в кабинет → список видео → нажать «Удалить» → confirm.
9. Проверить в YouTube Studio: видео удалено.
10. Нажать «Отключить YouTube» → confirm → токены отозваны.

## 4. Ссылки на документы

- Privacy Policy: `https://aiviral-studio.ru/privacy` (содержит блок Google API Services Limited Use).
- Terms of Service: `https://aiviral-studio.ru/terms`.

## 5. Ожидаемые вопросы Google

- **Зачем delete?** Пользователь управляет своим контентом; удаление возможно только по явному действию с confirm и только своего видео (проверка channelId).
- **Где хранятся токены?** В MongoDB, зашифрованы AES-256-GCM (env `TOKEN_ENCRYPTION_KEY`); в API отдаются только маскированные данные.
- **Передача данных?** Нет. Данные Google не передаются третьим лицам, не продаются, не используются для рекламы.
