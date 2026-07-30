import { useState } from 'react'
import { X } from 'lucide-react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

function AuthModal({ isOpen, onClose, defaultMode = 'login', onSuccess }) {
    const [mode, setMode] = useState(defaultMode)

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0a0a0f] border border-white/10 p-6 shadow-2xl">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    aria-label="Закрыть"
                >
                    <X size={22} />
                </button>

                <h2 className="text-2xl font-bold mb-1 text-center text-white">
                    {mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}
                </h2>
                <p className="text-gray-400 text-center mb-6 text-sm">
                    {mode === 'login'
                        ? 'Войди в свой аккаунт AI Viral Studio'
                        : 'Начни создавать вирусный контент бесплатно'}
                </p>

                {/* Tabs */}
                <div className="flex rounded-xl bg-white/5 p-1 mb-6 border border-white/10">
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            mode === 'login'
                                ? 'bg-[#00ff41] text-black shadow'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Вход
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('register')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            mode === 'register'
                                ? 'bg-[#00ff41] text-black shadow'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Регистрация
                    </button>
                </div>

                {mode === 'login' ? (
                    <LoginForm onSuccess={onSuccess} />
                ) : (
                    <RegisterForm onSuccess={onSuccess} />
                )}
            </div>
        </div>
    )
}

export default AuthModal
