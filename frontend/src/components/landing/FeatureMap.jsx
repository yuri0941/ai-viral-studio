import { useNavigate } from 'react-router-dom'
import { Sparkles, MessageSquare, BarChart3, Calendar, Zap, Shield } from 'lucide-react'

const FEATURES = [
  {
    id: 'omega',
    icon: Sparkles,
    title: 'OMEGA AI-ассистент',
    description: 'Генерирует идеи, сценарии, посты и отвечает на вопросы в одном чате.',
    action: 'Попробовать',
    path: '/creative-hub/chat',
    color: 'from-violet-500 to-fuchsia-500',
  },
  {
    id: 'support',
    icon: MessageSquare,
    title: 'Умная поддержка 24/7',
    description: 'AI анализирует обращение и мгновенно предлагает решение или эскалирует оператору.',
    action: 'Написать',
    path: '/dashboard',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Аналитика вирусности',
    description: 'Отслеживайте тренды, лучшее время публикаций и прогноз engagement.',
    action: 'Анализ',
    path: '/analytics',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'scheduler',
    icon: Calendar,
    title: 'Автопланировщик',
    description: 'Планируйте публикации на недели вперёд для всех соцсетей.',
    action: 'Запланировать',
    path: '/scheduler',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'video',
    icon: Zap,
    title: 'AI Video Shorts',
    description: 'Создавайте вирусные Reels и Shorts из текста за минуты.',
    action: 'Создать видео',
    path: '/video-creator',
    color: 'from-rose-500 to-pink-500',
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Безопасность и приватность',
    description: 'Privacy Firewall, шифрование данных и полный контроль доступа.',
    action: 'Подробнее',
    path: '/privacy-policy',
    color: 'from-slate-500 to-gray-500',
  },
]

export default function FeatureMap() {
  const navigate = useNavigate()

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Что умеет OMEGA</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">Все инструменты для вирусного контента — от идеи до публикации.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.id}
                className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${feature.color} opacity-10 blur-2xl rounded-full -mr-8 -mt-8 group-hover:opacity-20 transition-opacity`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 mb-5 leading-relaxed">{feature.description}</p>
                <button
                  onClick={() => navigate(feature.path)}
                  className={`text-sm font-medium bg-gradient-to-r ${feature.color} bg-clip-text text-transparent hover:opacity-80 transition-opacity`}
                >
                  {feature.action} →
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
