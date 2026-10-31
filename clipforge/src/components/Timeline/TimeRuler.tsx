import React, { useRef, useMemo } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { TIMELINE_END_PADDING } from '../../types/editor';

interface TimeRulerProps {
  totalDuration: number;
  zoom: number;
}

export const TimeRuler: React.FC<TimeRulerProps> = ({ totalDuration, zoom }) => {
  const { seek } = useEditorStore();
  const rulerRef = useRef<HTMLDivElement>(null);

  const maxTime = Math.max(0.5, totalDuration + TIMELINE_END_PADDING);
  const totalWidth = maxTime * zoom;

  const { ticks } = useMemo(() => {
    const MIN_MAJOR_PX = 70; // Minimum pixel gap between major timecode labels
    const CANDIDATE_STEPS = [0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600];
    const majorStep = CANDIDATE_STEPS.find(step => step * zoom >= MIN_MAJOR_PX) 
      || Math.max(60, Math.ceil(MIN_MAJOR_PX / zoom / 60) * 60);

    let minorStep: number | null = null;
    if (majorStep >= 60) {
      minorStep = majorStep / 4;
    } else if (majorStep >= 10) {
      minorStep = majorStep / 5;
    } else if (majorStep >= 2) {
      minorStep = majorStep / 2;
    } else if (majorStep >= 0.5) {
      minorStep = majorStep / 5;
    }

    const formatTimeLabel = (sec: number) => {
      if (majorStep < 1) {
        const mins = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const tenths = Math.floor((sec % 1) * 10);
        return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
      }
      const mins = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      if (maxTime >= 3600) {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const resultTicks: { time: number; isMajor: boolean; label?: string }[] = [];
    const epsilon = 0.001;

    // Major ticks
    for (let t = 0; t <= maxTime + epsilon; t += majorStep) {
      const roundedT = Number(t.toFixed(3));
      if (roundedT <= maxTime + epsilon) {
        resultTicks.push({
          time: roundedT,
          isMajor: true,
          label: formatTimeLabel(roundedT)
        });
      }
    }

    // Minor ticks (only if pixel distance >= 8px)
    if (minorStep && minorStep * zoom >= 8) {
      for (let t = minorStep; t <= maxTime + epsilon; t += minorStep) {
        const roundedT = Number(t.toFixed(3));
        const isNearMajor = resultTicks.some(m => m.isMajor && Math.abs(m.time - roundedT) < (minorStep! * 0.4));
        if (!isNearMajor && roundedT <= maxTime + epsilon) {
          resultTicks.push({
            time: roundedT,
            isMajor: false
          });
        }
      }
    }

    return { ticks: resultTicks };
  }, [maxTime, zoom]);

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
      className="h-5 relative border-b cursor-pointer select-none bg-[#1b1b1d] border-[#38383d] overflow-hidden transition-[width] duration-150 ease-out"
      style={{ width: `${totalWidth}px` }}
    >
      {ticks.map((tick) => (
        <div
          key={`${tick.isMajor ? 'maj' : 'min'}-${tick.time}`}
          className="absolute top-0 bottom-0 pointer-events-none flex flex-col justify-between"
          style={{ left: `${tick.time * zoom}px` }}
        >
          {tick.isMajor ? (
            <span className="text-[9.5px] font-mono text-[#8a8a93] font-medium pl-1 select-none leading-none pt-0.5">
              {tick.label}
            </span>
          ) : null}

          <div
            className={`w-px ${
              tick.isMajor ? 'h-2 bg-[#48484e]' : 'h-1 bg-[#323236]'
            }`}
          />
        </div>
      ))}

      {/* Subtle End Boundary Mark */}
      <div 
        className="absolute top-0 bottom-0 w-px bg-[#4f8cff]/30 pointer-events-none"
        style={{ left: `${totalDuration * zoom}px` }}
        title="Project End"
      />
    </div>
  );
};
