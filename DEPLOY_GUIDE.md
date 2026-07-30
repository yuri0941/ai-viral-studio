# DEPLOY GUIDE — AI Viral Studio (kilo2)

> Пошаговая инструкция по ручному деплою проекта на MongoDB Atlas + Render + Vercel + UptimeRobot.  
> Backend и frontend НЕ деплоятся автоматически — вы создаёте аккаунты, вносите ключи и запускаете сервисы вручную по этой инструкции.

---

## 1. Чек-лист подготовки кода к production

Перед деплоем проверьте и, если нужно, исправьте следующее в локальном репозитории `D:\kilo2\`.

### 1.1. `backend/.env` (не коммитится!)

Файл `backend/.env` уже должен существовать и содержать минимальный набор переменных. Перед продом проверьте:

| Переменная | Проверка | Пример/значение |
|------------|----------|-----------------|
| `MONGO_URI` | Строка подключения к MongoDB Atlas (см. раздел 2) | `mongodb+srv://user:pass@cluster.mongodb.net/aiviral?retryWrites=true&w=majority&appName=Cluster0` |
| `JWT_SECRET` | Минимум 32 случайных символа | `your-very-long-random-secret-min-32-chars` |
| `PORT` | Должен быть `5000` или не задан (Render подставит свой) | `5000` |
| `NODE_ENV` | Для продакшена `production` | `production` |
| `HUGGINGFACE_API_KEY` | Резервный AI-провайдер | `hf_...` |
| `CLOUDFLARE_API_KEY` | Резервный AI-провайдер | `cfut_...` |
| `CLOUDFLARE_ACCOUNT_ID` | Резервный AI-провайдер | `1e9c...` |
| `YOOKASSA_SHOP_ID` | Тестовый/боевой ID магазина ЮKassa | `123456` |
| `YOOKASSA_SECRET_KEY` | Тестовый/боевой секретный ключ ЮKassa | `test_...` или `live_...` |
| `YOOKASSA_WEBHOOK_SECRET` | Секрет для проверки подписи webhook (опционально) | `random-string` |
| `EMAIL_HOST` | SMTP-сервер | `smtp.yandex.ru` |
| `EMAIL_PORT` | Порт SMTP | `465` |
| `EMAIL_USER` | Почтовый ящик отправителя | `contact@aiviral.studio` |
| `EMAIL_PASS` | Пароль/токен приложения | `app-password` |
| `OWNER_EMAIL` | Fallback email для юр. уведомлений | `contact@aiviral.studio` |
| `OWNER_NAME` | Fallback имя оператора | `Иванов Иван Иванович` |
| `FRONTEND_URL` | URL фронтенда на Vercel | `https://aiviral-studio.vercel.app` |

**Важно:**
- `.env` должен быть в `.gitignore`.
- Никогда не коммитьте реальные ключи в GitHub.
- Для Render переменные будут введены вручную в веб-интерфейсе (раздел 3).

### 1.2. `frontend/.env` и `frontend/.env.production`

| Переменная | Проверка | Пример |
|------------|----------|--------|
| `VITE_API_URL` | URL backend на Render + `/api` | `https://aiviral-backend.onrender.com/api` |
| `VITE_APP_URL` | URL frontend на Vercel | `https://aiviral-studio.vercel.app` |

**Важно:**
- Фронтенд должен обращаться к backend по HTTPS.
- В коде используются относительные пути `/api/...` — убедитесь, что в production эти пути подменяются `VITE_API_URL`.
- В Vercel переменные будут введены вручную (раздел 4).

### 1.3. CORS

В `backend/server.js` должна быть настройка CORS, разрешающая запросы с `FRONTEND_URL`:

```js
import cors from 'cors'

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
```

Если в `server.js` CORS настроен как `origin: '*'`, для продакшена с cookies/JWT это может вызвать проблемы. Лучше явно указать `FRONTEND_URL`.

### 1.4. PORT

В `backend/server.js` порт должен браться из `process.env.PORT`:

```js
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server on ${PORT}`))
```

Render подставляет свой `PORT` (обычно 10000), поэтому не хардкодьте `5000` в проде.

### 1.5. API URL на фронтенде

В `frontend/src/services/api.js` (или где используется axios/fetch) должен быть базовый URL:

```js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
```

### 1.6. package.json scripts

**backend/package.json:**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

На Render в `Start Command` укажите `node server.js` (или `npm start`).

**frontend/package.json:**
```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  }
}
```

На Vercel в `Build Command` укажите `npm run build`.

### 1.7. Финальные локальные проверки перед пушем

```bash
# В папке backend
npm install
node --check server.js
npm start
# Откройте http://localhost:5000/health — должен вернуть {"status":"ok"}

# В папке frontend
npm install
npm run build
# Должен появиться папка frontend/dist без ошибок
```

Если всё прошло — запушьте код в GitHub (ветка `main`).

```bash
git add .
git commit -m "Pre-release: P10 + legal shield ready"
git push origin main
```


---

## 2. MongoDB Atlas — создание кластера M0 (Free Tier)

> Если кластер уже создан, пропустите создание и сразу перейдите к шагу 2.7 — скопируйте `MONGO_URI` и добавьте в Render.

### 2.1. Регистрация

1. Откройте [https://www.mongodb.com/products/platform/cloud](https://www.mongodb.com/products/platform/cloud) (или [https://cloud.mongodb.com](https://cloud.mongodb.com)).
2. Нажмите **Start Free** / **Sign In**.
3. Создайте аккаунт через Google/GitHub/email.

### 2.2. Создание организации и проекта

1. После входа в MongoDB Atlas нажмите **New Organization** (или используйте существующую).
2. Дайте название, например `AI-Viral-Studio`.
3. Внутри организации создайте **New Project** — назовите `aiviral`.
4. В проекте нажмите **Create** → **Cluster**.

### 2.3. Выбор бесплатного кластера M0

1. В разделе **Create a Cluster** выберите план **M0** (Shared RAM, 512 MB Storage, Free Forever).
   - Подпись: `FREE forever. No credit card required.`
2. Выберите провайдера: **AWS**, **Google Cloud** или **Azure**.
3. Регион: ближайший к вашим пользователям (например, `Frankfurt (eu-central-1)` для Европы/РФ, `N. Virginia (us-east-1)` для США).
4. В разделе **Name** задайте имя кластера, например `Cluster0`.
5. Нажмите **Create Deployment**.
   - Ждите 3–5 минут, пока кластер не станет активным (статус зелёный).

### 2.4. Создание пользователя базы данных

1. В левом меню проекта выберите **Database Access**.
2. Нажмите **Add New Database User**.
3. Способ аутентификации: **Password**.
4. **Username:** `aiviral_user` (или любой).
5. **Password:** сгенерируйте сложный пароль (например, в MongoDB Atlas есть кнопка **Generate Password**). Сохраните его — он понадобится для `MONGO_URI`.
6. **Database User Privileges:** выберите **Read and write to any database** (роль `readWriteAnyDatabase`).
7. Нажмите **Add User**.

### 2.5. Настройка доступа по IP (Network Access)

1. В левом меню выберите **Network Access**.
2. Нажмите **Add IP Address**.
3. Выберите **Allow Access from Anywhere** → в поле появится `0.0.0.0/0`.
   - Это нужно для Render, потому что у Render динамические IP-адреса.
4. В поле **Description** можно написать `Render`.
5. Нажмите **Confirm**.

> **Безопасность:** в продакшене можно ограничить IP Render, но на бесплатном тарифе Render IP меняются, поэтому `0.0.0.0/0` — самый простой вариант. Убедитесь, что пароль пользователя БД сложный.

### 2.6. Получение строки подключения (MONGO_URI)

1. Перейдите в **Database** → кластер **Cluster0**.
2. Нажмите кнопку **Connect**.
3. В появившемся окне выберите **Drivers**.
4. В списке драйверов выберите **Node.js**.
5. Версия: **5.5 or later** (или актуальная).
6. Скопируйте строку подключения. Она выглядит так:

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ai_viral_studio?retryWrites=true&w=majority&appName=Cluster0
```

7. Замените `<username>` и `<password>` на реальные значения из шага 2.4.
8. В конце строки укажите имя базы данных: `ai_viral_studio` (после `.net/` и перед `?`).

Пример итоговой строки:

```
mongodb+srv://aiviral_user:Ydzwo4IevmrhDE7s@cluster0.028ds1h.mongodb.net/ai_viral_studio?retryWrites=true&w=majority&appName=Cluster0
```

### 2.7. Куда вставить MONGO_URI

- **Render** → Environment Variables → `MONGO_URI` (см. раздел 3.7).
- **Локально** → `backend/.env` (для теста):
  ```env
  MONGO_URI=mongodb+srv://aiviral_user:Ydzwo4IevmrhDE7s@cluster0.028ds1h.mongodb.net/ai_viral_studio?retryWrites=true&w=majority&appName=Cluster0
  ```

### 2.8. Проверка подключения

После деплоя backend на Render откройте логи Render (`Logs` → `Deploy/Runtime`).  
Вы должны увидеть строку:

```
✅ MongoDB Connected: atlas
```

Если ошибка `MongoServerError: bad auth` — проверьте пароль в `MONGO_URI`.  
Если ошибка `connection refused` — проверьте `Network Access` (должно быть `0.0.0.0/0`).

