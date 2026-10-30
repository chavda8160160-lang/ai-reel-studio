import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { TimelineToolbar } from './TimelineToolbar';
import { TimeRuler } from './TimeRuler';
import { TrackLane } from './TrackLane';
import { Playhead } from './Playhead';

export const Timeline: React.FC = () => {
  const { 
    tracks, 
    totalDuration, 
    currentTime, 
    zoom, 
    setZoom,
    togglePlay,
    splitClipAtPlayhead,
    deleteClip,
    undo,
    redo 
  } = useEditorStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcuts (Space, S, Delete, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Space = Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }

      // S = Split
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        splitClipAtPlayhead();
      }

      // Delete or Backspace = Remove
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteClip();
      }

      // Ctrl+Z = Undo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z = Redo
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, splitClipAtPlayhead, deleteClip, undo, redo]);

  // Ctrl + Wheel = Timeline Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -4 : 4;
      setZoom(zoom + delta);
    }
  };

  const timelineContentWidth = (totalDuration + 5) * zoom;

  return (
    <section 
      className="h-[36%] min-h-[220px] bg-[#0E0E12] border-t border-[#2A2A2D] flex flex-col select-none shrink-0 z-20 relative overflow-hidden"
      onWheel={handleWheel}
    >
      {/* 1. Timeline Toolbar */}
      <TimelineToolbar />

      {/* 2. Main Timeline Scrollable Body */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative flex flex-col"
      >
        <div 
          className="relative flex flex-col min-h-full"
          style={{ width: `calc(130px + ${timelineContentWidth}px)` }}
        >
          {/* Header Row: Track Corner Label + Time Ruler */}
          <div className="flex h-6 border-b border-[#24242A] shrink-0 sticky top-0 z-30 bg-[#121216]">
            {/* Top Left Track Tag Corner */}
            <div className="w-[130px] shrink-0 bg-[#141418] border-r border-[#24242C] px-2 flex items-center justify-between text-[10px] text-zinc-500 font-mono font-medium">
              <span>TRACKS</span>
              <span>SEC</span>
            </div>

            {/* Time Ruler */}
            <div className="flex-1 relative">
              <TimeRuler totalDuration={totalDuration} zoom={zoom} />
            </div>
          </div>

          {/* Tracks Stack + Playhead */}
          <div className="flex-1 relative flex flex-col">
            {tracks.map((track) => (
              <TrackLane key={track.id} track={track} zoom={zoom} />
            ))}

            {/* Playhead Needle (Offset by left 130px track headers) */}
            <div 
              className="absolute top-0 bottom-0 pointer-events-none z-40"
              style={{ left: '130px' }}
            >
              <Playhead 
                currentTime={currentTime} 
                totalDuration={totalDuration} 
                zoom={zoom} 
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
