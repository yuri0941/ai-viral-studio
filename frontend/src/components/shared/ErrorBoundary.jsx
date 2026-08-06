import { Component } from 'react'

// [v6.5] added: graceful error boundary with luxury glassmorphism UI
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0a0a1f] p-6">
                    <div className="max-w-md w-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 text-center shadow-2xl">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-500/10 flex items-center justify-center">
                            <span className="text-3xl">🛠️</span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">OMEGA уже чинит...</h2>
                        <p className="text-sm text-gray-400 mb-6">
                            {this.state.error?.message || 'Мы обнаружили сбой в интерфейсе. Перезагрузите страницу, чтобы продолжить.'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            🔄 Перезагрузить
                        </button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}
