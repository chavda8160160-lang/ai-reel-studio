import React, { useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

interface TimeRulerProps {
  totalDuration: number;
  zoom: number; // Pixels per second
}

export const TimeRuler: React.FC<TimeRulerProps> = ({ totalDuration, zoom }) => {
  const { seek } = useEditorStore();
  const rulerRef = useRef<HTMLDivElement>(null);

  // Generate tick markers every 1s, major marker every 5s
  const ticksCount = Math.ceil(totalDuration) + 10;
  const ticks = Array.from({ length: ticksCount }, (_, i) => i);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const updateTime = (clientX: number) => {
      const offsetX = clientX - rect.left;
      const clickedTime = Math.max(0, Math.min(totalDuration, offsetX / zoom));
      seek(clickedTime);
    };

    updateTime(e.clientX);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateTime(moveEvent.clientX);
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
      ref={rulerRef}
      onPointerDown={handlePointerDown}
      className="h-6 relative border-b border-[#24242A] cursor-pointer select-none bg-[#111115]"
      style={{ width: `${(totalDuration + 5) * zoom}px` }}
    >
      {ticks.map((sec) => {
        const isMajor = sec % 5 === 0;
        return (
          <div
            key={sec}
            className="absolute top-0 bottom-0 pointer-events-none flex flex-col justify-between"
            style={{ left: `${sec * zoom}px` }}
          >
            {/* Major Label */}
            {isMajor ? (
              <span className="text-[10px] font-mono text-zinc-400 font-semibold pl-1 select-none leading-none pt-1">
                {formatSeconds(sec)}
              </span>
            ) : null}

            {/* Tick Mark */}
            <div
              className={`w-px ${
                isMajor ? 'h-2.5 bg-zinc-400' : 'h-1.5 bg-zinc-600'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};
