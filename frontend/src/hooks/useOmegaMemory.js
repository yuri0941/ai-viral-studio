// ============================================
// useOmegaMemory — работа с памятью OMEGA
// ============================================

import { useCallback, useEffect, useState } from 'react'
import { OmegaMemory, MEMORY_LEVELS } from '../ai/omega/index.js'

export function useOmegaMemory(options = {}) {
    const [memory] = useState(() => new OmegaMemory(options))
    const [summary, setSummary] = useState(() => memory.getSummary())

    const refresh = useCallback(() => {
        setSummary(memory.getSummary())
    }, [memory])

    const store = useCallback((level, data, opts) => {
        const entry = memory.store(level, data, opts)
        refresh()
        return entry
    }, [memory, refresh])

    const recall = useCallback((query, limit, levels) => {
        return memory.recall(query, limit, levels)
    }, [memory])

    const forget = useCallback((level, id) => {
        const ok = memory.forget(level, id)
        refresh()
        return ok
    }, [memory, refresh])

    const clear = useCallback((level) => {
        const ok = memory.clear(level)
        refresh()
        return ok
    }, [memory, refresh])

    const promote = useCallback((entryId, fromLevel, toLevel, opts) => {
        const entry = memory.promote(entryId, fromLevel, toLevel, opts)
        refresh()
        return entry
    }, [memory, refresh])

    const getLevel = useCallback((level) => {
        return memory.getLevel(level)
    }, [memory])

    useEffect(() => {
        refresh()
    }, [refresh])

    return {
        memory,
        summary,
        levels: MEMORY_LEVELS,
        store,
        recall,
        forget,
        clear,
        promote,
        getLevel,
        refresh,
        export: useCallback(() => memory.export(), [memory]),
        import: useCallback((json) => { memory.import(json); refresh() }, [memory, refresh]),
    }
}

export default useOmegaMemory
