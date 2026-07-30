// ============================================
// useOmega — главный хук доступа к OMEGA Core
// ============================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { OmegaCore, OmegaMemory, registerDefaultSkills, registerDefaultTools } from '../ai/omega/index.js'
import { omegaApi } from '../services/api.js'

const DEFAULT_PROVIDERS = [
    { id: 'groq', name: 'Groq', enabled: true, hasKey: true, reliability: 0.96, latency: 120, strengths: ['chat', 'code'] },
    { id: 'openrouter', name: 'OpenRouter', enabled: true, hasKey: true, reliability: 0.94, latency: 180, strengths: ['chat', 'vision'] },
    { id: 'deepseek', name: 'DeepSeek', enabled: true, hasKey: true, reliability: 0.92, latency: 250, strengths: ['chat', 'analysis'] },
]

export function useOmega(options = {}) {
    const coreRef = useRef(null)
    const memoryRef = useRef(null)
    const [status, setStatus] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        const core = new OmegaCore(options.core)
        registerDefaultSkills(core)
        registerDefaultTools(core)
        core.setProviders(options.providers || DEFAULT_PROVIDERS)

        const memory = new OmegaMemory({ ownerId: options.ownerId || 'default', ...options.memory })
        core.memory = memory

        coreRef.current = core
        memoryRef.current = memory
        setStatus(core.getStatus())
    }, [])

    const sendChatMessage = useCallback(async (message, history = []) => {
        if (!coreRef.current) return null
        setIsLoading(true)
        setError(null)
        try {
            const normalizedHistory = history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text || msg.content || '',
            }))

            const json = await omegaApi.chat(message, normalizedHistory)
            if (json.status !== 'success') throw new Error(json.message || 'OMEGA request failed')

            memoryRef.current?.store('short_term', {
                content: `User: ${message}\nOMEGA: ${json.data.response}`,
                tags: ['chat'],
            })
            setStatus(coreRef.current.getStatus())
            return json.data
        } catch (err) {
            setError(err.message)
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const executeSkill = useCallback(async (skillId, params = {}) => {
        if (!coreRef.current) return null
        setIsLoading(true)
        setError(null)
        try {
            const result = await coreRef.current.executeSkill(skillId, params)
            setStatus(coreRef.current.getStatus())
            return result
        } catch (err) {
            setError(err.message)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [])

    const executeTool = useCallback(async (toolId, params = {}) => {
        if (!coreRef.current) return null
        setIsLoading(true)
        setError(null)
        try {
            const result = await coreRef.current.executeTool(toolId, params)
            setStatus(coreRef.current.getStatus())
            return result
        } catch (err) {
            setError(err.message)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [])

    const decide = useCallback(async (context) => {
        if (!coreRef.current) return null
        return coreRef.current.decide(context)
    }, [])

    return {
        core: coreRef.current,
        memory: memoryRef.current,
        status,
        isLoading,
        error,
        sendChatMessage,
        executeSkill,
        executeTool,
        decide,
    }
}

export default useOmega
