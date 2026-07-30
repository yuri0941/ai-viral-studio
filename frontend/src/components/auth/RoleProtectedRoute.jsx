import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function RoleProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, isLoading, user, hasRole } = useAuth()

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#00ff41] animate-bounce" />
                    <div className="w-3 h-3 rounded-full bg-[#00ff41] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-3 h-3 rounded-full bg-[#00ff41] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />
    }

    if (!hasRole(allowedRoles)) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">🚫 Доступ запрещён</h1>
                    <p className="text-gray-400 mb-6">У вас нет прав для доступа к этой странице</p>
                    <p className="text-sm text-gray-500">Ваша роль: {user?.role || 'неизвестна'}</p>
                    <p className="text-sm text-gray-500">Требуется: {allowedRoles.join(', ')}</p>
                </div>
            </div>
        )
    }

    return children
}

export default RoleProtectedRoute