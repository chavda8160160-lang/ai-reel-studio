import React, { useRef, useState } from 'react';
import { VolumeX, Link2, Scissors } from 'lucide-react';
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
    setActiveInspectorTab,
    setActiveLeftTab,
    updateClipProperties,
    updateClipSpan,
    openInstagramTrimmer
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

  const handleFadeDrag = (e: React.MouseEvent, type: 'in' | 'out') => {
    e.stopPropagation();
    e.preventDefault();
    beginTransaction();
    const startX = e.clientX;
    const initialFade = type === 'in' ? (clip.properties.fadeIn || 0) : (clip.properties.fadeOut || 0);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / zoom;
      const maxFade = Math.max(0, clip.duration / 2);
      let newFade = type === 'in' 
        ? Math.min(maxFade, Math.max(0, initialFade + deltaSec))
        : Math.min(maxFade, Math.max(0, initialFade - deltaSec));
      newFade = Math.round(newFade * 10) / 10;
      updateClipProperties(clip.id, type === 'in' ? { fadeIn: newFade } : { fadeOut: newFade });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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

  const clipBgColor = (() => {
    switch (clip.type) {
      case 'video': return '#3b4a63';
      case 'audio': return '#3d5a4f';
      case 'text': return '#5c5246';
      case 'sticker':
      case 'effect':
      default:
        return '#4d4560';
    }
  })();

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
          } else if (clip.type === 'audio') {
            openInstagramTrimmer({
              clipId: clip.id,
              initialOffset: clip.offset,
              initialDuration: clip.duration,
            });
          }
        }}
        className={`absolute top-0.5 bottom-0.5 rounded-[3px] overflow-hidden cursor-grab active:cursor-grabbing border select-none group flex items-center transition-[filter,border-color] duration-150 ${
          isSelected
            ? 'border-[#4f8cff] z-20'
            : 'border-white/[0.12] hover:brightness-[1.12] z-10'
        }`}
        style={{
          left: `${leftPx}px`,
          width: `${widthPx}px`,
          backgroundColor: clipBgColor,
        }}
      >
        {/* 1. Left Trim Handle (6px visual bar, 12px hit area) */}
        <div
          data-handle="left"
          onMouseDown={(e) => handleTrimStart(e, 'start')}
          className="w-3 h-full absolute left-0 top-0 bottom-0 z-30 cursor-ew-resize flex items-center justify-start"
          title={isAtSourceStart ? "Source start limit reached (0:00)" : "Trim In"}
        >
          <div className={`w-1.5 h-full flex items-center justify-center transition-colors duration-150 ${
            isLeftHandleAtLimit
              ? 'bg-[#ef4444] opacity-100'
              : isSelected
              ? 'bg-[#4f8cff] opacity-100'
              : 'bg-white/20 opacity-0 group-hover:opacity-100'
          }`}>
            <div className={`w-0.5 h-2.5 rounded-[1px] ${isLeftHandleAtLimit ? 'bg-white' : 'bg-black/50'}`} />
          </div>
        </div>

        {/* 2. Visual Track Content */}
        {clip.type === 'video' && (
          <div className="relative w-full h-full flex items-center overflow-hidden">
            {/* Filmstrip sprocket lines */}
            <div className="absolute top-0.5 inset-x-2 h-0.5 bg-[radial-gradient(circle,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[length:5px_2px] opacity-30 pointer-events-none" />
            <div className="absolute bottom-0.5 inset-x-2 h-0.5 bg-[radial-gradient(circle,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[length:5px_2px] opacity-30 pointer-events-none" />

            {clip.thumbnail && (
              <div className="absolute inset-0 opacity-40 flex pointer-events-none">
                <img src={clip.thumbnail} alt="" className="h-full w-auto object-cover" />
                <img src={clip.thumbnail} alt="" className="h-full w-auto object-cover" />
                <img src={clip.thumbnail} alt="" className="h-full w-auto object-cover" />
              </div>
            )}

            <span className="relative z-10 px-3 text-[11px] font-medium text-[#d4d4d8] truncate font-sans">
              {displayTitle}
            </span>
          </div>
        )}

        {clip.type === 'audio' && (
          <div className="relative w-full h-full flex items-center px-3 justify-between overflow-hidden">
            {/* Fade In visual ramp */}
            {clip.properties.fadeIn && clip.properties.fadeIn > 0 && (
              <div 
                className="absolute left-0 top-0 bottom-0 bg-black/35 pointer-events-none z-10 border-r border-white/20"
                style={{
                  width: `${Math.min(widthPx, clip.properties.fadeIn * zoom)}px`,
                  clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                }}
              />
            )}

            {/* Fade Out visual ramp */}
            {clip.properties.fadeOut && clip.properties.fadeOut > 0 && (
              <div 
                className="absolute right-0 top-0 bottom-0 bg-black/35 pointer-events-none z-10 border-l border-white/20"
                style={{
                  width: `${Math.min(widthPx, clip.properties.fadeOut * zoom)}px`,
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%)'
                }}
              />
            )}

            {/* Waveform Graphic */}
            <div className="absolute inset-0 flex items-center gap-0.5 px-2.5 opacity-40 pointer-events-none">
              {(clip.waveform || [35, 55, 75, 45, 85, 65, 40, 80, 90, 60]).map((val, idx) => (
                <span
                  key={idx}
                  className="w-0.5 bg-white/80 rounded-full inline-block"
                  style={{ height: `${val}%` }}
                />
              ))}
            </div>

            {/* Clip Label + Status Icons */}
            <div className="relative z-10 flex items-center gap-1.5 truncate">
              {clip.properties.isMuted && (
                <span title="Clip Audio Muted" className="shrink-0 flex items-center">
                  <VolumeX className="w-3 h-3 text-[#ef4444]" />
                </span>
              )}
              {clip.groupId && (
                <span title="Grouped / Compound Clip" className="shrink-0 flex items-center">
                  <Link2 className="w-3 h-3 text-[#4f8cff]" />
                </span>
              )}
              <span className={`text-[11px] font-medium truncate font-sans ${clip.properties.isMuted ? 'text-[#8a8a93] line-through' : 'text-[#d4d4d8]'}`}>
                {displayTitle}
              </span>
            </div>

            {/* Fade Handles (top corners) */}
            <div 
              onMouseDown={(e) => handleFadeDrag(e, 'in')}
              className="absolute left-0 top-0 w-2.5 h-2.5 bg-white/60 hover:bg-[#4f8cff] rounded-br-xs cursor-ew-resize z-30 transition-colors"
              title={`Fade In: ${(clip.properties.fadeIn || 0).toFixed(1)}s (Drag to adjust)`}
            />
            <div 
              onMouseDown={(e) => handleFadeDrag(e, 'out')}
              className="absolute right-0 top-0 w-2.5 h-2.5 bg-white/60 hover:bg-[#4f8cff] rounded-bl-xs cursor-ew-resize z-30 transition-colors"
              title={`Fade Out: ${(clip.properties.fadeOut || 0).toFixed(1)}s (Drag to adjust)`}
            />

            {(() => {
              const videoTrack = tracks.find(t => t.type === 'video');
              const videoEnd = videoTrack?.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0) || 0;
              const isOverVideo = videoEnd > 0 && (clip.start + clip.duration) > (videoEnd + 0.2);

              return (
                <div className="relative z-20 shrink-0 ml-2 flex items-center gap-1.5">
                  {widthPx > 110 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInstagramTrimmer({
                          clipId: clip.id,
                          initialOffset: clip.offset,
                          initialDuration: clip.duration,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-gradient-to-r from-[#FD1D1D] via-[#E1306C] to-[#833AB4] hover:brightness-110 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      title="Open Instagram Reels Audio Trimmer"
                    >
                      <Scissors className="w-2.5 h-2.5" />
                      <span>Insta Cut</span>
                    </button>
                  )}

                  {isOverVideo && widthPx > 160 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const fitDur = Math.max(0.5, Number((videoEnd - clip.start).toFixed(2)));
                        updateClipSpan(clip.id, clip.start, fitDur, clip.offset);
                      }}
                      className="px-2 py-0.5 rounded bg-gradient-to-r from-[#4f8cff] to-[#38bdf8] hover:brightness-110 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      title={`Trim audio to match video end (${videoEnd.toFixed(1)}s)`}
                    >
                      <Scissors className="w-2.5 h-2.5" />
                      <span>Fit Video ({videoEnd.toFixed(1)}s)</span>
                    </button>
                  )}

                  {widthPx > 90 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLeftTab('audio');
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#2f2f34] hover:bg-[#3a3a40] border border-white/10 text-[10px] text-[#d4d4d8] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Change Audio Track"
                    >
                      <span>Change</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {(clip.type === 'text' || clip.type === 'sticker') && (
          <div className="relative w-full h-full flex items-center px-3 truncate">
            <span className="text-[11px] font-medium text-[#d4d4d8] truncate font-sans">
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
          <div className={`w-1.5 h-full flex items-center justify-center transition-colors duration-150 ${
            isRightHandleAtLimit
              ? 'bg-[#ef4444] opacity-100'
              : isSelected
              ? 'bg-[#4f8cff] opacity-100'
              : 'bg-white/20 opacity-0 group-hover:opacity-100'
          }`}>
            <div className={`w-0.5 h-2.5 rounded-[1px] ${isRightHandleAtLimit ? 'bg-white' : 'bg-black/50'}`} />
          </div>
        </div>
      </div>

      {/* 4. Live Floating Trim Tooltip */}
      {trimFeedback && (
        <div 
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 px-2.5 py-1.5 rounded-[3px] bg-[#1b1b1d] border border-[#38383d] shadow-lg text-[10.5px] font-mono text-[#d4d4d8] flex flex-col items-center gap-1 select-none"
          style={{ left: `${trimFeedback.clientX}px`, top: `${trimFeedback.clientY - 12}px` }}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span>In: <strong className="text-[#4f8cff] font-semibold">{trimFeedback.offset.toFixed(2)}s</strong></span>
            <span className="text-[#38383d]">|</span>
            <span>Out: <strong className="text-[#4f8cff] font-semibold">{trimFeedback.sourceOut.toFixed(2)}s</strong></span>
            <span className="text-[#38383d]">|</span>
            <span>Len: <strong className="text-[#d4d4d8] font-semibold">{trimFeedback.duration.toFixed(2)}s</strong></span>
          </div>
          {trimFeedback.hitLimit && (
            <div className="flex items-center gap-1 text-[9px] text-[#ef4444] font-semibold uppercase tracking-wider">
              <span>● Source Media Limit Reached</span>
            </div>
          )}
        </div>
      )}
    </>
  );
};
