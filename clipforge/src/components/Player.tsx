import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Maximize2, 
  Repeat, 
  Monitor, 
  Smartphone, 
  Square,
  ZoomIn
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export const Player: React.FC = () => {
  const { 
    currentTime, 
    totalDuration, 
    isPlaying, 
    togglePlay, 
    seek, 
    stepFrame, 
    aspectRatio, 
    setAspectRatio,
    tracks 
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isLooping, setIsLooping] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<'fit' | '50%' | '100%'>('fit');

  // Format seconds to mm:ss.ms
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Real-time playback timer loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      if (isPlaying) {
        const deltaSec = (now - lastTimestamp) / 1000;
        const nextTime = currentTime + deltaSec;
        if (nextTime >= totalDuration) {
          if (isLooping) {
            seek(0);
          } else {
            useEditorStore.getState().pause();
          }
        } else {
          seek(nextTime);
        }
      }
      lastTimestamp = now;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, totalDuration, isLooping, seek]);

  // Find active clips at currentTime
  const activeVideoTrack = tracks.find(t => t.type === 'video' && !t.isHidden);
  const activeVideoClip = activeVideoTrack?.clips.find(c => currentTime >= c.start && currentTime <= (c.start + c.duration));

  const activeTextTrack = tracks.find(t => t.type === 'text' && !t.isHidden);
  const activeTextClip = activeTextTrack?.clips.find(c => currentTime >= c.start && currentTime <= (c.start + c.duration));

  const activeStickerTrack = tracks.find(t => t.type === 'sticker' && !t.isHidden);
  const activeStickerClip = activeStickerTrack?.clips.find(c => currentTime >= c.start && currentTime <= (c.start + c.duration));

  // Compute aspect ratio styles
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[92%]';
      case '1:1':
        return 'aspect-square max-h-[90%]';
      case '4:5':
        return 'aspect-[4/5] max-h-[90%]';
      case '16:9':
      default:
        return 'aspect-video max-w-[94%] max-h-[90%]';
    }
  };

  // Compute CSS filter string
  const getFilterStyle = (filterName: string) => {
    switch (filterName) {
      case 'cinematic':
        return 'contrast(1.2) saturate(1.25) sepia(0.15) hue-rotate(-10deg)';
      case 'vibrant':
        return 'saturate(1.6) contrast(1.15) brightness(1.05)';
      case 'warm':
        return 'sepia(0.35) saturate(1.3) brightness(1.05)';
      case 'noir':
        return 'grayscale(1) contrast(1.4) brightness(0.95)';
      case 'cyberpunk':
        return 'hue-rotate(180deg) saturate(1.6) contrast(1.25)';
      default:
        return 'none';
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F0F10] overflow-hidden select-none relative">
      {/* 1. Main Viewport Canvas Stage */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_#18181C_0%,_#0B0B0D_100%)]"
      >
        {/* Monitor Screen Frame */}
        <div 
          className={`relative rounded-xl overflow-hidden bg-black shadow-2xl shadow-black/80 border border-[#2A2A2E] flex items-center justify-center transition-all duration-300 ${getAspectClass()}`}
        >
          {/* Active Video Rendering */}
          {activeVideoClip ? (
            <div 
              className="relative w-full h-full overflow-hidden flex items-center justify-center"
              style={{
                transform: `scale(${activeVideoClip.properties.scale}) translate(${activeVideoClip.properties.posX}px, ${activeVideoClip.properties.posY}px) rotate(${activeVideoClip.properties.rotation}deg) scaleX(${activeVideoClip.properties.flipH ? -1 : 1}) scaleY(${activeVideoClip.properties.flipV ? -1 : 1})`,
                opacity: activeVideoClip.properties.opacity,
                filter: getFilterStyle(activeVideoClip.properties.filter),
                transition: 'transform 0.1s ease, filter 0.15s ease',
              }}
            >
              <img
                src={activeVideoClip.thumbnail || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80'}
                alt="Active Clip"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
              <Monitor className="w-8 h-8 opacity-40" />
              <span className="text-xs font-mono">No active clip at playhead</span>
            </div>
          )}

          {/* Active Sticker Overlay */}
          {activeStickerClip && (
            <div 
              className="absolute z-20 pointer-events-none"
              style={{
                top: '20%',
                right: '15%',
                transform: `scale(${activeStickerClip.properties.scale}) translate(${activeStickerClip.properties.posX}px, ${activeStickerClip.properties.posY}px) rotate(${activeStickerClip.properties.rotation}deg)`,
              }}
            >
              <div className="bg-purple-600/90 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-lg border border-purple-400 flex items-center gap-1.5 backdrop-blur-sm animate-pulse-subtle">
                <span>{activeStickerClip.title}</span>
              </div>
            </div>
          )}

          {/* Active Subtitle / Text Caption Overlay */}
          {activeTextClip && (
            <div className="absolute bottom-10 inset-x-4 z-30 flex justify-center pointer-events-none">
              {activeTextClip.properties.fontStyle === 'hormozi' ? (
                <div className="bg-yellow-400 text-black font-black text-sm md:text-base px-3 py-1 rounded shadow-2xl tracking-wider uppercase border-2 border-black transform -rotate-1">
                  {activeTextClip.properties.text}
                </div>
              ) : activeTextClip.properties.fontStyle === 'neon' ? (
                <div className="text-emerald-400 font-extrabold text-sm md:text-base px-3 py-1 rounded tracking-wide uppercase drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] bg-black/60 backdrop-blur-sm border border-emerald-500/40">
                  {activeTextClip.properties.text}
                </div>
              ) : (
                <div className="bg-black/80 text-white font-bold text-sm px-4 py-1.5 rounded-md shadow-lg border border-white/20 backdrop-blur-sm">
                  {activeTextClip.properties.text}
                </div>
              )}
            </div>
          )}

          {/* Watermark / Safe Area Guide */}
          <div className="absolute top-2 left-2 text-[10px] font-mono text-zinc-500/60 bg-black/40 px-1.5 py-0.5 rounded pointer-events-none">
            {aspectRatio} Preview
          </div>
        </div>
      </div>

      {/* 2. Sleek Player Transport Control Bar */}
      <div className="h-12 bg-[#141416] border-t border-[#2A2A2D] px-4 flex items-center justify-between shrink-0 select-none z-20">
        {/* Left: Aspect Ratio & Zoom Selector */}
        <div className="flex items-center gap-2">
          {/* Aspect Ratio Switcher */}
          <div className="flex items-center bg-[#1C1C1F] border border-[#2A2A2D] rounded-md p-0.5 text-xs">
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`px-2 py-1 rounded font-mono font-medium transition-colors flex items-center gap-1 ${
                aspectRatio === '16:9' ? 'bg-[#22D3EE] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="16:9 Landscape (YouTube / Desktop)"
            >
              <Monitor className="w-3 h-3" />
              <span>16:9</span>
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`px-2 py-1 rounded font-mono font-medium transition-colors flex items-center gap-1 ${
                aspectRatio === '9:16' ? 'bg-[#22D3EE] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="9:16 Portrait (TikTok / Reels / Shorts)"
            >
              <Smartphone className="w-3 h-3" />
              <span>9:16</span>
            </button>
            <button
              onClick={() => setAspectRatio('1:1')}
              className={`px-2 py-1 rounded font-mono font-medium transition-colors flex items-center gap-1 ${
                aspectRatio === '1:1' ? 'bg-[#22D3EE] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="1:1 Square (Instagram Feed)"
            >
              <Square className="w-3 h-3" />
              <span>1:1</span>
            </button>
          </div>

          {/* Zoom Level */}
          <div className="hidden xl:flex items-center gap-1 bg-[#1C1C1F] border border-[#2A2A2D] rounded-md px-2 py-1 text-xs text-zinc-400">
            <ZoomIn className="w-3 h-3 text-zinc-500" />
            <select
              value={zoomLevel}
              onChange={(e) => setZoomLevel(e.target.value as any)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer"
            >
              <option value="fit" className="bg-[#1C1C1F]">Fit View</option>
              <option value="50%" className="bg-[#1C1C1F]">50%</option>
              <option value="100%" className="bg-[#1C1C1F]">100%</option>
            </select>
          </div>
        </div>

        {/* Center: Transport Playhead Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => stepFrame(-1)}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-[#202024] transition-colors"
            title="Step Back 1s (Left Arrow)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-[#22D3EE] hover:bg-[#06B6D4] text-black flex items-center justify-center shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Play / Pause (Spacebar)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => stepFrame(1)}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-[#202024] transition-colors"
            title="Step Forward 1s (Right Arrow)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Timecode Readout */}
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold bg-[#1C1C1F] border border-[#2A2A2D] px-2.5 py-1 rounded-md">
            <span className="text-[#22D3EE]">{formatTime(currentTime)}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Right: Loop & Fullscreen Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded transition-colors ${
              isLooping 
                ? 'text-[#22D3EE] bg-cyan-950/40 border border-cyan-500/30' 
                : 'text-zinc-400 hover:text-white bg-[#1C1C1F] border border-[#2A2A2D]'
            }`}
            title="Toggle Loop Playback"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleFullscreen}
            className="p-1.5 text-zinc-400 hover:text-white bg-[#1C1C1F] hover:bg-[#202024] border border-[#2A2A2D] rounded transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
