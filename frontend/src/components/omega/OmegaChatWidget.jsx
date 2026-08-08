import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, GripVertical } from 'lucide-react';
import OmegaChat from './OmegaChat.jsx';
import { playSound } from '../../hooks/useSound.js';

export default function OmegaChatWidget({ onOpenApiKeys }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: null, y: null }); // null = default bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  // Восстановление позиции из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('omega_chat_position');
    if (saved) {
      try { setPosition(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (!dragRef.current) return;
    setIsDragging(true);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      startX: dragRef.current.offsetLeft,
      startY: dragRef.current.offsetTop,
    };
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (!dragRef.current) return;
    setIsDragging(true);
    const touch = e.touches[0];
    startPos.current = {
      x: touch.clientX,
      y: touch.clientY,
      startX: dragRef.current.offsetLeft,
      startY: dragRef.current.offsetTop,
    };
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging || !dragRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startPos.current.x;
      const dy = clientY - startPos.current.y;
      let newX = startPos.current.startX + dx;
      let newY = startPos.current.startY + dy;

      // Bounds check
      const maxX = window.innerWidth - dragRef.current.offsetWidth;
      const maxY = window.innerHeight - dragRef.current.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      dragRef.current.style.left = `${newX}px`;
      dragRef.current.style.top = `${newY}px`;
      dragRef.current.style.right = 'auto';
      dragRef.current.style.bottom = 'auto';
    };

    const handleEnd = () => {
      if (!isDragging || !dragRef.current) return;
      setIsDragging(false);
      const rect = dragRef.current.getBoundingClientRect();
      const pos = { x: rect.left, y: rect.top };
      setPosition(pos);
      localStorage.setItem('omega_chat_position', JSON.stringify(pos));
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    playSound('omega-activate');
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={openChat}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:scale-110 transition-transform flex items-center justify-center"
        style={{ touchAction: 'manipulation' }}
        aria-label="Открыть чат OMEGA"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div
      ref={dragRef}
      className={`fixed z-50 flex flex-col bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
      style={{
        width: 'clamp(320px, 90vw, 420px)',
        height: isMinimized ? '56px' : 'clamp(500px, 80vh, 650px)',
        right: position.x === null ? '24px' : 'auto',
        bottom: position.y === null ? '24px' : 'auto',
        left: position.x !== null ? `${position.x}px` : 'auto',
        top: position.y !== null ? `${position.y}px` : 'auto',
        transition: isDragging ? 'none' : 'height 0.3s ease',
      }}
    >
      {/* Header — draggable */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-[#12121a] border-b border-white/[0.06] select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
          <GripVertical size={16} className="text-gray-500" />
          <span className="text-sm font-semibold text-white">OMEGA AI 🤖</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition"
            aria-label={isMinimized ? 'Развернуть' : 'Свернуть'}
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-gray-400 transition"
            aria-label="Закрыть"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          <OmegaChat onOpenApiKeys={onOpenApiKeys} embedded />
        </div>
      )}
    </div>
  );
}

// Совместимость со старыми именованными импортами
export { OmegaChatWidget };
