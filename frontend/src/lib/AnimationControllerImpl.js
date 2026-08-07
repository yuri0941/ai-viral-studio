// [v6.6-PART2] Safe animation controller with RAF cleanup + IntersectionObserver pause
export class AnimationControllerImpl {
    constructor(options = {}) {
        this.isRunning = false
        this.rafId = null
        this.timeoutId = null
        this.onTick = options.onTick || (() => {})
        this.interval = options.interval || 0
        this.lastTime = 0
    }

    start() {
        if (this.isRunning) return this
        this.isRunning = true
        const loop = (time) => {
            if (!this.isRunning) return
            if (time - this.lastTime >= this.interval) {
                this.lastTime = time
                this.onTick(time)
            }
            this.rafId = requestAnimationFrame(loop)
        }
        this.rafId = requestAnimationFrame(loop)
        return this
    }

    stop() {
        this.isRunning = false
        if (this.rafId) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
        return this
    }

    scheduleTimeout(fn, delay) {
        this.timeoutId = setTimeout(() => {
            if (!this.isRunning) return
            fn()
        }, delay)
        return this
    }

    destroy() {
        this.stop()
        this.onTick = null
    }
}

export function useVisibilityPause(ref, controller) {
    if (!ref?.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) controller.start()
        else controller.stop()
    }, { threshold: 0.1 })
    observer.observe(ref.current)
    return () => observer.disconnect()
}
