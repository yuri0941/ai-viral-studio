import { createNode } from './cognitiveMesh.js';

const WAITLIST = [];

export async function joinWaitlist(email, source = 'landing') {
  const entry = { email, source, date: new Date(), status: 'pending', approved: false };
  WAITLIST.push(entry);
  await createNode({ type: 'system', content: `New waitlist entry: ${email}`, confidence: 1, source: 'waitlist', metadata: { email, source, type: 'waitlist_join' } });
  return { success: true, position: WAITLIST.length };
}

export function getWaitlist() { return WAITLIST; }

export function approveWaitlist(email) {
  const entry = WAITLIST.find(w => w.email === email);
  if (entry) { entry.approved = true; entry.status = 'approved'; }
  return entry;
}
