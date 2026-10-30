import React, { useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

interface PlayheadProps {
  currentTime: number;
  totalDuration: number;
  zoom: number;
}

export const Playhead: React.FC<PlayheadProps> = ({ currentTime, totalDuration, zoom }) => {
  const { seek } = useEditorStore();
  const handleRef = useRef<HTMLDivElement>(null);

  const leftPx = currentTime * zoom;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const initialTime = currentTime;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaTime = deltaPx / zoom;
      const nextTime = Math.max(0, Math.min(totalDuration, initialTime + deltaTime));
      seek(nextTime);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-40 transition-none will-change-transform"
      style={{
        transform: `translateX(${leftPx}px)`,
        left: 0,
      }}
    >
      {/* 1. Inverted Triangle Top Handle */}
      <div
        ref={handleRef}
        onPointerDown={handlePointerDown}
        className="w-4 h-5 -ml-2 absolute -top-1 pointer-events-auto cursor-ew-resize flex items-center justify-center group"
      >
        <svg
          viewBox="0 0 16 20"
          className="w-3.5 h-4.5 fill-cyan-400 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform"
        >
          <path d="M0 0 H16 V11 L8 19 L0 11 Z" />
        </svg>
      </div>

      {/* 2. Vertical Needle Line */}
      <div className="w-0.5 h-full bg-[#22D3EE] shadow-[0_0_8px_#22D3EE,0_0_16px_rgba(34,211,238,0.5)]" />
    </div>
  );
};
