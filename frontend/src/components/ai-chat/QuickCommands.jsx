import { motion } from 'framer-motion'
import {
    Clapperboard,
    Image,
    Type,
    Hash,
    TrendingUp,
    Calendar,
    FileText,
    Sparkles
} from 'lucide-react'

const commands = [
    {
        icon: Clapperboard,
        label: 'Сценарий TikTok',
        command: 'Напиши сценарий для TikTok на тему: '
    },
    {
        icon: Image,
        label: 'Обложка',
        command: 'Опиши дизайн обложки для видео: '
    },
    {
        icon: Type,
        label: 'Описание',
        command: 'Напиши SEO-описание для: '
    },
    {
        icon: Hash,
        label: 'Хештеги',
        command: 'Сгенерируй хештеги для: '
    },
    {
        icon: TrendingUp,
        label: 'Анализ',
        command: 'Проанализируй тренды в нише: '
    },
    {
        icon: Calendar,
        label: 'Контент-план',
        command: 'Составь контент-план на неделю для: '
    },
    {
        icon: FileText,
        label: 'SEO-теги',
        command: 'Сгенерируй SEO-теги для видео: '
    },
    {
        icon: Sparkles,
        label: 'Хук',
        command: 'Придумай 5 хуков для: '
    }
]

const QuickCommands = ({ onSelect }) => {
    return (
        <div className="px-4 py-2 border-t border-white/10">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {commands.map((cmd, index) => (
                    <motion.button
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect?.(cmd.command)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                    >
                        <cmd.icon className="w-4 h-4 text-violet-400" />
                        {cmd.label}
                    </motion.button>
                ))}
            </div>
        </div>
    )
}

export default QuickCommands