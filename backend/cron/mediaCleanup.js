import fs from 'fs'
import path from 'path'
import ScheduledPost from '../models/ScheduledPost.js'
import User from '../models/User.js'

// [19.17.7-SCHEDULER-UX] media-queue cleanup:
//  - delete unreferenced files older than 7 days
//  - enforce a 5 GB per-user disk limit for queued media

const ORPHAN_AGE_MS = 7 * 24 * 60 * 60 * 1000
const USER_LIMIT_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB

function absoluteFromRelative(rel) {
  if (!rel) return ''
  if (rel.startsWith('/')) return path.join(process.cwd(), rel)
  return path.join(process.cwd(), 'uploads', rel)
}

function isReferenced(filePath) {
  const abs = path.resolve(filePath)
  const rel = abs.replace(process.cwd(), '').replace(/\\/g, '/')
  const relNoLeading = rel.startsWith('/') ? rel.slice(1) : rel
  return ScheduledPost.findOne({
    $or: [
      { mediaUrl: { $regex: escapeRegex(path.basename(filePath)) } },
      { youtubeVideoPath: abs },
      { youtubeThumbnailPath: abs },
      { youtubeVideoPath: rel },
      { youtubeThumbnailPath: rel },
      { youtubeVideoPath: relNoLeading },
      { youtubeThumbnailPath: relNoLeading },
    ],
  }).lean()
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function listFiles(dir) {
  const files = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await listFiles(full)))
      } else {
        const stat = fs.statSync(full)
        files.push({ path: full, size: stat.size, mtime: stat.mtime })
      }
    }
  } catch (e) {
    // directory may not exist
  }
  return files
}

export async function runMediaCleanup() {
  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadsDir)) return { deleted: 0, freed: 0 }

  let deleted = 0
  let freed = 0
  const now = Date.now()

  const allFiles = await listFiles(uploadsDir)

  // 1. Delete unreferenced files older than 7 days.
  for (const file of allFiles) {
    if (now - file.mtime.getTime() < ORPHAN_AGE_MS) continue
    const ref = await isReferenced(file.path)
    if (ref) continue
    try {
      fs.unlinkSync(file.path)
      deleted++
      freed += file.size
    } catch (e) {
      console.warn('[mediaCleanup] unlink failed:', file.path, e.message)
    }
  }

  // 2. Enforce 5 GB per-user limit across remaining unreferenced media.
  //    We group by userId from path: uploads/<userId>/...
  const byUser = {}
  const remaining = await listFiles(uploadsDir)
  for (const file of remaining) {
    const rel = path.relative(uploadsDir, file.path).replace(/\\/g, '/')
    const userId = rel.split('/')[0]
    if (!userId) continue
    const ref = await isReferenced(file.path)
    if (ref) continue // referenced files count against the user too, but we do not delete them
    if (!byUser[userId]) byUser[userId] = []
    byUser[userId].push(file)
  }

  for (const [userId, files] of Object.entries(byUser)) {
    const total = files.reduce((s, f) => s + f.size, 0)
    if (total <= USER_LIMIT_BYTES) continue
    const sorted = files.sort((a, b) => a.mtime - b.mtime) // oldest first
    let over = total
    for (const file of sorted) {
      if (over <= USER_LIMIT_BYTES) break
      try {
        fs.unlinkSync(file.path)
        deleted++
        freed += file.size
        over -= file.size
      } catch (e) {
        console.warn('[mediaCleanup] quota unlink failed:', file.path, e.message)
      }
    }
  }

  return { deleted, freed }
}
