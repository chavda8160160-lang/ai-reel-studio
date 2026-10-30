import React from 'react';
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
  Info
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import type { InspectorTab } from '../types/editor';

const TABS: { id: InspectorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'video', label: 'Video', icon: Film },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'speed', label: 'Speed', icon: Gauge },
  { id: 'animation', label: 'Animation', icon: Sparkles },
  { id: 'adjust', label: 'Adjust', icon: Sliders },
];

export const Inspector: React.FC = () => {
  const { 
    selectedClipId, 
    tracks, 
    activeInspectorTab, 
    setActiveInspectorTab, 
    updateClipProperties,
    aspectRatio,
    totalDuration 
  } = useEditorStore();

  // Find currently selected clip
  let activeClip = null;
  for (const track of tracks) {
    const found = track.clips.find(c => c.id === selectedClipId);
    if (found) {
      activeClip = found;
      break;
    }
  }

  const props = activeClip?.properties;

  const handleUpdate = (partial: any) => {
    if (selectedClipId) {
      updateClipProperties(selectedClipId, partial);
    }
  };

  return (
    <aside className="w-[300px] h-full bg-[#18181B] border-l border-[#2A2A2D] flex flex-col select-none shrink-0 overflow-hidden">
      {/* 1. Header with Tabs */}
      <div className="border-b border-[#2A2A2D] bg-[#141416] shrink-0">
        <div className="p-3 flex items-center justify-between pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inspector</span>
          </h2>
          {activeClip ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-mono font-medium truncate max-w-[120px]">
              {activeClip.title}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500 font-mono">No Selection</span>
          )}
        </div>

        {/* Tab Strip */}
        <div className="flex border-t border-[#242428] px-1 bg-[#121215]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeInspectorTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveInspectorTab(tab.id)}
                className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all border-b-2 ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1A1E]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Body Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {activeClip && props ? (
          <>
            {/* TAB 1: VIDEO (Transform & Opacity) */}
            {activeInspectorTab === 'video' && (
              <div className="space-y-3">
                {/* Transform Group */}
                <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-2.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Basic Transform</span>
                    <button
                      onClick={() => handleUpdate({ scale: 1, rotation: 0, posX: 0, posY: 0, flipH: false, flipV: false })}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Reset
                    </button>
                  </span>

                  {/* Scale */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Scale (Zoom)</span>
                      <span className="font-mono text-cyan-400 font-semibold">{props.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={props.scale}
                      onChange={(e) => handleUpdate({ scale: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#25252C] rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Rotation</span>
                      <span className="font-mono text-cyan-400 font-semibold">{props.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={props.rotation}
                      onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-[#25252C] rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Position X / Y */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-zinc-500">Position X</span>
                      <input
                        type="number"
                        value={props.posX}
                        onChange={(e) => handleUpdate({ posX: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-[#1C1C22] text-xs text-white px-2 py-1 rounded border border-[#2E2E36] font-mono text-center outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500">Position Y</span>
                      <input
                        type="number"
                        value={props.posY}
                        onChange={(e) => handleUpdate({ posY: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-[#1C1C22] text-xs text-white px-2 py-1 rounded border border-[#2E2E36] font-mono text-center outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Flip & Quick Rotate */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => handleUpdate({ rotation: (props.rotation + 90) % 360 })}
                      className="p-1.5 bg-[#1C1C22] hover:bg-[#25252E] border border-[#2E2E36] rounded text-zinc-300 flex items-center justify-center gap-1 text-[10px]"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>90°</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ flipH: !props.flipH })}
                      className={`p-1.5 border rounded text-zinc-300 flex items-center justify-center gap-1 text-[10px] ${
                        props.flipH ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-[#1C1C22] hover:bg-[#25252E] border-[#2E2E36]'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-3 h-3" />
                      <span>Flip H</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ flipV: !props.flipV })}
                      className={`p-1.5 border rounded text-zinc-300 flex items-center justify-center gap-1 text-[10px] ${
                        props.flipV ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-[#1C1C22] hover:bg-[#25252E] border-[#2E2E36]'
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-3 h-3" />
                      <span>Flip V</span>
                    </button>
                    <button
                      onClick={() => handleUpdate({ scale: 1, rotation: 0 })}
                      className="p-1.5 bg-[#1C1C22] hover:bg-[#25252E] border border-[#2E2E36] rounded text-zinc-300 flex items-center justify-center text-[10px]"
                      title="Reset Transforms"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Opacity Group */}
                <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Opacity</span>
                    </span>
                    <span className="font-mono text-cyan-400 font-semibold">{Math.round(props.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={props.opacity}
                    onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#25252C] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Text Specific Editor if active clip is text */}
                {activeClip.type === 'text' && (
                  <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-2">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      Caption Content
                    </span>
                    <input
                      type="text"
                      value={props.text || ''}
                      onChange={(e) => handleUpdate({ text: e.target.value })}
                      className="w-full bg-[#1C1C22] text-xs text-white p-2 rounded border border-[#2E2E36] outline-none focus:border-cyan-400"
                    />
                    <div className="flex gap-1.5">
                      {['hormozi', 'neon', 'clean'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdate({ fontStyle: st as any })}
                          className={`flex-1 py-1 text-[10px] font-bold uppercase rounded border ${
                            props.fontStyle === st
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-[#1C1C22] text-zinc-400 border-[#2E2E36]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: AUDIO (Volume & Envelope) */}
            {activeInspectorTab === 'audio' && (
              <div className="space-y-3">
                <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-2.5">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span className="font-semibold">Volume Gain</span>
                    <span className="font-mono text-cyan-400 font-semibold">{Math.round(props.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={props.volume}
                    onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#25252C] rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={props.isMuted}
                        onChange={(e) => handleUpdate({ isMuted: e.target.checked })}
                        className="rounded accent-cyan-400"
                      />
                      <span>Mute Audio</span>
                    </label>
                  </div>
                </div>

                <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Fade Envelopes
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-500">Fade In (s)</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={props.fadeIn}
                        onChange={(e) => handleUpdate({ fadeIn: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#1C1C22] text-xs text-white p-1 rounded border border-[#2E2E36] font-mono text-center outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500">Fade Out (s)</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={props.fadeOut}
                        onChange={(e) => handleUpdate({ fadeOut: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#1C1C22] text-xs text-white p-1 rounded border border-[#2E2E36] font-mono text-center outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SPEED (Multiplier & Ramps) */}
            {activeInspectorTab === 'speed' && (
              <div className="space-y-3">
                <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-2.5">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span className="font-semibold">Playback Speed</span>
                    <span className="font-mono text-cyan-400 font-semibold">{props.speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    value={props.speed}
                    onChange={(e) => handleUpdate({ speed: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#25252C] rounded-lg cursor-pointer"
                  />
                  {/* Preset chips */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[0.5, 1.0, 1.5, 2.0].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdate({ speed: s })}
                        className={`py-1 rounded text-xs font-mono font-medium border transition-colors ${
                          props.speed === s
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-400'
                            : 'bg-[#1C1C22] text-zinc-400 border-[#2E2E36] hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Curve Speed Ramping
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Hero Ramp', 'Flash Cut', 'Jump Cut', 'Smooth'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleUpdate({ speed: preset === 'Hero Ramp' ? 1.5 : (preset === 'Flash Cut' ? 3.0 : 1.2) })}
                        className="py-1.5 px-2 bg-[#1C1C22] hover:bg-[#25252E] border border-[#2E2E36] rounded text-[11px] text-zinc-300 font-medium text-left truncate"
                      >
                        ⚡ {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ANIMATION (In / Out) */}
            {activeInspectorTab === 'animation' && (
              <div className="space-y-3">
                <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    In Animation
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Fade In', 'Zoom In', 'Slide Left', 'Glitch Pop'].map((anim) => (
                      <button
                        key={anim}
                        onClick={() => handleUpdate({ inAnimation: anim })}
                        className="py-1.5 px-2 bg-[#1C1C22] hover:bg-[#25252E] border border-[#2E2E36] rounded text-[11px] text-zinc-300 font-medium"
                      >
                        ✨ {anim}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ADJUST (Color Grade & Filters) */}
            {activeInspectorTab === 'adjust' && (
              <div className="space-y-3">
                {/* LUT Preset Swatches */}
                <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Cinematic LUT Grade
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'Raw' },
                      { id: 'cinematic', label: 'Teal/Orange' },
                      { id: 'vibrant', label: 'Vibrant' },
                      { id: 'warm', label: 'Golden' },
                      { id: 'noir', label: 'Noir B&W' },
                      { id: 'cyberpunk', label: 'Cyber' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleUpdate({ filter: f.id })}
                        className={`py-1 text-[11px] font-medium rounded border transition-colors ${
                          props.filter === f.id
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-400 font-bold'
                            : 'bg-[#1C1C22] text-zinc-400 border-[#2E2E36] hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adjustment Sliders */}
                <div className="bg-[#141417] p-2.5 rounded-lg border border-[#2A2A2D] space-y-2.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Color Sliders
                  </span>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Brightness</span>
                      <span className="font-mono text-cyan-400 font-semibold">{props.adjust.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={props.adjust.brightness}
                      onChange={(e) => handleUpdate({ adjust: { ...props.adjust, brightness: parseInt(e.target.value, 10) } })}
                      className="w-full h-1.5 bg-[#25252C] rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Contrast</span>
                      <span className="font-mono text-cyan-400 font-semibold">{props.adjust.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={props.adjust.contrast}
                      onChange={(e) => handleUpdate({ adjust: { ...props.adjust, contrast: parseInt(e.target.value, 10) } })}
                      className="w-full h-1.5 bg-[#25252C] rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Saturation</span>
                      <span className="font-mono text-cyan-400 font-semibold">{props.adjust.saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={props.adjust.saturation}
                      onChange={(e) => handleUpdate({ adjust: { ...props.adjust, saturation: parseInt(e.target.value, 10) } })}
                      className="w-full h-1.5 bg-[#25252C] rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Project Overview when no clip is selected */
          <div className="space-y-3 text-xs text-zinc-400">
            <div className="bg-[#141417] p-3 rounded-lg border border-[#2A2A2D] space-y-2">
              <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Project Info</span>
              </span>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-[#242428]">
                  <span>Resolution</span>
                  <span className="font-mono text-white font-semibold">
                    {aspectRatio === '9:16' ? '1080 × 1920' : (aspectRatio === '1:1' ? '1080 × 1080' : '1920 × 1080')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#242428]">
                  <span>Canvas Aspect</span>
                  <span className="font-mono text-cyan-400 font-semibold">{aspectRatio}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#242428]">
                  <span>Duration</span>
                  <span className="font-mono text-white font-semibold">{totalDuration}s</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Active Tracks</span>
                  <span className="font-mono text-white font-semibold">{tracks.length}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 text-center px-4">
              Click any clip on the timeline to edit its transform, speed, audio, and visual adjustments.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
