import mongoose from 'mongoose'
import User from '../models/User.js'

/**
 * Build a MongoDB filter that returns all keys belonging to a given owner,
 * plus "orphan" documents that have no ownerId (legacy / pre-v9.9.19.5 keys).
 * The project is single-owner, so orphan keys are treated as the owner's keys.
 */
export function getOwnerScope(ownerId) {
  const scopes = [
    { ownerId: { $exists: false } },
    { ownerId: null },
  ]

  if (ownerId) {
    const str = String(ownerId)
    scopes.push({ ownerId: str })
    if (mongoose.Types.ObjectId.isValid(str)) {
      scopes.push({ ownerId: new mongoose.Types.ObjectId(str) })
    }
  }

  return { $or: scopes }
}

/**
 * Express-friendly wrapper: extracts ownerId from req.user.
 */
export function getOwnerKeyScope(req) {
  const ownerId = req?.user?.id || req?.user?._id
  return getOwnerScope(ownerId)
}

/**
 * For background jobs / hot-reload that have no request object.
 */
export async function getDefaultOwnerId() {
  const owner = await User.findOne({ role: 'owner' }).select('_id').lean()
  return owner?._id || null
}
