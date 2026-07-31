const GREETINGS = [
    'Привет, {name}! {niche} — отличная ниша 🚀',
    'Здравствуй, {name}! Готов помочь с {niche}.',
    'Привет, {name}! Давай сделаем {niche} вирусной.',
    'Рад тебя видеть, {name}! Как идёт {niche}?',
    'Привет, {name}! Что будем крутить в {niche}?',
    'Здравствуй, {name}! Готов к работе над {niche}.',
    'Привет, {name}! {niche} ждёт своего хита.',
    'Хай, {name}! Давай запустим {niche} в тренды.',
    'Привет, {name}! Начнём прокачивать {niche}.',
    'Добро пожаловать, {name}! {niche} — наше поле боя.',
    'Привет, {name}! Какой план по {niche} сегодня?',
    'С возвращением, {name}! {niche} уже скучала.',
    'Привет, {name}! Готов разорвать {niche} контентом?',
    'Здравствуй, {name}! Давай создадим магию для {niche}.',
    'Привет, {name}! Время делать {niche} ещё круче.',
]

const CONFIRMATIONS = [
    'Понял, {name}! Делаю для {niche}. ✅',
    'Принято, {name}! Работаю над {niche}.',
    'Хорошо, {name}! Применяю к {niche}.',
    'Окей, {name}! {niche} будет в порядке.',
    'Сделано, {name}! Следующий шаг для {niche}?',
    'Понял тебя, {name}! Продолжаем для {niche}.',
    'Выполнено, {name}! Что ещё для {niche}?',
    'Готово, {name}! {niche} идёт вверх.',
    'Записал, {name}! Действуем в {niche}.',
    'Ок, {name}! Настраиваю для {niche}.',
]

const FAREWELLS = [
    'Пока, {name}! Возвращайся к {niche} 🙌',
    'До встречи, {name}! {niche} будет ждать.',
    'Увидимся, {name}! Продолжим {niche} позже.',
    'Пока-пока, {name}! Успехов в {niche}.',
    'До скорого, {name}! {niche} уже ближе к цели.',
    'Бай, {name}! Не забывай про {niche}.',
    'Прощай, {name}! {niche} в надёжных руках.',
    'До встречи, {name}! {niche} будет расти.',
    'Пока, {name}! Ещё много идей для {niche}.',
    'Удачи, {name}! {niche} ждёт тебя.',
]

const RESPONSES = [
    'Для {niche} лучше всего подходит короткий вирусный формат, {name}.',
    'В {niche} сейчас трендят эмоциональные хуки, {name}.',
    'Попробуй в {niche} увеличить частоту публикаций, {name}.',
    'Для {niche} важен первая секунда — зацепи зрителя, {name}.',
    'В {niche} хорошо заходят истории с неожиданным поворотом, {name}.',
    'Проверь конкурентов в {niche} и сделай лучше, {name}.',
    'Для {niche} попробуй формат «До / После», {name}.',
    'В {niche} зрители любят практические советы, {name}.',
    'Сделай для {niche} контент с вопросом в начале, {name}.',
    'Для {niche} подойдёт короткий подкаст-формат, {name}.',
    'В {niche} важно показывать результат быстро, {name}.',
    'Попробуй в {niche} запустить серию роликов, {name}.',
    'Для {niche} хороши лайфхаки и чек-листы, {name}.',
    'В {niche} используй трендовые аудио и хештеги, {name}.',
    'Сделай для {niche} контент с личной историей, {name}.',
    'Для {niche} попробуй формат «Миф vs Реальность», {name}.',
    'В {niche} работают короткие кейсы с цифрами, {name}.',
    'Проверь лучшее время публикации для {niche}, {name}.',
    'Для {niche} сделай призыв к действию в конце, {name}.',
    'В {niche} важна честность — зрители ценят это, {name}.',
]

const TEMPLATE_BANKS = {
    greeting: GREETINGS,
    confirmation: CONFIRMATIONS,
    farewell: FAREWELLS,
    response: RESPONSES,
}

let lastIndices = {}

export function pickTemplate(category, context = {}) {
    const bank = TEMPLATE_BANKS[category] || RESPONSES
    if (bank.length === 0) return ''
    if (bank.length === 1) return renderTemplate(bank[0], context)

    let idx = lastIndices[category] ?? -1
    do {
        idx = Math.floor(Math.random() * bank.length)
    } while (idx === lastIndices[category] && bank.length > 1)
    lastIndices[category] = idx

    return renderTemplate(bank[idx], context)
}

export function renderTemplate(template, context = {}) {
    return template.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? `{${key}}`)
}

export function classifyQuestion(question) {
    const q = (question || '').toLowerCase()
    if (/привет|здравствуй|хай|добрый день|доброе/.test(q)) return 'greeting'
    if (/пока|до свидания|до встречи|бай|прощай/.test(q)) return 'farewell'
    if (/ok|окей|понял|хорошо|сделай|да|давай|принято/.test(q)) return 'confirmation'
    return 'response'
}

export default { pickTemplate, renderTemplate, classifyQuestion, TEMPLATE_BANKS }
