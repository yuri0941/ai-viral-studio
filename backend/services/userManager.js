import crypto from 'node:crypto';
import User from '../models/User.js';
import { createNode } from './cognitiveMesh.js';

export async function listClients(ownerId, filters = {}) {
  const query = { role: { $nin: ['owner', 'admin'] } };
  if (filters.email) query.email = new RegExp(filters.email, 'i');
  if (filters.plan) query.subscription = filters.plan;
  if (filters.status) query.status = filters.status;
  const clients = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(200);
  return clients;
}

export async function getClientDetails(clientId, ownerId) {
  const client = await User.findById(clientId).select('-password');
  if (!client) throw new Error('Client not found');
  return client;
}

export async function deleteClientAccount(clientId, ownerId, reason = '') {
  const client = await User.findById(clientId);
  if (!client) throw new Error('Client not found');
  client.status = 'deleted';
  client.deletedAt = new Date();
  client.deletionReason = reason;
  client.deletedBy = ownerId;
  await client.save();
  await createNode({ type: 'system', content: `Account deleted: ${client.email}`, confidence: 1, source: 'user_manager', metadata: { clientId, ownerId, reason, type: 'account_deleted' } });
  return { success: true, message: 'Account marked for deletion. Data will be purged in 30 days.' };
}

export async function blockClient(clientId, ownerId, reason = '') {
  // [STAFF-DOP] бан должен реально блокировать: login (auth.js) и protect (middleware/auth.js) смотрят на isActive
  const client = await User.findByIdAndUpdate(
    clientId,
    { status: 'blocked', isActive: false, blockedAt: new Date(), blockedReason: reason, blockedBy: ownerId },
    { new: true }
  );
  if (!client) throw new Error('Client not found');
  return { success: true, client };
}

export async function unblockClient(clientId, ownerId) {
  const client = await User.findByIdAndUpdate(
    clientId,
    { status: 'active', isActive: true, blockedAt: null, blockedReason: null, blockedBy: null },
    { new: true }
  );
  if (!client) throw new Error('Client not found');
  return { success: true, client };
}

export async function getClientStats() {
  const total = await User.countDocuments({ role: { $nin: ['owner', 'admin'] } });
  const active = await User.countDocuments({ status: 'active', role: { $nin: ['owner', 'admin'] } });
  const blocked = await User.countDocuments({ status: 'blocked' });
  const deleted = await User.countDocuments({ status: 'deleted' });
  const byPlan = await User.aggregate([
    { $match: { role: { $nin: ['owner', 'admin'] } } },
    { $group: { _id: '$subscription', count: { $sum: 1 } } }
  ]);
  return { total, active, blocked, deleted, byPlan };
}

// [STAFF-DOP] создание сотрудника из кабинета владельца (email + временный пароль + роль) — без seed-скриптов.
// Белый список Б3: только privileged-роли staff/admin и только под authorize('owner'); пароль хэширует pre-save User.
export async function createManagedUser({ email, name, password, role = 'staff' }, actor = 'owner-cabinet') {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new Error('Некорректный email');
  if (!['staff', 'admin'].includes(role)) throw new Error('Недопустимая роль сотрудника');
  const exists = await User.findOne({ email: cleanEmail }).lean();
  if (exists) throw new Error('Пользователь с таким email уже существует');
  const tempPassword = password ? String(password) : crypto.randomBytes(9).toString('base64url');
  if (tempPassword.length < 6) throw new Error('Пароль должен быть не короче 6 символов');
  const user = await User.create({
    email: cleanEmail,
    name: String(name || cleanEmail.split('@')[0]).trim(),
    password: tempPassword,
    role,
    status: 'active',
  });
  await createNode({
    type: 'system',
    content: `Staff account created: ${user.email} (${role})`,
    confidence: 1,
    source: 'user_manager',
    metadata: { userId: user._id, role, actor, type: 'staff_created' }
  });
  // временный пароль возвращаем только если сгенерировали сами (заданный вручную владелец и так знает)
  return { user, tempPassword: password ? undefined : tempPassword };
}

// [STAFF-MGMT] редактирование staff-аккаунта (owner-only на роуте). Гарды:
// цель — только privileged-роли staff/admin/developer (клиентов трогает clients-контур);
// нельзя понизить/изменить свой аккаунт ролево и аккаунт owner — вообще.
// Каждое действие пишется в AuditLog с diff до/после (пароль — фактом смены, без значения).
const STAFF_ROLES = ['staff', 'admin', 'developer'];

export async function updateManagedUser(staffId, patch = {}, actor = {}) {
  const target = await User.findById(staffId);
  if (!target || target.status === 'deleted') throw new Error('Сотрудник не найден');
  if (target.role === 'owner') throw new Error('Аккаунт владельца нельзя редактировать');
  if (!STAFF_ROLES.includes(target.role)) throw new Error('Не staff-аккаунт');
  const isSelf = String(actor.id) === String(target._id);

  const before = { email: target.email, name: target.name, role: target.role };
  const after = { ...before };
  let passwordChanged = false;

  if (patch.email !== undefined && patch.email !== target.email) {
    const cleanEmail = String(patch.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new Error('Некорректный email');
    const exists = await User.findOne({ email: cleanEmail, _id: { $ne: target._id } }).lean();
    if (exists) throw new Error('Пользователь с таким email уже существует');
    after.email = cleanEmail;
  }
  if (patch.name !== undefined && String(patch.name).trim() && patch.name !== target.name) {
    after.name = String(patch.name).trim().slice(0, 80);
  }
  if (patch.role !== undefined && patch.role !== target.role) {
    if (isSelf) throw new Error('Нельзя понизить/сменить роль своего аккаунта');
    if (!['staff', 'admin'].includes(patch.role)) throw new Error('Недопустимая роль сотрудника');
    after.role = patch.role;
  }
  if (patch.password) {
    if (String(patch.password).length < 6) throw new Error('Пароль должен быть не короче 6 символов');
    passwordChanged = true;
  }

  const changed = before.email !== after.email || before.name !== after.name || before.role !== after.role || passwordChanged;
  if (!changed) return { user: target, changed: false };

  target.email = after.email;
  target.name = after.name;
  target.role = after.role;
  if (passwordChanged) target.password = String(patch.password); // хэширует pre-save User
  await target.save();

  const { default: AuditLog } = await import('../models/AuditLog.js');
  await AuditLog.create({
    action: `staff_updated: ${before.email}`,
    user: actor.email || 'owner-cabinet',
    userId: target._id,
    ownerId: actor.id,
    type: 'staff',
    severity: 'medium',
    metadata: { targetId: String(target._id), before, after, passwordChanged },
  }).catch(e => console.warn('[staff] audit write failed:', e.message));
  return { user: target, changed: true };
}

// [STAFF-MGMT] удаление staff-аккаунта: soft-delete (status deleted, isActive false, логин
// анонимизируется — email освобождается для повторного найма). Себя и owner удалить нельзя.
export async function deleteManagedUser(staffId, actor = {}) {
  const target = await User.findById(staffId);
  if (!target || target.status === 'deleted') throw new Error('Сотрудник не найден');
  if (target.role === 'owner') throw new Error('Аккаунт владельца нельзя удалить');
  if (!STAFF_ROLES.includes(target.role)) throw new Error('Не staff-аккаунт');
  if (String(actor.id) === String(target._id)) throw new Error('Нельзя удалить свой аккаунт');

  const before = { email: target.email, name: target.name, role: target.role };
  target.status = 'deleted';
  target.isActive = false;
  target.deletedAt = new Date();
  target.deletedBy = actor.id;
  target.deletionReason = 'staff_removed_by_owner';
  target.email = `deleted_${target._id}@removed.invalid`;
  await target.save();

  const { default: AuditLog } = await import('../models/AuditLog.js');
  await AuditLog.create({
    action: `staff_deleted: ${before.email}`,
    user: actor.email || 'owner-cabinet',
    userId: target._id,
    ownerId: actor.id,
    type: 'staff',
    severity: 'high',
    metadata: { targetId: String(target._id), before, after: { status: 'deleted' } },
  }).catch(e => console.warn('[staff] audit write failed:', e.message));
  return { deleted: true, email: before.email };
}

