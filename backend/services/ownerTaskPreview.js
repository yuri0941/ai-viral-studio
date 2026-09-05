// [BOTS-FIX] Превью-гейт задач Омеге: свободный текст владельца НЕ уходит в очередь напрямую.
// Инцидент 2026-09-05: «Не работают кнопки» от владельца ушло в общую очередь → Омега
// опубликовала пост в канал @aiviralstudio без команды владельца. Теперь: превью
// «Выполнить? ✅/❌», исполнение (submitOwnerCommand) — только после ✅. ЖЁСТКИЙ ЗАПРЕТ:
// из чата владельца наружу (канал/соцсети) — только по явной команде с превью.
import { submitOwnerCommand } from './commandExecutor.js'

const TTL_MS = 15 * 60 * 1000

const pending = () => {
  global.pendingOwnerTasks = global.pendingOwnerTasks || new Map()
  return global.pendingOwnerTasks
}

// Текст владельца → превью задачи с кнопками. Ничего не выполняет.
export async function proposeOwnerTask({ chatId, text, safeSendMessage }) {
  pending().set(String(chatId), { text: String(text).slice(0, 500), at: Date.now() })
  await safeSendMessage(chatId,
    `📋 <b>Поставить задачу Омеге?</b>\n━━━━━━━━━━━━━━\n«${String(text).slice(0, 300)}»\n\n<i>В очередь НЕ ставлю без вашего подтверждения.</i>`, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[
        { text: '✅ Выполнить', callback_data: 'otask:run' },
        { text: '❌ Отмена', callback_data: 'otask:cancel' },
      ]] },
    })
}

// Кнопки превью: ✅ — в очередь (тут и только тут вызывается submitOwnerCommand), ❌ — отмена.
export async function handleOwnerTaskCallback({ chatId, data, safeSendMessage, bot }) {
  const rec = pending().get(String(chatId))
  if (data === 'otask:cancel') {
    pending().delete(String(chatId))
    await safeSendMessage(chatId, '🚫 Отменено — в очередь задач ничего не ушло.')
    return
  }
  if (!rec || Date.now() - rec.at > TTL_MS) {
    pending().delete(String(chatId))
    await safeSendMessage(chatId, '⏱ Превью задачи устарело (15 мин). Отправьте текст ещё раз.')
    return
  }
  pending().delete(String(chatId))
  await submitOwnerCommand({ chatId, text: rec.text, bot })
}
