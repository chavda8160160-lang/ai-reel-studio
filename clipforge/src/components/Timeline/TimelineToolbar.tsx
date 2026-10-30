import React from 'react';
import { 
  Scissors, 
  Trash2, 
  Crop, 
  FlipHorizontal, 
  RotateCw, 
  Snowflake, 
  Magnet, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  MousePointer,
  Plus,
  ArrowLeftToLine,
  ArrowRightToLine,
  Copy,
  Rows
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
    toggleTrackHeightMode
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
    <div className="h-8 border-b px-2.5 flex items-center justify-between shrink-0 select-none text-xs bg-[#141418] border-[#24242A]">
      {/* Left: Editing Tools */}
      <div className="flex items-center gap-1">
        <button
          className="p-1.5 rounded border transition-colors text-[#C9A66B] bg-[#2A251D] border-[#C9A66B]/30"
          title="Pointer Select Tool (V)"
        >
          <MousePointer className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>

        <div className="w-px h-3.5 bg-[#2A2A32] mx-1" />

        {/* Split at Playhead */}
        <button
          onClick={() => splitClipAtPlayhead()}
          className="flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium text-[#D8D6D1] bg-[#1E1E24] border-[#2C2C33] hover:border-[#C9A66B]/50 transition-colors cursor-pointer group"
          title="Split Clip at Playhead (S)"
        >
          <Scissors className="w-3 h-3 stroke-[1.5] text-[#8A8A92] group-hover:text-[#C9A66B]" />
          <span>Split</span>
        </button>

        {/* Move to 0:00 Start */}
        <button
          onClick={() => {
            if (activeClip) {
              moveClip(activeClip.id, 0);
            }
          }}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium text-[#D8D6D1] bg-[#1E1E24] border-[#2C2C33] hover:border-[#C9A66B]/50 disabled:opacity-25 transition-colors cursor-pointer"
          title="Move selected clip to 00:00 (Start of timeline)"
        >
          <ArrowLeftToLine className="w-3 h-3 text-[#C9A66B]" />
          <span>To 0:00</span>
        </button>

        {/* Move to Current Playhead */}
        <button
          onClick={() => {
            if (activeClip) {
              moveClip(activeClip.id, currentTime);
            }
          }}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium text-[#D8D6D1] bg-[#1E1E24] border-[#2C2C33] hover:border-[#C9A66B]/50 disabled:opacity-25 transition-colors cursor-pointer"
          title="Move selected clip to current playhead"
        >
          <ArrowRightToLine className="w-3 h-3 text-[#C9A66B]" />
          <span>To Head</span>
        </button>

        {/* Duplicate */}
        <button
          onClick={() => duplicateSelectedClip()}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-medium text-[#D8D6D1] bg-[#1E1E24] border-[#2C2C33] hover:border-[#C9A66B]/50 disabled:opacity-25 transition-colors cursor-pointer"
          title="Duplicate Selected Clip (Ctrl+D)"
        >
          <Copy className="w-3 h-3 stroke-[1.5] text-[#C9A66B]" />
          <span>Duplicate</span>
        </button>

        {/* Delete */}
        <button
          onClick={() => deleteClip()}
          disabled={!selectedClipId}
          className="p-1.5 rounded border text-[#8A8A92] hover:text-[#EF4444] disabled:opacity-25 bg-[#1E1E24] border-[#2C2C33] transition-colors"
          title="Delete Selected Clip (Delete / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>

        <div className="w-px h-3.5 bg-[#2A2A32] mx-1" />

        {/* Quick Transform tools */}
        <button
          onClick={() => alert("Crop Tool: Drag the canvas corner handles to crop.")}
          className="p-1.5 rounded border text-[#8A8A92] hover:text-[#E8E6E1] bg-[#1E1E24] border-[#2C2C33] transition-colors"
          title="Crop Video Canvas (C)"
        >
          <Crop className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>

        <button
          onClick={handleFlip}
          disabled={!selectedClipId}
          className="p-1.5 rounded border text-[#8A8A92] hover:text-[#E8E6E1] disabled:opacity-25 bg-[#1E1E24] border-[#2C2C33] transition-colors"
          title="Mirror / Flip Horizontal"
        >
          <FlipHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>

        <button
          onClick={handleRotate}
          disabled={!selectedClipId}
          className="p-1.5 rounded border text-[#8A8A92] hover:text-[#E8E6E1] disabled:opacity-25 bg-[#1E1E24] border-[#2C2C33] transition-colors"
          title="Rotate 90° Clockwise"
        >
          <RotateCw className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>

        <button
          onClick={() => {
            if (activeClip) {
              useEditorStore.getState().trimClip(activeClip.id, 'end', 2.0);
            }
          }}
          disabled={!selectedClipId}
          className="p-1.5 rounded border text-[#8A8A92] hover:text-[#E8E6E1] disabled:opacity-25 bg-[#1E1E24] border-[#2C2C33] transition-colors"
          title="Freeze Frame (2s hold)"
        >
          <Snowflake className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>

        <div className="w-px h-3.5 bg-[#2A2A32] mx-1" />

        {/* Add Track */}
        <button
          onClick={() => addTrack('video')}
          className="flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-medium text-[#C9A66B] bg-[#2A251D] border-[#C9A66B]/30 hover:border-[#C9A66B]/60 transition-colors"
          title="Add Sequence Track"
        >
          <Plus className="w-3 h-3 stroke-[2]" />
          <span>Track</span>
        </button>
      </div>

      {/* Right: Height Toggle, Magnet Snap, Zoom Slider & Fit */}
      <div className="flex items-center gap-2">
        {/* Track Height Toggle (Compact / Normal) */}
        <button
          onClick={toggleTrackHeightMode}
          className="flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-medium transition-colors bg-[#1E1E24] border-[#2C2C33] text-[#D8D6D1] hover:border-[#C9A66B]/50"
          title={`Toggle Track Height: currently ${trackHeightMode}`}
        >
          <Rows className="w-3 h-3 text-[#C9A66B]" />
          <span className="capitalize">{trackHeightMode}</span>
        </button>

        <div className="w-px h-3.5 bg-[#2A2A32]" />

        {/* Magnetic Snapping Toggle */}
        <button
          onClick={toggleSnap}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-semibold transition-colors ${
            isSnapEnabled
              ? 'text-[#C9A66B] bg-[#2A251D] border-[#C9A66B]/40'
              : 'text-[#787882] bg-[#1E1E24] border-[#2C2C33] hover:text-[#D8D6D1]'
          }`}
          title="Magnetic Snapping (N)"
        >
          <Magnet className="w-3 h-3 stroke-[1.5]" />
          <span>Snap {isSnapEnabled ? 'ON' : 'OFF'}</span>
        </button>

        <div className="w-px h-3.5 bg-[#2A2A32]" />

        {/* Zoom Slider */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(zoom - 5)}
            disabled={zoom <= (minZoom || 1)}
            className="text-[#8A8A92] hover:text-[#E8E6E1] disabled:opacity-25 p-0.5"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3 stroke-[1.5]" />
          </button>
          <input
            type="range"
            min={Number((minZoom || 1).toFixed(1))}
            max={Math.max(120, Number((minZoom || 1).toFixed(1)) + 80)}
            step="0.5"
            value={Number(zoom.toFixed(1))}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-16 h-1 bg-[#282832] rounded cursor-pointer"
            title={`Timeline Scale: ${zoom.toFixed(1)} px/s (min: ${(minZoom || 1).toFixed(1)})`}
          />
          <button
            onClick={() => setZoom(zoom + 5)}
            className="text-[#8A8A92] hover:text-[#E8E6E1] p-0.5"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3 stroke-[1.5]" />
          </button>
        </div>

        {/* Fit Timeline Button (Rule 3) */}
        <button
          onClick={() => fitToView()}
          className={`p-1 rounded border transition-colors ${
            isAutoFit 
              ? 'bg-[#2A251D] border-[#C9A66B] text-[#C9A66B]' 
              : 'text-[#8A8A92] hover:text-[#E8E6E1] bg-[#1E1E24] border-[#2C2C33]'
          }`}
          title="Fit Project to Window (F)"
        >
          <Maximize className="w-3 h-3 stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
};
