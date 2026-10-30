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
  Plus
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const TimelineToolbar: React.FC = () => {
  const { 
    splitClipAtPlayhead, 
    deleteClip, 
    selectedClipId, 
    updateClipProperties,
    tracks,
    isSnapEnabled, 
    toggleSnap, 
    zoom, 
    setZoom,
    addTrack 
  } = useEditorStore();

  // Find selected clip
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
    <div className="h-10 bg-[#141417] border-b border-[#2A2A2D] px-3 flex items-center justify-between shrink-0 select-none text-xs">
      {/* Left: Editing Tools */}
      <div className="flex items-center gap-1">
        <button
          className="p-1.5 text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 rounded hover:bg-cyan-950/70 transition-colors"
          title="Select Tool (V)"
        >
          <MousePointer className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-[#2A2A2D] mx-1" />

        {/* Split at Playhead */}
        <button
          onClick={() => splitClipAtPlayhead()}
          className="flex items-center gap-1.5 px-2.5 py-1 text-zinc-300 hover:text-white bg-[#1C1C20] hover:bg-[#25252B] border border-[#2A2A2D] hover:border-cyan-400/50 rounded transition-colors group cursor-pointer"
          title="Split Clip at Playhead (S)"
        >
          <Scissors className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400" />
          <span className="font-medium text-[11px]">Split</span>
        </button>

        {/* Delete */}
        <button
          onClick={() => deleteClip()}
          disabled={!selectedClipId}
          className="p-1.5 text-zinc-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-400 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2A2A2D] rounded transition-colors"
          title="Delete Selected Clip (Delete / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-[#2A2A2D] mx-1" />

        {/* Quick Transform tools */}
        <button
          onClick={handleCrop}
          className="p-1.5 text-zinc-400 hover:text-white bg-[#1C1C20] hover:bg-[#25252B] border border-[#2A2A2D] rounded transition-colors"
          title="Crop Video Canvas (C)"
        >
          <Crop className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleFlip}
          disabled={!selectedClipId}
          className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2A2A2D] rounded transition-colors"
          title="Mirror / Flip Horizontal"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleRotate}
          disabled={!selectedClipId}
          className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2A2A2D] rounded transition-colors"
          title="Rotate 90° Clockwise"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            if (activeClip) {
              useEditorStore.getState().trimClip(activeClip.id, 'end', 2.0);
            }
          }}
          disabled={!selectedClipId}
          className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 bg-[#1C1C20] hover:bg-[#25252B] border border-[#2A2A2D] rounded transition-colors"
          title="Freeze Frame (2s hold)"
        >
          <Snowflake className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-[#2A2A2D] mx-1" />

        {/* Add Track Dropdown */}
        <button
          onClick={() => addTrack('video')}
          className="flex items-center gap-1 px-2 py-1 text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 rounded text-[11px] font-medium transition-colors"
          title="Add New Track"
        >
          <Plus className="w-3 h-3" />
          <span>Track</span>
        </button>
      </div>

      {/* Right: Magnet Snap, Zoom Slider & Fit */}
      <div className="flex items-center gap-3">
        {/* Magnetic Snapping Toggle */}
        <button
          onClick={toggleSnap}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
            isSnapEnabled
              ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40'
              : 'bg-[#1C1C20] text-zinc-500 border-[#2A2A2D] hover:text-zinc-300'
          }`}
          title="Magnetic Snapping (N)"
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap {isSnapEnabled ? 'ON' : 'OFF'}</span>
        </button>

        <div className="w-px h-4 bg-[#2A2A2D]" />

        {/* Zoom Slider */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(zoom - 6)}
            className="text-zinc-400 hover:text-white p-1"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min="16"
            max="100"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            className="w-20 h-1 bg-[#25252C] rounded cursor-pointer"
            title="Timeline Zoom Level"
          />
          <button
            onClick={() => setZoom(zoom + 6)}
            className="text-zinc-400 hover:text-white p-1"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fit Timeline */}
        <button
          onClick={() => setZoom(36)}
          className="p-1.5 text-zinc-400 hover:text-white bg-[#1C1C20] hover:bg-[#25252B] border border-[#2A2A2D] rounded transition-colors"
          title="Fit Timeline"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  function handleCrop() {
    alert("Crop Tool: Drag the canvas corner handles to crop aspect ratio.");
  }
};
