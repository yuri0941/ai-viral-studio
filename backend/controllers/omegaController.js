import { createOmegaBackend } from '../ai/omega/index.js'
import { OmegaMemory, OmegaSkill, ApiKey } from '../models/index.js'
import { chatWithAI } from '../services/aiService.js'
import { checkOmegaGuard, logOmegaGuardEvent } from '../ai/omega/omegaGuard.js'
import { selectResponse } from '../services/omegaBrain/responseSelector.js'
import { rateMemory } from '../services/omegaBrain/memoryStore.js'
import axios from 'axios'

let omegaCore = null

async function getOmegaCore() {
    if (!omegaCore) {
        omegaCore = await createOmegaBackend()
    }
    return omegaCore
}

export async function getStatus(req, res) {
    try {
        const core = await getOmegaCore()
        res.json({ status: 'success', data: core.getStatus() })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function chat(req, res) {
    try {
        const { message, history = [] } = req.body
        if (!message) {
            return res.status(400).json({ status: 'error', message: 'message is required' })
        }

        const lang = req.body.lang || 'ru'
        const guard = checkOmegaGuard(message, lang)
        if (guard.blocked) {
            await logOmegaGuardEvent({
                userId: req.user?.id || req.user?._id,
                message,
                matched: guard.matched,
                lang
            })
            return res.status(403).json({
                status: 'error',
                message: guard.message,
                data: { blocked: true, reason: 'forbidden_topic' }
            })
        }

        const core = await getOmegaCore()
        const decision = await core.decide({ message, history })

        const userId = req.user?._id || req.user?.id
        const userContext = {
            name: req.user?.name || 'пользователь',
            niche: req.user?.preferences?.niche || 'контент',
            language: lang,
        }

        const result = userId
            ? await selectResponse(userId, message, userContext)
            : await chatWithAI(message, history.map(h => ({ role: h.role, content: h.content || h.text })), lang)

        const responseText = result.reply || (result.success ? result.reply : 'AI временно недоступен. Попробуйте позже.')

        res.json({
            status: 'success',
            data: {
                response: responseText,
                decision,
                provider: result.provider || core.activeProvider || null,
                memoryId: result.memoryId || null,
                usage: result.usage || null,
                cached: result.cached || false,
            },
        })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getMemory(req, res) {
    try {
        const { query, limit = 5 } = req.query
        const ownerId = req.user?._id || req.query.ownerId

        let entries = []
        if (ownerId && OmegaMemory) {
            const doc = await OmegaMemory.findOne({ ownerId })
            entries = doc ? doc.entries : []
        }

        if (query) {
            const lower = query.toLowerCase()
            entries = entries.filter(e =>
                JSON.stringify(e.content).toLowerCase().includes(lower) ||
                e.tags?.some(t => t.toLowerCase().includes(lower))
            )
        }

        res.json({ status: 'success', data: { entries: entries.slice(0, Number(limit)) } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function createMemory(req, res) {
    try {
        const { level, content, tags, ownerId } = req.body
        if (!level || content === undefined) {
            return res.status(400).json({ status: 'error', message: 'level and content are required' })
        }

        let doc
        if (ownerId && OmegaMemory) {
            doc = await OmegaMemory.findOneAndUpdate(
                { ownerId },
                {
                    $push: {
                        entries: {
                            level,
                            content,
                            tags: tags || [],
                            createdAt: new Date(),
                        },
                    },
                },
                { upsert: true, new: true }
            )
        }

        res.json({ status: 'success', data: { entry: doc?.entries?.at(-1) || { level, content, tags } } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getSkills(req, res) {
    try {
        const ownerId = req.user?._id || req.query.ownerId
        let skills = []
        if (ownerId && OmegaSkill) {
            skills = await OmegaSkill.find({ ownerId }).lean()
        }
        res.json({ status: 'success', data: { skills } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function learnSkill(req, res) {
    try {
        const { skillId, ownerId } = req.body
        if (!skillId) {
            return res.status(400).json({ status: 'error', message: 'skillId is required' })
        }

        let skill
        if (ownerId && OmegaSkill) {
            skill = await OmegaSkill.findOneAndUpdate(
                { ownerId, id: skillId },
                { $inc: { experience: 10 } },
                { new: true, upsert: false }
            )
        }

        res.json({
            status: 'success',
            data: {
                skillId,
                learned: !!skill,
                experience: skill?.experience || 0,
            },
        })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function rate(req, res) {
    try {
        const { memoryId, rating } = req.body
        if (!memoryId || typeof rating !== 'number') {
            return res.status(400).json({ status: 'error', message: 'memoryId and rating are required' })
        }
        const doc = await rateMemory(memoryId, rating)
        if (!doc) {
            return res.status(404).json({ status: 'error', message: 'memory not found' })
        }
        res.json({ status: 'success', data: { memoryId, rating: doc.rating } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function sendCommand(req, res) {
    try {
        const { command, params = {} } = req.body
        if (!command) {
            return res.status(400).json({ status: 'error', message: 'command is required' })
        }

        const core = await getOmegaCore()
        const decision = await core.decide({ message: command, ...params })

        let result = null
        if (decision.skillId) {
            result = await core.executeSkill(decision.skillId, params)
        } else if (decision.toolId) {
            result = await core.executeTool(decision.toolId, params)
        }

        res.json({
            status: 'success',
            data: {
                command,
                decision,
                result,
                provider: core.activeProvider,
            },
        })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}
