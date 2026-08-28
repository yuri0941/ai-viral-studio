// [OWNER-OMEGA] батч 2: ключи owner.changelog.* и owner.expenses.* в 4 локали.
// Запуск: node scripts/i18n-owner-omega-fill2.mjs
import fs from 'node:fs'

const FILES = [
    ['frontend/src/locales/ru.json', 'ru'],
    ['frontend/public/locales/ru.json', 'ru'],
    ['frontend/src/locales/en.json', 'en'],
    ['frontend/public/locales/en.json', 'en'],
]

const changelogRu = {
    title: 'Редактор changelog (модалка обновлений)',
    liveHint: 'Записи из этой таблицы заменяют встроенный список в модалке обновлений. Пусто — показывается встроенный.',
    version: 'Версия (например 9.9.22)',
    itemTitleRu: 'Заголовок (RU)',
    itemTitleEn: 'Заголовок (EN)',
    itemBodyRu: 'Текст (RU)',
    itemBodyEn: 'Текст (EN)',
    audAll: 'Все',
    audClient: 'Клиенты',
    audOwner: 'Владелец',
    addVersion: 'Добавить версию',
    delete: 'Удалить',
    saved: 'Запись changelog сохранена',
    deleted: 'Запись changelog удалена',
    empty: 'Записей нет — показывается встроенный changelog',
}
const changelogEn = {
    title: 'Changelog editor (update modal)',
    liveHint: 'Entries from this table replace the bundled list in the update modal. Empty — bundled list is shown.',
    version: 'Version (e.g. 9.9.22)',
    itemTitleRu: 'Title (RU)',
    itemTitleEn: 'Title (EN)',
    itemBodyRu: 'Text (RU)',
    itemBodyEn: 'Text (EN)',
    audAll: 'All',
    audClient: 'Clients',
    audOwner: 'Owner',
    addVersion: 'Add version',
    delete: 'Delete',
    saved: 'Changelog entry saved',
    deleted: 'Changelog entry deleted',
    empty: 'No entries — bundled changelog is shown',
}

const expensesRu = {
    title: 'Расходы (лайт)',
    aiTotal: 'AI-вызовы',
    calls: 'вызовов',
    infraTitle: 'Инфраструктура (Render, MongoDB, Cloudflare)',
    servicePh: 'Сервис (Render…)',
    amountPh: '₽/мес',
    add: 'Добавить',
    remove: 'Удалить',
    saved: 'Расход сохранён',
    range: { day: 'День', week: 'Неделя', month: 'Месяц' },
}
const expensesEn = {
    title: 'Expenses (lite)',
    aiTotal: 'AI calls',
    calls: 'calls',
    infraTitle: 'Infrastructure (Render, MongoDB, Cloudflare)',
    servicePh: 'Service (Render…)',
    amountPh: '₽/mo',
    add: 'Add',
    remove: 'Remove',
    saved: 'Expense saved',
    range: { day: 'Day', week: 'Week', month: 'Month' },
}

for (const [file, lang] of FILES) {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'))
    json.owner = json.owner || {}
    json.owner.changelog = lang === 'ru' ? changelogRu : changelogEn
    json.owner.expenses = lang === 'ru' ? expensesRu : expensesEn
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
    console.log(`OK ${file}`)
}
