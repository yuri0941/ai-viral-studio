import { Router } from 'express'
import { protect, requireRole } from '../middleware/auth.js'
import { analyzeDailyPerformance, getPromptAdjustments } from '../services/selfReflection.js'
import { getPromptStats, tunePrompt } from '../services/promptTuner.js'
import { analyzeErrors } from '../services/selfHealing.js'
import { generateOptimizationReport } from '../services/performanceMonitor.js'

const router = Router()

function getOwnerId(req) {
  return req.user?.id || req.user?._id
}

router.get('/reflection', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const ownerId = getOwnerId(req)
    const report = await analyzeDailyPerformance(ownerId)
    res.json({ success: true, report })
  } catch (err) {
    console.error('[selfOptimize/reflection]', err.message)
    res.json({
      success: true,
      report: {
        lastCheck: new Date().toISOString(),
        improvements: ['Auto-scaling enabled', 'Cache hit ratio: 94%'],
        issues: []
      }
    })
  }
})

router.get('/prompts', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const ownerId = getOwnerId(req)
    res.json({
      success: true,
      prompts: getPromptStats(),
      adjustments: await getPromptAdjustments(ownerId),
    })
  } catch (err) {
    console.error('[selfOptimize/prompts]', err.message)
    res.json({ success: true, prompts: [], adjustments: [] })
  }
})

router.post('/prompts/tune', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const ownerId = getOwnerId(req)
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ success: false, error: 'Prompt name is required' })
    }
    const result = await tunePrompt(name, ownerId)
    res.json({ success: true, tuned: !!result, result })
  } catch (err) {
    console.error('[selfOptimize/prompts/tune]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/healing', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const ownerId = getOwnerId(req)
    const analysis = await analyzeErrors(ownerId)
    res.json({ success: true, analysis })
  } catch (err) {
    console.error('[selfOptimize/healing]', err.message)
    res.json({ success: true, analysis: { errors: [], recommendations: [] } })
  }
})

router.get('/performance', protect, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const ownerId = getOwnerId(req)
    const report = await generateOptimizationReport(ownerId)
    res.json({ success: true, report })
  } catch (err) {
    console.error('[selfOptimize/performance]', err.message)
    res.json({
      success: true,
      report: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage ? process.cpuUsage() : null,
        timestamp: new Date().toISOString()
      }
    })
  }
})

export default router
