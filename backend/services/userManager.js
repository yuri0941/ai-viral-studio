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
  const client = await User.findByIdAndUpdate(
    clientId,
    { status: 'blocked', blockedAt: new Date(), blockedReason: reason, blockedBy: ownerId },
    { new: true }
  );
  if (!client) throw new Error('Client not found');
  return { success: true, client };
}

export async function unblockClient(clientId, ownerId) {
  const client = await User.findByIdAndUpdate(
    clientId,
    { status: 'active', blockedAt: null, blockedReason: null, blockedBy: null },
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
