export function Checkbox({ checked, onChange, label, className = '' }) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer group ${className}`}>
      <div className="relative flex-shrink-0 w-5 h-5 mt-0.5">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <div className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800/50 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
          <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <span className="text-sm text-slate-300 leading-5 group-hover:text-white transition-colors select-none">{label}</span>
    </label>
  );
}
