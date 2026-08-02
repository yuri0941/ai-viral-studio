function StepStyle({ value, onChange }) {
    const styles = [
        {
            id: 'professional',
            label: 'Профессиональный',
            desc: 'Факты, цифры, экспертность. Подходит для B2B и услуг.',
            example: '«7 метрик, которые повышают конверсию лендинга на 34%»',
        },
        {
            id: 'friendly',
            label: 'Дружелюбный',
            desc: 'Тёплый разговорный тон, эмодзи, личные истории.',
            example: '«Ребят, я только что понял, почему мои Reels не залетали — и это гениально 🤯»',
        },
        {
            id: 'ironic',
            label: 'Ироничный',
            desc: 'Мемы, остроумные подколы, вирусность через юмор.',
            example: '«Когда клиент говорит "сделай красиво" — а ты делаешь красиво, но он имел в виду другое»',
        },
    ]

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Выберите стиль общения</h2>
                <p className="text-gray-400">OMEGA будет писать в этом ключе</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {styles.map(s => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onChange(s.id)}
                        className={`p-5 rounded-2xl border text-left transition-all ${
                            value === s.id
                                ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/50'
                                : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                        }`}
                    >
                        <div className="text-sm font-semibold text-white mb-2">{s.label}</div>
                        <p className="text-xs text-gray-400 mb-4">{s.desc}</p>
                        <div className="p-3 rounded-xl bg-[#0a0a0f] border border-white/5 text-xs text-gray-300 leading-relaxed">
                            {s.example}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default StepStyle
