import EventEmitter from 'events'
import { redis, getJSON, setJSON } from '../../../config/redis.js'

/**
 * In-memory event bus with optional Redis pub/sub fallback.
 * Allows OMEGA swarm agents to communicate without tight coupling.
 */

class SwarmEventBus extends EventEmitter {
    constructor() {
        super()
        this.channel = 'omega:swarm'
        this.redisSubscriber = null
        this.redisPublisher = null
        this._setupRedis()
    }

    async _setupRedis() {
        if (!redis) return
        try {
            this.redisPublisher = redis.duplicate ? redis.duplicate() : redis
            this.redisSubscriber = redis.duplicate ? redis.duplicate() : redis
            if (this.redisSubscriber && this.redisSubscriber.subscribe) {
                await this.redisSubscriber.subscribe(this.channel)
                this.redisSubscriber.on('message', (channel, message) => {
                    if (channel !== this.channel) return
                    try {
                        const event = JSON.parse(message)
                        this.emit(event.topic, event.payload, event.meta)
                    } catch (err) {
                        console.warn('[SwarmEventBus] invalid redis message:', err.message)
                    }
                })
            }
        } catch (err) {
            console.warn('[SwarmEventBus] Redis setup failed:', err.message)
        }
    }

    async publish(topic, payload, meta = {}) {
        const event = { topic, payload, meta: { ...meta, timestamp: new Date().toISOString() } }
        this.emit(topic, payload, event.meta)
        if (this.redisPublisher) {
            try {
                await this.redisPublisher.publish(this.channel, JSON.stringify(event))
            } catch (err) {
                console.warn('[SwarmEventBus] publish failed:', err.message)
            }
        }
    }

    subscribe(topic, handler) {
        this.on(topic, handler)
        return () => this.off(topic, handler)
    }
}

export const eventBus = new SwarmEventBus()
export default eventBus
