import React from 'react';
import { 
  Scissors, 
  Trash2, 
  FlipHorizontal, 
  RotateCw, 
  Magnet, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  Plus,
  ArrowLeftToLine,
  ArrowRightToLine,
  Copy,
  Rows,
  MousePointer,
  Link2,
  Music,
  VolumeX,
  Mic
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const TimelineToolbar: React.FC = () => {
  const { 
    splitClipAtPlayhead, 
    deleteClip, 
    moveClip,
    currentTime,
    selectedClipId, 
    updateClipProperties,
    tracks,
    isSnapEnabled, 
    toggleSnap, 
    zoom, 
    setZoom,
    minZoom,
    isAutoFit,
    fitToView,
    addTrack,
    duplicateSelectedClip,
    trackHeightMode,
    toggleTrackHeightMode,
    activeTool,
    setActiveTool,
    isLinkageEnabled,
    toggleLinkage,
    extractAudioFromVideo,
    toggleClipMute,
    isRecordingVoice,
    setIsRecordingVoice
  } = useEditorStore();

  let activeClip = null;
  for (const t of tracks) {
    const found = t.clips.find(c => c.id === selectedClipId);
    if (found) {
      activeClip = found;
      break;
    }
  }

  const handleRotate = () => {
    if (activeClip) {
      updateClipProperties(activeClip.id, {
        rotation: (activeClip.properties.rotation + 90) % 360
      });
    }
  };

  const handleFlip = () => {
    if (activeClip) {
      updateClipProperties(activeClip.id, {
        flipH: !activeClip.properties.flipH
      });
    }
  };

  return (
    <div className="h-8 border-b px-2.5 flex items-center justify-between shrink-0 select-none text-xs bg-[#2a2a2e] border-[#38383d]">
      {/* Left: Functional Editing Tools */}
      <div className="flex items-center gap-1">
        {/* Selection Tool (CapCut Desktop 'A') */}
        <button
          onClick={() => setActiveTool('select')}
          className={`h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
            activeTool === 'select'
              ? 'bg-[#4f8cff] text-white border-[#4f8cff]'
              : 'text-[#8a8a93] bg-[#2f2f34] border-[#38383d] hover:text-[#d4d4d8] hover:bg-[#3a3a40]'
          }`}
          title="Selection Tool (A)"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>

        {/* 1px Divider */}
        <div className="w-px h-3.5 bg-[#38383d] mx-0.5" />

        {/* Group 1: Edit & Sequence Actions */}
        <button
          onClick={() => splitClipAtPlayhead()}
          className="h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium text-[#d4d4d8] bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40] transition-colors duration-150 cursor-pointer group"
          title="Split Clip at Playhead (Ctrl+B / S)"
        >
          <Scissors className="w-3.5 h-3.5 text-[#8a8a93] group-hover:text-[#d4d4d8] transition-colors duration-150" />
          <span>Split</span>
        </button>

        <button
          onClick={() => duplicateSelectedClip()}
          disabled={!selectedClipId}
          className="h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium text-[#d4d4d8] bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40] disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer group"
          title="Duplicate Selected Clip (Ctrl+D)"
        >
          <Copy className="w-3.5 h-3.5 text-[#8a8a93] group-hover:text-[#d4d4d8] transition-colors duration-150" />
          <span>Duplicate</span>
        </button>

        <button
          onClick={() => deleteClip()}
          disabled={!selectedClipId}
          className="h-6 w-6 flex items-center justify-center rounded-[3px] border text-[#8a8a93] hover:text-[#ef4444] disabled:opacity-25 disabled:cursor-not-allowed bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40] transition-colors duration-150 cursor-pointer"
          title="Delete Selected Clip (Delete / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* 1px Divider */}
        <div className="w-px h-3.5 bg-[#38383d] mx-1" />

        {/* Group 2: Position Alignment */}
        <button
          onClick={() => {
            if (activeClip) {
              moveClip(activeClip.id, 0);
            }
          }}
          disabled={!selectedClipId}
          className="h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium text-[#d4d4d8] bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40] disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer group"
          title="Move selected clip to 00:00 (Start of timeline)"
        >
          <ArrowLeftToLine className="w-3.5 h-3.5 text-[#8a8a93] group-hover:text-[#d4d4d8] transition-colors duration-150" />
          <span>To 0:00</span>
        </button>

        <button
          onClick={() => {
            if (activeClip) {
              moveClip(activeClip.id, currentTime);
            }
          }}
          disabled={!selectedClipId}
          className="h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium text-[#d4d4d8] bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40] disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer group"
          title="Move selected clip to current playhead"
        >
          <ArrowRightToLine className="w-3.5 h-3.5 text-[#8a8a93] group-hover:text-[#d4d4d8] transition-colors duration-150" />
          <span>To Head</span>
        </button>

        {/* 1px Divider */}
        <div className="w-px h-3.5 bg-[#38383d] mx-1" />

        {/* Group 3: Quick Transform Tools */}
        <button
          onClick={handleFlip}
          disabled={!selectedClipId}
          className="h-6 w-6 flex items-center justify-center rounded-[3px] border text-[#8a8a93] hover:text-[#d4d4d8] disabled:opacity-25 disabled:cursor-not-allowed bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40] transition-colors duration-150 cursor-pointer"
          title="Mirror / Flip Horizontal"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleRotate}
          disabled={!selectedClipId}
          className="h-6 w-6 flex items-center justify-center rounded-[3px] border text-[#8a8a93] hover:text-[#d4d4d8] disabled:opacity-25 disabled:cursor-not-allowed bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40] transition-colors duration-150 cursor-pointer"
          title="Rotate 90° Clockwise"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* 1px Divider */}
        <div className="w-px h-3.5 bg-[#38383d] mx-1" />

        {/* Group 3B: Audio Tools (Phase 2) */}
        {activeClip?.type === 'video' && (
          <button
            onClick={() => extractAudioFromVideo(activeClip.id)}
            className="h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium text-[#d4d4d8] bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40] hover:border-[#4f8cff] transition-colors duration-150 cursor-pointer"
            title="Separate / Extract Audio from Video to Track A1"
          >
            <Music className="w-3.5 h-3.5 text-[#4f8cff]" />
            <span>Extract</span>
          </button>
        )}

        {activeClip && (
          <button
            onClick={() => toggleClipMute(activeClip.id)}
            className={`h-6 w-6 flex items-center justify-center rounded-[3px] border transition-colors duration-150 cursor-pointer ${
              activeClip.properties.isMuted
                ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                : 'bg-[#2f2f34] border-[#38383d] text-[#8a8a93] hover:text-[#d4d4d8] hover:bg-[#3a3a40]'
            }`}
            title={activeClip.properties.isMuted ? "Unmute Clip" : "Mute Clip Audio"}
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => setIsRecordingVoice(!isRecordingVoice)}
          className={`h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
            isRecordingVoice
              ? 'bg-[#ef4444] text-white border-[#ef4444] animate-pulse'
              : 'text-[#8a8a93] bg-[#2f2f34] border-[#38383d] hover:text-[#d4d4d8] hover:bg-[#3a3a40]'
          }`}
          title="Record Voiceover (MediaRecorder onto Audio Track)"
        >
          <Mic className="w-3.5 h-3.5 text-[#4f8cff]" />
          <span>Record</span>
        </button>

        {/* 1px Divider */}
        <div className="w-px h-3.5 bg-[#38383d] mx-1" />

        {/* Group 4: Track Management */}
        <button
          onClick={() => addTrack('video')}
          className="h-6 px-2 flex items-center gap-1 rounded-[3px] border text-[11px] font-medium text-[#d4d4d8] bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40] hover:border-[#4f8cff]/50 transition-colors duration-150 cursor-pointer group"
          title="Add Sequence Video Track"
        >
          <Plus className="w-3.5 h-3.5 text-[#8a8a93] group-hover:text-[#d4d4d8] transition-colors duration-150" />
          <span>Track</span>
        </button>
      </div>

      {/* Right: View & Snap Controls */}
      <div className="flex items-center gap-1.5">
        {/* Track Height Toggle (Compact / Normal) */}
        <button
          onClick={toggleTrackHeightMode}
          className="h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium transition-colors duration-150 bg-[#2f2f34] border-[#38383d] text-[#d4d4d8] hover:bg-[#3a3a40] cursor-pointer"
          title={`Toggle Track Height: currently ${trackHeightMode}`}
        >
          <Rows className="w-3.5 h-3.5 text-[#8a8a93]" />
          <span className="capitalize">{trackHeightMode}</span>
        </button>

        {/* 1px Divider */}
        <div className="w-px h-3.5 bg-[#38383d] mx-0.5" />

        {/* Magnetic Snapping Toggle */}
        <button
          onClick={toggleSnap}
          className={`h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
            isSnapEnabled
              ? 'text-white bg-[#4f8cff] border-[#4f8cff]'
              : 'text-[#8a8a93] bg-[#2f2f34] border-[#38383d] hover:text-[#d4d4d8] hover:bg-[#3a3a40]'
          }`}
          title="Magnetic Snapping (N)"
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap {isSnapEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* 1px Divider */}
        <div className="w-px h-3.5 bg-[#38383d] mx-0.5" />

        {/* Linkage Toggle (Video + Audio Sync) */}
        <button
          onClick={toggleLinkage}
          className={`h-6 px-2 flex items-center gap-1.5 rounded-[3px] border text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
            isLinkageEnabled
              ? 'text-white bg-[#4f8cff] border-[#4f8cff]'
              : 'text-[#8a8a93] bg-[#2f2f34] border-[#38383d] hover:text-[#d4d4d8] hover:bg-[#3a3a40]'
          }`}
          title="Toggle Linkage: Video and Audio clips move together"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Link {isLinkageEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* 1px Divider */}
        <div className="w-px h-3.5 bg-[#38383d] mx-0.5" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(zoom - 5)}
            disabled={zoom <= (minZoom || 1)}
            className="h-6 w-6 flex items-center justify-center rounded-[3px] text-[#8a8a93] hover:text-[#d4d4d8] disabled:opacity-25 disabled:cursor-not-allowed hover:bg-[#3a3a40] transition-colors duration-150 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={Number((minZoom || 1).toFixed(1))}
            max={Math.max(120, Number((minZoom || 1).toFixed(1)) + 80)}
            step="0.5"
            value={Number(zoom.toFixed(1))}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-16 h-1 bg-[#232326] accent-[#4f8cff] rounded cursor-pointer"
            title={`Timeline Scale: ${zoom.toFixed(1)} px/s (min: ${(minZoom || 1).toFixed(1)})`}
          />
          <button
            onClick={() => setZoom(zoom + 5)}
            className="h-6 w-6 flex items-center justify-center rounded-[3px] text-[#8a8a93] hover:text-[#d4d4d8] hover:bg-[#3a3a40] transition-colors duration-150 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fit Timeline Button */}
        <button
          onClick={() => fitToView()}
          className={`h-6 w-6 flex items-center justify-center rounded-[3px] border transition-colors duration-150 cursor-pointer ${
            isAutoFit 
              ? 'bg-[#4f8cff] border-[#4f8cff] text-white' 
              : 'text-[#8a8a93] hover:text-[#d4d4d8] bg-[#2f2f34] border-[#38383d] hover:bg-[#3a3a40]'
          }`}
          title="Fit Project to Window (F)"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
