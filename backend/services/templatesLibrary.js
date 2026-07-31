// 50 AI-шаблонов для генерации контента
// categories: hooks, aida, pas, email, shorts

const TEMPLATES = [
  // === Хуки (10) ===
  {
    id: 'hook-1',
    category: 'hooks',
    name: 'Неожиданный факт',
    template: 'Вы не поверите, но {niche} может измениться за {timeframe}. Вот что я узнал 👇',
    variables: ['niche', 'timeframe'],
  },
  {
    id: 'hook-2',
    category: 'hooks',
    name: 'Лайфхак',
    template: 'Этот лайфхак изменит ваш подход к {niche}. Сохраните, чтобы не потерять!',
    variables: ['niche'],
  },
  {
    id: 'hook-3',
    category: 'hooks',
    name: 'Вопрос',
    template: 'А вы знали, что {stat} людей в {niche} делают эту ошибку? 🤔',
    variables: ['stat', 'niche'],
  },
  {
    id: 'hook-4',
    category: 'hooks',
    name: 'Провокация',
    template: 'Перестаньте верить в этот миф о {niche}. Вот правда, которую молчат эксперты.',
    variables: ['niche'],
  },
  {
    id: 'hook-5',
    category: 'hooks',
    name: 'Сравнение',
    template: '{niche}: до и после. Разница в {metric} — и это без магии.',
    variables: ['niche', 'metric'],
  },
  {
    id: 'hook-6',
    category: 'hooks',
    name: 'Срочность',
    template: 'Только {percent} тех, кто работает в {niche}, знают этот приём. Успейте первыми! ⏰',
    variables: ['percent', 'niche'],
  },
  {
    id: 'hook-7',
    category: 'hooks',
    name: 'История',
    template: 'Я потратил {time} на {niche}, чтобы понять одну простую вещь...',
    variables: ['time', 'niche'],
  },
  {
    id: 'hook-8',
    category: 'hooks',
    name: 'Спойлер',
    template: 'Спойлер: {outcome}. Вот как добиться такого результата в {niche}.',
    variables: ['outcome', 'niche'],
  },
  {
    id: 'hook-9',
    category: 'hooks',
    name: 'Миф',
    template: '3 мифа о {niche}, которые тормозят ваш рост. Разберём прямо сейчас.',
    variables: ['niche'],
  },
  {
    id: 'hook-10',
    category: 'hooks',
    name: 'Прямой призыв',
    template: 'Если вы работаете в {niche}, это видео — именно для вас. Делайте репост, чтобы не потерять!',
    variables: ['niche'],
  },

  // === AIDA (10) ===
  {
    id: 'aida-1',
    category: 'aida',
    name: 'AIDA классика',
    template: `Attention: Хотите {benefit}?
Interest: Сотни клиентов в {niche} уже используют этот подход.
Desire: Представьте: {result} уже через {timeframe}.
Action: Напишите «{keyword}» в комментариях — вышлем инструкцию.`,
    variables: ['benefit', 'niche', 'result', 'timeframe', 'keyword'],
  },
  {
    id: 'aida-2',
    category: 'aida',
    name: 'AIDA короткая',
    template: `Внимание: {niche} никогда не будет прежней.
Интерес: {stat} экспертов перешли на этот метод.
Желание: Получите {benefit} без лишних затрат.
Действие: Ссылка в шапке профиля.`,
    variables: ['niche', 'stat', 'benefit'],
  },
  {
    id: 'aida-3',
    category: 'aida',
    name: 'AIDA с цифрой',
    template: `Attention: {metric} за {timeframe} — реально?
Interest: Да, если применить систему для {niche}.
Desire: {result} уже у {clients} клиентов.
Action: Запишитесь на бесплатную консультацию.`,
    variables: ['metric', 'timeframe', 'niche', 'result', 'clients'],
  },
  {
    id: 'aida-4',
    category: 'aida',
    name: 'AIDA история',
    template: `Attention: Когда-то я тоже боролся с {pain} в {niche}.
Interest: Потом открыл для себя {solution}.
Desire: Теперь {result} — моя новая норма.
Action: Подпишитесь, чтобы не пропустить следующий кейс.`,
    variables: ['pain', 'niche', 'solution', 'result'],
  },
  {
    id: 'aida-5',
    category: 'aida',
    name: 'AIDA провокация',
    template: `Attention: Ваш конкурент в {niche} уже использует это.
Interest: Пока вы думаете, он забирает клиентов.
Desire: Хотите такой же результат — {benefit}?
Action: Лайк + комментарий «{keyword}», и я пришлю чек-лист.`,
    variables: ['niche', 'benefit', 'keyword'],
  },
  {
    id: 'aida-6',
    category: 'aida',
    name: 'AIDA обучение',
    template: `Attention: Учиться {skill} можно за {timeframe}.
Interest: Мы собрали пошаговый план для {niche}.
Desire: Выполните {steps} шагов — и получите {result}.
Action: Напишите «+» в комментариях.`,
    variables: ['skill', 'timeframe', 'niche', 'steps', 'result'],
  },
  {
    id: 'aida-7',
    category: 'aida',
    name: 'AIDA скидка',
    template: `Attention: Скидка {percent}% на {offer} заканчивается сегодня.
Interest: Это лучшее предложение для {niche} за этот год.
Desire: Успейте получить {benefit} по цене {price}.
Action: Промокод «{code}» — активируйте сейчас.`,
    variables: ['percent', 'offer', 'niche', 'benefit', 'price', 'code'],
  },
  {
    id: 'aida-8',
    category: 'aida',
    name: 'AIDA вопрос',
    template: `Attention: Как вы решаете {problem} в {niche}?
Interest: 80% делают это неэффективно.
Desire: Есть способ {result} без лишних усилий.
Action: Отправьте «{keyword}» в личные сообщения.`,
    variables: ['problem', 'niche', 'result', 'keyword'],
  },
  {
    id: 'aida-9',
    category: 'aida',
    name: 'AIDA тренд',
    template: `Attention: Тренд 2026 в {niche} — {trend}.
Interest: Ранние адепты уже получают {benefit}.
Desire: Не упустите момент, чтобы быть впереди.
Action: Сохраните пост и подпишитесь.`,
    variables: ['niche', 'trend', 'benefit'],
  },
  {
    id: 'aida-10',
    category: 'aida',
    name: 'AIDA результат',
    template: `Attention: {result} — это не магия, а система.
Interest: Для {niche} мы адаптировали проверенный фреймворк.
Desire: {benefit} станет вашей реальностью.
Action: Запишитесь на вебинар по ссылке.`,
    variables: ['result', 'niche', 'benefit'],
  },

  // === PAS (10) ===
  {
    id: 'pas-1',
    category: 'pas',
    name: 'PAS классика',
    template: `Problem: {pain} — самая частая проблема в {niche}.
Agitate: Каждый день без решения вы теряете {loss}.
Solution: Мы создали {solution}, чтобы {benefit}.`,
    variables: ['pain', 'niche', 'loss', 'solution', 'benefit'],
  },
  {
    id: 'pas-2',
    category: 'pas',
    name: 'PAS быстрый',
    template: `Проблема: {problem} тормозит рост в {niche}.
Усиление: Конкуренты уже не ждут, они действуют.
Решение: {solution} — запуск за {timeframe}.`,
    variables: ['problem', 'niche', 'solution', 'timeframe'],
  },
  {
    id: 'pas-3',
    category: 'pas',
    name: 'PAS метрика',
    template: `Problem: {metric} — это слишком мало для {niche}.
Agitate: При таких цифрах вы не окупите вложения.
Solution: Система, которая даёт {target} за {timeframe}.`,
    variables: ['metric', 'niche', 'target', 'timeframe'],
  },
  {
    id: 'pas-4',
    category: 'pas',
    name: 'PAS эмоция',
    template: `Problem: Устали от {pain} в {niche}?
Agitate: Это выматывает, отнимает время и деньги.
Solution: Попробуйте {solution} — почувствуйте разницу уже завтра.`,
    variables: ['pain', 'niche', 'solution'],
  },
  {
    id: 'pas-5',
    category: 'pas',
    name: 'PAS сравнение',
    template: `Problem: Старые методы в {niche} больше не работают.
Agitate: Вы тратите {cost}, а результат падает.
Solution: {solution} — новый стандарт для {niche}.`,
    variables: ['niche', 'cost', 'solution'],
  },
  {
    id: 'pas-6',
    category: 'pas',
    name: 'PAS мини',
    template: `{pain}? Это нормально для {niche}, но не обязательно.
Проблема растёт, пока вы откладываете.
Решение: {solution} — начните с {step}.`,
    variables: ['pain', 'niche', 'solution', 'step'],
  },
  {
    id: 'pas-7',
    category: 'pas',
    name: 'PAS кейс',
    template: `Problem: Клиент в {niche} терял {loss} каждый месяц.
Agitate: Без изменений бизнес рисковал закрыться.
Solution: Внедрили {solution} → {result} за {timeframe}.`,
    variables: ['niche', 'loss', 'solution', 'result', 'timeframe'],
  },
  {
    id: 'pas-8',
    category: 'pas',
    name: 'PAS обучение',
    template: `Problem: В {niche} не хватает системных знаний.
Agitate: Самоучки допускают ошибки, которые дорого стоят.
Solution: Курс «{course}» — {benefit} за {duration}.`,
    variables: ['niche', 'course', 'benefit', 'duration'],
  },
  {
    id: 'pas-9',
    category: 'pas',
    name: 'PAS подписчики',
    template: `Problem: В {niche} сложно удержать аудиторию.
Agitate: Подписчики уходят к конкурентам с первых секунд.
Solution: Хуки из этой подборки увеличивают удержание на {percent}%.`,
    variables: ['niche', 'percent'],
  },
  {
    id: 'pas-10',
    category: 'pas',
    name: 'PAS продажи',
    template: `Problem: В {niche} мало заявок.
Agitate: Каждый пропущенный лид — это упущенная прибыль.
Solution: Воронка {solution} приносит {metric} за {timeframe}.`,
    variables: ['niche', 'solution', 'metric', 'timeframe'],
  },

  // === Email-цепочки (10) ===
  {
    id: 'email-1',
    category: 'email',
    name: 'Email приветствие',
    template: `Привет, {name}!

Спасибо, что подписались на рассылку про {niche}. В ближайших письмах буду делиться практиками, которые помогают {benefit}.

До связи,
{sender}`,
    variables: ['name', 'niche', 'benefit', 'sender'],
  },
  {
    id: 'email-2',
    category: 'email',
    name: 'Email питч',
    template: `Здравствуйте, {name}!

Я работаю с {niche} и помогаю компаниям добиваться {benefit}. Недавно мы сделали для похожего клиента {result}.

Готовы обсудить, как это может работать для вас? Ответьте на это письмо — назначу короткий созвон.`,
    variables: ['name', 'niche', 'benefit', 'result'],
  },
  {
    id: 'email-3',
    category: 'email',
    name: 'Email возражение цена',
    template: `Привет, {name}!

Понимаю, что бюджет — важный вопрос. Давайте смотреть на цифры: {solution} в среднем окупается за {payback} и даёт {roi} ROI.

Предлагаю протестировать {trial} — так вы оцените эффект без риска.`,
    variables: ['name', 'solution', 'payback', 'roi', 'trial'],
  },
  {
    id: 'email-4',
    category: 'email',
    name: 'Email закрытие',
    template: `Привет, {name}!

Осталось только одно — начать. Мы подготовили всё для запуска: {steps}.

Нажмите кнопку ниже и активируйте {offer} до {deadline}. После этого мы свяжемся в течение часа.`,
    variables: ['name', 'steps', 'offer', 'deadline'],
  },
  {
    id: 'email-5',
    category: 'email',
    name: 'Email фоллоу-ап',
    template: `Привет, {name}!

Отправляю короткое напоминание про {topic}. Может, вы уже успели посмотреть?

Если есть вопросы — ответьте на письмо. Если не интересно — тоже напишите, больше не буду беспокоить.`,
    variables: ['name', 'topic'],
  },
  {
    id: 'email-6',
    category: 'email',
    name: 'Email ценность',
    template: `{name}, привет!

В {niche} сейчас главный тренд — {trend}. Мы собрали чек-лист, как внедрить его за {timeframe}: {link}.

Будет полезно — делитесь с коллегами.`,
    variables: ['name', 'niche', 'trend', 'timeframe', 'link'],
  },
  {
    id: 'email-7',
    category: 'email',
    name: 'Email вебинар',
    template: `Привет, {name}!

{date} в {time} провожу вебинар «{title}» для {niche}. Разберём:
• {point1}
• {point2}
• {point3}

Регистрация: {link}. Места ограничены.`,
    variables: ['name', 'date', 'time', 'title', 'niche', 'point1', 'point2', 'point3', 'link'],
  },
  {
    id: 'email-8',
    category: 'email',
    name: 'Email благодарность',
    template: `Привет, {name}!

Спасибо за покупку {product}. Ваш доступ уже активирован: {link}.

Если возникнут вопросы — пишите в ответ на это письмо. Успехов!`,
    variables: ['name', 'product', 'link'],
  },
  {
    id: 'email-9',
    category: 'email',
    name: 'Email реактивация',
    template: `{name}, мы давно не слышались!

В {niche} появилось много нового: {update}. Если хотите вернуться — ответьте «{keyword}», и я пришлю свежий материал.

Скучаю по вашей активности 😉`,
    variables: ['name', 'niche', 'update', 'keyword'],
  },
  {
    id: 'email-10',
    category: 'email',
    name: 'Email обратная связь',
    template: `Привет, {name}!

Вы уже используете {product}. Расскажите в 2-3 предложениях, что изменилось для вас?

Ваш ответ поможет сделать продукт лучше. В качестве благодарности пришлю {gift}.`,
    variables: ['name', 'product', 'gift'],
  },

  // === Shorts/Reels (10) ===
  {
    id: 'shorts-1',
    category: 'shorts',
    name: 'Shorts 15 сек — хук',
    template: `[0-3s] Хук: "{hook}"
[3-8s] Проблема: "{pain}"
[8-12s] Решение: "{solution}"
[12-15s] CTA: "Подпишись + лайк"`,
    variables: ['hook', 'pain', 'solution'],
  },
  {
    id: 'shorts-2',
    category: 'shorts',
    name: 'Shorts 30 сек — лайфхак',
    template: `[0-3s] Внимание: "{hook}"
[3-10s] Показ проблемы: "{pain}"
[10-20s] Лайфхак: "{solution}"
[20-25s] Результат: "{result}"
[25-30s] CTA: "Сохрани, чтобы не потерять"`,
    variables: ['hook', 'pain', 'solution', 'result'],
  },
  {
    id: 'shorts-3',
    category: 'shorts',
    name: 'Shorts 60 сек — миф',
    template: `[0-5s] Миф: "{myth}"
[5-15s] Почему многие так думают
[15-35s] Правда: "{truth}"
[35-50s] Пример: "{example}"
[50-60s] CTA: "Пиши в комментариях, с чем столкнулся"`,
    variables: ['myth', 'truth', 'example'],
  },
  {
    id: 'shorts-4',
    category: 'shorts',
    name: 'Shorts 15 сек — до/после',
    template: `[0-3s] До: "{before}"
[3-8s] После: "{after}"
[8-12s] Как: "{solution}"
[12-15s] CTA: "Лайк + подписка"`,
    variables: ['before', 'after', 'solution'],
  },
  {
    id: 'shorts-5',
    category: 'shorts',
    name: 'Shorts 30 сек — ошибка',
    template: `[0-3s] Ошибка в {niche}: "{mistake}"
[3-12s] Последствия: "{consequence}"
[12-22s] Как исправить: "{solution}"
[22-30s] CTA: "Подпишись, чтобы не повторять"`,
    variables: ['niche', 'mistake', 'consequence', 'solution'],
  },
  {
    id: 'shorts-6',
    category: 'shorts',
    name: 'Shorts 60 сек — туториал',
    template: `[0-5s] Хук: "{hook}"
[5-15s] Что нужно: "{tools}"
[15-40s] Пошагово: "{steps}"
[40-55s] Результат: "{result}"
[55-60s] CTA: "Сохрани в избранное"`,
    variables: ['hook', 'tools', 'steps', 'result'],
  },
  {
    id: 'shorts-7',
    category: 'shorts',
    name: 'Shorts 15 сек — вопрос',
    template: `[0-3s] Вопрос: "{question}"
[3-8s] Ответ: "{answer}"
[8-12s] Почему: "{reason}"
[12-15s] CTA: "Комментируй"`,
    variables: ['question', 'answer', 'reason'],
  },
  {
    id: 'shorts-8',
    category: 'shorts',
    name: 'Shorts 30 сек — список',
    template: `[0-3s] 3 ошибки в {niche}
[3-10s] 1. {mistake1}
[10-18s] 2. {mistake2}
[18-25s] 3. {mistake3}
[25-30s] CTA: "Какая из них твоя? Пиши в комментариях"`,
    variables: ['niche', 'mistake1', 'mistake2', 'mistake3'],
  },
  {
    id: 'shorts-9',
    category: 'shorts',
    name: 'Shorts 60 сек — история',
    template: `[0-5s] Хук: "{hook}"
[5-20s] Контекст: "{context}"
[20-40s] Поворот: "{twist}"
[40-55s] Урок: "{lesson}"
[55-60s] CTA: "Подпишись, если узнал себя"`,
    variables: ['hook', 'context', 'twist', 'lesson'],
  },
  {
    id: 'shorts-10',
    category: 'shorts',
    name: 'Shorts 15 сек — тренд',
    template: `[0-3s] Тренд 2026: "{trend}"
[3-8s] Почему работает: "{reason}"
[8-12s] Как применить: "{how}"
[12-15s] CTA: "Делай репост"`,
    variables: ['trend', 'reason', 'how'],
  },
]

export function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id) || null
}

export function getTemplatesByCategory(category) {
  return TEMPLATES.filter(t => t.category === category)
}

export function generateFromTemplate(id, variables = {}) {
  const template = getTemplateById(id)
  if (!template) return null

  let text = template.template
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`)
  }
  // Clean up any remaining placeholders
  text = text.replace(/\{[a-zA-Z0-9_-]+\}/g, '')

  return {
    id: template.id,
    category: template.category,
    name: template.name,
    text: text.trim(),
  }
}

export function listTemplateCategories() {
  return ['hooks', 'aida', 'pas', 'email', 'shorts']
}

export function listTemplates() {
  return TEMPLATES.map(t => ({
    id: t.id,
    category: t.category,
    name: t.name,
    variables: t.variables,
  }))
}

export default TEMPLATES
