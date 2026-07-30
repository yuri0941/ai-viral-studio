import { getStatusColor } from '../../utils/helpers'

export function StatusBadge({ status, label, pulse = false }) {
    const classes = getStatusColor(status)
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${classes}`}>
            {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {label || status}
        </span>
    )
}
