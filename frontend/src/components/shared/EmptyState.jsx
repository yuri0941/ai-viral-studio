export function EmptyState({ icon: Icon, title = 'Нет данных', message, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            {Icon && <Icon size={40} className="text-gray-600 mb-4" />}
            <h3 className="text-sm font-medium text-white mb-1">{title}</h3>
            {message && <p className="text-xs text-gray-500 max-w-xs">{message}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}
