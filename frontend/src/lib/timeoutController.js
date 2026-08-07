// [v6.6-PART2] Safe timeout loop with stop flag and cleanup
export function createTimeoutController(fn, delay = 1000, immediate = false) {
    let isRunning = false
    let timeoutId = null

    const loop = () => {
        if (!isRunning) return
        try {
            fn()
        } catch (err) {
            console.error('[timeoutController] loop error:', err)
        }
        timeoutId = setTimeout(loop, delay)
    }

    const start = () => {
        if (isRunning) return
        isRunning = true
        if (immediate) fn()
        timeoutId = setTimeout(loop, delay)
    }

    const stop = () => {
        isRunning = false
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
        }
    }

    return { start, stop, get isRunning() { return isRunning } }
}

export default createTimeoutController
