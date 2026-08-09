import TelegramMenu from '../models/TelegramMenu.js'
import { chatWithAI } from './aiService.js'

export async function getMenu(name, ownerId) {
  let menu = await TelegramMenu.findOne({ name, ownerId })
  if (!menu) menu = await getDefaultMenu(name, ownerId)
  return menu.buttons.filter(b => b.active).sort((a, b) => a.order - b.order)
}

export async function trackClick(menuName, callbackData, ownerId) {
  if (!ownerId || !callbackData) return
  await TelegramMenu.updateOne(
    { name: menuName, ownerId, 'buttons.callback_data': callbackData },
    { $inc: { 'buttons.$.clickCount': 1 }, updatedAt: new Date() }
  )
}

export async function generateMenuImprovements(ownerId) {
  const menus = await TelegramMenu.find({ ownerId })
  const prompt = `Analyze Telegram menu usage for an owner of AI Viral Studio. Menus: ${JSON.stringify(menus.map(m => ({ name: m.name, buttons: m.buttons.map(b => ({ text: b.text, callback_data: b.callback_data, clicks: b.clickCount || 0 })) })))}. Suggest: 1) Which buttons to remove (clicks < 3), 2) Which new buttons to add based on owner activity (content creation, analytics, factory, predictions, reports, improvements), 3) Reorder by popularity. Return ONLY valid JSON: { remove: [callback_data], add: [{text, callback_data, icon}], reorder: [callback_data] }. Do not add explanation.`
  const aiResult = await chatWithAI(prompt, [], 'ru', { maxTokens: 1000, temperature: 0.4 })
  try {
    return JSON.parse(aiResult?.reply || aiResult?.text || '{}')
  } catch (e) {
    return {}
  }
}

export async function applyMenuChanges(ownerId, changes) {
  const menu = await TelegramMenu.findOne({ name: 'main', ownerId })
  if (!menu || !changes) return
  // Remove
  if (Array.isArray(changes.remove)) {
    menu.buttons = menu.buttons.filter(b => !changes.remove.includes(b.callback_data))
  }
  // Add
  if (Array.isArray(changes.add)) {
    changes.add.forEach((btn, i) => {
      if (menu.buttons.some(b => b.callback_data === btn.callback_data)) return
      menu.buttons.push({ ...btn, order: menu.buttons.length + i, active: true, clickCount: 0 })
    })
  }
  // Reorder
  if (Array.isArray(changes.reorder)) {
    menu.buttons.sort((a, b) => {
      const idxA = changes.reorder.indexOf(a.callback_data)
      const idxB = changes.reorder.indexOf(b.callback_data)
      if (idxA === -1 && idxB === -1) return a.order - b.order
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })
  }
  menu.updatedAt = new Date()
  await menu.save()
}

export async function addCustomButton(ownerId, button) {
  let menu = await TelegramMenu.findOne({ name: 'main', ownerId })
  if (!menu) menu = await getDefaultMenu('main', ownerId)
  if (menu.buttons.some(b => b.callback_data === button.callback_data)) return null
  menu.buttons.push({
    text: button.text,
    callback_data: button.callback_data,
    icon: button.icon || '🔘',
    order: menu.buttons.length,
    active: true,
    clickCount: 0
  })
  menu.updatedAt = new Date()
  await menu.save()
  return menu.buttons
}

export async function toggleButton(ownerId, callbackData, active) {
  const menu = await TelegramMenu.findOne({ name: 'main', ownerId })
  if (!menu) return null
  const btn = menu.buttons.find(b => b.callback_data === callbackData)
  if (!btn) return null
  btn.active = active
  menu.updatedAt = new Date()
  await menu.save()
  return menu.buttons
}

async function getDefaultMenu(name, ownerId) {
  const defaults = {
    main: [
      { text: '🎬 Контент', callback_data: 'owner:content', icon: '🎬', order: 0, active: true, clickCount: 0 },
      { text: '📊 Аналитика', callback_data: 'owner:analytics', icon: '📊', order: 1, active: true, clickCount: 0 },
      { text: '🏭 Factory', callback_data: 'owner:factory', icon: '🏭', order: 2, active: true, clickCount: 0 },
      { text: '🔮 Прогнозы', callback_data: 'owner:predictions', icon: '🔮', order: 3, active: true, clickCount: 0 },
      { text: '📋 Отчёт', callback_data: 'owner:report', icon: '📋', order: 4, active: true, clickCount: 0 },
      { text: '⚡ Ещё', callback_data: 'owner:more', icon: '⚡', order: 5, active: true, clickCount: 0 }
    ]
  }
  const menu = await TelegramMenu.create({ name, ownerId, buttons: defaults[name] || [], isDefault: true })
  return menu
}
