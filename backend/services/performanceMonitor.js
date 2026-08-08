import { createNode } from './cognitiveMesh.js'

const METRICS = []

export function recordMetric(name, duration, success = true, metadata = {}) {
  METRICS.push({ timestamp: new Date(), name, duration, success, metadata })
  if (METRICS.length > 500) METRICS.shift()
}

export function getSlowQueries(threshold = 2000) {
  return METRICS.filter(m => m.duration > threshold && m.success).sort((a, b) => b.duration - a.duration).slice(0, 10)
}

export function getFailureRate(name) {
  const relevant = METRICS.filter(m => m.name === name)
  if (relevant.length === 0) return 0
  return relevant.filter(m => !m.success).length / relevant.length
}

export async function generateOptimizationReport(ownerId) {
  const slow = getSlowQueries()
  const failures = METRICS.filter(m => !m.success).slice(-20)
  const report = { slowQueries: slow, failures, recommendations: [] }
  if (slow.some(m => m.name === 'chatWithAI')) report.recommendations.push({ target: 'chatWithAI', action: 'Add response caching for repeated queries', priority: 'high' })
  if (slow.some(m => m.name === 'queryMesh')) report.recommendations.push({ target: 'queryMesh', action: 'Add MongoDB index on createdAt + type', priority: 'high' })
  await createNode({ type: 'system', content: `Performance report: ${slow.length} slow queries, ${failures.length} failures`, confidence: 0.9, source: 'performance_monitor', metadata: { ownerId, report, type: 'performance_report' } })
  return report
}
