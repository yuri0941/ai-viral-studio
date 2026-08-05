import { Component } from 'react';

// [v5.7-COMPACT] added: global error boundary
export default class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0a0a1f] p-6">
                    <div className="luxury-card max-w-md w-full text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center"><span className="text-2xl">⚠️</span></div>
                        <h2 className="text-xl font-bold text-white mb-2">Что-то пошло не так</h2>
                        <p className="text-sm text-gray-400 mb-4">{this.state.error?.message || 'Неизвестная ошибка'}</p>
                        <button onClick={() => window.location.reload()} className="luxury-btn luxury-btn-primary">🔄 Перезагрузить</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
