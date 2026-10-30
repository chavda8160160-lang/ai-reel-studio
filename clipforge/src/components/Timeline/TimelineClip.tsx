import React, { useRef, useState } from 'react';
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
    beginTransaction,
    commitTransaction,
    currentTime, 
    seek,
    isSnapEnabled,
    tracks,
    setSnapGuideTime,
    setEditingClipId,
    setActiveInspectorTab
  } = useEditorStore();

  const isSelected = selectedClipId === clip.id;
  const clipRef = useRef<HTMLDivElement>(null);

  const [trimFeedback, setTrimFeedback] = useState<{
    edge: 'start' | 'end';
    hitLimit: boolean;
    offset: number;
    sourceOut: number;
    duration: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  const leftPx = clip.start * zoom;
  const widthPx = Math.max(16, clip.duration * zoom);

  const speed = clip.properties.speed || 1.0;
  const currentOffset = clip.offset ?? 0;
  const currentSourceOut = currentOffset + clip.duration * speed;
  const sourceDuration = clip.sourceDuration || 30;

  const isAtSourceStart = currentOffset <= 0.02;
  const isAtSourceEnd = currentSourceOut >= sourceDuration - 0.05;

  const handleClipMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    e.stopPropagation();

    selectClip(clip.id, clip.trackId);
    beginTransaction();

    const startX = e.clientX;
    const initialStart = clip.start;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / zoom;
      let newStart = Math.max(0, initialStart + deltaSec);

      if (isSnapEnabled) {
        const threshold = 0.4;
        if (Math.abs(newStart - currentTime) < threshold) {
          newStart = currentTime;
          setSnapGuideTime(currentTime);
        } else {
          setSnapGuideTime(null);
        }
      }

      moveClip(clip.id, newStart);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setSnapGuideTime(null);
      commitTransaction();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTrimStart = (e: React.MouseEvent, edge: 'start' | 'end') => {
    e.stopPropagation();
    selectClip(clip.id, clip.trackId);
    beginTransaction();

    const startX = e.clientX;
    const initialStart = clip.start;
    const initialEnd = clip.start + clip.duration;

    // Find adjacent clip boundaries on the same track for magnetic snapping
    const currentTrack = tracks.find(t => t.id === clip.trackId);
    const otherClips = currentTrack?.clips.filter(c => c.id !== clip.id) || [];
    const prevClips = otherClips.filter(c => c.start < initialStart);
    const nextClips = otherClips.filter(c => c.start > initialStart);

    const prevClip = prevClips.length > 0
      ? prevClips.reduce((latest, c) => (c.start + c.duration > latest.start + latest.duration ? c : latest))
      : null;
    const nextClip = nextClips.length > 0
      ? nextClips.reduce((earliest, c) => (c.start < earliest.start ? c : earliest))
      : null;

    const prevBound = prevClip ? (prevClip.start + prevClip.duration) : 0;
    const nextBound = nextClip ? nextClip.start : null;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / zoom;

      let candidateTime: number;

      if (edge === 'end') {
        candidateTime = initialEnd + deltaSec;

        // Snapping for right edge
        if (isSnapEnabled) {
          const snapThreshold = Math.max(0.08, 8 / zoom);
          let snapped = false;

          if (Math.abs(candidateTime - currentTime) < snapThreshold) {
            candidateTime = currentTime;
            setSnapGuideTime(currentTime);
            snapped = true;
          } else if (nextBound !== null && Math.abs(candidateTime - nextBound) < snapThreshold) {
            candidateTime = nextBound;
            setSnapGuideTime(nextBound);
            snapped = true;
          }

          if (!snapped) {
            setSnapGuideTime(null);
          }
        }

        const res = trimClip(clip.id, 'end', candidateTime);
        if (res) {
          // Live preview: update frame at trimmed out-point
          seek(clip.start + res.duration);
          setTrimFeedback({
            edge: 'end',
            hitLimit: res.hitSourceLimit,
            offset: res.offset,
            sourceOut: res.sourceOut,
            duration: res.duration,
            clientX: moveEvent.clientX,
            clientY: moveEvent.clientY
          });
        }
      } else {
        candidateTime = initialStart + deltaSec;

        // Snapping for left edge
        if (isSnapEnabled) {
          const snapThreshold = Math.max(0.08, 8 / zoom);
          let snapped = false;

          if (Math.abs(candidateTime - currentTime) < snapThreshold) {
            candidateTime = currentTime;
            setSnapGuideTime(currentTime);
            snapped = true;
          } else if (Math.abs(candidateTime - prevBound) < snapThreshold) {
            candidateTime = prevBound;
            setSnapGuideTime(prevBound);
            snapped = true;
          } else if (Math.abs(candidateTime) < snapThreshold) {
            candidateTime = 0;
            setSnapGuideTime(0);
            snapped = true;
          }

          if (!snapped) {
            setSnapGuideTime(null);
          }
        }

        const res = trimClip(clip.id, 'start', candidateTime);
        if (res) {
          // Live preview: update frame at trimmed in-point
          seek(res.start);
          setTrimFeedback({
            edge: 'start',
            hitLimit: res.hitSourceLimit,
            offset: res.offset,
            sourceOut: res.sourceOut,
            duration: res.duration,
            clientX: moveEvent.clientX,
            clientY: moveEvent.clientY
          });
        }
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setSnapGuideTime(null);
      setTrimFeedback(null);
      commitTransaction();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const isLeftHandleAtLimit = trimFeedback?.edge === 'start' ? trimFeedback.hitLimit : false;
  const isRightHandleAtLimit = trimFeedback?.edge === 'end' ? trimFeedback.hitLimit : false;

  const displayTitle = (clip.type === 'text' || clip.type === 'sticker') && clip.properties.text
    ? clip.properties.text
    : clip.title;

  return (
    <>
      <div
        ref={clipRef}
        data-clip-id={clip.id}
        onMouseDown={handleClipMouseDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          selectClip(clip.id, clip.trackId);
          if (clip.type === 'text' || clip.type === 'sticker') {
            setEditingClipId(clip.id);
            setActiveInspectorTab('text');
          }
        }}
        className={`absolute top-0.5 bottom-0.5 rounded overflow-hidden cursor-grab active:cursor-grabbing border select-none group flex items-center transition-colors ${
          isSelected
            ? 'border-[#C9A66B] ring-1 ring-[#C9A66B]/50 shadow-sm z-20'
            : 'border-white/10 hover:border-white/25 z-10'
        }`}
        style={{
          left: `${leftPx}px`,
          width: `${widthPx}px`,
          backgroundColor: clip.color || '#384357',
        }}
      >
        {/* 1. Left Trim Handle (6px visual bar, 12px hit area) */}
        <div
          data-handle="left"
          onMouseDown={(e) => handleTrimStart(e, 'start')}
          className="w-3 h-full absolute left-0 top-0 bottom-0 z-30 cursor-ew-resize flex items-center justify-start"
          title={isAtSourceStart ? "Source start limit reached (0:00)" : "Trim In"}
        >
          <div className={`w-1.5 h-full flex items-center justify-center transition-colors ${
            isLeftHandleAtLimit
              ? 'bg-[#EF4444] opacity-100 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
              : isSelected
              ? 'bg-[#C9A66B] opacity-100'
              : 'bg-white/20 opacity-0 group-hover:opacity-100'
          }`}>
            <div className={`w-0.5 h-2.5 rounded ${isLeftHandleAtLimit ? 'bg-white' : 'bg-black/60'}`} />
          </div>
        </div>

        {/* 2. Visual Track Content */}
        {clip.type === 'video' && (
          <div className="relative w-full h-full flex items-center overflow-hidden">
            {/* Filmstrip sprocket lines */}
            <div className="absolute top-0.5 inset-x-2 h-0.5 bg-[radial-gradient(circle,rgba(255,255,255,0.3)_1px,transparent_1px)] bg-[length:5px_2px] opacity-40 pointer-events-none" />
            <div className="absolute bottom-0.5 inset-x-2 h-0.5 bg-[radial-gradient(circle,rgba(255,255,255,0.3)_1px,transparent_1px)] bg-[length:5px_2px] opacity-40 pointer-events-none" />

            {clip.thumbnail && (
              <div className="absolute inset-0 opacity-20 flex pointer-events-none">
                <img src={clip.thumbnail} alt="" className="h-full w-auto object-cover" />
                <img src={clip.thumbnail} alt="" className="h-full w-auto object-cover" />
                <img src={clip.thumbnail} alt="" className="h-full w-auto object-cover" />
              </div>
            )}

            <span className="relative z-10 px-3 text-[11px] font-medium text-[#E8E6E1] truncate">
              {displayTitle}
            </span>
          </div>
        )}

        {clip.type === 'audio' && (
          <div className="relative w-full h-full flex items-center px-3 justify-between overflow-hidden">
            <div className="absolute inset-0 flex items-center gap-0.5 px-2.5 opacity-35 pointer-events-none">
              {(clip.waveform || [35, 55, 75, 45, 85, 65, 40, 80, 90, 60]).map((val, idx) => (
                <span
                  key={idx}
                  className="w-0.5 bg-[#86EFAC] rounded-full inline-block"
                  style={{ height: `${val}%` }}
                />
              ))}
            </div>
            <span className="relative z-10 text-[11px] font-medium text-[#E8E6E1] truncate">
              {displayTitle}
            </span>
          </div>
        )}

        {(clip.type === 'text' || clip.type === 'sticker') && (
          <div className="relative w-full h-full flex items-center px-3 truncate">
            <span className="text-[11px] font-medium text-[#E8E6E1] truncate">
              {displayTitle}
            </span>
          </div>
        )}

        {/* 3. Right Trim Handle (6px visual bar, 12px hit area) */}
        <div
          data-handle="right"
          onMouseDown={(e) => handleTrimStart(e, 'end')}
          className="w-3 h-full absolute right-0 top-0 bottom-0 z-30 cursor-ew-resize flex items-center justify-end"
          title={isAtSourceEnd ? `Source end limit reached (${sourceDuration.toFixed(2)}s)` : "Trim Out"}
        >
          <div className={`w-1.5 h-full flex items-center justify-center transition-colors ${
            isRightHandleAtLimit
              ? 'bg-[#EF4444] opacity-100 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
              : isSelected
              ? 'bg-[#C9A66B] opacity-100'
              : 'bg-white/20 opacity-0 group-hover:opacity-100'
          }`}>
            <div className={`w-0.5 h-2.5 rounded ${isRightHandleAtLimit ? 'bg-white' : 'bg-black/60'}`} />
          </div>
        </div>
      </div>

      {/* 4. Live Floating Trim Tooltip */}
      {trimFeedback && (
        <div 
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 px-2.5 py-1.5 rounded bg-[#16161A]/95 backdrop-blur-md border border-[#383844] shadow-2xl text-[10.5px] font-mono text-[#E8E6E1] flex flex-col items-center gap-1 select-none"
          style={{ left: `${trimFeedback.clientX}px`, top: `${trimFeedback.clientY - 12}px` }}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span>In: <strong className="text-[#C9A66B]">{trimFeedback.offset.toFixed(2)}s</strong></span>
            <span className="text-zinc-600">|</span>
            <span>Out: <strong className="text-[#C9A66B]">{trimFeedback.sourceOut.toFixed(2)}s</strong></span>
            <span className="text-zinc-600">|</span>
            <span>Len: <strong className="text-white">{trimFeedback.duration.toFixed(2)}s</strong></span>
          </div>
          {trimFeedback.hitLimit && (
            <div className="flex items-center gap-1 text-[9px] text-[#EF4444] font-semibold uppercase tracking-wider">
              <span>● Source Media Limit Reached</span>
            </div>
          )}
        </div>
      )}
    </>
  );
};
