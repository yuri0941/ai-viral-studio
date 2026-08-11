// [v9.9.19.14-MEMORY-GRAPH-PAYMENT-FIX] Валидация и автофикс HTML для Telegram Bot API.
// Разрешённые теги: b, strong, i, em, u, ins, s, strike, del, a (с href), code, pre, blockquote.
// <br> конвертируется в \n (Telegram его не поддерживает).
// Автофиксы: закрытие незакрытых тегов, экранирование одиночных & < > вне тегов,
// разведение пересекающихся тегов, вырезание неподдерживаемых тегов (текст сохраняется).

const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'a', 'code', 'pre', 'blockquote'])

const escapeText = (s) => s
  .replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

export function validateTelegramHTML(input) {
  const errors = []
  if (input == null || input === '') return { ok: true, fixed: '', errors }
  const text = String(input)

  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)(\s[^<>]*)?>/g
  let out = ''
  let last = 0
  const stack = []
  let m

  while ((m = tagRe.exec(text)) !== null) {
    out += escapeText(text.slice(last, m.index))
    last = m.index + m[0].length

    const isClose = m[1] === '/'
    const tag = m[2].toLowerCase()
    const attrs = m[3] || ''

    if (tag === 'br') { out += '\n'; continue }
    if (!ALLOWED.has(tag)) { errors.push(`unsupported <${tag}> removed`); continue }

    if (!isClose) {
      if (tag === 'a') {
        const hrefM = attrs.match(/href\s*=\s*"([^"]*)"/i) || attrs.match(/href\s*=\s*'([^']*)'/i)
        const href = hrefM ? hrefM[1].trim() : ''
        if (!href) { errors.push('<a> without href → unwrapped'); continue }
        out += `<a href="${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`
        stack.push('a')
        continue
      }
      out += `<${tag}>`
      stack.push(tag)
      continue
    }

    // Закрывающий тег
    const idx = stack.lastIndexOf(tag)
    if (idx === -1) { errors.push(`stray </${tag}> dropped`); continue }
    if (idx === stack.length - 1) {
      out += `</${tag}>`
      stack.pop()
      continue
    }
    // Пересечение тегов: <b><i>текст</b></i> → закрываем всё выше + сам тег (валидная вложенность)
    for (let i = stack.length - 1; i >= idx; i--) out += `</${stack[i]}>`
    stack.splice(idx)
    errors.push(`crossing tags fixed around </${tag}>`)
  }

  out += escapeText(text.slice(last))

  // Закрываем незакрытые теги (особенно <a>)
  while (stack.length) {
    const t = stack.pop()
    out += `</${t}>`
    errors.push(`unclosed <${t}> closed`)
  }

  return { ok: errors.length === 0, fixed: out, errors }
}

// Убрать все теги — для plain-text fallback
export function stripHtml(input) {
  return String(input || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
}

export function isParseEntitiesError(err) {
  return /can't parse entities/i.test(err?.message || err?.response?.body?.description || err?.response?.data?.description || '')
}

// [4.2] Единая точка: обёртка bot.sendMessage — валидация HTML + plain-text fallback на 400 parse.
// Один monkey-patch на инстанс бота покрывает ВСЕ существующие вызовы sendMessage без их переписывания.
export function wrapBotHtmlSending(bot, label = 'bot') {
  if (!bot || bot.__htmlWrapped || typeof bot.sendMessage !== 'function') return bot
  const origSend = bot.sendMessage.bind(bot)
  bot.sendMessage = async (chatId, text, options = {}) => {
    let payload = text
    if (options.parse_mode === 'HTML' && typeof payload === 'string') {
      const v = validateTelegramHTML(payload)
      payload = v.fixed
      if (!v.ok) console.warn(`[TG-HTML] ${label}: auto-fixed (${v.errors.join('; ')})`)
    }
    try {
      return await origSend(chatId, payload, options)
    } catch (e) {
      // [4.3] после auto-fix Telegram снова 400 parse → plain text БЕЗ parse_mode (лучше пост без форматирования, чем без поста)
      if (options.parse_mode && isParseEntitiesError(e)) {
        console.warn(`[TG-HTML] ${label}: 400 parse after fix → plain text fallback`)
        const { parse_mode, ...rest } = options
        try {
          return await origSend(chatId, stripHtml(payload), rest)
        } catch (e2) {
          console.warn(`[TG-HTML] ${label}: plain fallback failed:`, e2.message)
          throw e2
        }
      }
      throw e
    }
  }
  bot.__htmlWrapped = true
  return bot
}

export default { validateTelegramHTML, stripHtml, isParseEntitiesError, wrapBotHtmlSending }
