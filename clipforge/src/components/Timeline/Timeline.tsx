import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { TRACK_HEADER_WIDTH, TIMELINE_END_PADDING } from '../../types/editor';
import { TimelineToolbar } from './TimelineToolbar';
import { VoiceRecorderBar } from './VoiceRecorderBar';
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
    fitToView,
    setTimelineViewportWidth,
    togglePlay,
    splitClipAtPlayhead,
    deleteClip,
    duplicateSelectedClip,
    undo,
    redo,
    snapGuideTime,
    setActiveTool,
    trimLeftToPlayhead,
    trimRightToPlayhead,
    selectAllClips,
    toggleSnap
  } = useEditorStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  // Timeline panel total height: about 30% of screen, resizable (min 180px, max 55%)
  const [panelHeight, setPanelHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.max(180, Math.round(window.innerHeight * 0.30));
    }
    return 240;
  });

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startY = e.clientY;
    const initialHeight = panelHeight;

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = moveEvt.clientY - startY;
      const minH = 180;
      const maxH = Math.round(window.innerHeight * 0.55);
      const newH = Math.max(minH, Math.min(maxH, initialHeight - deltaY));
      setPanelHeight(newH);
    };

    const onPointerUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // ResizeObserver for auto-fit on window / panel resize & first load (Rule 3)
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;

    const handleResize = () => {
      const width = el.clientWidth;
      if (width > 0) {
        setTimelineViewportWidth(width);
        fitToView(width);
      }
    };

    handleResize();

    const ro = new ResizeObserver(() => {
      handleResize();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [fitToView, setTimelineViewportWidth]);

  // Auto-fit whenever totalDuration changes (Rule 3)
  useEffect(() => {
    if (scrollContainerRef.current) {
      fitToView(scrollContainerRef.current.clientWidth);
    }
  }, [totalDuration]);

  // Global Keyboard Shortcuts (Space, S, Delete, Ctrl+Z, Ctrl+Y, F for Fit)
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

      // A = CapCut Selection Tool
      if (!e.ctrlKey && !e.metaKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setActiveTool('select');
      }

      // Ctrl+A = Select All Clips
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        selectAllClips();
      }

      // Q = CapCut Ripple Trim Left to Playhead
      if (!e.ctrlKey && !e.metaKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        trimLeftToPlayhead();
      }

      // W = CapCut Ripple Trim Right to Playhead
      if (!e.ctrlKey && !e.metaKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        trimRightToPlayhead();
      }

      // Ctrl+B or S = Split Clip at Playhead
      if (((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) || (!e.ctrlKey && !e.metaKey && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        splitClipAtPlayhead();
      }

      // N = Toggle Magnetic Snapping
      if (!e.ctrlKey && !e.metaKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        toggleSnap();
      }

      // Ctrl + '+' or '=' = Zoom In
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(zoom + 6);
      }

      // Ctrl + '-' = Zoom Out
      if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        setZoom(zoom - 6);
      }

      // Delete or Backspace = Remove
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteClip();
      }

      // Ctrl+D = Duplicate Selected Clip
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateSelectedClip();
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

      // F = Fit to View
      if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          fitToView();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, splitClipAtPlayhead, deleteClip, undo, redo, fitToView, setActiveTool, trimLeftToPlayhead, trimRightToPlayhead, selectAllClips, toggleSnap, zoom, setZoom]);

  // Ctrl + Wheel = Timeline Zoom (Rule 5 & 6: Zoom out never goes below fit level)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -4 : 4;
      setZoom(zoom + delta);
    }
  };

  // Rule 2: Lock right side scrolling (clamp scrollLeft to scrollWidth - clientWidth)
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (el.scrollLeft > maxScroll) {
      el.scrollLeft = maxScroll;
    }
  };

  // Drag and drop video/audio files directly onto timeline
  const handleTimelineDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio') || /\.(mp3|wav|ogg)$/i.test(file.name);
      if (isAudio) {
        const tempAudio = document.createElement('audio');
        tempAudio.src = url;
        tempAudio.onloadedmetadata = () => {
          useEditorStore.getState().loadAudioMedia(file.name, url, tempAudio.duration || 15);
        };
      } else {
        const tempVideo = document.createElement('video');
        tempVideo.src = url;
        tempVideo.onloadedmetadata = () => {
          useEditorStore.getState().loadVideoMedia(file.name, url, tempVideo.duration || 15);
        };
      }
    }
  };

  // Timeline end = totalDuration + small padding (Rule 1)
  const maxProjectTime = Math.max(0.5, totalDuration + TIMELINE_END_PADDING);
  const timelineContentWidth = maxProjectTime * zoom;

  return (
    <section 
      style={{ height: `${panelHeight}px` }}
      className="min-h-[180px] bg-[#1b1b1d] border-t border-[#38383d] flex flex-col select-none shrink-0 z-20 relative overflow-hidden transition-colors duration-150"
      onWheel={handleWheel}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleTimelineDrop}
    >
      {/* Top Drag-to-Resize Handle (min 180px, max 55% screen) */}
      <div 
        onPointerDown={handleResizePointerDown}
        className="absolute top-0 inset-x-0 h-1 cursor-row-resize z-50 hover:bg-[#4f8cff] transition-colors duration-150"
        title="Drag up/down to resize timeline panel"
      />

      {/* 1. Timeline Toolbar (32px) */}
      <TimelineToolbar />

      {/* Voice Recording Active Bar */}
      <VoiceRecorderBar />

      {/* 2. Main Timeline Scrollable Body */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto overflow-y-auto relative flex flex-col"
      >
        <div 
          className="relative flex flex-col min-h-full transition-[width] duration-150 ease-out"
          style={{ width: `${TRACK_HEADER_WIDTH + timelineContentWidth}px` }}
        >
          {/* Header Row: Track Corner Label + Time Ruler (20px sticky) */}
          <div className="flex h-5 border-b border-[#38383d] shrink-0 sticky top-0 z-30 bg-[#2a2a2e]">
            {/* Top Left Track Tag Corner */}
            <div 
              className="shrink-0 bg-[#2a2a2e] border-r border-[#38383d] px-2 flex items-center justify-between text-[11px] text-[#8a8a93] font-mono tracking-wider font-medium"
              style={{ width: `${TRACK_HEADER_WIDTH}px` }}
            >
              <span>TRACKS</span>
              <span>SEC</span>
            </div>

            {/* Time Ruler (20px) */}
            <div className="flex-1 relative overflow-hidden">
              <TimeRuler totalDuration={totalDuration} zoom={zoom} />
            </div>
          </div>

          {/* Tracks Stack + Playhead (Rule 9: tracks fill remaining height with no big dead space) */}
          <div className="flex-1 relative flex flex-col min-h-0">
            {tracks.map((track) => (
              <TrackLane key={track.id} track={track} zoom={zoom} />
            ))}

            {/* Playhead Needle (Offset by left TRACK_HEADER_WIDTH track headers) */}
            <div 
              className="absolute top-0 bottom-0 pointer-events-none z-40"
              style={{ left: `${TRACK_HEADER_WIDTH}px` }}
            >
              <Playhead 
                currentTime={currentTime} 
                totalDuration={totalDuration} 
                zoom={zoom} 
              />
            </div>

            {/* Magnetic Snap Guide Line (Active during clip drag / handle trim) */}
            {snapGuideTime !== null && (
              <div 
                className="absolute top-0 bottom-0 pointer-events-none z-30 border-l border-dashed border-[#4f8cff] transition-none"
                style={{ left: `${TRACK_HEADER_WIDTH + snapGuideTime * zoom}px` }}
              >
                <div className="bg-[#4f8cff] text-white text-[9.5px] font-mono font-medium px-1 py-0.5 rounded-[2px] -translate-x-1/2 mt-0.5">
                  {snapGuideTime.toFixed(2)}s
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
