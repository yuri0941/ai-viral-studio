import ScheduledPost from '../models/ScheduledPost.js'
import PublishLog from '../models/PublishLog.js'
import User from '../models/User.js'
import fs from 'fs'
import path from 'path'

// [HOTFIX] re-export runMediaCleanup so autoPublisher.js can import it from this module.
export { runMediaCleanup } from './mediaCleanup.js'

// [19.17.7-SCHEDULER-UX] clean up scheduled posts/files by TTL and archive to PublishLog before deletion.

export async function deletePostFiles(post) {
  const candidates = [
    post?.youtubeVideoPath,
    post?.youtubeThumbnailPath,
    post?.mediaUrl,
  ].filter(Boolean)
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p)
    } catch (e) {
      console.warn('[schedulerCleanup] file delete failed:', p, e.message)
    }
  }
}

async function archiveToPublishLog(post) {
  if (!post) return
  const already = await PublishLog.findOne({ scheduledPostId: post._id }).lean()
  if (already) return
  const platform = (post.platforms || [])[0] || ''
  const isYoutube = platform === 'youtube'
  await PublishLog.create({
    userId: post.userId,
    scheduledPostId: post._id,
    platform,
    type: isYoutube ? 'video' : (post.types || [])[0] || '',
    title: post.title || '',
    videoId: post.youtubeVideoId || '',
    url: post.publishedUrl || post.youtubeVideoUrl || '',
    status: post.status === 'published' ? 'published' : 'failed',
    errorMessage: post.errorMessage || '',
    publishedAt: post.publishedAt || post.createdAt || new Date(),
  })
}

// Reads user's auto-clean TTL preference and returns autoDeleteAt Date for a just-published post.
function computeAutoDeleteAt(user, publishedAt = new Date()) {
  const ttl = user?.preferences?.autoCleanTTL
  if (ttl === -1) return null // never
  const minutes = Number.isFinite(ttl) ? ttl : 15
  if (minutes <= 0) return new Date(publishedAt.getTime()) // immediately
  return new Date(publishedAt.getTime() + minutes * 60 * 1000)
}

// Called from autoPublisher after a successful publish.
export async function onPostPublished(post, user) {
  await deletePostFiles(post)
  const autoDeleteAt = computeAutoDeleteAt(user, post.publishedAt)
  const update = { autoDeleteAt }
  if (post.status !== 'published') update.status = 'published'
  await ScheduledPost.updateOne({ _id: post._id }, { $set: update })
}

// Called from autoPublisher after a permanent failure.
export async function onPostFailed(post) {
  const fileExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h for retry file retention
  await ScheduledPost.updateOne({ _id: post._id }, { $set: { fileExpiresAt } })
}

// Main cleanup job (runs every 5 minutes via autoPublisher, or can be called standalone).
export async function runSchedulerCleanup() {
  const now = new Date()

  // 1. Delete published posts whose autoDeleteAt has passed.
  // Skip paused/scheduled — they are not yet published.
  const expiredPublished = await ScheduledPost.find({
    status: 'published',
    autoDeleteAt: { $lte: now },
    hidden: { $ne: true },
  }).limit(100)

  for (const post of expiredPublished) {
    await archiveToPublishLog(post)
    await deletePostFiles(post)
    await ScheduledPost.deleteOne({ _id: post._id })
  }

  // 2. Expired failed-post files -> delete files and move post to 'error' status.
  const expiredFailed = await ScheduledPost.find({
    status: 'failed',
    fileExpiresAt: { $lte: now },
    hidden: { $ne: true },
  }).limit(100)

  for (const post of expiredFailed) {
    await archiveToPublishLog(post)
    await deletePostFiles(post)
    await ScheduledPost.updateOne(
      { _id: post._id },
      { $set: { status: 'error', errorMessage: post.errorMessage || 'retention_expired' } }
    )
  }

  // 3. Safety net: delete any paused/scheduled posts should NOT be touched.

  return { publishedDeleted: expiredPublished.length, failedExpired: expiredFailed.length }
}
