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
      {/* 1. Flat Downward Triangle Top Handle (no glow) */}
      <div
        ref={handleRef}
        onPointerDown={handlePointerDown}
        className="w-3 h-3 -ml-[5.5px] absolute -top-0.5 pointer-events-auto cursor-ew-resize flex items-start justify-center group"
      >
        <svg
          viewBox="0 0 10 7"
          className="w-2.5 h-[7px] fill-[#4f8cff]"
        >
          <polygon points="0,0 10,0 5,7" />
        </svg>
      </div>

      {/* 2. Razor 1px Accent Line (no glow) */}
      <div className="w-px h-full bg-[#4f8cff]" />
    </div>
  );
};
