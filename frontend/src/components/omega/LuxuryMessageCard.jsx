import React from 'react';

const COLOR_MAP = {
  violet: 'bg-gradient-to-br from-violet-500/[0.08] to-violet-500/[0.02] hover:shadow-violet-500/10',
  emerald: 'bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] hover:shadow-emerald-500/10',
  amber: 'bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02] hover:shadow-amber-500/10',
  rose: 'bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.02] hover:shadow-rose-500/10',
  cyan: 'bg-gradient-to-br from-cyan-500/[0.08] to-cyan-500/[0.02] hover:shadow-cyan-500/10',
  orange: 'bg-gradient-to-br from-orange-500/[0.08] to-orange-500/[0.02] hover:shadow-orange-500/10',
  gray: 'bg-gradient-to-br from-gray-500/[0.08] to-gray-500/[0.02] hover:shadow-gray-500/10',
};

export const LuxuryMessageCard = ({ title, children, icon = '✨', color = 'violet' }) => {
  const colorClass = COLOR_MAP[color] || COLOR_MAP.violet;
  return (
    <div className={`mb-3 ${colorClass} backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 hover:shadow-lg transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-white/90">{title}</span>
      </div>
      <div className="text-sm text-gray-200 leading-relaxed">{children}</div>
    </div>
  );
};

export default LuxuryMessageCard;
