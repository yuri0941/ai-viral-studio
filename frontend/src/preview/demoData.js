// [DESIGN-LAB] Демо-данные для /preview/* — реалистичные, в ₽. НЕ из API: лаборатория публична.
export const demoQuota = {
  used: 382,
  limit: 500,
  remaining: 118,
  plan: 'Pro',
  messageCost: 2, // кредитов за 1 сообщение OMEGA
}

export const demoChatMessages = [
  { role: 'user', text: 'Привет! Нужен пост про запуск Reels-курса на этой неделе', time: '12:02' },
  {
    role: 'assistant',
    text: 'Привет! Вот 3 хука под запуск:\n1. «Почему ваши Reels смотрят 200 человек, а не 200 000»\n2. «7 ошибок первой недели курса (я сделала все)»\n3. «До/после: ученица набрала 12к подписчиков за 21 день»\n\nСобрать полный пост по хуку №3 с CTA на лендинг?',
    time: '12:02',
  },
  { role: 'user', text: 'Давай по третьему, добавь дедлайн записи', time: '12:04' },
  {
    role: 'assistant',
    text: 'Готово. Пост «До/после: 12к за 21 день» с дедлайном «запись до воскресенья 23:59» сохранён в черновики Планировщика на завтра 14:00 — лучший слот по вашей аудитории.',
    time: '12:05',
  },
]

export const demoQuickActions = [
  '🪝 3 хука для ниши',
  '📅 Пост в планировщик',
  '🎬 Сценарий Reels',
  '📊 Разбор конкурента',
]

export const demoBalance = {
  credits: 350,
  creditsLimit: 500,
  spentThisMonth: 1240, // ₽
  savedThisMonth: 3860, // ₽ vs ручная работа
  generationsThisMonth: 96,
}

export const demoPayments = {
  topups: [
    { id: 'p1', date: '03.09.2026', sum: 990, status: 'paid', method: 'ЮKassa · карта *4382' },
    { id: 'p2', date: '21.08.2026', sum: 490, status: 'paid', method: 'ЮKassa · СБП' },
    { id: 'p3', date: '02.08.2026', sum: 990, status: 'refund14', method: 'ЮKassa · карта *4382' },
    { id: 'p4', date: '28.07.2026', sum: 1490, status: 'paid', method: 'ЮKassa · карта *4382' },
  ],
  charges: [
    { id: 'c1', date: '04.09.2026', sum: 240, status: 'paid', method: 'Пакет 1000 кредитов' },
    { id: 'c2', date: '01.09.2026', sum: 2, status: 'pending', method: 'OMEGA: генерация поста' },
    { id: 'c3', date: '31.08.2026', sum: 6, status: 'paid', method: 'OMEGA: сценарий видео' },
    { id: 'c4', date: '30.08.2026', sum: 2, status: 'paid', method: 'OMEGA: анализ ниши' },
    { id: 'c5', date: '29.08.2026', sum: 4, status: 'paid', method: 'OMEGA: 3 хука + пост' },
  ],
}

export const demoPaymentStatus = {
  paid: { label: 'Оплачено', tone: 'success' },
  refund14: { label: 'Возврат 14д', tone: 'warning' },
  pending: { label: 'Ожидает', tone: 'muted' },
}

// ——— Кабинет рекламодателя ———
export const demoCampaigns = [
  { id: 'camp1', name: 'Reels-курс · холодный трафик', status: 'active', budget: 15000, spent: 8420, reach: 48200, clicks: 2410, ctr: 5.0, cpc: 3.49, leads: 168, cpl: 50.1 },
  { id: 'camp2', name: 'Виральный хук · ретаргет', status: 'active', budget: 8000, spent: 5130, reach: 19800, clicks: 1330, ctr: 6.7, cpc: 3.86, leads: 121, cpl: 42.4 },
  { id: 'camp3', name: 'Автоворонка · вебинар', status: 'paused', budget: 12000, spent: 12000, reach: 61400, clicks: 3050, ctr: 5.0, cpc: 3.93, leads: 240, cpl: 50.0 },
  { id: 'camp4', name: 'Кейс «12к за 21 день»', status: 'active', budget: 6000, spent: 2210, reach: 27600, clicks: 1710, ctr: 6.2, cpc: 1.29, leads: 96, cpl: 23.0 },
  { id: 'camp5', name: 'Тест креативов A/B', status: 'draft', budget: 3000, spent: 0, reach: 0, clicks: 0, ctr: 0, cpc: 0, leads: 0, cpl: 0 },
]

export const demoKpis = {
  spendToday: 1874, // ₽
  spendDelta: +12.4, // % к вчера
  leadsToday: 23,
  leadsDelta: +8.1,
  cplAvg: 41.4, // ₽
  cplDelta: -6.3,
  ctrAvg: 5.6, // %
  ctrDelta: +0.4,
}

export const demoSpendSeries = [420, 380, 510, 470, 620, 590, 740, 690, 810, 760, 920, 870, 1040, 980, 1150, 1090, 1230, 1180, 1320, 1260, 1410, 1350, 1500, 1440, 1590, 1520, 1680, 1610, 1770, 1874]

export const demoFunnel = [
  { stage: 'Показы', value: 136000, pct: 100 },
  { stage: 'Клики', value: 8500, pct: 6.3 },
  { stage: 'Лиды', value: 625, pct: 0.46 },
  { stage: 'Оплаты', value: 74, pct: 0.054 },
]

export const demoCalendar = [
  { day: 'Пн', items: [{ time: '14:00', title: 'Пост «До/после»', type: 'post' }] },
  { day: 'Вт', items: [{ time: '12:00', title: 'Reels «7 ошибок»', type: 'video' }, { time: '19:00', title: 'Сторис-опрос', type: 'story' }] },
  { day: 'Ср', items: [{ time: '14:00', title: 'Кейс ученицы', type: 'post' }] },
  { day: 'Чт', items: [{ time: '11:00', title: 'Запуск A/B теста', type: 'ads' }] },
  { day: 'Пт', items: [{ time: '14:00', title: 'Вебинар-анонс', type: 'post' }, { time: '20:00', title: 'Прямой эфир', type: 'live' }] },
  { day: 'Сб', items: [] },
  { day: 'Вс', items: [{ time: '23:59', title: 'Дедлайн записи', type: 'deadline' }] },
]

export const demoTicker = [
  '12:41 · Клик +34 · «Кейс 12к»',
  '12:38 · Лид #626 · 41 ₽',
  '12:31 · CTR «Ретаргет» вырос до 6.9%',
  '12:24 · Оплата 990 ₽ · воронка «вебинар»',
  '12:17 · Клик +28 · «Reels-курс»',
  '12:09 · CPL «Кейс» снизился до 23 ₽',
  '12:02 · Лид #625 · 44 ₽',
]

export const demoAiDiagnosis = [
  { tone: 'success', title: '«Кейс 12к за 21 день» — лучший CPL 23 ₽', text: 'CPL на 44% ниже среднего по кабинету. Рекомендация: перелейте 20% бюджета из «Вебинара» (пауза, CPL 50 ₽).' },
  { tone: 'warning', title: '«Ретаргет» упирается в частоту', text: 'Частота 3.8 при охвате 19.8к — креатив пригорает. Обновите хук или расширьте аудиторию.' },
  { tone: 'info', title: 'Слот 14:00 — ваш пик', text: 'Клики из слота 14:00 дают CPL на 31% дешевле. Планировщик уже предлагает его для постов.' },
]

// ——— Рекламные слоты ———
export const demoAdSlots = {
  chatBanner: { brand: 'Reels Academy', title: 'Курс «Вирусные Reels за 21 день»', cta: 'Забрать со скидкой −30%', note: 'Реклама · 18+' },
  sidebar: { brand: 'SMM-интенсив', title: '10 готовых контент-планов', cta: 'Скачать бесплатно', note: 'Реклама' },
  mobilePlate: { brand: 'Reels Academy', title: '−30% на курс до воскресенья', cta: 'Подробнее', note: 'Реклама' },
}

// ——— Студия ———
export const demoStudioTools = [
  { id: 'hooks', icon: '🪝', name: 'Хуки', desc: '3 цепляющих первых кадра', cost: 2 },
  { id: 'post', icon: '📝', name: 'Пост', desc: 'Текст + CTA под площадку', cost: 2 },
  { id: 'script', icon: '🎬', name: 'Сценарий Reels', desc: 'Тайминги, ракурсы, текст', cost: 6 },
  { id: 'cover', icon: '🖼', name: 'Обложка', desc: 'Визуал под хук', cost: 4 },
  { id: 'analyze', icon: '📊', name: 'Разбор ниши', desc: 'Конкуренты и тренды', cost: 3 },
  { id: 'calendar', icon: '📅', name: 'Контент-неделя', desc: '7 постов в планировщик', cost: 8 },
  { id: 'voice', icon: '🎙', name: 'Озвучка', desc: 'Диктор для Reels', cost: 5 },
  { id: 'repurpose', icon: '♻️', name: 'Репакинг', desc: '1 видео → 5 форматов', cost: 7 },
]

export const fmtRub = (n) => `${Number(n).toLocaleString('ru-RU')} ₽`

// ——— Студия: OMEGA Control (4 контура, живые статусы) ———
export const demoOmegaControl = [
  { id: 'autopost', icon: '📅', name: 'Автопостинг', status: 'on', statusLabel: 'включён · слот 14:00' },
  { id: 'week', icon: '🗓', name: 'Контент-неделя', status: 'working', statusLabel: 'собирает пост 4/7' },
  { id: 'trends', icon: '📈', name: 'Мониторинг трендов', status: 'paused', statusLabel: 'пауза' },
  { id: 'comments', icon: '💬', name: 'Ответы в комментарии', status: 'on', statusLabel: 'включён · 12 ответов сегодня' },
]

export const demoOmegaControlStatus = {
  on: { dot: 'bg-emerald-500', label: 'работает' },
  working: { dot: 'bg-[var(--primary)] animate-pulse', label: 'в процессе' },
  paused: { dot: 'bg-amber-500', label: 'пауза' },
}

// ——— Студия: контур постов. Пост = утверждённый вариант 1:1 ———
export const demoPostVariants = [
  {
    id: 1,
    hook: '«До/после: 12к за 21 день»',
    text: 'Ученица набрала 12 000 подписчиков за 21 день — без бюджета и ботов.\n\nЧто сработало: 1 хук в первые 1.5 секунды, рубрика «ошибка дня», публикация в 14:00.\n\nРазобрали весь путь на курсе «Вирусные Reels за 21 день». Запись до воскресенья 23:59.',
    hashtags: ['#reels', '#продвижение', '#smm', '#блогинг', '#кейс'],
    cta: 'Записаться со скидкой −30%',
    link: 'aiviral-studio.ru/r/reels21',
  },
  {
    id: 2,
    hook: '«7 ошибок первой недели»',
    text: '7 ошибок, которые я сделала в первую неделю курса (сделала все).\n\nГлавная — снимать «в стол» вместо публикации каждый день. Алгоритм любит регулярность, а не идеал.\n\nПолный разбор — на бесплатном вебинаре в пятницу 20:00.',
    hashtags: ['#reels', '#ошибки', '#контент', '#smm'],
    cta: 'Место на вебинар',
    link: 'aiviral-studio.ru/r/webinar',
  },
  {
    id: 3,
    hook: '«Почему смотрят 200, а не 200 000»',
    text: 'Почему ваши Reels смотрят 200 человек, а не 200 000.\n\nДело не в алгоритме: первые 1.5 секунды решают всё. Показываю 3 хука, которые подняли удержание с 18% до 61%.\n\nСохраните и проверьте на своём следующем ролике.',
    hashtags: ['#reels', '#хуки', '#удержание', '#блогинг'],
    cta: '3 хука в PDF бесплатно',
    link: 'aiviral-studio.ru/r/hooks',
  },
]

export const demoPostSlot = 'завтра · 14:00 (пик вашей аудитории)'

// ——— Глобальное левое меню: 100% паритет с AppSidebar (OWNER_GROUPS), демо — пункты не ведут в прод ———
export const demoMenuGroups = [
  {
    id: 'overview', title: 'ОБЗОР',
    items: [
      { label: 'Dashboard', icon: '📊' },
      { label: 'Ω OMEGA', icon: '🚀', badge: 'AI' },
      { label: '📊 Аналитика', icon: '📈' },
      { label: '🏭 Project Factory', icon: '🏭' },
    ],
  },
  {
    id: 'omega', title: 'OMEGA',
    items: [
      { label: 'Ω OMEGA Core', icon: '🧠' },
      { label: '🧠 Нейросеть', icon: '🧠' },
      { label: '🧠 Self-Optimize', icon: '⚙️' },
      { label: '💾 Память', icon: '💾' },
      { label: '💻 DevStudio', icon: '💻' },
      { label: '🌙 Dream Mode', icon: '🌙' },
      { label: '🏛 Совет', icon: '🏛' },
      { label: '🥊 AI vs Human', icon: '🥊' },
      { label: '💰 OMEGA Finance', icon: '💰' },
      { label: '🧠 OMEGA Skills', icon: '🧠' },
      { label: '🗄️ OMEGA Memory', icon: '🗄️' },
      { label: '🤖 AI Агенты', icon: '🤖' },
      { label: '🧠 OMEGA Supreme', icon: '👑' },
    ],
  },
  {
    id: 'finance', title: 'ФИНАНСЫ',
    items: [
      { label: 'Финансы', icon: '💵' },
      { label: 'Подписки', icon: '💳' },
      { label: '💸 Возвраты', icon: '💸' },
      { label: '🏢 Реквизиты', icon: '🏢' },
      { label: 'Реклама', icon: '📢' },
      { label: 'Рефералы', icon: '🔗' },
    ],
  },
  {
    id: 'team', title: 'КОМАНДА',
    items: [
      { label: 'Команда', icon: '👥' },
      { label: '👥 Клиенты', icon: '🧑‍🤝‍🧑' },
      { label: 'Кабинеты', icon: '🖥' },
      { label: '✅ Задачи', icon: '✅' },
      { label: '🏢 Совет', icon: '🏢' },
      { label: '🔮 Разведка', icon: '🔮' },
      { label: '💰 Инвестиции', icon: '🏦' },
      { label: '🚀 Рождение бизнеса', icon: '🚀' },
    ],
  },
  {
    id: 'content', title: 'КОНТЕНТ',
    items: [
      { label: 'Новости', icon: '📰' },
      { label: 'Промо', icon: '🎁' },
      { label: '📋 Шаблоны', icon: '📋' },
      { label: '🎨 Brand Voice', icon: '🎨' },
      { label: '🎬 AI Video', icon: '🎬' },
      { label: '🧠 Neuro-Sales', icon: '🧠' },
      { label: '🔥 Scout', icon: '🔥' },
      { label: '📱 Telegram', icon: '📱' },
      { label: '📡 Каналы', icon: '📡' },
      { label: '🛒 Заказы рекламы', icon: '🛒' },
      { label: '📈 Метрики продаж', icon: '📈' },
    ],
  },
  {
    id: 'client', title: 'CLIENT',
    items: [
      { label: '📊 Аналитика', icon: '📊' },
      { label: '📅 Планировщик', icon: '📅' },
    ],
  },
  {
    id: 'settings', title: 'НАСТРОЙКИ',
    items: [
      { label: '🛠 Управление аддонами', icon: '🛠' },
      { label: '🔑 API Keys', icon: '🔑' },
      { label: 'Безопасность', icon: '🔒' },
      { label: 'Юр. лицо', icon: '⚖️' },
      { label: '⚖️ Юр. настройки', icon: '⚖️' },
      { label: 'Аудит', icon: '🛡' },
      { label: 'Серверы', icon: '🖥' },
      { label: '📅 Планировщик', icon: '📅' },
      { label: 'Обновления', icon: '🔄' },
      { label: 'Интеграции', icon: '🔌' },
      { label: 'AI Аналитика', icon: '📊' },
      { label: 'Логи системы', icon: '📄' },
      { label: 'Уведомления', icon: '🔔' },
      { label: '💬 Поддержка', icon: '💬' },
      { label: 'Помощь', icon: '❓' },
      { label: 'Feedback', icon: '💜' },
      { label: '🚀 DevStudio', icon: '🚀' },
    ],
  },
]
