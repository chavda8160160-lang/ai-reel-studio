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
      {/* 1. Geometric Diamond Top Handle */}
      <div
        ref={handleRef}
        onPointerDown={handlePointerDown}
        className="w-3.5 h-4 -ml-[7px] absolute -top-0.5 pointer-events-auto cursor-ew-resize flex items-center justify-center group"
      >
        <svg
          viewBox="0 0 14 18"
          className="w-3 h-4 fill-[#C9A66B] filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform"
        >
          <path d="M0 0 H14 V10 L7 17 L0 10 Z" />
        </svg>
      </div>

      {/* 2. Thin 1.5px Razor Line */}
      <div className="w-[1.5px] h-full bg-[#C9A66B] shadow-[0_0_6px_rgba(201,166,107,0.4)]" />
    </div>
  );
};
