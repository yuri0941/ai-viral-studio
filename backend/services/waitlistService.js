import { createNode } from './cognitiveMesh.js';
import Waitlist from '../models/Waitlist.js';

// [HOTFIX-FINAL-2 З4] waitlist лендинга — в MongoDB (было: in-memory массив, записи умирали
// с рестартом Render) + уведомление владельцу в TG owner-бот о каждой НОВОЙ заявке.
export async function joinWaitlist(email, source = 'landing') {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new Error('Valid email is required');
  }

  const existing = await Waitlist.findOne({ email: normalizedEmail });
  if (existing) {
    const position = await existing.calculatePosition();
    return { success: true, position, alreadyRegistered: true };
  }

  const entry = await Waitlist.create({
    email: normalizedEmail,
    source: source || 'landing',
    referralCode: 'OMEGA' + Math.random().toString(16).slice(2, 8).toUpperCase(),
  });
  const position = await entry.calculatePosition();
  entry.position = position;
  await entry.save();

  try {
    await createNode({ type: 'system', content: `New waitlist entry: ${normalizedEmail}`, confidence: 1, source: 'waitlist', metadata: { email: normalizedEmail, source, type: 'waitlist_join' } });
  } catch { /* mesh не критичен */ }

  // Уведомление владельцу — факт заявки; обрыв алерта не ломает запись
  try {
    const { sendOwnerAlert } = await import('./ownerBot.js');
    const total = await Waitlist.countDocuments();
    await sendOwnerAlert(
      `📨 <b>Новая заявка с лендинга</b>\n📧 ${normalizedEmail}\n📍 Источник: ${source || 'landing'}\n🔢 Позиция: ${position} · всего в очереди: ${total}`,
      'newuser'
    );
  } catch (e) {
    console.warn('[waitlist] owner alert failed:', e.message);
  }

  return { success: true, position };
}

export async function getWaitlist() {
  return Waitlist.find().sort({ createdAt: -1 }).limit(500).lean();
}

export async function approveWaitlist(email) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const entry = await Waitlist.findOne({ email: normalizedEmail });
  if (entry) {
    entry.approved = true;
    entry.badge = entry.badge || 'approved';
    await entry.save();
  }
  return entry;
}
