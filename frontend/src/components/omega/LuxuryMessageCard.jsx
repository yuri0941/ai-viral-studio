import React from 'react';

export const LuxuryMessageCard = ({ title, children, icon = '✨', color = 'violet' }) => (
  <div className={`mb-3 bg-gradient-to-br from-${color}-500/[0.08] to-${color}-500/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 hover:shadow-lg hover:shadow-${color}-500/10 transition-all`}>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-semibold text-white/90">{title}</span>
    </div>
    <div className="text-sm text-gray-200 leading-relaxed">{children}</div>
  </div>
);

export default LuxuryMessageCard;
