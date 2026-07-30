// ============================================
// OMEGA Autonomy — уровень автономности и approval flow
// Версия: 1.0 Lite (фундамент для OMEGA v5)
// ============================================

import { OMEGA_AUTONOMY_LEVELS } from './omegaCore.js'

export { OMEGA_AUTONOMY_LEVELS }

/**
 * Статусы действий, требующих одобрения.
 */
export const APPROVAL_STATUSES = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
}

/**
 * Типы действий, которые OMEGA может запрашивать на одобрение.
 */
export const ACTION_TYPES = {
    FINANCE: 'finance',
    CONFIG: 'config',
    DEPLOY: 'deploy',
    DATA: 'data',
    SECURITY: 'security',
    COMMUNICATION: 'communication',
    AGENT_MANAGEMENT: 'agent_management',
}

/**
 * Риск-уровни действий.
 */
export const RISK_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
}

/**
 * Возвращает риск-уровень для типа действия.
 */
export function assessRisk(actionType, payload = {}) {
    switch (actionType) {
        case ACTION_TYPES.FINANCE:
            const amount = payload.amount || 0
            return amount > 10000 ? RISK_LEVELS.CRITICAL : amount > 1000 ? RISK_LEVELS.HIGH : RISK_LEVELS.MEDIUM
        case ACTION_TYPES.SECURITY:
            return RISK_LEVELS.CRITICAL
        case ACTION_TYPES.DEPLOY:
            return RISK_LEVELS.HIGH
        case ACTION_TYPES.CONFIG:
            return RISK_LEVELS.MEDIUM
        case ACTION_TYPES.COMMUNICATION:
            return RISK_LEVELS.LOW
        default:
            return RISK_LEVELS.MEDIUM
    }
}

/**
 * Определяет, может ли OMEGA выполнить действие автоматически
 * на основе уровня автономности и риска.
 */
export function canExecuteAutonomously(autonomyLevel, actionType, payload = {}) {
    const risk = assessRisk(actionType, payload)

    // FULL_AUTO — всё, кроме критического риска
    if (autonomyLevel === OMEGA_AUTONOMY_LEVELS.FULL_AUTO) {
        return risk !== RISK_LEVELS.CRITICAL
    }

    // SEMI_AUTO — только LOW/MEDIUM
    if (autonomyLevel === OMEGA_AUTONOMY_LEVELS.SEMI_AUTO) {
        return risk === RISK_LEVELS.LOW || risk === RISK_LEVELS.MEDIUM
    }

    // SUGGEST и ASSIST — требуется одобрение
    return false
}

/**
 * OmegaAutonomyManager — управляет approval flow и уровнем автономности.
 */
export class OmegaAutonomyManager {
    constructor(options = {}) {
        this.autonomyLevel = options.autonomyLevel ?? OMEGA_AUTONOMY_LEVELS.SUGGEST
        this.pendingActions = []
        this.history = []
        this.maxHistory = options.maxHistory || 100
        this.listeners = new Set()
    }

    /**
     * Подписывается на изменения очереди действий.
     */
    subscribe(listener) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    notify() {
        this.listeners.forEach(fn => fn(this.getState()))
    }

    /**
     * Запрашивает разрешение на действие или выполняет автоматически.
     */
    requestAction(action) {
        const { type, payload, description } = action
        const risk = assessRisk(type, payload)
        const id = `action_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

        const item = {
            id,
            type,
            payload,
            description,
            risk,
            status: APPROVAL_STATUSES.PENDING,
            requestedAt: new Date().toISOString(),
            resolvedAt: null,
            autoExecuted: false,
        }

        if (canExecuteAutonomously(this.autonomyLevel, type, payload)) {
            item.status = APPROVAL_STATUSES.APPROVED
            item.autoExecuted = true
            item.resolvedAt = new Date().toISOString()
            this.history.push(item)
            this.trimHistory()
            this.notify()
            return { id, approved: true, auto: true, item }
        }

        this.pendingActions.push(item)
        this.notify()
        return { id, approved: false, auto: false, item }
    }

    /**
     * Одобряет действие владельцем.
     */
    approve(id) {
        const idx = this.pendingActions.findIndex(a => a.id === id)
        if (idx < 0) return null

        const item = this.pendingActions.splice(idx, 1)[0]
        item.status = APPROVAL_STATUSES.APPROVED
        item.resolvedAt = new Date().toISOString()
        this.history.push(item)
        this.trimHistory()
        this.notify()
        return item
    }

    /**
     * Отклоняет действие владельцем.
     */
    reject(id, reason = '') {
        const idx = this.pendingActions.findIndex(a => a.id === id)
        if (idx < 0) return null

        const item = this.pendingActions.splice(idx, 1)[0]
        item.status = APPROVAL_STATUSES.REJECTED
        item.resolvedAt = new Date().toISOString()
        item.rejectReason = reason
        this.history.push(item)
        this.trimHistory()
        this.notify()
        return item
    }

    /**
     * Устанавливает уровень автономности.
     */
    setAutonomyLevel(level) {
        if (!Object.values(OMEGA_AUTONOMY_LEVELS).includes(level)) {
            throw new Error(`Invalid autonomy level: ${level}`)
        }
        this.autonomyLevel = level
        this.notify()
    }

    /**
     * Возвращает текущее состояние.
     */
    getState() {
        return {
            autonomyLevel: this.autonomyLevel,
            pendingActions: [...this.pendingActions],
            history: [...this.history],
        }
    }

    /**
     * Возвращает действия, требующие одобрения, с фильтром.
     */
    getPending(filter = {}) {
        let items = [...this.pendingActions]
        if (filter.type) items = items.filter(a => a.type === filter.type)
        if (filter.risk) items = items.filter(a => a.risk === filter.risk)
        return items
    }

    /**
     * Возвращает историю решений.
     */
    getHistory(filter = {}) {
        let items = [...this.history]
        if (filter.status) items = items.filter(a => a.status === filter.status)
        if (filter.type) items = items.filter(a => a.type === filter.type)
        return items
    }

    trimHistory() {
        while (this.history.length > this.maxHistory) {
            this.history.shift()
        }
    }
}

export default OmegaAutonomyManager
