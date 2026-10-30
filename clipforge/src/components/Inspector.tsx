import React, { useEffect } from 'react';
import { 
  Film, 
  Volume2, 
  Gauge, 
  Sparkles, 
  Sliders, 
  FlipHorizontal, 
  FlipVertical, 
  RotateCw, 
  RotateCcw,
  Eye,
  Info,
  Scissors,
  ArrowLeftToLine,
  ArrowRightToLine,
  Type,
  Move,
  Sun,
  Contrast,
  Droplet,
  SplitSquareVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Italic
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import type { InspectorTab } from '../types/editor';

interface TabDef {
  id: InspectorTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Inspector: React.FC = () => {
  const { 
    selectedClipId, 
    tracks, 
    activeInspectorTab, 
    setActiveInspectorTab, 
    updateClipProperties,
    trimClip,
    moveClip,
    beginTransaction,
    commitTransaction,
    currentTime,
    aspectRatio,
    totalDuration,
    setIsComparingFilter,
    isComparingFilter
  } = useEditorStore();

  let activeClip = null;
  for (const track of tracks) {
    const found = track.clips.find(c => c.id === selectedClipId);
    if (found) {
      activeClip = found;
      break;
    }
  }

  const props = activeClip?.properties;
  const speed = activeClip?.properties?.speed || 1.0;
  const clipOffset = activeClip ? (activeClip.offset ?? 0) : 0;
  const sourceDuration = activeClip?.sourceDuration || 30;
  const maxDuration = Math.max(0.1, (sourceDuration - clipOffset) / speed);
  const maxStartPoint = Math.max(0.1, sourceDuration - 0.1);

  // 1. Dynamic Tabs depending strictly on active clip type (Rule 1)
  const getTabsForClip = (): TabDef[] => {
    if (!activeClip) return [];
    switch (activeClip.type) {
      case 'video':
        return [
          { id: 'video', label: 'Video', icon: Film },
          { id: 'audio', label: 'Audio', icon: Volume2 },
          { id: 'speed', label: 'Speed', icon: Gauge },
          { id: 'animation', label: 'Animation', icon: Sparkles },
          { id: 'adjust', label: 'Adjust', icon: Sliders },
        ];
      case 'audio':
        return [
          { id: 'audio', label: 'Audio', icon: Volume2 },
          { id: 'speed', label: 'Speed', icon: Gauge },
        ];
      case 'text':
        return [
          { id: 'text', label: 'Text', icon: Type },
          { id: 'transform', label: 'Transform', icon: Move },
          { id: 'animation', label: 'Animation', icon: Sparkles },
        ];
      case 'sticker':
        return [
          { id: 'text', label: 'Text', icon: Type },
          { id: 'transform', label: 'Transform', icon: Move },
          { id: 'animation', label: 'Animation', icon: Sparkles },
        ];
      default:
        return [
          { id: 'video', label: 'Video', icon: Film },
          { id: 'animation', label: 'Animation', icon: Sparkles },
        ];
    }
  };

  const currentTabs = getTabsForClip();

  // Keep activeInspectorTab valid for the selected clip
  useEffect(() => {
    if (currentTabs.length > 0) {
      const isCurrentValid = currentTabs.some(t => t.id === activeInspectorTab);
      if (!isCurrentValid) {
        setActiveInspectorTab(currentTabs[0].id);
      }
    }
  }, [activeClip?.type, activeInspectorTab, currentTabs, setActiveInspectorTab]);

  const handleUpdate = (partial: any) => {
    if (selectedClipId) {
      updateClipProperties(selectedClipId, partial);
    }
  };

  // Helper for adjusting individual color settings with -100..+100 scale
  const handleAdjustParam = (paramName: string, val: number) => {
    if (!props) return;
    const currentAdj = props.adjust || { brightness: 0, contrast: 0, saturation: 0, temperature: 0, vignette: 0, sharpen: 0 };
    handleUpdate({
      adjust: {
        ...currentAdj,
        [paramName]: val
      }
    });
  };

  const resetAdjustments = () => {
    handleUpdate({
      adjust: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        vignette: 0,
        sharpen: 0
      }
    });
  };

  return (
    <aside className="w-[300px] h-full border-l flex flex-col select-none shrink-0 overflow-hidden bg-[#18181C] border-[#2A2A30]">
      {/* 1. Header with Dynamic Clip Badge */}
      <div className="border-b shrink-0 bg-[#141417] border-[#26262D]">
        <div className="p-3 flex items-center justify-between pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#D8D6D1] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 stroke-[1.5] text-[#C9A66B]" />
            <span>Inspector</span>
          </h2>
          {activeClip ? (
            <span className="text-[9.5px] px-2 py-0.5 rounded border font-mono truncate max-w-[140px] bg-[#222228] border-[#36363F] text-[#C9A66B] font-medium">
              {activeClip.title}
            </span>
          ) : (
            <span className="text-[10px] text-[#787882] font-mono">No Selection</span>
          )}
        </div>

        {/* Dynamic Tab Strip based strictly on clip type */}
        {currentTabs.length > 0 && (
          <div className="flex border-t px-1 bg-[#131316] border-[#24242A]">
            {currentTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeInspectorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveInspectorTab(tab.id)}
                  className={`flex-1 py-1.5 text-[10.5px] font-medium flex items-center justify-center gap-1 border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#C9A66B] text-[#C9A66B] font-semibold bg-[#1A1A20]'
                      : 'border-transparent text-[#8A8A92] hover:text-[#E8E6E1] hover:bg-[#1E1E22]'
                  }`}
                >
                  <Icon className="w-3 h-3 stroke-[1.5]" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Body Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeClip && props ? (
          <>
            {/* =========================================================================
                TAB: VIDEO (Only for Video clips)
            ========================================================================= */}
            {activeInspectorTab === 'video' && activeClip.type === 'video' && (
              <div className="space-y-2.5">
                {/* 0. Precision Timeline Range & Trim */}
                <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#26262D]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1.5">
                      <Scissors className="w-3 h-3 text-[#C9A66B]" />
                      <span>Timeline Range & Trim</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveClip(activeClip.id, currentTime)}
                        className="text-[10px] text-[#C9A66B] hover:underline cursor-pointer font-medium"
                        title="Move clip start to current playhead"
                      >
                        To Head
                      </button>
                      <span className="text-zinc-600 text-[10px]">|</span>
                      <button
                        onClick={() => moveClip(activeClip.id, 0)}
                        className="text-[10px] text-[#C9A66B] hover:underline cursor-pointer font-medium"
                        title="Align clip to 0:00 start"
                      >
                        To 0:00
                      </button>
                    </div>
                  </div>

                  {/* Timeline Position (Start) */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span>Timeline Position</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={Number(Math.max(0, totalDuration).toFixed(2))}
                          value={Number(activeClip.start.toFixed(2))}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) moveClip(activeClip.id, Math.max(0, val));
                          }}
                          className="w-16 px-1.5 py-0.5 text-[10.5px] font-mono bg-[#1E1E24] border border-[#303038] rounded text-[#C9A66B] text-right focus:outline-none focus:border-[#C9A66B]"
                        />
                        <span className="text-[10px] text-zinc-400 font-mono">s</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Number(Math.max(totalDuration, activeClip.start + 5).toFixed(2))}
                      step="0.1"
                      value={Number(activeClip.start.toFixed(2))}
                      onDoubleClick={() => moveClip(activeClip.id, 0)}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => moveClip(activeClip.id, parseFloat(e.target.value) || 0)}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset to 0:00"
                    />
                  </div>

                  {/* Source In-Point */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#D8D6D1] mb-1">
                      <span>Source In-Point</span>
                      <span className="font-mono text-[#C9A66B] font-medium">
                        {clipOffset.toFixed(2)}s <span className="text-[#787882] text-[9.5px]">/ {sourceDuration.toFixed(2)}s</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Number(maxStartPoint.toFixed(2))}
                      step="0.1"
                      value={Number(clipOffset.toFixed(2))}
                      onDoubleClick={() => {
                        const deltaTimeline = -clipOffset / speed;
                        trimClip(activeClip.id, 'start', activeClip.start + deltaTimeline);
                      }}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => {
                        const newOffset = parseFloat(e.target.value) || 0;
                        const deltaTimeline = (newOffset - clipOffset) / speed;
                        trimClip(activeClip.id, 'start', activeClip.start + deltaTimeline);
                      }}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset to source start"
                    />
                  </div>

                  {/* Clip Duration */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span>Timeline Duration</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max={Number(maxDuration.toFixed(2))}
                          value={Number(activeClip.duration.toFixed(2))}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0.1) trimClip(activeClip.id, 'end', activeClip.start + val);
                          }}
                          className="w-16 px-1.5 py-0.5 text-[10.5px] font-mono bg-[#1E1E24] border border-[#303038] rounded text-[#C9A66B] text-right focus:outline-none focus:border-[#C9A66B]"
                        />
                        <span className="text-[10px] text-zinc-400 font-mono">s</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max={Number(maxDuration.toFixed(2))}
                      step="0.1"
                      value={Number(activeClip.duration.toFixed(2))}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => {
                        const newDur = parseFloat(e.target.value) || 0.1;
                        trimClip(activeClip.id, 'end', activeClip.start + newDur);
                      }}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    />
                  </div>

                  {/* Quick Trim Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      onClick={() => trimClip(activeClip.id, 'start', currentTime)}
                      className="p-1.5 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] bg-[#1F1F24] border-[#2C2C33] hover:border-[#C9A66B]/50 transition-colors"
                      title="Trim clip start to playhead"
                    >
                      <ArrowLeftToLine className="w-3 h-3 text-[#C9A66B]" />
                      <span>Trim In at Head</span>
                    </button>
                    <button
                      onClick={() => trimClip(activeClip.id, 'end', currentTime)}
                      className="p-1.5 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] bg-[#1F1F24] border-[#2C2C33] hover:border-[#C9A66B]/50 transition-colors"
                      title="Trim clip end to playhead"
                    >
                      <ArrowRightToLine className="w-3 h-3 text-[#C9A66B]" />
                      <span>Trim Out at Head</span>
                    </button>
                  </div>
                </div>

                {/* Transform Card */}
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <span className="text-[10.5px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center justify-between">
                    <span>Transform</span>
                    <button
                      onClick={() => handleUpdate({ scale: 1, rotation: 0, posX: 0, posY: 0, flipH: false, flipV: false })}
                      className="text-[10px] text-[#C9A66B] hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  </span>

                  {/* Scale */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#D8D6D1] mb-1">
                      <span>Scale (Zoom)</span>
                      <span className="font-mono text-[#C9A66B]">{props.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={props.scale}
                      onDoubleClick={() => handleUpdate({ scale: 1.0 })}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleUpdate({ scale: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset to 1.0x"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#D8D6D1] mb-1">
                      <span>Rotation</span>
                      <span className="font-mono text-[#C9A66B]">{props.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={props.rotation}
                      onDoubleClick={() => handleUpdate({ rotation: 0 })}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value, 10) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset to 0°"
                    />
                  </div>

                  {/* Position X / Y */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <span className="text-[9.5px] text-[#787882]">Position X</span>
                      <input
                        type="number"
                        value={props.posX}
                        onChange={(e) => handleUpdate({ posX: parseInt(e.target.value, 10) || 0 })}
                        className="w-full text-xs px-2 py-0.5 rounded border font-mono text-center outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#C9A66B]"
                      />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-[#787882]">Position Y</span>
                      <input
                        type="number"
                        value={props.posY}
                        onChange={(e) => handleUpdate({ posY: parseInt(e.target.value, 10) || 0 })}
                        className="w-full text-xs px-2 py-0.5 rounded border font-mono text-center outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#C9A66B]"
                      />
                    </div>
                  </div>

                  {/* Flip & Rotate Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => handleUpdate({ rotation: (props.rotation + 90) % 360 })}
                      className="p-1 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830]"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3 h-3 stroke-[1.5]" />
                      <span>90°</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ flipH: !props.flipH })}
                      className={`p-1 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] ${
                        props.flipH ? 'bg-[#2A251D] border-[#C9A66B] text-[#C9A66B]' : 'bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830]'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-3 h-3 stroke-[1.5]" />
                      <span>Flip H</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ flipV: !props.flipV })}
                      className={`p-1 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] ${
                        props.flipV ? 'bg-[#2A251D] border-[#C9A66B] text-[#C9A66B]' : 'bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830]'
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-3 h-3 stroke-[1.5]" />
                      <span>Flip V</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ scale: 1, rotation: 0, posX: 0, posY: 0 })}
                      className="p-1 border rounded text-[#8A8A92] hover:text-[#E8E6E1] flex items-center justify-center bg-[#1F1F24] border-[#2C2C33]"
                      title="Reset Transforms"
                    >
                      <RotateCcw className="w-3 h-3 stroke-[1.5]" />
                    </button>
                  </div>
                </div>

                {/* Opacity */}
                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#26262D]">
                  <div className="flex justify-between text-[11px] text-[#D8D6D1]">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3 h-3 stroke-[1.5] text-[#8A8A92]" />
                      <span>Opacity</span>
                    </span>
                    <span className="font-mono text-[#C9A66B]">{Math.round(props.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={props.opacity}
                    onDoubleClick={() => handleUpdate({ opacity: 1.0 })}
                    onPointerDown={() => beginTransaction()}
                    onPointerUp={() => commitTransaction()}
                    onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    title="Double-click to reset to 100%"
                  />
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB: AUDIO (Only for Video and Audio clips)
            ========================================================================= */}
            {activeInspectorTab === 'audio' && (activeClip.type === 'video' || activeClip.type === 'audio') && (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <div className="flex justify-between text-[11px] text-[#D8D6D1]">
                    <span>Volume Level</span>
                    <span className="font-mono text-[#C9A66B]">{Math.round(props.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={props.volume}
                    onDoubleClick={() => handleUpdate({ volume: 1.0 })}
                    onPointerDown={() => beginTransaction()}
                    onPointerUp={() => commitTransaction()}
                    onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    title="Double-click to reset to 100%"
                  />
                  <label className="flex items-center gap-2 text-xs text-[#8A8A92] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={props.isMuted}
                      onChange={(e) => handleUpdate({ isMuted: e.target.checked })}
                      className="rounded"
                    />
                    <span>Mute Clip Audio</span>
                  </label>
                </div>

                {/* Fade In / Out */}
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                    Audio Fades
                  </span>
                  <div>
                    <div className="flex justify-between text-[11px] text-[#D8D6D1] mb-1">
                      <span>Fade In</span>
                      <span className="font-mono text-[#C9A66B]">{(props.fadeIn || 0).toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.2"
                      value={props.fadeIn || 0}
                      onDoubleClick={() => handleUpdate({ fadeIn: 0 })}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleUpdate({ fadeIn: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-[#D8D6D1] mb-1">
                      <span>Fade Out</span>
                      <span className="font-mono text-[#C9A66B]">{(props.fadeOut || 0).toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.2"
                      value={props.fadeOut || 0}
                      onDoubleClick={() => handleUpdate({ fadeOut: 0 })}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleUpdate({ fadeOut: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB: SPEED (Only for Video and Audio clips)
            ========================================================================= */}
            {activeInspectorTab === 'speed' && (activeClip.type === 'video' || activeClip.type === 'audio') && (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <div className="flex justify-between text-[11px] text-[#D8D6D1]">
                    <span>Playback Speed</span>
                    <span className="font-mono text-[#C9A66B]">{props.speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    value={props.speed}
                    onDoubleClick={() => handleUpdate({ speed: 1.0 })}
                    onPointerDown={() => beginTransaction()}
                    onPointerUp={() => commitTransaction()}
                    onChange={(e) => handleUpdate({ speed: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    title="Double-click to reset to 1.0x"
                  />
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[0.5, 1.0, 1.5, 2.0].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdate({ speed: s })}
                        className={`py-1 rounded text-xs font-mono font-medium border ${
                          props.speed === s
                            ? 'bg-[#2A251D] text-[#C9A66B] border-[#C9A66B]/50 font-bold'
                            : 'bg-[#1F1F24] text-[#8A8A92] border-[#2C2C33]'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB: ANIMATION (Video, Text, Sticker)
            ========================================================================= */}
            {activeInspectorTab === 'animation' && (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                    In Animation
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {['Fade In', 'Zoom In', 'Slide Left', 'Dissolve'].map((anim) => (
                      <button
                        key={anim}
                        onClick={() => handleUpdate({ inAnimation: anim })}
                        className={`py-1 px-2 border rounded text-[10.5px] transition-colors ${
                          props.inAnimation === anim
                            ? 'bg-[#2A251D] text-[#C9A66B] border-[#C9A66B]/60 font-semibold'
                            : 'text-[#D8D6D1] bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830]'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                    Out Animation
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {['Fade Out', 'Zoom Out', 'Slide Right'].map((anim) => (
                      <button
                        key={anim}
                        onClick={() => handleUpdate({ outAnimation: anim })}
                        className={`py-1 px-2 border rounded text-[10.5px] transition-colors ${
                          props.outAnimation === anim
                            ? 'bg-[#2A251D] text-[#C9A66B] border-[#C9A66B]/60 font-semibold'
                            : 'text-[#D8D6D1] bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830]'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB: ADJUST (Color Grade & Real Adjustments - ONLY Video clips)
            ========================================================================= */}
            {activeInspectorTab === 'adjust' && activeClip.type === 'video' && (
              <div className="space-y-2.5">
                {/* Before / After Hold Compare & Reset Bar */}
                <div className="p-2.5 rounded border bg-[#141418] border-[#26262D] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1">
                      <SplitSquareVertical className="w-3 h-3 text-[#C9A66B]" />
                      <span>Color Grading</span>
                    </span>

                    <button
                      onClick={resetAdjustments}
                      className="text-[10px] text-[#C9A66B] hover:underline cursor-pointer font-medium"
                      title="Reset all color adjustment sliders to 0"
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Hold Compare Button */}
                  <button
                    onPointerDown={() => setIsComparingFilter(true)}
                    onPointerUp={() => setIsComparingFilter(false)}
                    onPointerLeave={() => setIsComparingFilter(false)}
                    onTouchStart={() => setIsComparingFilter(true)}
                    onTouchEnd={() => setIsComparingFilter(false)}
                    className={`w-full py-1.5 px-3 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer ${
                      isComparingFilter
                        ? 'bg-[#C9A66B] text-[#121214] border-[#C9A66B] shadow-md'
                        : 'bg-[#1E1E24] text-[#D8D6D1] border-[#2C2C33] hover:border-[#C9A66B]/60'
                    }`}
                    title="Press and hold to bypass grades and view Raw/Original video"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isComparingFilter ? 'Viewing Raw (Holding)' : 'Hold to Compare Before / After'}</span>
                  </button>
                </div>

                {/* Color Grade Presets */}
                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                    Presets (Real Color Matrices)
                  </span>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {[
                      { id: 'none', label: 'Raw' },
                      { id: 'cinematic', label: 'Teal/Gold' },
                      { id: 'vibrant', label: 'Vibrant' },
                      { id: 'warm', label: 'Golden' },
                      { id: 'noir', label: 'Noir B&W' },
                      { id: 'cyberpunk', label: 'Cyber' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleUpdate({ filter: f.id })}
                        className={`py-1 text-[10.5px] rounded border transition-colors ${
                          props.filter === f.id
                            ? 'bg-[#2A251D] text-[#C9A66B] border-[#C9A66B] font-bold shadow-sm'
                            : 'bg-[#1F1F24] text-[#8A8A92] border-[#2C2C33] hover:text-[#E8E6E1]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adjustments: -100 to +100 Scale with Reset per Slider */}
                <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                    Adjustments (-100 to +100)
                  </span>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span className="flex items-center gap-1">
                        <Sun className="w-3 h-3 text-[#8A8A92]" />
                        <span>Brightness</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#C9A66B] font-medium">{props.adjust.brightness > 0 ? `+${props.adjust.brightness}` : props.adjust.brightness}</span>
                        <button
                          onClick={() => handleAdjustParam('brightness', 0)}
                          className="text-[9.5px] text-[#8A8A92] hover:text-[#C9A66B] hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={props.adjust.brightness}
                      onDoubleClick={() => handleAdjustParam('brightness', 0)}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleAdjustParam('brightness', parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span className="flex items-center gap-1">
                        <Contrast className="w-3 h-3 text-[#8A8A92]" />
                        <span>Contrast</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#C9A66B] font-medium">{props.adjust.contrast > 0 ? `+${props.adjust.contrast}` : props.adjust.contrast}</span>
                        <button
                          onClick={() => handleAdjustParam('contrast', 0)}
                          className="text-[9.5px] text-[#8A8A92] hover:text-[#C9A66B] hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={props.adjust.contrast}
                      onDoubleClick={() => handleAdjustParam('contrast', 0)}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleAdjustParam('contrast', parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span className="flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-[#8A8A92]" />
                        <span>Saturation</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#C9A66B] font-medium">{props.adjust.saturation > 0 ? `+${props.adjust.saturation}` : props.adjust.saturation}</span>
                        <button
                          onClick={() => handleAdjustParam('saturation', 0)}
                          className="text-[9.5px] text-[#8A8A92] hover:text-[#C9A66B] hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={props.adjust.saturation}
                      onDoubleClick={() => handleAdjustParam('saturation', 0)}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleAdjustParam('saturation', parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset"
                    />
                  </div>

                  {/* Temperature */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span>Temperature</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#C9A66B] font-medium">{props.adjust.temperature > 0 ? `+${props.adjust.temperature}` : props.adjust.temperature}</span>
                        <button
                          onClick={() => handleAdjustParam('temperature', 0)}
                          className="text-[9.5px] text-[#8A8A92] hover:text-[#C9A66B] hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={props.adjust.temperature}
                      onDoubleClick={() => handleAdjustParam('temperature', 0)}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleAdjustParam('temperature', parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB: TEXT (For Subtitles, Captions & Text Overlays like Royal Heritage)
            ========================================================================= */}
            {activeInspectorTab === 'text' && (activeClip.type === 'text' || activeClip.type === 'sticker') && (
              <div className="space-y-2.5">
                {/* 1. Timeline Range & Trim */}
                <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#26262D]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1.5">
                      <Scissors className="w-3 h-3 text-[#C9A66B]" />
                      <span>Timeline Position</span>
                    </span>
                    <button
                      onClick={() => moveClip(activeClip.id, currentTime)}
                      className="text-[10px] text-[#C9A66B] hover:underline cursor-pointer font-medium"
                    >
                      To Head
                    </button>
                  </div>

                  {/* Start Point */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span>Start Point</span>
                      <span className="font-mono text-[#C9A66B] font-medium">{activeClip.start.toFixed(2)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Number(Math.max(totalDuration, activeClip.start + 5).toFixed(2))}
                      step="0.1"
                      value={Number(activeClip.start.toFixed(2))}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => moveClip(activeClip.id, parseFloat(e.target.value) || 0)}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span>Duration</span>
                      <span className="font-mono text-[#C9A66B] font-medium">{activeClip.duration.toFixed(2)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="30"
                      step="0.2"
                      value={Number(activeClip.duration.toFixed(2))}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => trimClip(activeClip.id, 'end', activeClip.start + (parseFloat(e.target.value) || 1))}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. Text Content (Textarea that updates preview live) */}
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#C9A66B] uppercase tracking-wider block">
                    Text Content
                  </span>
                  <textarea
                    rows={3}
                    value={props.text ?? activeClip.title ?? ''}
                    onFocus={() => beginTransaction()}
                    onBlur={() => commitTransaction()}
                    onChange={(e) => handleUpdate({ text: e.target.value })}
                    className="w-full text-xs p-2 rounded border outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#C9A66B] resize-none"
                    placeholder="Enter text content..."
                  />
                </div>

                {/* 3. Typography: Font Family, Size, Weight, Alignment */}
                <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider block">
                    Typography
                  </span>

                  {/* Font Family (8 Good Fonts) */}
                  <div>
                    <label className="text-[10.5px] text-[#8A8A92] block mb-1">Font Family</label>
                    <select
                      value={props.fontFamily || 'Inter'}
                      onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
                      className="w-full text-xs p-1.5 rounded bg-[#1F1F24] border border-[#2C2C33] text-[#E8E6E1] outline-none focus:border-[#C9A66B]"
                    >
                      <option value="Inter">Inter (Clean Modern Sans)</option>
                      <option value="Montserrat">Montserrat (Bold Geometric)</option>
                      <option value="Playfair Display">Playfair Display (Luxury Serif)</option>
                      <option value="Cinzel">Cinzel (Royal Heritage)</option>
                      <option value="Anton">Anton (Bold Viral Punch)</option>
                      <option value="Bebas Neue">Bebas Neue (Tall Headline)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Cyber Monospace)</option>
                      <option value="Syne">Syne (High-Fashion Artistic)</option>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span>Font Size</span>
                      <span className="font-mono text-[#C9A66B] font-medium">{props.fontSize || 28}px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="96"
                      value={props.fontSize || 28}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value, 10) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    />
                  </div>

                  {/* Weight, Italic & Alignment */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {/* Alignment */}
                    <div className="flex items-center rounded border border-[#2C2C33] bg-[#1A1A20] p-0.5">
                      <button
                        onClick={() => handleUpdate({ textAlign: 'left' })}
                        className={`p-1 rounded ${props.textAlign === 'left' ? 'bg-[#2A251D] text-[#C9A66B]' : 'text-[#8A8A92] hover:text-white'}`}
                        title="Align Left"
                      >
                        <AlignLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleUpdate({ textAlign: 'center' })}
                        className={`p-1 rounded ${(props.textAlign || 'center') === 'center' ? 'bg-[#2A251D] text-[#C9A66B]' : 'text-[#8A8A92] hover:text-white'}`}
                        title="Align Center"
                      >
                        <AlignCenter className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleUpdate({ textAlign: 'right' })}
                        className={`p-1 rounded ${props.textAlign === 'right' ? 'bg-[#2A251D] text-[#C9A66B]' : 'text-[#8A8A92] hover:text-white'}`}
                        title="Align Right"
                      >
                        <AlignRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Italic */}
                    <button
                      onClick={() => handleUpdate({ isItalic: !props.isItalic })}
                      className={`px-2 py-1 rounded border text-[10.5px] font-medium flex items-center gap-1 ${
                        props.isItalic
                          ? 'bg-[#2A251D] text-[#C9A66B] border-[#C9A66B]/50'
                          : 'bg-[#1A1A20] text-[#8A8A92] border-[#2C2C33] hover:text-white'
                      }`}
                      title="Italic"
                    >
                      <Italic className="w-3 h-3" />
                      <span>Italic</span>
                    </button>

                    {/* Weight */}
                    <select
                      value={props.fontWeight || '700'}
                      onChange={(e) => handleUpdate({ fontWeight: e.target.value })}
                      className="text-xs p-1 rounded bg-[#1F1F24] border border-[#2C2C33] text-[#E8E6E1] outline-none"
                    >
                      <option value="400">Regular (400)</option>
                      <option value="600">Semibold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="900">Black (900)</option>
                    </select>
                  </div>

                  {/* Letter Spacing & Line Height */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8A8A92] mb-1">
                        <span>Spacing</span>
                        <span className="font-mono text-[#C9A66B]">{props.letterSpacing || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="-2"
                        max="12"
                        value={props.letterSpacing || 0}
                        onChange={(e) => handleUpdate({ letterSpacing: parseInt(e.target.value, 10) })}
                        className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8A8A92] mb-1">
                        <span>Line H</span>
                        <span className="font-mono text-[#C9A66B]">{props.lineHeight || 1.2}</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="2.2"
                        step="0.1"
                        value={props.lineHeight || 1.2}
                        onChange={(e) => handleUpdate({ lineHeight: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Colors & Background Styling */}
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider block">
                    Colors & Box
                  </span>

                  {/* Text Color */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#D8D6D1]">Text Color</span>
                    <div className="flex items-center gap-1.5">
                      {['#FFFFFF', '#C9A66B', '#EAB308', '#38BDF8', '#F43F5E', '#18181B'].map(hex => (
                        <button
                          key={hex}
                          onClick={() => handleUpdate({ fontColor: hex })}
                          className={`w-4 h-4 rounded-full border ${props.fontColor === hex ? 'border-white ring-1 ring-[#C9A66B]' : 'border-black/50'}`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                      <input
                        type="color"
                        value={props.fontColor || '#E8E6E1'}
                        onChange={(e) => handleUpdate({ fontColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>

                  {/* Background Color & Opacity */}
                  <div className="pt-1 border-t border-[#222228] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#D8D6D1]">Box Background</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={props.fontBg || '#000000'}
                          onChange={(e) => handleUpdate({ fontBg: e.target.value })}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono text-[#8A8A92]">
                          {Math.round((props.bgOpacity ?? 0.5) * 100)}%
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={props.bgOpacity ?? 0.5}
                      onChange={(e) => handleUpdate({ bgOpacity: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                    />

                    {/* Padding & Radius */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] text-[#8A8A92] mb-0.5">
                          <span>Padding</span>
                          <span className="font-mono text-[#C9A66B]">{props.bgPadding ?? 8}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="28"
                          value={props.bgPadding ?? 8}
                          onChange={(e) => handleUpdate({ bgPadding: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-[#8A8A92] mb-0.5">
                          <span>Radius</span>
                          <span className="font-mono text-[#C9A66B]">{props.bgRadius ?? 4}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="24"
                          value={props.bgRadius ?? 4}
                          onChange={(e) => handleUpdate({ bgRadius: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Outline & Shadow */}
                  <div className="pt-1.5 border-t border-[#222228] grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8A8A92] mb-0.5">
                        <span>Outline</span>
                        <span className="font-mono text-[#C9A66B]">{props.outlineWidth || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        value={props.outlineWidth || 0}
                        onChange={(e) => handleUpdate({ outlineWidth: parseInt(e.target.value, 10) })}
                        className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8A8A92] mb-0.5">
                        <span>Shadow</span>
                        <span className="font-mono text-[#C9A66B]">{props.shadowBlur || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        value={props.shadowBlur || 0}
                        onChange={(e) => handleUpdate({ shadowBlur: parseInt(e.target.value, 10) })}
                        className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Transform: Position X/Y, Scale, Rotation, Opacity */}
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider block">
                    Position & Scale
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8A8A92] mb-0.5">
                        <span>Pos X</span>
                        <span className="font-mono text-[#C9A66B]">{props.posX || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={props.posX || 0}
                        onChange={(e) => handleUpdate({ posX: parseInt(e.target.value, 10) })}
                        className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8A8A92] mb-0.5">
                        <span>Pos Y</span>
                        <span className="font-mono text-[#C9A66B]">{props.posY || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={props.posY || 0}
                        onChange={(e) => handleUpdate({ posY: parseInt(e.target.value, 10) })}
                        className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8A8A92] mb-0.5">
                        <span>Scale</span>
                        <span className="font-mono text-[#C9A66B]">{(props.scale || 1).toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.05"
                        value={props.scale || 1}
                        onChange={(e) => handleUpdate({ scale: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8A8A92] mb-0.5">
                        <span>Opacity</span>
                        <span className="font-mono text-[#C9A66B]">{Math.round((props.opacity ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={props.opacity ?? 1}
                        onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB: TRANSFORM (For Text & Sticker clips)
            ========================================================================= */}
            {activeInspectorTab === 'transform' && (activeClip.type === 'text' || activeClip.type === 'sticker') && (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <span className="text-[10.5px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center justify-between">
                    <span>Transform</span>
                    <button
                      onClick={() => handleUpdate({ scale: 1, rotation: 0, posX: 0, posY: 0 })}
                      className="text-[10px] text-[#C9A66B] hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  </span>

                  {/* Scale */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#D8D6D1] mb-1">
                      <span>Scale</span>
                      <span className="font-mono text-[#C9A66B]">{props.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={props.scale}
                      onDoubleClick={() => handleUpdate({ scale: 1.0 })}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleUpdate({ scale: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#D8D6D1] mb-1">
                      <span>Rotation</span>
                      <span className="font-mono text-[#C9A66B]">{props.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={props.rotation}
                      onDoubleClick={() => handleUpdate({ rotation: 0 })}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value, 10) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset"
                    />
                  </div>

                  {/* Position X / Y */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <span className="text-[9.5px] text-[#787882]">Position X</span>
                      <input
                        type="number"
                        value={props.posX}
                        onChange={(e) => handleUpdate({ posX: parseInt(e.target.value, 10) || 0 })}
                        className="w-full text-xs px-2 py-0.5 rounded border font-mono text-center outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#C9A66B]"
                      />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-[#787882]">Position Y</span>
                      <input
                        type="number"
                        value={props.posY}
                        onChange={(e) => handleUpdate({ posY: parseInt(e.target.value, 10) || 0 })}
                        className="w-full text-xs px-2 py-0.5 rounded border font-mono text-center outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#C9A66B]"
                      />
                    </div>
                  </div>
                </div>

                {/* Opacity */}
                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#26262D]">
                  <div className="flex justify-between text-[11px] text-[#D8D6D1]">
                    <span>Opacity</span>
                    <span className="font-mono text-[#C9A66B]">{Math.round(props.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={props.opacity}
                    onDoubleClick={() => handleUpdate({ opacity: 1.0 })}
                    onPointerDown={() => beginTransaction()}
                    onPointerUp={() => commitTransaction()}
                    onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          /* =========================================================================
              EMPTY STATE: Nothing Selected (Rule: "Select a clip to edit")
          ========================================================================= */
          <div className="h-full flex flex-col justify-between py-2 text-xs text-[#8A8A92]">
            <div className="space-y-3">
              <div className="p-4 rounded-lg border text-center space-y-2 bg-[#141418] border-[#26262D]">
                <div className="w-10 h-10 rounded-full bg-[#202026] border border-[#2E2E38] flex items-center justify-center mx-auto text-[#C9A66B]">
                  <Sliders className="w-5 h-5 stroke-[1.5]" />
                </div>
                <h3 className="text-xs font-semibold text-[#E8E6E1]">Select a clip to edit</h3>
                <p className="text-[11px] text-[#787882] leading-relaxed">
                  Click on any video, audio, or subtitle clip on the timeline to inspect and edit properties.
                </p>
              </div>

              {/* Project Parameters Card */}
              <div className="p-3 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D8D6D1] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#C9A66B]" />
                  <span>Project Overview</span>
                </span>
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-[#24242A]">
                    <span>Resolution</span>
                    <span className="font-mono text-[#E8E6E1]">
                      {aspectRatio === '9:16' ? '1080 × 1920' : (aspectRatio === '1:1' ? '1080 × 1080' : '1920 × 1080')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#24242A]">
                    <span>Aspect Ratio</span>
                    <span className="font-mono text-[#C9A66B] font-semibold">{aspectRatio}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#24242A]">
                    <span>Project Length</span>
                    <span className="font-mono text-[#E8E6E1]">{totalDuration.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Active Tracks</span>
                    <span className="font-mono text-[#E8E6E1]">{tracks.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[#55555F] text-center pt-4">
              Tip: Press Space to Play/Pause, S to Split, F to Fit View
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
