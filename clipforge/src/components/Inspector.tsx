import React, { useEffect, useState, useRef } from 'react';
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
  Italic,
  ChevronLeft,
  ChevronRight,
  Music,
  VolumeX,
  AlertTriangle,
  Lock,
  Unlock,
  Layers,
  Palette,
  Pipette,
  Activity,
  Maximize2,
  TrendingUp,
  Diamond,
  Trash2,
  Zap
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import type { InspectorTab, HslColorName, CurveChannel, KeyframePoint } from '../types/editor';

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
    isComparingFilter,
    isInspectorCollapsed,
    toggleInspector,
    extractAudioFromVideo,
    isPlaying,
    seek,
    updateClipSpan,
    openInstagramTrimmer
  } = useEditorStore();

  let activeClip = null;
  for (const track of tracks) {
    const found = track.clips.find(c => c.id === selectedClipId);
    if (found) {
      activeClip = found;
      break;
    }
  }

  const [adjustSubTab, setAdjustSubTab] = useState<'color' | 'hsl' | 'curves' | 'mask' | 'chroma' | 'effects'>('color');
  const [selectedHslColor, setSelectedHslColor] = useState<HslColorName>('red');
  const [selectedCurveChannel, setSelectedCurveChannel] = useState<CurveChannel>('master');
  const curveSvgRef = useRef<SVGSVGElement | null>(null);

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
    const currentAdj = props.adjust || { 
      brightness: 0, 
      contrast: 0, 
      saturation: 0, 
      temperature: 0, 
      tint: 0, 
      highlights: 0, 
      shadows: 0, 
      vignette: 0, 
      sharpen: 0,
      clarity: 0 
    };
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
        tint: 0,
        highlights: 0,
        shadows: 0,
        vignette: 0,
        sharpen: 0,
        clarity: 0
      }
    });
  };

  const handleHslChange = (color: HslColorName, field: 'hue' | 'saturation' | 'luminance', val: number) => {
    if (!props) return;
    const currentHsl = props.hsl || {};
    const item = currentHsl[color] || { hue: 0, saturation: 0, luminance: 0 };
    handleUpdate({
      hsl: {
        ...currentHsl,
        [color]: {
          ...item,
          [field]: val
        }
      }
    });
  };

  const resetHslColor = (color: HslColorName) => {
    if (!props) return;
    const currentHsl = props.hsl || {};
    handleUpdate({
      hsl: {
        ...currentHsl,
        [color]: { hue: 0, saturation: 0, luminance: 0 }
      }
    });
  };

  const resetAllHsl = () => {
    handleUpdate({
      hsl: {
        red: { hue: 0, saturation: 0, luminance: 0 },
        orange: { hue: 0, saturation: 0, luminance: 0 },
        yellow: { hue: 0, saturation: 0, luminance: 0 },
        green: { hue: 0, saturation: 0, luminance: 0 },
        cyan: { hue: 0, saturation: 0, luminance: 0 },
        blue: { hue: 0, saturation: 0, luminance: 0 },
        purple: { hue: 0, saturation: 0, luminance: 0 },
        magenta: { hue: 0, saturation: 0, luminance: 0 },
      }
    });
  };

  const handleCurveChange = (channel: CurveChannel, midX: number, midY: number) => {
    if (!props) return;
    const currentCurves = props.curves || {
      master: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
      red: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
      green: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
      blue: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
    };
    handleUpdate({
      curves: {
        ...currentCurves,
        [channel]: [{ x: 0, y: 0 }, { x: midX, y: midY }, { x: 100, y: 100 }]
      }
    });
  };

  const resetCurves = () => {
    handleUpdate({
      curves: {
        master: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
        red: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
        green: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
        blue: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
      }
    });
  };

  const handleMaskChange = (field: string, val: any) => {
    if (!props) return;
    const currentMask = props.mask || { shape: 'none', size: 100, feather: 0, rotation: 0, inverted: false };
    handleUpdate({
      mask: {
        ...currentMask,
        [field]: val
      }
    });
  };

  const resetMask = () => {
    handleUpdate({
      mask: { shape: 'none', size: 100, feather: 0, rotation: 0, inverted: false }
    });
  };

  const handleChromaChange = (field: string, val: any) => {
    if (!props) return;
    const currentChroma = props.chromaKey || { enabled: false, color: '#00ff00', tolerance: 30, smoothness: 10 };
    handleUpdate({
      chromaKey: {
        ...currentChroma,
        [field]: val
      }
    });
  };

  const resetChroma = () => {
    handleUpdate({
      chromaKey: { enabled: false, color: '#00ff00', tolerance: 30, smoothness: 10 }
    });
  };

  const handleTransitionChange = (field: string, val: any) => {
    if (!props) return;
    const currentTr = props.transition || { type: 'none', duration: 0.5 };
    handleUpdate({
      transition: {
        ...currentTr,
        [field]: val
      }
    });
  };

  if (isInspectorCollapsed) {
    return (
      <aside className="w-10 h-full border-l flex flex-col items-center py-3 select-none shrink-0 bg-[#141417] border-[#26262D] transition-[width] duration-150">
        <button
          onClick={toggleInspector}
          className="w-7 h-7 rounded flex items-center justify-center text-[#8A8A92] hover:text-[#E8E6E1] hover:bg-[#1F1F24] transition-colors"
          title="Expand Inspector"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="mt-4 [writing-mode:vertical-lr] text-[10.5px] uppercase tracking-wider text-[#8A8A92] font-semibold flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 rotate-90 text-[#4f8cff]" />
          <span>Inspector</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[300px] h-full border-l flex flex-col select-none shrink-0 overflow-hidden bg-[#18181C] border-[#2A2A30] transition-[width] duration-150">
      {/* 1. Header with Dynamic Clip Badge */}
      <div className="border-b shrink-0 bg-[#141417] border-[#26262D]">
        <div className="p-3 flex items-center justify-between pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#D8D6D1] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 stroke-[1.5] text-[#4f8cff]" />
            <span>Inspector</span>
          </h2>
          <div className="flex items-center gap-1.5">
            {activeClip ? (
              <span className="text-[9.5px] px-2 py-0.5 rounded border font-mono truncate max-w-[120px] bg-[#222228] border-[#36363F] text-[#4f8cff] font-medium">
                {activeClip.title}
              </span>
            ) : (
              <span className="text-[10px] text-[#787882] font-mono">No Selection</span>
            )}
            <button
              onClick={toggleInspector}
              className="p-1 rounded text-[#8A8A92] hover:text-[#E8E6E1] hover:bg-[#1F1F24] transition-colors"
              title="Collapse Inspector"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
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
                      ? 'border-[#4f8cff] text-[#4f8cff] font-semibold bg-[#1A1A20]'
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
                      <Scissors className="w-3 h-3 text-[#4f8cff]" />
                      <span>Timeline Range & Trim</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveClip(activeClip.id, currentTime)}
                        className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer font-medium"
                        title="Move clip start to current playhead"
                      >
                        To Head
                      </button>
                      <span className="text-zinc-600 text-[10px]">|</span>
                      <button
                        onClick={() => moveClip(activeClip.id, 0)}
                        className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer font-medium"
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
                          className="w-16 px-1.5 py-0.5 text-[10.5px] font-mono bg-[#1E1E24] border border-[#303038] rounded text-[#4f8cff] text-right focus:outline-none focus:border-[#4f8cff]"
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
                      <span className="font-mono text-[#4f8cff] font-medium">
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
                          className="w-16 px-1.5 py-0.5 text-[10.5px] font-mono bg-[#1E1E24] border border-[#303038] rounded text-[#4f8cff] text-right focus:outline-none focus:border-[#4f8cff]"
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
                      className="p-1.5 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] bg-[#1F1F24] border-[#2C2C33] hover:border-[#4f8cff]/50 transition-colors"
                      title="Trim clip start to playhead"
                    >
                      <ArrowLeftToLine className="w-3 h-3 text-[#4f8cff]" />
                      <span>Trim In at Head</span>
                    </button>
                    <button
                      onClick={() => trimClip(activeClip.id, 'end', currentTime)}
                      className="p-1.5 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] bg-[#1F1F24] border-[#2C2C33] hover:border-[#4f8cff]/50 transition-colors"
                      title="Trim clip end to playhead"
                    >
                      <ArrowRightToLine className="w-3 h-3 text-[#4f8cff]" />
                      <span>Trim Out at Head</span>
                    </button>
                  </div>
                </div>

                {/* Transform Card */}
                <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#26262D]">
                  <span className="text-[10.5px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center justify-between">
                    <span>Transform</span>
                    <button
                      onClick={() => handleUpdate({ scale: 1, rotation: 0, posX: 0, posY: 0, flipH: false, flipV: false, opacity: 1, blendMode: 'normal' })}
                      className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  </span>

                  {/* Scale with Uniform Lock */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span className="flex items-center gap-1.5">
                        <span>Scale (Zoom)</span>
                        <button
                          type="button"
                          onClick={() => handleUpdate({ isScaleLocked: props.isScaleLocked === false ? true : false })}
                          className={`p-0.5 rounded text-[10px] ${props.isScaleLocked !== false ? 'text-[#4f8cff]' : 'text-[#8a8a93]'}`}
                          title={props.isScaleLocked !== false ? "Uniform Scale Locked" : "Free Scale"}
                        >
                          {props.isScaleLocked !== false ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                      </span>
                      <span className="font-mono text-[#4f8cff]">{props.scale.toFixed(2)}x</span>
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
                      <span className="font-mono text-[#4f8cff]">{props.rotation}°</span>
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
                        className="w-full text-xs px-2 py-0.5 rounded border font-mono text-center outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#4f8cff]"
                      />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-[#787882]">Position Y</span>
                      <input
                        type="number"
                        value={props.posY}
                        onChange={(e) => handleUpdate({ posY: parseInt(e.target.value, 10) || 0 })}
                        className="w-full text-xs px-2 py-0.5 rounded border font-mono text-center outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#4f8cff]"
                      />
                    </div>
                  </div>

                  {/* Quick Alignment Grid */}
                  <div>
                    <span className="text-[9.5px] text-[#787882] block mb-1">Alignment Anchors</span>
                    <div className="grid grid-cols-5 gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posX: 0, posY: 0 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Center (0, 0)"
                      >
                        Center
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posY: -100 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Top"
                      >
                        Top
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posY: 100 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Bottom"
                      >
                        Bottom
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posX: -120 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Left"
                      >
                        Left
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posX: 120 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Right"
                      >
                        Right
                      </button>
                    </div>
                  </div>

                  {/* Flip & Rotate Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => handleUpdate({ rotation: (props.rotation + 90) % 360 })}
                      className="p-1 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830] cursor-pointer"
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="w-3 h-3 stroke-[1.5]" />
                      <span>90°</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ flipH: !props.flipH })}
                      className={`p-1 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] cursor-pointer ${
                        props.flipH ? 'bg-[#1e293b] border-[#4f8cff] text-[#4f8cff]' : 'bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830]'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-3 h-3 stroke-[1.5]" />
                      <span>Flip H</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ flipV: !props.flipV })}
                      className={`p-1 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] cursor-pointer ${
                        props.flipV ? 'bg-[#1e293b] border-[#4f8cff] text-[#4f8cff]' : 'bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830]'
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-3 h-3 stroke-[1.5]" />
                      <span>Flip V</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ scale: 1, rotation: 0, posX: 0, posY: 0 })}
                      className="p-1 border rounded text-[#8A8A92] hover:text-[#E8E6E1] flex items-center justify-center bg-[#1F1F24] border-[#2C2C33] cursor-pointer"
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
                    <span className="font-mono text-[#4f8cff]">{Math.round(props.opacity * 100)}%</span>
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

                {/* Blend Modes (CapCut Desktop Overlays Suite) */}
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <div className="flex justify-between items-center text-[11px] text-[#D8D6D1]">
                    <span className="font-semibold text-[10px] text-[#8A8A92] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-[#4f8cff]" />
                      <span>Blend Mode</span>
                    </span>
                    <span className="font-mono text-[#4f8cff] text-[10px] capitalize font-medium">
                      {props.blendMode || 'normal'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {(['normal', 'screen', 'darken', 'multiply', 'overlay', 'lighten', 'color-dodge', 'soft-light'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleUpdate({ blendMode: mode })}
                        className={`text-[9.5px] py-1 px-0.5 rounded text-center capitalize border transition-colors cursor-pointer ${
                          (props.blendMode || 'normal') === mode
                            ? 'bg-[#4f8cff] text-white border-[#4f8cff] font-semibold'
                            : 'bg-[#1F1F24] text-[#8a8a93] border-[#2C2C33] hover:text-[#d4d4d8] hover:bg-[#282830]'
                        }`}
                      >
                        {mode.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reverse Video Playback Toggle */}
                <div className="p-2.5 rounded border bg-[#141418] border-[#26262D] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-[#D8D6D1] block">Reverse Playback</span>
                    <span className="text-[9.5px] text-[#8A8A92] block">Play clip backwards in sequence</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ isReversed: !props.isReversed })}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      props.isReversed 
                        ? 'bg-[#4f8cff] text-white border-[#4f8cff]' 
                        : 'bg-[#232326] text-[#8a8a93] border-[#38383d] hover:text-[#d4d4d8]'
                    }`}
                  >
                    {props.isReversed ? 'Reversed' : 'Standard'}
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB: AUDIO (CapCut Desktop Pro Suite)
            ========================================================================= */}
            {activeInspectorTab === 'audio' && (activeClip.type === 'video' || activeClip.type === 'audio') && (() => {
              const vol = props.volume ?? 1.0;
              const isMuted = props.isMuted || false;
              const volDb = vol === 0 ? -60 : Math.max(-60, Number((20 * Math.log10(vol)).toFixed(1)));
              const volDbDisplay = vol === 0 ? '-∞ dB' : `${volDb >= 0 ? '+' : ''}${volDb} dB`;
              const isPeakWarning = !isMuted && volDb > -6.0;
              const baseLevel = isPlaying && !isMuted ? (0.6 + 0.3 * Math.sin(currentTime * 8)) : 0;
              const activeDbPercent = isMuted ? 0 : Math.min(100, Math.max(0, (vol * baseLevel) * 75));

              return (
                <div className="space-y-2.5">
                  {/* Instagram Snippet & Duration Trimmer for Audio Clips */}
                  {activeClip.type === 'audio' && (() => {
                    const videoTrack = tracks.find(t => t.type === 'video');
                    const videoDuration = Math.max(1, videoTrack?.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0) || 15);
                    const srcDur = activeClip.sourceDuration || 216;
                    const maxPartOffset = Math.max(0, srcDur - activeClip.duration);

                    const formatSecTime = (s: number) => {
                      const m = Math.floor(s / 60);
                      const sec = (s % 60).toFixed(1);
                      return `${m < 10 ? '0' : ''}${m}:${parseFloat(sec) < 10 ? '0' : ''}${sec}`;
                    };

                    return (
                      <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#26262D]">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-white flex items-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5 text-[#38bdf8]" />
                            <span>Audio Snippet & Cut (કટ / ટ્રીમ)</span>
                          </span>
                          <span className="font-mono text-[#4f8cff] text-[10.5px] font-bold">
                            {activeClip.duration.toFixed(1)}s
                          </span>
                        </div>

                        {/* Instagram Reels Audio Trimmer Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            openInstagramTrimmer({
                              clipId: activeClip.id,
                              initialOffset: activeClip.offset,
                              initialDuration: activeClip.duration,
                            });
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#FD1D1D] via-[#E1306C] to-[#833AB4] hover:brightness-110 active:scale-98 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-md shadow-[#FD1D1D]/20 transition-all cursor-pointer"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>🎵 Open Instagram Trimmer (Full UI)</span>
                        </button>

                        {/* 1-Click Match Video Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const fitDur = Math.max(0.5, Number((videoDuration - activeClip.start).toFixed(2)));
                            updateClipSpan(activeClip.id, activeClip.start, fitDur, activeClip.offset);
                          }}
                          className="w-full py-1.5 px-3 rounded bg-gradient-to-r from-[#4f8cff] to-[#38bdf8] hover:from-[#3b72db] hover:to-[#0284c7] text-white text-[11px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                          title="Instantly trim audio clip to match video end automatically"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span>🎬 Match Video Length ({videoDuration.toFixed(1)}s)</span>
                        </button>

                        {/* Quick Presets: 15s, 30s, 60s, Full */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: '⚡ 15s', sec: 15 },
                            { label: '🔥 30s', sec: 30 },
                            { label: '⏱️ 60s', sec: 60 },
                            { label: '🎵 Full', sec: srcDur }
                          ].map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                updateClipSpan(activeClip.id, activeClip.start, Math.min(item.sec, srcDur), activeClip.offset);
                              }}
                              className={`py-1 text-[10.5px] font-medium rounded border transition-colors cursor-pointer ${
                                Math.abs(activeClip.duration - item.sec) < 0.2
                                  ? 'bg-[#4f8cff] text-white border-[#4f8cff] font-bold'
                                  : 'bg-[#222227] hover:bg-[#2c2c34] text-[#a1a1aa] border-[#33333b]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        {/* Song Part / Hook Offset Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px] text-[#a1a1aa]">
                            <span>Song Part (Chorus / Hook Start)</span>
                            <span className="font-mono text-[#38bdf8]">
                              {formatSecTime(activeClip.offset || 0)} → {formatSecTime((activeClip.offset || 0) + activeClip.duration)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={maxPartOffset}
                            step="0.5"
                            value={activeClip.offset || 0}
                            onChange={(e) => {
                              updateClipSpan(activeClip.id, activeClip.start, activeClip.duration, parseFloat(e.target.value));
                            }}
                            className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#38bdf8]"
                          />
                        </div>

                        {/* Clip Duration Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10.5px] text-[#a1a1aa]">
                            <span>Clip Duration</span>
                            <span className="font-mono text-[#4f8cff]">{activeClip.duration.toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max={srcDur}
                            step="0.5"
                            value={activeClip.duration}
                            onChange={(e) => {
                              updateClipSpan(activeClip.id, activeClip.start, parseFloat(e.target.value), activeClip.offset);
                            }}
                            className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Extract Audio (if video clip selected) */}
                  {activeClip.type === 'video' && (
                    <button
                      onClick={() => extractAudioFromVideo(activeClip.id)}
                      className="w-full py-2 px-3 rounded bg-[#232326] hover:bg-[#2f2f34] border border-[#38383d] hover:border-[#4f8cff] text-[11px] font-medium text-[#d4d4d8] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      title="Extract and separate audio onto an independent audio track"
                    >
                      <Music className="w-3.5 h-3.5 text-[#4f8cff]" />
                      <span>Separate / Extract Audio</span>
                    </button>
                  )}

                  {/* Volume Level + dB Representation */}
                  <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1]">
                      <span className="font-medium flex items-center gap-1.5">
                        {isMuted ? <VolumeX className="w-3 h-3 text-[#ef4444]" /> : <Volume2 className="w-3 h-3 text-[#4f8cff]" />}
                        <span>Volume Level</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#8a8a93]">{volDbDisplay}</span>
                        <span className="font-mono text-[#4f8cff] font-semibold">{Math.round(vol * 100)}%</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={vol}
                      onDoubleClick={() => handleUpdate({ volume: 1.0 })}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset to 100% (0 dB)"
                    />

                    {/* Live Peak dB Meter */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[9px] text-[#8A8A92] font-mono">
                        <span>-60 dB</span>
                        <span>-24</span>
                        <span>-12</span>
                        <span className="text-[#eab308]">-6 dB</span>
                        <span className="text-[#ef4444]">0 dB</span>
                      </div>
                      <div className="h-2 w-full bg-[#1b1b1d] rounded-xs border border-[#38383d] overflow-hidden flex relative">
                        <div 
                          className={`h-full transition-[width] duration-75 ${
                            isPeakWarning ? 'bg-gradient-to-r from-[#10b981] via-[#eab308] to-[#ef4444]' : 'bg-gradient-to-r from-[#10b981] to-[#eab308]'
                          }`}
                          style={{ width: `${activeDbPercent}%` }}
                        />
                        {/* -6 dB marker */}
                        <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/30" />
                      </div>
                      {isPeakWarning && (
                        <div className="flex items-center gap-1 text-[9.5px] text-[#ef4444] font-medium pt-0.5 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Warning: Audio peaks above -6 dB (Risk of distortion)</span>
                        </div>
                      )}
                    </div>

                    {/* Mute Clip Checkbox */}
                    <label className="flex items-center gap-2 text-xs text-[#8A8A92] cursor-pointer pt-1 border-t border-[#232328]">
                      <input
                        type="checkbox"
                        checked={isMuted}
                        onChange={(e) => handleUpdate({ isMuted: e.target.checked })}
                        className="rounded cursor-pointer"
                      />
                      <span className={isMuted ? 'text-[#ef4444] font-medium' : ''}>Mute Clip Audio</span>
                    </label>
                  </div>

                  {/* Audio Fades (Fade In & Fade Out) */}
                  <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                    <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                      Audio Fades
                    </span>
                    <div>
                      <div className="flex justify-between text-[11px] text-[#D8D6D1] mb-1">
                        <span>Fade In</span>
                        <span className="font-mono text-[#4f8cff]">{(props.fadeIn || 0).toFixed(1)}s</span>
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
                        title="Double-click to reset to 0s"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-[#D8D6D1] mb-1">
                        <span>Fade Out</span>
                        <span className="font-mono text-[#4f8cff]">{(props.fadeOut || 0).toFixed(1)}s</span>
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
                        title="Double-click to reset to 0s"
                      />
                    </div>
                  </div>

                  {/* Loudness Normalization */}
                  <div className="p-2.5 rounded border bg-[#141418] border-[#26262D] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-[#D8D6D1] block">Loudness Normalization</span>
                      <span className="text-[9.5px] text-[#8A8A92] block">Auto-standardize volume to 0 dB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdate({ 
                        loudnessNormalized: !props.loudnessNormalized,
                        volume: !props.loudnessNormalized ? 1.0 : props.volume
                      })}
                      className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                        props.loudnessNormalized 
                          ? 'bg-[#4f8cff] text-white border-[#4f8cff]' 
                          : 'bg-[#232326] text-[#8a8a93] border-[#38383d] hover:text-[#d4d4d8]'
                      }`}
                    >
                      {props.loudnessNormalized ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Noise Reduction */}
                  <div className="p-2.5 rounded border bg-[#141418] border-[#26262D] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-[#D8D6D1] block">Noise Reduction</span>
                      <span className="text-[9.5px] text-[#8A8A92] block">Filter ambient background hum</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdate({ noiseReduction: !props.noiseReduction })}
                      className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                        props.noiseReduction 
                          ? 'bg-[#4f8cff] text-white border-[#4f8cff]' 
                          : 'bg-[#232326] text-[#8a8a93] border-[#38383d] hover:text-[#d4d4d8]'
                      }`}
                    >
                      {props.noiseReduction ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Channel Balance (L/R) */}
                  <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                    <div className="flex justify-between text-[11px] text-[#D8D6D1]">
                      <span>Channel Balance (L / R)</span>
                      <span className="font-mono text-[#4f8cff]">
                        {(props.audioBalance ?? 0) === 0 
                          ? 'Center' 
                          : (props.audioBalance ?? 0) < 0 
                          ? `L ${Math.round(Math.abs(props.audioBalance ?? 0) * 100)}%` 
                          : `R ${Math.round((props.audioBalance ?? 0) * 100)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={props.audioBalance ?? 0}
                      onDoubleClick={() => handleUpdate({ audioBalance: 0 })}
                      onPointerDown={() => beginTransaction()}
                      onPointerUp={() => commitTransaction()}
                      onChange={(e) => handleUpdate({ audioBalance: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer"
                      title="Double-click to reset to Center"
                    />
                    <div className="flex justify-between text-[9px] text-[#8A8A92] font-mono">
                      <span>100% Left</span>
                      <span>Center</span>
                      <span>100% Right</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* =========================================================================
                TAB: SPEED (Constant Speed + CapCut Speed Curve with Draggable Points)
            ========================================================================= */}
            {activeInspectorTab === 'speed' && (activeClip.type === 'video' || activeClip.type === 'audio') && (
              <div className="space-y-2.5">
                {/* Speed Mode Toggle */}
                <div className="flex border rounded p-0.5 bg-[#141418] border-[#2A2A30] text-[10.5px]">
                  <button
                    onClick={() => handleUpdate({ speedMode: 'constant' })}
                    className={`flex-1 py-1 rounded font-medium transition-colors text-center ${
                      (props.speedMode || 'constant') === 'constant'
                        ? 'bg-[#232326] text-[#4f8cff] shadow-sm font-semibold'
                        : 'text-[#8A8A92] hover:text-[#D8D6D1]'
                    }`}
                  >
                    Constant Speed
                  </button>
                  <button
                    onClick={() => handleUpdate({ speedMode: 'curve' })}
                    className={`flex-1 py-1 rounded font-medium transition-colors text-center ${
                      props.speedMode === 'curve'
                        ? 'bg-[#232326] text-[#4f8cff] shadow-sm font-semibold'
                        : 'text-[#8A8A92] hover:text-[#D8D6D1]'
                    }`}
                  >
                    Speed Curve
                  </button>
                </div>

                {/* 1. Constant Speed Mode */}
                {(props.speedMode || 'constant') === 'constant' ? (
                  <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#2A2A30]">
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1]">
                      <span>Playback Speed</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#4f8cff] font-semibold">{props.speed.toFixed(2)}x</span>
                        <button
                          onClick={() => handleUpdate({ speed: 1.0 })}
                          className="text-[9.5px] text-[#8A8A92] hover:text-[#4f8cff] hover:underline"
                        >
                          Reset
                        </button>
                      </div>
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
                      className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                      title="Double-click to reset to 1.0x"
                    />

                    {/* Quick Speed Multiplier Buttons */}
                    <div className="grid grid-cols-6 gap-1 pt-1">
                      {[0.5, 1.0, 1.5, 2.0, 5.0, 10.0].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdate({ speed: s })}
                          className={`py-1 rounded text-[10px] font-mono font-medium border transition-colors ${
                            props.speed === s
                              ? 'bg-[#1e293b] text-[#4f8cff] border-[#4f8cff]/60 font-bold'
                              : 'bg-[#18181C] text-[#8A8A92] border-[#2A2A30] hover:text-[#D8D6D1]'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    {/* Duration Readout */}
                    <div className="pt-2 border-t border-[#26262B] flex justify-between text-[10px] font-mono text-[#8A8A92]">
                      <span>Source: {(activeClip.sourceDuration || 15).toFixed(1)}s</span>
                      <span className="text-[#4f8cff]">
                        New Duration: {((activeClip.sourceDuration || 15) / props.speed).toFixed(1)}s
                      </span>
                    </div>
                  </div>
                ) : (
                  /* 2. Speed Curve Mode */
                  <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#2A2A30]">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-[#4f8cff]" />
                        <span>Curve Presets</span>
                      </span>
                      <button
                        onClick={() => {
                          handleUpdate({
                            speedCurvePreset: 'default',
                            speedCurvePoints: [
                              { timePercent: 0, speed: 1.0 },
                              { timePercent: 25, speed: 1.0 },
                              { timePercent: 50, speed: 1.0 },
                              { timePercent: 75, speed: 1.0 },
                              { timePercent: 100, speed: 1.0 }
                            ]
                          });
                        }}
                        className="text-[9.5px] text-[#4f8cff] hover:underline"
                      >
                        Reset Curve
                      </button>
                    </div>

                    {/* Curve Preset Pills */}
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { 
                          id: 'montage', 
                          label: 'Montage', 
                          points: [
                            { timePercent: 0, speed: 0.5 },
                            { timePercent: 25, speed: 2.5 },
                            { timePercent: 50, speed: 0.4 },
                            { timePercent: 75, speed: 3.0 },
                            { timePercent: 100, speed: 1.0 }
                          ] 
                        },
                        { 
                          id: 'hero', 
                          label: 'Hero', 
                          points: [
                            { timePercent: 0, speed: 1.0 },
                            { timePercent: 30, speed: 0.3 },
                            { timePercent: 60, speed: 3.2 },
                            { timePercent: 85, speed: 1.0 },
                            { timePercent: 100, speed: 1.0 }
                          ] 
                        },
                        { 
                          id: 'bullet', 
                          label: 'Bullet', 
                          points: [
                            { timePercent: 0, speed: 2.5 },
                            { timePercent: 25, speed: 0.2 },
                            { timePercent: 50, speed: 0.2 },
                            { timePercent: 75, speed: 0.2 },
                            { timePercent: 100, speed: 2.5 }
                          ] 
                        },
                        { 
                          id: 'jumpcut', 
                          label: 'Jump Cut', 
                          points: [
                            { timePercent: 0, speed: 3.5 },
                            { timePercent: 30, speed: 1.0 },
                            { timePercent: 70, speed: 3.5 },
                            { timePercent: 100, speed: 1.0 }
                          ] 
                        },
                        { 
                          id: 'flashin', 
                          label: 'Flash In', 
                          points: [
                            { timePercent: 0, speed: 4.5 },
                            { timePercent: 35, speed: 1.0 },
                            { timePercent: 70, speed: 1.0 },
                            { timePercent: 100, speed: 1.0 }
                          ] 
                        },
                        { 
                          id: 'flashout', 
                          label: 'Flash Out', 
                          points: [
                            { timePercent: 0, speed: 1.0 },
                            { timePercent: 30, speed: 1.0 },
                            { timePercent: 65, speed: 1.0 },
                            { timePercent: 100, speed: 4.5 }
                          ] 
                        },
                      ].map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            handleUpdate({
                              speedCurvePreset: preset.id,
                              speedCurvePoints: preset.points
                            });
                          }}
                          className={`py-1 text-[10.5px] rounded border transition-colors font-medium ${
                            props.speedCurvePreset === preset.id
                              ? 'bg-[#1e293b] border-[#4f8cff] text-[#4f8cff] shadow-sm font-semibold'
                              : 'bg-[#18181C] border-[#2A2A30] text-[#8A8A92] hover:text-[#D8D6D1]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Interactive Speed Curve SVG View */}
                    {(() => {
                      const points = props.speedCurvePoints || [
                        { timePercent: 0, speed: 1.0 },
                        { timePercent: 25, speed: 2.0 },
                        { timePercent: 50, speed: 0.5 },
                        { timePercent: 75, speed: 2.5 },
                        { timePercent: 100, speed: 1.0 },
                      ];

                      // SVG coordinates: Width 100 (time 0-100%), Height 100 (speed 0.1x to 5.0x mapped)
                      const pathD = points.reduce((acc, p, idx) => {
                        const x = p.timePercent;
                        const y = Math.max(5, Math.min(95, 100 - (p.speed / 5.0) * 85));
                        return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                      }, '');

                      return (
                        <div className="p-2 rounded border bg-[#18181C] border-[#2A2A30] space-y-2">
                          <svg
                            className="w-full h-32 bg-[#121214] rounded border border-[#26262B] select-none"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            {/* Grid Lines */}
                            <line x1="0" y1="83" x2="100" y2="83" stroke="#26262D" strokeWidth="0.5" strokeDasharray="2,2" />
                            <line x1="0" y1="49" x2="100" y2="49" stroke="#26262D" strokeWidth="0.5" strokeDasharray="2,2" />
                            <line x1="0" y1="15" x2="100" y2="15" stroke="#26262D" strokeWidth="0.5" strokeDasharray="2,2" />

                            {/* 1.0x Normal Speed Line */}
                            <line x1="0" y1="83" x2="100" y2="83" stroke="#3A3A45" strokeWidth="0.75" />

                            {/* Speed Curve Path */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#4f8cff"
                              strokeWidth="2"
                            />

                            {/* Control Points */}
                            {points.map((p, idx) => {
                              const x = p.timePercent;
                              const y = Math.max(5, Math.min(95, 100 - (p.speed / 5.0) * 85));
                              return (
                                <circle
                                  key={idx}
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="#4f8cff"
                                  stroke="#ffffff"
                                  strokeWidth="1"
                                />
                              );
                            })}
                          </svg>

                          {/* Draggable Point Sliders */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] text-[#8A8A92] font-semibold block uppercase">
                              Curve Points Speed
                            </span>
                            <div className="grid grid-cols-5 gap-1">
                              {points.map((p, idx) => (
                                <div key={idx} className="flex flex-col items-center">
                                  <input
                                    type="range"
                                    min="0.2"
                                    max="5.0"
                                    step="0.1"
                                    value={p.speed}
                                    onChange={(e) => {
                                      const next = [...points];
                                      next[idx] = { ...next[idx], speed: parseFloat(e.target.value) };
                                      handleUpdate({ speedCurvePoints: next });
                                    }}
                                    className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                                    title={`Point ${idx + 1}: ${p.speed}x`}
                                  />
                                  <span className="text-[9.5px] font-mono text-[#4f8cff] mt-0.5">
                                    {p.speed.toFixed(1)}x
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                TAB: ANIMATION (Presets + Manual Keyframes with Keyframe Lane)
            ========================================================================= */}
            {activeInspectorTab === 'animation' && (
              <div className="space-y-2.5">
                {/* 1. In Animation */}
                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#2A2A30]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                    In Animation
                  </span>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {['None', 'Fade In', 'Zoom In', 'Slide Left', 'Slide Right', 'Flip'].map((anim) => (
                      <button
                        key={anim}
                        onClick={() => handleUpdate({ inAnimation: anim === 'None' ? undefined : anim })}
                        className={`py-1 text-[10.5px] border rounded transition-colors font-medium text-center ${
                          (props.inAnimation || 'None') === anim
                            ? 'bg-[#1e293b] text-[#4f8cff] border-[#4f8cff]/60 font-semibold shadow-sm'
                            : 'text-[#8A8A92] bg-[#18181C] border-[#2A2A30] hover:text-[#D8D6D1]'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Out Animation */}
                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#2A2A30]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                    Out Animation
                  </span>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {['None', 'Fade Out', 'Zoom Out', 'Slide Right', 'Slide Left', 'Dissolve'].map((anim) => (
                      <button
                        key={anim}
                        onClick={() => handleUpdate({ outAnimation: anim === 'None' ? undefined : anim })}
                        className={`py-1 text-[10.5px] border rounded transition-colors font-medium text-center ${
                          (props.outAnimation || 'None') === anim
                            ? 'bg-[#1e293b] text-[#4f8cff] border-[#4f8cff]/60 font-semibold shadow-sm'
                            : 'text-[#8A8A92] bg-[#18181C] border-[#2A2A30] hover:text-[#D8D6D1]'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Combo Animation */}
                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#2A2A30]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                    Combo Animation
                  </span>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {['None', 'Flash', 'Pulse', 'Swing', 'Float', 'Wobble'].map((anim) => (
                      <button
                        key={anim}
                        onClick={() => handleUpdate({ comboAnimation: anim === 'None' ? undefined : anim })}
                        className={`py-1 text-[10.5px] border rounded transition-colors font-medium text-center ${
                          (props.comboAnimation || 'None') === anim
                            ? 'bg-[#1e293b] text-[#4f8cff] border-[#4f8cff]/60 font-semibold shadow-sm'
                            : 'text-[#8A8A92] bg-[#18181C] border-[#2A2A30] hover:text-[#D8D6D1]'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Manual Keyframes Lane & Controls */}
                <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#2A2A30]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1">
                      <Diamond className="w-3 h-3 text-[#4f8cff]" />
                      <span>Manual Keyframes</span>
                    </span>

                    {/* Add / Remove Keyframe at Playhead Button */}
                    <button
                      onClick={() => {
                        const timeOffset = Math.max(0, Math.min(activeClip.duration, currentTime - activeClip.start));
                        const roundedOffset = Number(timeOffset.toFixed(2));
                        const currentKeyframes: KeyframePoint[] = props.keyframes || [];
                        const existingIdx = currentKeyframes.findIndex(
                          kf => Math.abs(kf.timeOffset - roundedOffset) < 0.15
                        );

                        if (existingIdx >= 0) {
                          handleUpdate({ keyframes: currentKeyframes.filter((_, i) => i !== existingIdx) });
                        } else {
                          const newKf: KeyframePoint = {
                            id: `kf-${Date.now()}`,
                            timeOffset: roundedOffset,
                            scale: props.scale,
                            posX: props.posX,
                            posY: props.posY,
                            opacity: props.opacity,
                            rotation: props.rotation
                          };
                          handleUpdate({ keyframes: [...currentKeyframes, newKf].sort((a, b) => a.timeOffset - b.timeOffset) });
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] font-medium rounded border border-[#4f8cff]/40 bg-[#1e293b] text-[#4f8cff] hover:bg-[#23334d] flex items-center gap-1 transition-colors"
                      title="Add or remove keyframe at current playhead"
                    >
                      <Diamond className="w-2.5 h-2.5 fill-current" />
                      <span>Add / Remove</span>
                    </button>
                  </div>

                  {/* Keyframe List */}
                  {props.keyframes && props.keyframes.length > 0 ? (
                    <div className="space-y-1 pt-1 max-h-36 overflow-y-auto pr-1">
                      {props.keyframes.map((kf) => (
                        <div
                          key={kf.id}
                          className="flex items-center justify-between p-1.5 rounded bg-[#18181C] border border-[#26262B] text-[10px]"
                        >
                          <div 
                            onClick={() => seek(activeClip.start + kf.timeOffset)}
                            className="flex items-center gap-1.5 cursor-pointer text-[#D8D6D1] hover:text-[#4f8cff]"
                            title="Click to jump playhead to this keyframe"
                          >
                            <Diamond className="w-2.5 h-2.5 text-[#4f8cff] fill-[#4f8cff]" />
                            <span className="font-mono font-medium">{kf.timeOffset.toFixed(2)}s</span>
                            <span className="text-[#8A8A92] font-mono">
                              (S:{kf.scale ?? 1.0}, O:{kf.opacity ?? 1.0})
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              const remaining = (props.keyframes || []).filter(k => k.id !== kf.id);
                              handleUpdate({ keyframes: remaining });
                            }}
                            className="p-1 rounded text-[#8A8A92] hover:text-red-400 hover:bg-[#202026]"
                            title="Delete Keyframe"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#8A8A92] font-mono py-1">
                      No keyframes. Move playhead and click "Add / Remove" to pin scale, position & opacity.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB: ADJUST (CapCut Desktop Suite: Color, HSL, Curves, Mask, Chroma, Effects)
            ========================================================================= */}
            {activeInspectorTab === 'adjust' && activeClip.type === 'video' && (
              <div className="space-y-2.5">
                {/* Adjust Sub-Nav Header */}
                <div className="flex border rounded p-0.5 bg-[#141418] border-[#2A2A30] overflow-x-auto text-[10.5px]">
                  {[
                    { id: 'color', label: 'Color' },
                    { id: 'hsl', label: 'HSL' },
                    { id: 'curves', label: 'Curves' },
                    { id: 'mask', label: 'Mask' },
                    { id: 'chroma', label: 'Chroma' },
                    { id: 'effects', label: 'Effects' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAdjustSubTab(tab.id as any)}
                      className={`flex-1 py-1 px-2 rounded font-medium transition-colors shrink-0 text-center ${
                        adjustSubTab === tab.id
                          ? 'bg-[#232326] text-[#4f8cff] shadow-sm font-semibold'
                          : 'text-[#8A8A92] hover:text-[#D8D6D1] hover:bg-[#1C1C20]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ==================== SUBTAB 1: COLOR ==================== */}
                {adjustSubTab === 'color' && (
                  <div className="space-y-2.5">
                    {/* Before / After Hold Compare & Reset Bar */}
                    <div className="p-2.5 rounded border bg-[#141418] border-[#2A2A30] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1">
                          <SplitSquareVertical className="w-3 h-3 text-[#4f8cff]" />
                          <span>Color Grading</span>
                        </span>

                        <button
                          onClick={resetAdjustments}
                          className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer font-medium"
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
                            ? 'bg-[#4f8cff] text-[#121214] border-[#4f8cff] shadow-md'
                            : 'bg-[#1E1E24] text-[#D8D6D1] border-[#2C2C33] hover:border-[#4f8cff]/60'
                        }`}
                        title="Press and hold to bypass grades and view Raw/Original video"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isComparingFilter ? 'Viewing Raw (Holding)' : 'Hold to Compare Before / After'}</span>
                      </button>
                    </div>

                    {/* Color Grade Presets */}
                    <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#2A2A30]">
                      <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                        Presets (Color Matrices)
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
                                ? 'bg-[#1e293b] text-[#4f8cff] border-[#4f8cff] font-bold shadow-sm'
                                : 'bg-[#1F1F24] text-[#8A8A92] border-[#2C2C33] hover:text-[#E8E6E1]'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Adjustments: -100 to +100 Scale */}
                    <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#2A2A30]">
                      <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider">
                        Tone Adjustments (-100 to +100)
                      </span>

                      {[
                        { key: 'brightness', label: 'Brightness', icon: Sun, val: props.adjust?.brightness || 0 },
                        { key: 'contrast', label: 'Contrast', icon: Contrast, val: props.adjust?.contrast || 0 },
                        { key: 'saturation', label: 'Saturation', icon: Droplet, val: props.adjust?.saturation || 0 },
                        { key: 'temperature', label: 'Temperature', val: props.adjust?.temperature || 0 },
                        { key: 'tint', label: 'Tint', val: props.adjust?.tint || 0 },
                        { key: 'highlights', label: 'Highlights', val: props.adjust?.highlights || 0 },
                        { key: 'shadows', label: 'Shadows', val: props.adjust?.shadows || 0 },
                        { key: 'clarity', label: 'Clarity', val: props.adjust?.clarity || 0 },
                        { key: 'sharpen', label: 'Sharpen', val: props.adjust?.sharpen || 0 },
                        { key: 'vignette', label: 'Vignette', val: props.adjust?.vignette || 0, min: 0, max: 100 },
                      ].map((item) => {
                        const Icon = item.icon;
                        const min = item.min !== undefined ? item.min : -100;
                        const max = item.max !== undefined ? item.max : 100;
                        return (
                          <div key={item.key}>
                            <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                              <span className="flex items-center gap-1">
                                {Icon && <Icon className="w-3 h-3 text-[#8A8A92]" />}
                                <span>{item.label}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[#4f8cff] font-medium">
                                  {item.val > 0 ? `+${item.val}` : item.val}
                                </span>
                                <button
                                  onClick={() => handleAdjustParam(item.key, 0)}
                                  className="text-[9.5px] text-[#8A8A92] hover:text-[#4f8cff] hover:underline"
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                            <input
                              type="range"
                              min={min}
                              max={max}
                              value={item.val}
                              onDoubleClick={() => handleAdjustParam(item.key, 0)}
                              onPointerDown={() => beginTransaction()}
                              onPointerUp={() => commitTransaction()}
                              onChange={(e) => handleAdjustParam(item.key, parseInt(e.target.value, 10))}
                              className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                              title="Double-click to reset"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ==================== SUBTAB 2: HSL ==================== */}
                {adjustSubTab === 'hsl' && (
                  <div className="p-2.5 rounded border space-y-3 bg-[#141418] border-[#2A2A30]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1">
                        <Palette className="w-3 h-3 text-[#4f8cff]" />
                        <span>HSL Color Tuner</span>
                      </span>
                      <button
                        onClick={resetAllHsl}
                        className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer font-medium"
                      >
                        Reset All HSL
                      </button>
                    </div>

                    {/* 8 Color Swatches */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[
                        { id: 'red', name: 'Red', hex: '#ef4444' },
                        { id: 'orange', name: 'Orange', hex: '#f97316' },
                        { id: 'yellow', name: 'Yellow', hex: '#eab308' },
                        { id: 'green', name: 'Green', hex: '#22c55e' },
                        { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
                        { id: 'blue', name: 'Blue', hex: '#3b82f6' },
                        { id: 'purple', name: 'Purple', hex: '#a855f7' },
                        { id: 'magenta', name: 'Magenta', hex: '#ec4899' },
                      ].map(swatch => {
                        const isSel = selectedHslColor === swatch.id;
                        return (
                          <button
                            key={swatch.id}
                            onClick={() => setSelectedHslColor(swatch.id as HslColorName)}
                            className={`flex flex-col items-center gap-1 p-1.5 rounded border transition-all ${
                              isSel
                                ? 'bg-[#232326] border-[#4f8cff] shadow-sm'
                                : 'bg-[#18181C] border-[#2A2A30] hover:border-[#38383D]'
                            }`}
                          >
                            <span 
                              className="w-4 h-4 rounded-full border border-black/40"
                              style={{ backgroundColor: swatch.hex }}
                            />
                            <span className="text-[9.5px] text-[#D8D6D1] font-medium">
                              {swatch.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Sliders for current HSL color */}
                    <div className="p-2.5 rounded border space-y-2.5 bg-[#18181C] border-[#2A2A30]">
                      <div className="flex justify-between items-center text-[11px] font-semibold text-[#D8D6D1]">
                        <span className="capitalize">{selectedHslColor} Channel</span>
                        <button
                          onClick={() => resetHslColor(selectedHslColor)}
                          className="text-[9.5px] text-[#8A8A92] hover:text-[#4f8cff] hover:underline"
                        >
                          Reset {selectedHslColor}
                        </button>
                      </div>

                      {/* Hue */}
                      <div>
                        <div className="flex justify-between items-center text-[10.5px] text-[#8A8A92] mb-1">
                          <span>Hue</span>
                          <span className="font-mono text-[#4f8cff]">
                            {props.hsl?.[selectedHslColor]?.hue || 0}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={props.hsl?.[selectedHslColor]?.hue || 0}
                          onChange={(e) => handleHslChange(selectedHslColor, 'hue', parseInt(e.target.value, 10))}
                          className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                        />
                      </div>

                      {/* Saturation */}
                      <div>
                        <div className="flex justify-between items-center text-[10.5px] text-[#8A8A92] mb-1">
                          <span>Saturation</span>
                          <span className="font-mono text-[#4f8cff]">
                            {props.hsl?.[selectedHslColor]?.saturation || 0}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={props.hsl?.[selectedHslColor]?.saturation || 0}
                          onChange={(e) => handleHslChange(selectedHslColor, 'saturation', parseInt(e.target.value, 10))}
                          className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                        />
                      </div>

                      {/* Luminance */}
                      <div>
                        <div className="flex justify-between items-center text-[10.5px] text-[#8A8A92] mb-1">
                          <span>Luminance</span>
                          <span className="font-mono text-[#4f8cff]">
                            {props.hsl?.[selectedHslColor]?.luminance || 0}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={props.hsl?.[selectedHslColor]?.luminance || 0}
                          onChange={(e) => handleHslChange(selectedHslColor, 'luminance', parseInt(e.target.value, 10))}
                          className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================== SUBTAB 3: CURVES ==================== */}
                {adjustSubTab === 'curves' && (
                  <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#2A2A30]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1">
                        <Activity className="w-3 h-3 text-[#4f8cff]" />
                        <span>RGB Curves</span>
                      </span>
                      <button
                        onClick={resetCurves}
                        className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer font-medium"
                      >
                        Reset Curves
                      </button>
                    </div>

                    {/* Channel Selector */}
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'master', label: 'Master', color: '#ffffff' },
                        { id: 'red', label: 'Red', color: '#ef4444' },
                        { id: 'green', label: 'Green', color: '#22c55e' },
                        { id: 'blue', label: 'Blue', color: '#3b82f6' },
                      ].map(ch => (
                        <button
                          key={ch.id}
                          onClick={() => setSelectedCurveChannel(ch.id as CurveChannel)}
                          className={`py-1 text-[10.5px] rounded border transition-colors flex items-center justify-center gap-1 font-medium ${
                            selectedCurveChannel === ch.id
                              ? 'bg-[#232326] border-[#4f8cff] text-white shadow-sm'
                              : 'bg-[#18181C] border-[#2A2A30] text-[#8A8A92] hover:text-[#D8D6D1]'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                          <span>{ch.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Interactive Curve SVG Graph */}
                    {(() => {
                      const currentCurves = props.curves || {
                        master: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
                        red: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
                        green: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
                        blue: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
                      };
                      const points = currentCurves[selectedCurveChannel] || [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }];
                      const mid = points[1] || { x: 50, y: 50 };
                      const strokeColor = selectedCurveChannel === 'master' ? '#ffffff' : selectedCurveChannel === 'red' ? '#ef4444' : selectedCurveChannel === 'green' ? '#22c55e' : '#3b82f6';

                      const handleSvgPointerDown = (e: React.PointerEvent) => {
                        if (!curveSvgRef.current) return;
                        const rect = curveSvgRef.current.getBoundingClientRect();
                        const updateFromEvt = (evt: PointerEvent) => {
                          const px = Math.max(10, Math.min(90, ((evt.clientX - rect.left) / rect.width) * 100));
                          const py = Math.max(10, Math.min(90, (1 - (evt.clientY - rect.top) / rect.height) * 100));
                          handleCurveChange(selectedCurveChannel, Math.round(px), Math.round(py));
                        };
                        updateFromEvt(e.nativeEvent);
                        const onMove = (moveEvt: PointerEvent) => updateFromEvt(moveEvt);
                        const onUp = () => {
                          window.removeEventListener('pointermove', onMove);
                          window.removeEventListener('pointerup', onUp);
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                      };

                      return (
                        <div className="p-2 rounded border bg-[#18181C] border-[#2A2A30] space-y-2">
                          <svg
                            ref={curveSvgRef}
                            onPointerDown={handleSvgPointerDown}
                            className="w-full h-36 bg-[#121214] rounded border border-[#26262B] cursor-crosshair select-none"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            {/* Grid Lines */}
                            <line x1="25" y1="0" x2="25" y2="100" stroke="#26262D" strokeWidth="0.5" />
                            <line x1="50" y1="0" x2="50" y2="100" stroke="#26262D" strokeWidth="0.5" />
                            <line x1="75" y1="0" x2="75" y2="100" stroke="#26262D" strokeWidth="0.5" />
                            <line x1="0" y1="25" x2="100" y2="25" stroke="#26262D" strokeWidth="0.5" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="#26262D" strokeWidth="0.5" />
                            <line x1="0" y1="75" x2="100" y2="75" stroke="#26262D" strokeWidth="0.5" />

                            {/* Diagonal Baseline */}
                            <line x1="0" y1="100" x2="100" y2="0" stroke="#3A3A42" strokeDasharray="2,2" strokeWidth="0.75" />

                            {/* Bezier Curve */}
                            <path
                              d={`M 0 100 Q ${mid.x} ${100 - mid.y} 100 0`}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth="2"
                            />

                            {/* Control Point */}
                            <circle
                              cx={mid.x}
                              cy={100 - mid.y}
                              r="3.5"
                              fill="#4f8cff"
                              stroke="#ffffff"
                              strokeWidth="1"
                            />
                          </svg>

                          <div className="flex justify-between items-center text-[10px] text-[#8A8A92] font-mono">
                            <span>Input: {mid.x}</span>
                            <span className="text-[#4f8cff] font-semibold">Mid: ({mid.x}, {mid.y})</span>
                            <span>Output: {mid.y}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ==================== SUBTAB 4: MASK ==================== */}
                {adjustSubTab === 'mask' && (
                  <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#2A2A30]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1">
                        <Maximize2 className="w-3 h-3 text-[#4f8cff]" />
                        <span>Masking</span>
                      </span>
                      <button
                        onClick={resetMask}
                        className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer font-medium"
                      >
                        Reset Mask
                      </button>
                    </div>

                    {/* Mask Shapes */}
                    <div className="grid grid-cols-5 gap-1 pt-1">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'circle', label: 'Circle' },
                        { id: 'rectangle', label: 'Rect' },
                        { id: 'horizontal', label: 'Horiz' },
                        { id: 'mirror', label: 'Mirror' }
                      ].map(shape => {
                        const isSel = (props.mask?.shape || 'none') === shape.id;
                        return (
                          <button
                            key={shape.id}
                            onClick={() => handleMaskChange('shape', shape.id)}
                            className={`py-1.5 text-[10.5px] rounded border transition-colors font-medium text-center ${
                              isSel
                                ? 'bg-[#232326] border-[#4f8cff] text-[#4f8cff] shadow-sm'
                                : 'bg-[#18181C] border-[#2A2A30] text-[#8A8A92] hover:text-[#D8D6D1]'
                            }`}
                          >
                            {shape.label}
                          </button>
                        );
                      })}
                    </div>

                    {props.mask?.shape && props.mask.shape !== 'none' && (
                      <div className="space-y-2.5 pt-1 border-t border-[#26262B]">
                        {/* Size */}
                        <div>
                          <div className="flex justify-between items-center text-[10.5px] text-[#8A8A92] mb-1">
                            <span>Size</span>
                            <span className="font-mono text-[#4f8cff]">{props.mask.size || 100}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="200"
                            value={props.mask.size || 100}
                            onChange={(e) => handleMaskChange('size', parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                          />
                        </div>

                        {/* Feather */}
                        <div>
                          <div className="flex justify-between items-center text-[10.5px] text-[#8A8A92] mb-1">
                            <span>Feather</span>
                            <span className="font-mono text-[#4f8cff]">{props.mask.feather || 0}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={props.mask.feather || 0}
                            onChange={(e) => handleMaskChange('feather', parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                          />
                        </div>

                        {/* Rotation */}
                        <div>
                          <div className="flex justify-between items-center text-[10.5px] text-[#8A8A92] mb-1">
                            <span>Rotation</span>
                            <span className="font-mono text-[#4f8cff]">{props.mask.rotation || 0}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            value={props.mask.rotation || 0}
                            onChange={(e) => handleMaskChange('rotation', parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                          />
                        </div>

                        {/* Invert */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10.5px] text-[#D8D6D1]">Invert Mask</span>
                          <button
                            onClick={() => handleMaskChange('inverted', !props.mask?.inverted)}
                            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                              props.mask?.inverted ? 'bg-[#4f8cff]' : 'bg-[#2A2A30]'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                props.mask?.inverted ? 'left-4.5' : 'left-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== SUBTAB 5: CHROMA KEY ==================== */}
                {adjustSubTab === 'chroma' && (
                  <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#2A2A30]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1">
                        <Pipette className="w-3 h-3 text-[#4f8cff]" />
                        <span>Chroma Key (Green/Blue Screen)</span>
                      </span>
                      <button
                        onClick={resetChroma}
                        className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer font-medium"
                      >
                        Reset Chroma
                      </button>
                    </div>

                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-2 rounded bg-[#18181C] border border-[#2A2A30]">
                      <span className="text-xs text-[#D8D6D1] font-medium">Enable Chroma Key</span>
                      <button
                        onClick={() => handleChromaChange('enabled', !props.chromaKey?.enabled)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          props.chromaKey?.enabled ? 'bg-[#4f8cff]' : 'bg-[#2A2A30]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            props.chromaKey?.enabled ? 'left-4.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {props.chromaKey?.enabled && (
                      <div className="space-y-2.5 pt-1">
                        {/* Key Color Picker */}
                        <div>
                          <label className="text-[10.5px] text-[#8A8A92] block mb-1">Key Color</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleChromaChange('color', '#00ff00')}
                              className="px-2 py-1 rounded border border-[#2A2A30] bg-[#18181C] text-[10.5px] text-[#D8D6D1] flex items-center gap-1.5 hover:border-[#4f8cff]"
                            >
                              <span className="w-3 h-3 rounded-full bg-[#00ff00] border border-black/40" />
                              <span>Green</span>
                            </button>
                            <button
                              onClick={() => handleChromaChange('color', '#0000ff')}
                              className="px-2 py-1 rounded border border-[#2A2A30] bg-[#18181C] text-[10.5px] text-[#D8D6D1] flex items-center gap-1.5 hover:border-[#4f8cff]"
                            >
                              <span className="w-3 h-3 rounded-full bg-[#0000ff] border border-black/40" />
                              <span>Blue</span>
                            </button>
                            <input
                              type="color"
                              value={props.chromaKey.color || '#00ff00'}
                              onChange={(e) => handleChromaChange('color', e.target.value)}
                              className="w-8 h-7 p-0 bg-transparent rounded cursor-pointer border border-[#2A2A30]"
                              title="Custom Key Color"
                            />
                            <span className="text-[10px] font-mono text-[#8A8A92]">
                              {props.chromaKey.color || '#00ff00'}
                            </span>
                          </div>
                        </div>

                        {/* Tolerance */}
                        <div>
                          <div className="flex justify-between items-center text-[10.5px] text-[#8A8A92] mb-1">
                            <span>Tolerance</span>
                            <span className="font-mono text-[#4f8cff]">{props.chromaKey.tolerance || 30}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={props.chromaKey.tolerance || 30}
                            onChange={(e) => handleChromaChange('tolerance', parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                          />
                        </div>

                        {/* Smoothness */}
                        <div>
                          <div className="flex justify-between items-center text-[10.5px] text-[#8A8A92] mb-1">
                            <span>Smoothness</span>
                            <span className="font-mono text-[#4f8cff]">{props.chromaKey.smoothness || 10}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={props.chromaKey.smoothness || 10}
                            onChange={(e) => handleChromaChange('smoothness', parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== SUBTAB 6: EFFECTS & TRANSITIONS ==================== */}
                {adjustSubTab === 'effects' && (
                  <div className="p-2.5 rounded border space-y-3 bg-[#141418] border-[#2A2A30]">
                    <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider block">
                      Video Transitions
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'fade', label: 'Fade' },
                        { id: 'dissolve', label: 'Dissolve' },
                        { id: 'wipe-left', label: 'Wipe L' },
                        { id: 'wipe-right', label: 'Wipe R' },
                        { id: 'zoom-in', label: 'Zoom In' },
                      ].map(tr => {
                        const isSel = (props.transition?.type || 'none') === tr.id;
                        return (
                          <button
                            key={tr.id}
                            onClick={() => handleTransitionChange('type', tr.id)}
                            className={`py-1 text-[10.5px] rounded border transition-colors font-medium ${
                              isSel
                                ? 'bg-[#232326] border-[#4f8cff] text-[#4f8cff] shadow-sm'
                                : 'bg-[#18181C] border-[#2A2A30] text-[#8A8A92] hover:text-[#D8D6D1]'
                            }`}
                          >
                            {tr.label}
                          </button>
                        );
                      })}
                    </div>

                    {props.transition?.type && props.transition.type !== 'none' && (
                      <div>
                        <div className="flex justify-between items-center text-[10.5px] text-[#8A8A92] mb-1">
                          <span>Transition Duration</span>
                          <span className="font-mono text-[#4f8cff]">{(props.transition.duration || 0.5).toFixed(1)}s</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="2.0"
                          step="0.1"
                          value={props.transition.duration || 0.5}
                          onChange={(e) => handleTransitionChange('duration', parseFloat(e.target.value))}
                          className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#4f8cff]"
                        />
                      </div>
                    )}

                    <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider block pt-2 border-t border-[#26262B]">
                      Visual Effects
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'glitch', label: 'Glitch' },
                        { id: 'zoom', label: 'Zoom In' },
                        { id: 'blur', label: 'Blur' },
                        { id: 'flash', label: 'Flash' },
                        { id: 'shake', label: 'Shake' },
                      ].map(fx => {
                        const isSel = (props.videoEffect || 'none') === fx.id;
                        return (
                          <button
                            key={fx.id}
                            onClick={() => handleUpdate({ videoEffect: fx.id })}
                            className={`py-1 text-[10.5px] rounded border transition-colors font-medium ${
                              isSel
                                ? 'bg-[#232326] border-[#4f8cff] text-[#4f8cff] shadow-sm'
                                : 'bg-[#18181C] border-[#2A2A30] text-[#8A8A92] hover:text-[#D8D6D1]'
                            }`}
                          >
                            {fx.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Global Adjustment Layer Toggle */}
                    <div className="flex items-center justify-between p-2 rounded bg-[#18181C] border border-[#2A2A30] mt-2">
                      <div className="space-y-0.5">
                        <span className="text-xs text-[#D8D6D1] font-medium block">Adjustment Layer</span>
                        <span className="text-[9.5px] text-[#8A8A92] block">Apply color grade across all lower tracks</span>
                      </div>
                      <button
                        onClick={() => handleUpdate({ isAdjustmentLayer: !props.isAdjustmentLayer })}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          props.isAdjustmentLayer ? 'bg-[#4f8cff]' : 'bg-[#2A2A30]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            props.isAdjustmentLayer ? 'left-4.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
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
                      <Scissors className="w-3 h-3 text-[#4f8cff]" />
                      <span>Timeline Position</span>
                    </span>
                    <button
                      onClick={() => moveClip(activeClip.id, currentTime)}
                      className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer font-medium"
                    >
                      To Head
                    </button>
                  </div>

                  {/* Start Point */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span>Start Point</span>
                      <span className="font-mono text-[#4f8cff] font-medium">{activeClip.start.toFixed(2)}s</span>
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
                      <span className="font-mono text-[#4f8cff] font-medium">{activeClip.duration.toFixed(2)}s</span>
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
                  <span className="text-[10px] font-semibold text-[#4f8cff] uppercase tracking-wider block">
                    Text Content
                  </span>
                  <textarea
                    rows={3}
                    value={props.text ?? activeClip.title ?? ''}
                    onFocus={() => beginTransaction()}
                    onBlur={() => commitTransaction()}
                    onChange={(e) => handleUpdate({ text: e.target.value })}
                    className="w-full text-xs p-2 rounded border outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#4f8cff] resize-none"
                    placeholder="Enter text content..."
                  />
                </div>

                {/* Text Templates & Presets */}
                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#26262D]">
                  <span className="text-[10px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#4f8cff]" />
                    <span>Viral Text Templates</span>
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {[
                      {
                        name: 'Alex Hormozi',
                        desc: 'Yellow Punch',
                        preset: {
                          fontFamily: 'Montserrat',
                          fontWeight: '800',
                          fontSize: 32,
                          fontColor: '#FACC15',
                          outlineWidth: 3,
                          outlineColor: '#000000',
                          shadowBlur: 10,
                          shadowColor: 'rgba(0,0,0,0.9)',
                          fontBg: '#000000',
                          bgOpacity: 0.3
                        }
                      },
                      {
                        name: 'Cinematic Gold',
                        desc: 'Luxury Serif',
                        preset: {
                          fontFamily: 'Cinzel',
                          fontWeight: '700',
                          fontSize: 28,
                          fontColor: '#FDE047',
                          outlineWidth: 1,
                          outlineColor: '#78350F',
                          shadowBlur: 16,
                          shadowColor: 'rgba(0,0,0,0.8)',
                          fontBg: '#000000',
                          bgOpacity: 0.4
                        }
                      },
                      {
                        name: 'Cyberpunk Neon',
                        desc: 'Electric Cyan',
                        preset: {
                          fontFamily: 'JetBrains Mono',
                          fontWeight: '700',
                          fontSize: 26,
                          fontColor: '#22D3EE',
                          outlineWidth: 0,
                          shadowBlur: 16,
                          shadowColor: '#EC4899',
                          fontBg: '#08080C',
                          bgOpacity: 0.7
                        }
                      },
                      {
                        name: 'Minimal Clean',
                        desc: 'Modern Pill',
                        preset: {
                          fontFamily: 'Inter',
                          fontWeight: '600',
                          fontSize: 24,
                          fontColor: '#FFFFFF',
                          fontBg: '#18181B',
                          bgOpacity: 0.8,
                          bgRadius: 6,
                          bgPadding: 8,
                          outlineWidth: 0,
                          shadowBlur: 4
                        }
                      },
                      {
                        name: 'Breaking News',
                        desc: 'Red Banner',
                        preset: {
                          fontFamily: 'Anton',
                          fontWeight: '700',
                          fontSize: 28,
                          fontColor: '#FFFFFF',
                          fontBg: '#DC2626',
                          bgOpacity: 0.95,
                          bgRadius: 2,
                          bgPadding: 6,
                          outlineWidth: 0,
                          shadowBlur: 8
                        }
                      },
                      {
                        name: 'Green Viral',
                        desc: 'Hormozi Pop',
                        preset: {
                          fontFamily: 'Montserrat',
                          fontWeight: '800',
                          fontSize: 32,
                          fontColor: '#4ADE80',
                          outlineWidth: 3,
                          outlineColor: '#000000',
                          shadowBlur: 12,
                          shadowColor: 'rgba(0,0,0,0.9)',
                          fontBg: '#000000',
                          bgOpacity: 0.3
                        }
                      }
                    ].map(tpl => (
                      <button
                        key={tpl.name}
                        onClick={() => handleUpdate(tpl.preset)}
                        className="p-1.5 rounded border border-[#26262B] bg-[#18181C] hover:border-[#4f8cff] text-left transition-colors flex flex-col group"
                      >
                        <span className="text-[10.5px] font-medium text-[#E8E6E1] group-hover:text-[#4f8cff]">
                          {tpl.name}
                        </span>
                        <span className="text-[9px] text-[#8A8A92]">
                          {tpl.desc}
                        </span>
                      </button>
                    ))}
                  </div>
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
                      className="w-full text-xs p-1.5 rounded bg-[#1F1F24] border border-[#2C2C33] text-[#E8E6E1] outline-none focus:border-[#4f8cff]"
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
                      <span className="font-mono text-[#4f8cff] font-medium">{props.fontSize || 28}px</span>
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
                        className={`p-1 rounded ${props.textAlign === 'left' ? 'bg-[#1e293b] text-[#4f8cff]' : 'text-[#8A8A92] hover:text-white'}`}
                        title="Align Left"
                      >
                        <AlignLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleUpdate({ textAlign: 'center' })}
                        className={`p-1 rounded ${(props.textAlign || 'center') === 'center' ? 'bg-[#1e293b] text-[#4f8cff]' : 'text-[#8A8A92] hover:text-white'}`}
                        title="Align Center"
                      >
                        <AlignCenter className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleUpdate({ textAlign: 'right' })}
                        className={`p-1 rounded ${props.textAlign === 'right' ? 'bg-[#1e293b] text-[#4f8cff]' : 'text-[#8A8A92] hover:text-white'}`}
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
                          ? 'bg-[#1e293b] text-[#4f8cff] border-[#4f8cff]/50'
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
                        <span className="font-mono text-[#4f8cff]">{props.letterSpacing || 0}px</span>
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
                        <span className="font-mono text-[#4f8cff]">{props.lineHeight || 1.2}</span>
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
                      {['#FFFFFF', '#4f8cff', '#EAB308', '#38BDF8', '#F43F5E', '#18181B'].map(hex => (
                        <button
                          key={hex}
                          onClick={() => handleUpdate({ fontColor: hex })}
                          className={`w-4 h-4 rounded-full border ${props.fontColor === hex ? 'border-white ring-1 ring-[#4f8cff]' : 'border-black/50'}`}
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
                          <span className="font-mono text-[#4f8cff]">{props.bgPadding ?? 8}px</span>
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
                          <span className="font-mono text-[#4f8cff]">{props.bgRadius ?? 4}px</span>
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
                        <span className="font-mono text-[#4f8cff]">{props.outlineWidth || 0}px</span>
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
                        <span className="font-mono text-[#4f8cff]">{props.shadowBlur || 0}px</span>
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
                        <span className="font-mono text-[#4f8cff]">{props.posX || 0}px</span>
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
                        <span className="font-mono text-[#4f8cff]">{props.posY || 0}px</span>
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
                        <span className="font-mono text-[#4f8cff]">{(props.scale || 1).toFixed(2)}x</span>
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
                        <span className="font-mono text-[#4f8cff]">{Math.round((props.opacity ?? 1) * 100)}%</span>
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
                <div className="p-2.5 rounded border space-y-2.5 bg-[#141418] border-[#26262D]">
                  <span className="text-[10.5px] font-semibold text-[#8A8A92] uppercase tracking-wider flex items-center justify-between">
                    <span>Transform</span>
                    <button
                      onClick={() => handleUpdate({ scale: 1, rotation: 0, posX: 0, posY: 0, flipH: false, flipV: false, opacity: 1, blendMode: 'normal' })}
                      className="text-[10px] text-[#4f8cff] hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  </span>

                  {/* Scale */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-[#D8D6D1] mb-1">
                      <span className="flex items-center gap-1.5">
                        <span>Scale</span>
                        <button
                          type="button"
                          onClick={() => handleUpdate({ isScaleLocked: props.isScaleLocked === false ? true : false })}
                          className={`p-0.5 rounded text-[10px] ${props.isScaleLocked !== false ? 'text-[#4f8cff]' : 'text-[#8a8a93]'}`}
                          title={props.isScaleLocked !== false ? "Uniform Scale Locked" : "Free Scale"}
                        >
                          {props.isScaleLocked !== false ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                      </span>
                      <span className="font-mono text-[#4f8cff]">{props.scale.toFixed(2)}x</span>
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
                      <span className="font-mono text-[#4f8cff]">{props.rotation}°</span>
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
                        className="w-full text-xs px-2 py-0.5 rounded border font-mono text-center outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#4f8cff]"
                      />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-[#787882]">Position Y</span>
                      <input
                        type="number"
                        value={props.posY}
                        onChange={(e) => handleUpdate({ posY: parseInt(e.target.value, 10) || 0 })}
                        className="w-full text-xs px-2 py-0.5 rounded border font-mono text-center outline-none bg-[#1F1F24] border-[#2C2C33] text-[#E8E6E1] focus:border-[#4f8cff]"
                      />
                    </div>
                  </div>

                  {/* Quick Alignment Grid */}
                  <div>
                    <span className="text-[9.5px] text-[#787882] block mb-1">Alignment Anchors</span>
                    <div className="grid grid-cols-5 gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posX: 0, posY: 0 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Center (0, 0)"
                      >
                        Center
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posY: -100 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Top"
                      >
                        Top
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posY: 100 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Bottom"
                      >
                        Bottom
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posX: -120 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Left"
                      >
                        Left
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate({ posX: 120 })}
                        className="py-1 px-0.5 rounded bg-[#1F1F24] border border-[#2C2C33] hover:bg-[#282830] text-[9.5px] text-[#d4d4d8] text-center"
                        title="Right"
                      >
                        Right
                      </button>
                    </div>
                  </div>

                  {/* Flip & Rotate Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => handleUpdate({ rotation: (props.rotation + 90) % 360 })}
                      className="p-1 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830] cursor-pointer"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3 h-3 stroke-[1.5]" />
                      <span>90°</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ flipH: !props.flipH })}
                      className={`p-1 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] cursor-pointer ${
                        props.flipH ? 'bg-[#1e293b] border-[#4f8cff] text-[#4f8cff]' : 'bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830]'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-3 h-3 stroke-[1.5]" />
                      <span>Flip H</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ flipV: !props.flipV })}
                      className={`p-1 border rounded text-[#D8D6D1] flex items-center justify-center gap-1 text-[10px] cursor-pointer ${
                        props.flipV ? 'bg-[#1e293b] border-[#4f8cff] text-[#4f8cff]' : 'bg-[#1F1F24] border-[#2C2C33] hover:bg-[#282830]'
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-3 h-3 stroke-[1.5]" />
                      <span>Flip V</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ scale: 1, rotation: 0, posX: 0, posY: 0 })}
                      className="p-1 border rounded text-[#8A8A92] hover:text-[#E8E6E1] flex items-center justify-center bg-[#1F1F24] border-[#2C2C33] cursor-pointer"
                      title="Reset Transforms"
                    >
                      <RotateCcw className="w-3 h-3 stroke-[1.5]" />
                    </button>
                  </div>
                </div>

                {/* Opacity */}
                <div className="p-2.5 rounded border space-y-1.5 bg-[#141418] border-[#26262D]">
                  <div className="flex justify-between text-[11px] text-[#D8D6D1]">
                    <span>Opacity</span>
                    <span className="font-mono text-[#4f8cff]">{Math.round(props.opacity * 100)}%</span>
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

                {/* Blend Modes (CapCut Desktop Overlays Suite) */}
                <div className="p-2.5 rounded border space-y-2 bg-[#141418] border-[#26262D]">
                  <div className="flex justify-between items-center text-[11px] text-[#D8D6D1]">
                    <span className="font-semibold text-[10px] text-[#8A8A92] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-[#4f8cff]" />
                      <span>Blend Mode</span>
                    </span>
                    <span className="font-mono text-[#4f8cff] text-[10px] capitalize font-medium">
                      {props.blendMode || 'normal'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {(['normal', 'screen', 'darken', 'multiply', 'overlay', 'lighten', 'color-dodge', 'soft-light'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleUpdate({ blendMode: mode })}
                        className={`text-[9.5px] py-1 px-0.5 rounded text-center capitalize border transition-colors cursor-pointer ${
                          (props.blendMode || 'normal') === mode
                            ? 'bg-[#4f8cff] text-white border-[#4f8cff] font-semibold'
                            : 'bg-[#1F1F24] text-[#8a8a93] border-[#2C2C33] hover:text-[#d4d4d8] hover:bg-[#282830]'
                        }`}
                      >
                        {mode.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
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
                <div className="w-10 h-10 rounded-full bg-[#202026] border border-[#2E2E38] flex items-center justify-center mx-auto text-[#4f8cff]">
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
                  <Info className="w-3.5 h-3.5 text-[#4f8cff]" />
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
                    <span className="font-mono text-[#4f8cff] font-semibold">{aspectRatio}</span>
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

