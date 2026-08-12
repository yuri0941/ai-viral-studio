import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * [v9.9.19.15.4] Reusable collapsible instruction block.
 * @param {string} titleKey - i18n key for the header title
 * @param {string[]} stepKeys - array of i18n keys for ordered steps
 * @param {string} [className='']
 */
export default function InstructionBlock({ titleKey, stepKeys = [], className = '' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className={`border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-[var(--text)]">
          <BookOpen size={16} className="text-violet-400" />
          <span className="font-medium">{t(titleKey)}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
            {stepKeys.map((key) => (
              <li key={key} className="pl-1">{t(key)}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
