import React, { useRef } from 'react';
import type { ClipItem } from '../../types/editor';
import { useEditorStore } from '../../store/useEditorStore';

interface TimelineClipProps {
  clip: ClipItem;
  zoom: number;
}

export const TimelineClip: React.FC<TimelineClipProps> = ({ clip, zoom }) => {
  const { 
    selectedClipId, 
    selectClip, 
    moveClip, 
    trimClip, 
    currentTime, 
    isSnapEnabled 
  } = useEditorStore();

  const isSelected = selectedClipId === clip.id;
  const clipRef = useRef<HTMLDivElement>(null);

  const leftPx = clip.start * zoom;
  const widthPx = Math.max(20, clip.duration * zoom);

  // Drag Entire Clip (Move horizontally)
  const handleClipMouseDown = (e: React.MouseEvent) => {
    // If clicking on trim handles, do not drag whole clip
    if ((e.target as HTMLElement).dataset.handle) return;
    e.stopPropagation();

    selectClip(clip.id, clip.trackId);

    const startX = e.clientX;
    const initialStart = clip.start;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / zoom;
      let newStart = Math.max(0, initialStart + deltaSec);

      // Snap logic
      if (isSnapEnabled) {
        const threshold = 0.4;
        if (Math.abs(newStart - currentTime) < threshold) {
          newStart = currentTime;
        }
      }

      moveClip(clip.id, newStart);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Drag Trim Handles (Start / End)
  const handleTrimStart = (e: React.MouseEvent, edge: 'start' | 'end') => {
    e.stopPropagation();
    selectClip(clip.id, clip.trackId);

    const startX = e.clientX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / zoom;
      trimClip(clip.id, edge, deltaSec);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={clipRef}
      onMouseDown={handleClipMouseDown}
      className={`absolute top-1 bottom-1 rounded-md overflow-hidden cursor-grab active:cursor-grabbing border transition-shadow select-none group flex items-center ${
        isSelected
          ? 'border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)] ring-1 ring-cyan-400 z-20'
          : 'border-white/10 hover:border-white/30 z-10'
      }`}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
        backgroundColor: clip.color || '#2563EB',
      }}
    >
      {/* 1. Left Trim Handle */}
      <div
        data-handle="left"
        onMouseDown={(e) => handleTrimStart(e, 'start')}
        className={`w-2.5 h-full absolute left-0 top-0 bottom-0 z-30 cursor-ew-resize flex items-center justify-center transition-opacity ${
          isSelected ? 'bg-cyan-400 opacity-100' : 'bg-white/30 opacity-0 group-hover:opacity-100'
        }`}
        title="Trim Start"
      >
        <div className="w-0.5 h-3 bg-black rounded" />
      </div>

      {/* 2. Visual Content depending on clip type */}
      {clip.type === 'video' && (
        <div className="relative w-full h-full flex items-center overflow-hidden">
          {/* Filmstrip Sprockets Top & Bottom */}
          <div className="absolute top-0.5 inset-x-2 h-1 bg-[radial-gradient(circle,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[length:6px_4px] opacity-60 pointer-events-none" />
          <div className="absolute bottom-0.5 inset-x-2 h-1 bg-[radial-gradient(circle,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[length:6px_4px] opacity-60 pointer-events-none" />

          {/* Thumbnail preview strip */}
          {clip.thumbnail && (
            <div className="absolute inset-0 opacity-25 flex pointer-events-none">
              <img src={clip.thumbnail} alt="" className="h-full w-auto object-cover" />
              <img src={clip.thumbnail} alt="" className="h-full w-auto object-cover" />
              <img src={clip.thumbnail} alt="" className="h-full w-auto object-cover" />
            </div>
          )}

          {/* Title label */}
          <span className="relative z-10 px-3 text-[11px] font-semibold text-white truncate drop-shadow-md">
            {clip.title}
          </span>
        </div>
      )}

      {clip.type === 'audio' && (
        <div className="relative w-full h-full flex items-center px-3 justify-between overflow-hidden">
          {/* Waveform Visualizer */}
          <div className="absolute inset-0 flex items-center gap-0.5 px-3 opacity-40 pointer-events-none">
            {(clip.waveform || [40, 60, 80, 50, 90, 70, 45, 85, 100, 65]).map((val, idx) => (
              <span
                key={idx}
                className="w-1 bg-emerald-300 rounded-full inline-block"
                style={{ height: `${val}%` }}
              />
            ))}
          </div>
          <span className="relative z-10 text-[11px] font-semibold text-emerald-100 truncate drop-shadow-md">
            🎵 {clip.title}
          </span>
        </div>
      )}

      {(clip.type === 'text' || clip.type === 'sticker') && (
        <div className="relative w-full h-full flex items-center px-3 truncate">
          <span className="text-[11px] font-bold text-white drop-shadow truncate">
            {clip.title}
          </span>
        </div>
      )}

      {/* 3. Right Trim Handle */}
      <div
        data-handle="right"
        onMouseDown={(e) => handleTrimStart(e, 'end')}
        className={`w-2.5 h-full absolute right-0 top-0 bottom-0 z-30 cursor-ew-resize flex items-center justify-center transition-opacity ${
          isSelected ? 'bg-cyan-400 opacity-100' : 'bg-white/30 opacity-0 group-hover:opacity-100'
        }`}
        title="Trim End"
      >
        <div className="w-0.5 h-3 bg-black rounded" />
      </div>
    </div>
  );
};
