// ============================================
// OmegaApprovalModal — одобрение действия OMEGA
// ============================================

import { useState } from 'react'
import { Bot, AlertTriangle, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { ModalShell } from '../common/ModalShell'

export function OmegaApprovalModal({ isOpen, onClose, request, onApprove, onReject }) {
    const [comment, setComment] = useState('')

    if (!isOpen) return null

    const { action = 'Действие OMEGA', description = '', impact = '', risk = 'low', estimatedCost = '' } = request || {}

    const riskColors = {
        low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        high: 'text-red-400 bg-red-500/10 border-red-500/20',
    }

    const riskLabels = {
        low: 'Низкий риск',
        medium: 'Средний риск',
        high: 'Высокий риск',
    }

    const handleApprove = () => {
        onApprove?.({ ...request, comment, approvedAt: new Date().toISOString() })
        setComment('')
        onClose()
    }

    const handleReject = () => {
        onReject?.({ ...request, comment, rejectedAt: new Date().toISOString() })
        setComment('')
        onClose()
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Запрос на одобрение OMEGA" maxWidth="max-w-lg">
            <div className="space-y-5">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                        <Bot size={24} className="text-white" />
                    </div>
                    <div>
                        <h4 className="text-base font-semibold text-white">{action}</h4>
                        <p className="text-sm text-gray-400 mt-1">{description}</p>
                    </div>
                </div>

                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${riskColors[risk] || riskColors.low}`}>
                    <AlertTriangle size={18} />
                    <div className="text-sm font-medium">{riskLabels[risk] || riskLabels.low}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {impact && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Влияние</div>
                            <div className="text-sm text-white">{impact}</div>
                        </div>
                    )}
                    {estimatedCost && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Оценочная стоимость</div>
                            <div className="text-sm text-white">{estimatedCost}</div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                        <MessageSquare size={12} />
                        Комментарий (необязательно)
                    </label>
                    <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2.5 bg-[#0a0a0f] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/30 resize-none"
                        placeholder="Ваш комментарий к решению..."
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleReject}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-medium hover:bg-red-500/20 transition-colors"
                    >
                        <XCircle size={16} />
                        Отклонить
                    </button>
                    <button
                        type="button"
                        onClick={handleApprove}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors"
                    >
                        <CheckCircle size={16} />
                        Одобрить
                    </button>
                </div>
            </div>
        </ModalShell>
    )
}

export default OmegaApprovalModal
