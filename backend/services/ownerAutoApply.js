import { EventEmitter } from 'events'

// [MASTER-v5.0] added: owner auto-apply emitter
export const configEmitter = new EventEmitter()

export const applyOwnerChange = (changeType, data) => {
    configEmitter.emit(changeType, data)
    console.log(`[AUTO-APPLY] Owner changed ${changeType}:`, data)
}
