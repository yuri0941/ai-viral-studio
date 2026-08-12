import '../config/env.js'
import { connectDB } from '../config/database.js'
import ScheduledPost from '../models/ScheduledPost.js'
import { getConnectedSocials } from '../utils/connectedSocials.js'

/**
 * [v9.9.19.15.5] Разовое восстановление постов, убитых багом vk_not_connected / отсутствием ключа.
 * Находит ScheduledPost со status=failed за последние 7 дней, где причина связана с
 * отсутствием/невалидностью VK community key или group id.
 * getConnectedSocials теперь читает root-level поля vkCommunityKey/vkGroupId.
 * Только dry-run по умолчанию; с --apply переводит в scheduled (due = now+5min).
 *
 * node backend/scripts/requeueVkFailedPosts.js           # dry-run
 * node backend/scripts/requeueVkFailedPosts.js --apply   # применить
 */

const APPLY = process.argv.includes('--apply')
const SINCE = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

function textHash(post) {
  const text = String(post.content || '') + '|' + String(post.title || '') + '|' + String(post.hashtags || '')
  let h = 0
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h) + text.charCodeAt(i)
    h |= 0
  }
  return String(h)
}

const FAILED_REASONS = [
  'vk_not_connected',
  'vk_needs_wall_scope',
  'not_connected',
  'no_group',
  'invalid_group',
  'vk_invalid_token',
  'vk_wall_denied',
  'vk_access_denied',
  'vk_group_disabled',
  'vk_invalid_group',
  '0 platforms published',
  'ни одна платформа',
  'no platforms connected'
]

function matchesOldBug(post) {
  const text = String(post.errorMessage || '') + ' ' + JSON.stringify(post.publishResults || [])
  return FAILED_REASONS.some(reason => text.toLowerCase().includes(reason.toLowerCase()))
}

async function main() {
  await connectDB()

  const candidates = await ScheduledPost.find({
    status: 'failed',
    createdAt: { $gte: SINCE },
    platforms: { $in: ['vk'] }
  }).sort({ createdAt: -1 })

  const matched = candidates.filter(matchesOldBug)

  console.log(`[requeue] найдено ${candidates.length} failed-постов с vk за 7 дней, из них по причине старого бага: ${matched.length}`)

  const toRequeue = []
  const skipped = []

  for (const post of matched) {
    const status = await getConnectedSocials(post.userId)
    const vkOk = status.vk.connected
    const item = { id: String(post._id), title: post.title || '(no title)', userId: String(post.userId), vkConnected: vkOk, reason: post.errorMessage?.slice(0, 120) || '' }

    if (vkOk) {
      toRequeue.push({ post, item })
    } else {
      skipped.push({ ...item, vkStatus: status.vk })
    }
  }

  console.log('\n[requeue] dry-run: посты, готовые к переочереди:')
  for (const { item } of toRequeue) {
    console.log(`  - ${item.id} | "${item.title}" | user=${item.userId} | vk=connected`)
  }

  if (skipped.length) {
    console.log('\n[requeue] пропущены (VK всё ещё не подключён):')
    for (const item of skipped) {
      console.log(`  - ${item.id} | "${item.title}" | user=${item.userId} | vkStatus=${JSON.stringify(item.vkStatus)}`)
    }
  }

  // [v9.9.19.15.6] dedupe by content hash: keep only 1 post per duplicate text group
  const hashGroups = new Map()
  for (const { post } of toRequeue) {
    const h = textHash(post)
    if (!hashGroups.has(h)) hashGroups.set(h, [])
    hashGroups.get(h).push(post)
  }

  const unique = []
  const duplicates = []
  for (const group of hashGroups.values()) {
    if (group.length > 1) {
      unique.push(group[0])
      duplicates.push(...group.slice(1))
    } else {
      unique.push(group[0])
    }
  }

  if (!APPLY) {
    console.log(`\n[requeue] DRY-RUN. Передайте --apply для применения.`)
    if (duplicates.length) {
      console.log(`[requeue] найдено ${duplicates.length} дубликатов, которые будут отменены`)
    }
    process.exit(0)
  }

  let updated = 0
  for (const post of unique) {
    post.status = 'scheduled'
    post.scheduledAt = new Date(Date.now() + 5 * 60 * 1000)
    post.retriedAt = undefined
    post.errorMessage = '[requeue] recovered from old vk_not_connected bug'
    await post.save()
    updated++
    console.log(`[requeue] recovered ${post._id} → scheduled at ${post.scheduledAt.toISOString()}`)
  }

  let cancelled = 0
  for (const post of duplicates) {
    post.status = 'cancelled'
    post.errorMessage = 'duplicate_requeue'
    await post.save()
    cancelled++
  }

  if (cancelled) {
    console.log(`[VK Requeue] deduped ${cancelled} duplicates`)
  }

  console.log(`\n[requeue] применено: ${updated} постов переочереднено, ${cancelled} отменено как дубликаты, ${skipped.length} пропущено.`)
  process.exit(0)
}

main().catch(err => {
  console.error('[requeue] fatal:', err.message)
  process.exit(1)
})
