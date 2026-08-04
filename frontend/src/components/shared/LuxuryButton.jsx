import { useRef, useState } from 'react';

// [MASTER-v5.6] Luxury magnetic button with adaptive touch
export default function LuxuryButton({ children, variant = 'primary', onClick, className = '', disabled, ...props }) {
  const btnRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState(false);
  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;

  const handleMouseMove = (e) => {
    if (isTouch) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.12;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.12;
    setOffset({ x, y });
  };

  const variants = {
    primary: 'luxury-btn luxury-btn-primary',
    secondary: 'luxury-btn bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 active:bg-white/15',
    danger: 'luxury-btn bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30',
    ghost: 'luxury-btn bg-transparent text-gray-400 hover:text-white'
  };

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => !isTouch && setOffset({ x: 0, y: 0 })}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${pressed ? 'scale-95' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      style={!isTouch ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : {}}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}
