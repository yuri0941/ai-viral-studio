import { createOmegaBackend } from '../ai/omega/index.js'
import { OmegaMemory, OmegaSkill, ApiKey } from '../models/index.js'
import { scan as privacyScan } from '../ai/omega/privacyFirewall.js'
import { getContext as getContextEngineContext } from '../ai/omega/contextEngine.js'
import * as neuralGraph from '../ai/omega/neuralGraph.js'
import { chatWithAI } from '../services/aiService.js'
import { checkOmegaGuard, logOmegaGuardEvent, checkCommandRole } from '../ai/omega/omegaGuard.js'
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
import { searchWithFallback } from '../ai/omega/webSearch.js'
import { generateVideoScript, generateVideoPlaceholder, startReplicateVideo } from '../services/aiVideoService.js'
import User from '../models/User.js'
import axios from 'axios'
import { checkQuota, consumeGeneration } from '../services/usageQuotaService.js'
import { scrapeVideo } from '../services/youtubeScraper.js'
import dialogueEvolution from '../ai/omega/dialogueEvolution.js'

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
        const { message, history = [], userRole = 'guest', userId: chatUserId } = req.body
        if (!message) {
            return res.status(400).json({ status: 'error', message: 'message is required' })
        }

        const lang = req.body.lang || 'ru'
        // [HOTFIX-2026-08-04] added role context
        const roleContext = {
            owner: 'Вы владелец платформы. Полный доступ ко всем данным.',
            admin: 'Вы администратор. Доступ: пользователи, модерация, контент.',
            staff: 'Вы сотрудник поддержки. Доступ: тикеты, база знаний, чат.',
            creator: 'Вы клиент (creator). Доступ: свой проект, аналитика, контент.',
            advertiser: 'Вы рекламодатель. Доступ: кампании, бюджет, отчёты.',
            guest: 'Вы гость. Доступ: ограниченные функции.'
        }[userRole] || 'Вы пользователь.'

        const guard = checkOmegaGuard(message, lang, userRole)
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

        // [v5.9-CONT] added: command role restriction
        const cmdGuard = checkCommandRole(message, req.user?.role || userRole)
        if (!cmdGuard.allowed) {
            await logOmegaGuardEvent({
                userId: req.user?.id || req.user?._id,
                message,
                matched: [cmdGuard.command],
                lang
            })
            return res.status(403).json({
                status: 'error',
                message: cmdGuard.message,
                data: { blocked: true, reason: 'role_forbidden_command' }
            })
        }

        const core = await getOmegaCore()
        const decision = await core.decide({ message, history })

        const userId = req.user?._id || req.user?.id

        // [MONETIZE-2026-08-04] added: consume quota before AI call
        if (userId) {
            try {
                const quota = await consumeGeneration(userId)
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
            } catch (err) {
                if (err.message === 'QUOTA_EXCEEDED') {
                    const quota = await checkQuota(userId)
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
                console.warn('[omegaController:chat] quota check failed:', err.message)
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
            role: req.user?.role || userRole || 'guest', // [v5.9-CONT] added
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

        let searchContextString = ''
        const searchIntent = /\b(поиск|найди|search|google|новости|тренд|reddit|twitter|новост)/i.test(message)
        if (searchIntent) {
            try {
                const search = await searchWithFallback(message)
                if (search?.sources?.length) {
                    searchContextString = `Результаты веб-поиска:\n${search.summary}\n` +
                        search.sources.map((s, i) => `${i + 1}. ${s.title} — ${s.link}\n${s.snippet}`).join('\n')
                }
            } catch (err) {
                console.warn('[omegaController:chat] webSearch failed:', err.message)
            }
        }

        const extraSystemContext = [systemContext, graphContextString, searchContextString].filter(Boolean).join('\n\n')

        const result = userId
            ? await selectResponse({
                userId,
                userContext,
                userRole: req.user?.role || userRole, // [v5.9-CONT] added
                message,
                history,
                providers: [],
                language: req.body.language || req.user?.preferences?.language || lang,
                extraSystem: extraSystemContext,
            })
            : await chatWithAI(
                extraSystemContext ? `${extraSystemContext}\n\nВопрос: ${message}` : message,
                history.map(h => ({ role: h.role, content: h.content || h.text })),
                lang,
                { userId, ownerId: userId, userRole, extraSystem: roleContext, chatUserId }
            )

        let reasoning = ''
        try {
            const thought = await core.think(message, req.user?.role)
            reasoning = thought?.reasoning || ''
        } catch (err) {
            console.warn('[omegaController:chat] think failed:', err.message)
        }

        let responseText = result.reply || (result.success ? result.reply : 'AI временно недоступен. Попробуйте позже.')

        // [P16] Client role restrictions + OMEGA signature
        if (req.user?.role === 'client') {
            responseText = responseText
                .replace(/\b(MRR|ARR|revenue|доход|прибыль|количество пользователей|user count|стек|stack|users? count)\b[^.\n]*/gi, '[скрыто]')
        }
        // Privacy Firewall scan перед отправкой ответа
        try {
            const scanResult = await privacyScan(responseText, userRole, req.user)
            if (scanResult.modified) {
                responseText = scanResult.text
            }
        } catch (err) {
            console.warn('[omegaController:chat] privacy scan failed:', err.message)
        }

        // [v6.6] Dialogue evolution: tone adaptation + emotional memory
        try {
            const userId = req.user?._id || req.user?.id
            if (userId) {
                await dialogueEvolution.trackTone(userId, message)
                if (/раздраж|frustrated|angry|annoyed|wtf|бесит|долго|не помогает/i.test(message)) {
                    await dialogueEvolution.emotionalMemory(userId, 'frustration', 0.8)
                }
                responseText = await dialogueEvolution.adaptResponse(userId, responseText)
            }
        } catch (err) {
            console.warn('[omegaController:chat] dialogue evolution failed:', err.message)
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
                reasoning,
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
        const userId = req.user?._id || req.user?.id
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
                const aiResult = await chatWithAI(prompt, [], 'ru', { ownerId: userId, userRole: req.user?.role || req.body?.userRole || 'guest' })
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

// [VALUE-2026-08-04] added: structured video analysis with AI + Smart Demo fallback
export async function analyzeVideo(req, res) {
    try {
        const { url, niche = 'контент', language = 'ru' } = req.body
        if (!url) {
            return res.status(400).json({ status: 'error', message: 'url is required' })
        }

        const platform =
            /youtube\.com\/shorts|youtu\.be/.test(url) ? 'youtube-shorts' :
            /youtube\.com/.test(url) ? 'youtube' :
            /tiktok\.com/.test(url) ? 'tiktok' :
            /instagram\.com/.test(url) ? 'instagram' :
            /x\.com|twitter\.com/.test(url) ? 'twitter' : 'unknown'

        // [MASTER-v5.0] added: real scraping metadata
        const metadata = await scrapeVideo(url)
        if (metadata.error && !metadata.title) {
            return res.status(400).json({ status: 'error', message: metadata.error || 'Проверьте ссылку или попробуйте позже' })
        }

        const prompt = `Проанализируй видео "${metadata.title || ''}" автора "${metadata.author || ''}" по ссылке ${url}. Выдай: 1) Хук (первые 3 сек) 2) CTA 3) Вирусные моменты с таймкодами 4) Что улучшить. Ниша: ${niche}. На ${language === 'ru' ? 'русском' : 'английском'}.`

        let aiText = ''
        let provider = 'demo'
        try {
            const userId = req.user?._id || req.user?.id
            const aiResult = await chatWithAI(prompt, [], language, { ownerId: userId, userRole: req.user?.role || req.body?.userRole || 'guest' })
            aiText = aiResult?.reply || ''
            provider = aiResult?.provider || 'demo'
        } catch (err) {
            console.warn('[omegaController:analyzeVideo] AI failed:', err.message)
        }

        // Try to parse structured fields from AI response
        const hook = aiText.match(/(?:1[).]|Хук[:\s]).*/i)?.[0]?.replace(/^.*?(?:1[).]|Хук[:\s])/i, '').trim() ||
            aiText.split('\n').find(l => /хук|первые 3/i.test(l))?.replace(/^[^а-яёa-z]*/i, '').trim() || ''
        const cta = aiText.match(/(?:2[).]|CTA[:\s]|Призыв[:\s]).*/i)?.[0]?.replace(/^.*?(?:2[).]|CTA[:\s]|Призыв[:\s])/i, '').trim() ||
            aiText.split('\n').find(l => /cta|призыв/i.test(l))?.replace(/^[^а-яёa-z]*/i, '').trim() || ''
        const improvements = []
        const viralMoments = []
        aiText.split('\n').forEach(line => {
            const vm = line.match(/(?:\d+[:\.]\d+|\d{1,2}:\d{2})\s*[\-–:]\s*(.+)/i)
            if (vm && viralMoments.length < 5) {
                viralMoments.push({ time: vm[1].trim(), label: vm[2].trim() })
            }
            if (/улучш|рекомендац|сделай|добавь|убери/i.test(line) && !line.match(/^\d+[:\.]\d+/)) {
                improvements.push(line.replace(/^[^а-яёa-z]*/i, '').trim())
            }
        })

        // Smart Demo fallback if AI empty or demo
        const isDemo = !aiText || provider === 'demo' || provider === 'smart-demo'
        const smartDemo = {
            hook: hook || 'Хук: конкретный результат в первые 3 секунды («Я получил X за Y дней»)',
            cta: cta || 'CTA: подпишись и сохрани, если узнал что-то новое',
            viralMoments: viralMoments.length ? viralMoments : [
                { time: '00:00-00:03', label: 'Хук — обещание результата' },
                { time: '00:10-00:15', label: 'Доказательство / кейс' },
                { time: '00:25-00:30', label: 'CTA и подписка' }
            ],
            improvements: improvements.length ? improvements.slice(0, 5) : [
                'Добавьте субтитры — +30% досмотров',
                'Усильте хук цифрами в первые 3 секунды',
                'Используйте 3–5 релевантных хештегов',
                'Сделайте обложку с крупным текстом',
                'Публикуйте в 19:00–21:00 по аудитории'
            ],
            platform,
            duration: '45 сек'
        }

        res.json({
            status: 'success',
            data: {
                ...smartDemo,
                aiText,
                provider,
                demo: isDemo,
                url,
                niche,
                title: metadata.title || '',
                author: metadata.author || '',
                thumbnail: metadata.thumbnail || '',
            }
        })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

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
        // [HOTFIX-2026-08-04] added — return brand voice with explicit enabled flag
        const brandVoice = user?.brandVoice || {}
        res.json({ status: 'success', data: { ...brandVoice, enabled: brandVoice.enabled || false } })
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
        const { text, voiceId } = req.body
        if (!text) return res.status(400).json({ status: 'error', message: 'Text is required' })
        const result = await synthesizeSpeech(userId, text, voiceId)
        res.json({ status: 'success', data: result })
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message })
    }
}

// [P19] added: AI Video (Shorts/Reels) generation
export async function generateVideo(req, res) {
    try {
        const { topic, niche, duration } = req.body || {}
        if (!topic) return res.status(400).json({ status: 'error', message: 'topic is required' })

        const script = await generateVideoScript(topic, niche, duration)
        const placeholder = generateVideoPlaceholder(script)
        const replicate = await startReplicateVideo(topic, duration)

        return res.json({
            status: 'success',
            data: {
                script,
                placeholder,
                replicate,
                fallback: !replicate,
            },
        })
    } catch (err) {
        console.error('[omegaController:generateVideo]', err.message)
        return res.status(500).json({ status: 'error', message: err.message })
    }
}
