import { createOmegaBackend } from '../ai/omega/index.js'
import { OmegaMemory, OmegaSkill, ApiKey } from '../models/index.js'
import { scan as privacyScan } from '../ai/omega/privacyFirewall.js'
import { getContext as getContextEngineContext } from '../ai/omega/contextEngine.js'
import * as neuralGraph from '../ai/omega/neuralGraph.js'
import { chatWithAI } from '../services/aiService.js'
import { checkOmegaGuard, logOmegaGuardEvent } from '../ai/omega/omegaGuard.js'
import { selectResponse } from '../services/omegaBrain/responseSelector.js'
import { rateMemory, OmegaBrainMemory } from '../services/omegaBrain/memoryStore.js'
import { getSkillLevels } from '../services/omegaAgents/skillsSystem.js'
import { generateFromTemplate, listTemplates } from '../services/templatesLibrary.js'
import { analyzeBrandVoiceWithAI, buildBrandVoicePrompt } from '../services/brandVoice.js'
import { isAutopilotEnabled, setAutopilotEnabled, startAutopilot, scheduleAutoPost } from '../services/autoPilot.js'
import { getPreferredProvider } from '../services/selfHealing.js'
import { analyzeChannel, generateShortsScript, generateAutoSubtitles, recommendBestTime } from '../services/youtubeAI.js'
import { analyzeBestTime } from '../services/bestTimeService.js'
import { getTrends, invalidateTrendCache } from '../services/trendScanner.js'
import { generateCover } from '../services/imageGeneration.js'
import User from '../models/User.js'
import axios from 'axios'
import { checkQuota, consumeGeneration } from '../services/usageQuotaService.js'

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

        if (userId) {
            const quota = await checkQuota(userId)
            if (quota.blocked) {
                return res.status(402).json({
                    status: 'error',
                    code: 'QUOTA_EXCEEDED',
                    message: 'Генерации исчерпаны. Докупите пакет, чтобы продолжить.',
                    data: {
                        used: quota.used,
                        limit: quota.limit,
                        topUpPackSize: quota.topUpPackSize,
                        topUpPackPrice: quota.topUpPackPrice,
                    },
                })
            }
        }

        let brandVoicePrompt = ''
        if (userId) {
            try {
                const user = await User.findById(userId).select('brandVoice').lean()
                if (user?.brandVoice) {
                    brandVoicePrompt = buildBrandVoicePrompt(user.brandVoice)
                }
            } catch (err) {
                console.warn('[omegaController:chat] brandVoice load failed:', err.message)
            }
        }

        const userContext = {
            name: req.user?.name || 'пользователь',
            niche: req.user?.preferences?.niche || 'контент',
            language: lang,
            brandVoice: brandVoicePrompt,
        }

        // Ролевой контекст и нейро-граф
        let systemContext = ''
        let graphContextString = ''
        try {
            systemContext = await getContextEngineContext(req.user, message)
        } catch (err) {
            console.warn('[omegaController:chat] contextEngine failed:', err.message)
        }
        try {
            const graphNodes = neuralGraph.getContext(message, 3)
            if (graphNodes.length > 0) {
                graphContextString = 'Контекст из нейро-графа:\n' + graphNodes.map(n => `- [${n.type}] ${n.label}`).join('\n')
            }
        } catch (err) {
            console.warn('[omegaController:chat] neuralGraph failed:', err.message)
        }

        const extraSystemContext = [systemContext, graphContextString].filter(Boolean).join('\n\n')

        const result = userId
            ? await selectResponse(userId, message, userContext, extraSystemContext)
            : await chatWithAI(
                extraSystemContext ? `${extraSystemContext}\n\nВопрос: ${message}` : message,
                history.map(h => ({ role: h.role, content: h.content || h.text })),
                lang,
                { userId }
            )

        if (userId) {
            try {
                await consumeGeneration(userId)
            } catch (err) {
                console.warn('[omegaController:chat] consumeGeneration failed:', err.message)
            }
        }

        let responseText = result.reply || (result.success ? result.reply : 'AI временно недоступен. Попробуйте позже.')

        // [P16] Client role restrictions + OMEGA signature
        if (req.user?.role === 'client') {
            responseText = responseText
                .replace(/\b(MRR|ARR|revenue|доход|прибыль|количество пользователей|user count|стек|stack|users? count)\b[^.\n]*/gi, '[скрыто]')
        }
        const projectName = req.user?.name || req.user?.preferences?.projectName || 'AI Viral Studio'
        if (!responseText.startsWith('Я OMEGA')) {
            responseText = `Я OMEGA, ваш AI-ассистент. Могу помочь с вашим проектом ${projectName}.\n\n${responseText}`
        }

        // Privacy Firewall scan перед отправкой ответа
        try {
            const scanResult = await privacyScan(responseText, req.user?.role, req.user)
            if (scanResult.modified) {
                responseText = scanResult.text
            }
        } catch (err) {
            console.warn('[omegaController:chat] privacy scan failed:', err.message)
        }

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

export async function stats(req, res) {
    try {
        const totalDialogs = await OmegaBrainMemory.countDocuments({ type: 'dialog' })
        const brainResponses = await OmegaBrainMemory.countDocuments({ type: 'dialog', provider: 'brain' })
        const webFactsCount = await OmegaBrainMemory.countDocuments({ type: 'fact' })
        const agentLevels = await getSkillLevels()

        const autonomyScore = totalDialogs > 0 ? Math.round((brainResponses / totalDialogs) * 100) : 0

        res.json({
            status: 'success',
            data: {
                autonomyScore,
                brainCount: brainResponses,
                totalResponses: totalDialogs,
                webFactsCount,
                agentLevels: agentLevels.map(a => ({
                    name: a.name,
                    level: a.level,
                    usageCount: a.usageCount,
                    unlockedSkills: a.unlockedSkills,
                    status: a.status,
                })),
            },
        })
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

export async function generateTemplate(req, res) {
    try {
        const { templateId, variables = {}, autoExpand = true } = req.body
        if (!templateId) {
            return res.status(400).json({ status: 'error', message: 'templateId is required' })
        }
        const base = generateFromTemplate(templateId, variables)
        if (!base) {
            return res.status(404).json({ status: 'error', message: 'template not found' })
        }

        if (autoExpand) {
            const prompt = `По шаблону ниже создай готовый к публикации текст. Заполни пропуски, сохрани структуру, добавь естественные переходы и призыв к действию. Не меняй смысл шаблона.

Название: ${base.name}
Категория: ${base.category}
Шаблон:
${base.text}

Переменные: ${JSON.stringify(variables)}`
            try {
                const aiResult = await chatWithAI(prompt, [], 'ru')
                if (aiResult?.reply) {
                    base.aiText = aiResult.reply
                    base.provider = aiResult.provider || 'ai'
                }
            } catch (err) {
                console.warn('[omegaController:generateTemplate] AI expansion failed:', err.message)
            }
        }

        res.json({ status: 'success', data: base })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

import { getJSON, setJSON, cacheKey } from '../config/redis.js'

export async function listTemplateLibrary(req, res) {
    try {
        const key = cacheKey('omega:templates', 'global')
        const cached = await getJSON(key)
        if (cached) return res.json({ status: 'success', data: cached, cached: true })

        const data = listTemplates()
        await setJSON(key, data, 3600)
        res.json({ status: 'success', data })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function analyzeBrandVoice(req, res) {
    try {
        const { texts, niche } = req.body
        if (!Array.isArray(texts) || texts.length === 0) {
            return res.status(400).json({ status: 'error', message: 'texts array is required' })
        }
        const analysis = await analyzeBrandVoiceWithAI(texts, niche)
        if (!analysis) {
            return res.status(400).json({ status: 'error', message: 'unable to analyze brand voice' })
        }

        const userId = req.user?._id || req.user?.id
        if (userId) {
            try {
                const user = await User.findById(userId).select('brandVoice').lean()
                const enabled = user?.brandVoice?.enabled !== false
                await User.findByIdAndUpdate(userId, {
                    brandVoice: { ...analysis, enabled, updatedAt: new Date() },
                })
                analysis.enabled = enabled
            } catch (err) {
                console.warn('[omegaController:analyzeBrandVoice] save failed:', err.message)
            }
        }

        res.json({ status: 'success', data: analysis })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getBrandVoice(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' })
        const user = await User.findById(userId).select('brandVoice').lean()
        res.json({ status: 'success', data: user?.brandVoice || null })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function toggleBrandVoice(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' })
        const { enabled } = req.body
        const user = await User.findById(userId).select('brandVoice')
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' })
        user.brandVoice = { ...user.brandVoice, enabled: !!enabled, updatedAt: new Date() }
        await user.save()
        res.json({ status: 'success', data: user.brandVoice })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getBestTime(req, res) {
    try {
        const { platform, audienceTimezone, historicalPosts, niche } = req.body || {}
        const result = await analyzeBestTime({ platform, audienceTimezone, historicalPosts, niche })
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getTrendsScout(req, res) {
    try {
        const { niche, force } = req.query || {}
        const userId = req.user?._id || req.user?.id
        const result = await getTrends({ niche, userId, force: force === 'true' })
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function generateCoverImage(req, res) {
    try {
        const { prompt, style, size, seed } = req.body || {}
        if (!prompt) {
            return res.status(400).json({ status: 'error', message: 'prompt is required' })
        }
        const result = await generateCover({ prompt, style, size, seed })
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getAutopilotStatus(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        if (!ownerId) return res.status(401).json({ status: 'error', message: 'Unauthorized' })
        const enabled = await isAutopilotEnabled(ownerId)
        res.json({ status: 'success', data: { enabled } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function setAutopilotStatus(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        if (!ownerId) return res.status(401).json({ status: 'error', message: 'Unauthorized' })
        const { enabled } = req.body
        const next = await setAutopilotEnabled(ownerId, !!enabled)
        res.json({ status: 'success', data: { enabled: next } })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function createAutopilotPost(req, res) {
    try {
        const ownerId = req.user?._id || req.user?.id
        if (!ownerId) return res.status(401).json({ status: 'error', message: 'Unauthorized' })

        const post = await scheduleAutoPost(ownerId, { ...req.body, userId: ownerId })
        res.json({ status: 'success', data: post })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function getSelfHealingStatus(req, res) {
    res.json({ status: 'success', data: { preferredProvider: getPreferredProvider() } })
}

export async function analyzeYouTube(req, res) {
    try {
        const { channelId } = req.query
        const result = await analyzeChannel(channelId)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function generateShorts(req, res) {
    try {
        const { topic, niche, duration } = req.body
        if (!topic) return res.status(400).json({ status: 'error', message: 'topic is required' })
        const result = await generateShortsScript(topic, niche, duration)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function generateSubtitles(req, res) {
    try {
        const { videoUrl } = req.body
        if (!videoUrl) return res.status(400).json({ status: 'error', message: 'videoUrl is required' })
        const result = await generateAutoSubtitles(videoUrl)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

import { synthesizeSpeech } from '../services/voiceService.js'

export async function recommendPublishTime(req, res) {
    try {
        const { channelId } = req.query
        const result = await recommendBestTime(channelId)
        res.json(result)
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

export async function speakVoice(req, res) {
    try {
        const userId = req.user?._id || req.user?.id
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' })
        const { text } = req.body
        if (!text) return res.status(400).json({ status: 'error', message: 'Text is required' })
        const result = await synthesizeSpeech(userId, text)
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}
