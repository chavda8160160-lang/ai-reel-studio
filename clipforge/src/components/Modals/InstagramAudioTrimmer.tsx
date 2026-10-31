import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  X, 
  Sparkles, 
  Check, 
  Sliders, 
  Music, 
  Zap
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

// In-memory cache for decoded waveform peaks by audio URL / ID
import { getCachedOrFetchAudioUrl } from '../../services/audioCacheService';

const waveformCache = new Map<string, number[]>();

export const InstagramAudioTrimmer: React.FC = () => {
  const activeInstagramTrimmer = useEditorStore(s => s.activeInstagramTrimmer);
  
  if (!activeInstagramTrimmer || !activeInstagramTrimmer.isOpen) {
    return null;
  }

  return <InstagramAudioTrimmerContent />;
};

const InstagramAudioTrimmerContent: React.FC = () => {
  const { 
    activeInstagramTrimmer, 
    closeInstagramTrimmer, 
    tracks, 
    updateClipSpan, 
    updateClipProperties,
    addClipToTrack, 
    currentTime,
    setActiveInspectorTab 
  } = useEditorStore();

  const targetClip = activeInstagramTrimmer?.clipId 
    ? tracks.flatMap(t => t.clips).find(c => c.id === activeInstagramTrimmer.clipId)
    : null;

  const songData = activeInstagramTrimmer?.song || (targetClip ? {
    id: targetClip.id,
    name: targetClip.title.split(' - ')[0] || targetClip.title,
    artist: targetClip.title.split(' - ')[1] || 'Music Artist',
    duration: targetClip.sourceDuration || targetClip.duration || 180,
    thumbnailUrl: targetClip.thumbnail,
    previewUrl: targetClip.src || '',
    category: 'Trending',
    license: 'Royalty-Free / Creative Commons',
    licenseBadge: 'CC-BY',
  } : null);

  // Video track duration on timeline
  const videoTrack = tracks.find(t => t.type === 'video');
  const videoDuration = Math.max(1, videoTrack?.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0) || 15);

  const songDuration = Math.max(1, Number(songData?.duration) || 180);

  // Initial Duration & Offset
  const initialDur = activeInstagramTrimmer?.initialDuration 
    ?? (targetClip ? targetClip.duration : Math.min(30, songDuration));

  const initialOff = activeInstagramTrimmer?.initialOffset 
    ?? (targetClip ? (targetClip.offset || 0) : 0);

  // Preset Length Chips: 5s, 15s, 30s, 60s, 90s, "Custom"
  const [lengthMode, setLengthMode] = useState<'5s' | '15s' | '30s' | '60s' | '90s' | 'custom'>(() => {
    if (Math.abs(initialDur - 5) < 0.2) return '5s';
    if (Math.abs(initialDur - 15) < 0.2) return '15s';
    if (Math.abs(initialDur - 30) < 0.2) return '30s';
    if (Math.abs(initialDur - 60) < 0.2) return '60s';
    if (Math.abs(initialDur - 90) < 0.2) return '90s';
    return 'custom';
  });

  const [selectedDuration, setSelectedDuration] = useState<number>(initialDur);
  const [offset, setOffset] = useState<number>(initialOff);

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playheadTime, setPlayheadTime] = useState<number>(initialOff);

  // Audio Processing: Fade in, Fade out, Volume
  const [fadeIn, setFadeIn] = useState<number>(targetClip?.properties?.fadeIn ?? 0.5);
  const [fadeOut, setFadeOut] = useState<number>(targetClip?.properties?.fadeOut ?? 1.0);
  const [volume, setVolume] = useState<number>(targetClip?.properties?.volume ?? 0.9);
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);

  // Waveform Peaks & Decoding state
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [isDecodingAudio, setIsDecodingAudio] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const waveformTrackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingWindowRef = useRef<boolean>(false);
  const isResizingWindowRef = useRef<'start' | 'end' | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);
  const dragStartDurationRef = useRef<number>(0);

  // Decode audio data with Web Audio API for true waveform & RMS peak computation
  useEffect(() => {
    const audioUrl = songData?.previewUrl;
    if (!audioUrl) {
      generateFallbackPeaks();
      return;
    }

    if (waveformCache.has(audioUrl)) {
      setWaveformPeaks(waveformCache.get(audioUrl)!);
      return;
    }

    setIsDecodingAudio(true);
    let isCancelled = false;

    const decode = async () => {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error('Fetch failed');
        const arrayBuffer = await response.arrayBuffer();

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // Compute 100 normalized RMS energy peaks
        const rawData = audioBuffer.getChannelData(0);
        const samples = 100;
        const blockSize = Math.floor(rawData.length / samples);
        const peaks: number[] = [];

        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            const val = rawData[start + j] || 0;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / blockSize);
          peaks.push(Math.min(100, Math.max(12, Math.round(rms * 220))));
        }

        audioCtx.close().catch(() => {});

        if (!isCancelled) {
          waveformCache.set(audioUrl, peaks);
          setWaveformPeaks(peaks);
          setIsDecodingAudio(false);
        }
      } catch (err) {
        if (!isCancelled) {
          generateFallbackPeaks();
          setIsDecodingAudio(false);
        }
      }
    };

    decode();

    return () => {
      isCancelled = true;
    };
  }, [songData?.previewUrl]);

  // Fallback procedural waveform peaks
  const generateFallbackPeaks = () => {
    const base = [30, 45, 60, 80, 50, 75, 95, 85, 60, 70, 90, 100, 80, 60, 85, 95, 75, 55, 65, 85];
    const generated: number[] = [];
    for (let i = 0; i < 100; i++) {
      const idx = i % base.length;
      const variation = Math.sin(i * 0.3) * 15;
      generated.push(Math.min(100, Math.max(15, base[idx] + variation)));
    }
    setWaveformPeaks(generated);
  };

  // Bounds constraint: offset cannot exceed songDuration - selectedDuration
  useEffect(() => {
    const maxOff = Math.max(0, songDuration - selectedDuration);
    if (offset > maxOff) {
      setOffset(Number(maxOff.toFixed(1)));
    }
  }, [selectedDuration, songDuration, offset]);

  // Audio Playback Preview loop (plays ONLY selected slice [offset, offset + selectedDuration])
  useEffect(() => {
    if (!songData?.previewUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.src = songData.previewUrl;
    audio.volume = volume;

    const loopCheck = () => {
      if (audio && !audio.paused) {
        setPlayheadTime(audio.currentTime);
        // Loop back when slice reaches end
        if (audio.currentTime >= offset + selectedDuration || audio.currentTime >= songDuration) {
          audio.currentTime = offset;
        }
        animFrameRef.current = requestAnimationFrame(loopCheck);
      }
    };

    if (isPlaying) {
      audio.currentTime = Math.max(offset, Math.min(audio.currentTime, offset + selectedDuration));
      audio.play().then(() => {
        animFrameRef.current = requestAnimationFrame(loopCheck);
      }).catch(() => {
        setIsPlaying(false);
      });
    } else {
      audio.pause();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, offset, selectedDuration, volume, songData, songDuration]);

  // Handle Preset Length Chip Click
  const handleSelectLength = (dur: number, mode: typeof lengthMode) => {
    const validDur = Math.min(songDuration, dur);
    setSelectedDuration(validDur);
    setLengthMode(mode);
    if (audioRef.current && isPlaying) {
      audioRef.current.currentTime = offset;
    }
  };

  // Auto-Suggest: "Best part" button using RMS energy
  const handleAutoSuggestBestPart = () => {
    if (!waveformPeaks.length) return;
    const totalBars = waveformPeaks.length;
    const windowBars = Math.max(2, Math.round((selectedDuration / songDuration) * totalBars));

    let maxEnergy = -1;
    let bestStartIndex = 0;

    for (let i = 0; i <= totalBars - windowBars; i++) {
      let energy = 0;
      for (let j = 0; j < windowBars; j++) {
        const val = waveformPeaks[i + j] || 0;
        energy += val * val;
      }
      if (energy > maxEnergy) {
        maxEnergy = energy;
        bestStartIndex = i;
      }
    }

    const calculatedOffset = (bestStartIndex / totalBars) * songDuration;
    const maxOff = Math.max(0, songDuration - selectedDuration);
    const clampedOffset = Math.min(maxOff, Math.max(0, Number(calculatedOffset.toFixed(1))));

    setOffset(clampedOffset);
    if (audioRef.current) {
      audioRef.current.currentTime = clampedOffset;
    }
  };

  // Close & stop playback
  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    closeInstagramTrimmer();
  };

  // Keyboard Navigation: Space = preview, Left/Right = 0.5s (Shift = 5s), Esc = Close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 5.0 : 0.5;
        setOffset(prev => Math.max(0, Number((prev - step).toFixed(1))));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 5.0 : 0.5;
        const maxOff = Math.max(0, songDuration - selectedDuration);
        setOffset(prev => Math.min(maxOff, Number((prev + step).toFixed(1))));
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [songDuration, selectedDuration]);

  // Dragging the selection window across the waveform
  const handleWindowPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDraggingWindowRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offset;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>, edge: 'start' | 'end') => {
    e.stopPropagation();
    isResizingWindowRef.current = edge;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offset;
    dragStartDurationRef.current = selectedDuration;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!waveformTrackRef.current) return;
    const rect = waveformTrackRef.current.getBoundingClientRect();
    const pxPerSec = rect.width / songDuration;

    if (isDraggingWindowRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaSec = deltaX / pxPerSec;
      const newOff = Math.max(0, Math.min(songDuration - selectedDuration, dragStartOffsetRef.current + deltaSec));
      setOffset(Number(newOff.toFixed(1)));
      if (audioRef.current && isPlaying) {
        audioRef.current.currentTime = newOff;
      }
    } else if (isResizingWindowRef.current === 'end') {
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaSec = deltaX / pxPerSec;
      const newDur = Math.max(3, Math.min(songDuration - offset, dragStartDurationRef.current + deltaSec));
      setSelectedDuration(Number(newDur.toFixed(1)));
      setLengthMode('custom');
    } else if (isResizingWindowRef.current === 'start') {
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaSec = deltaX / pxPerSec;
      const newOff = Math.max(0, Math.min(offset + selectedDuration - 3, dragStartOffsetRef.current + deltaSec));
      const newDur = (dragStartOffsetRef.current + dragStartDurationRef.current) - newOff;
      setOffset(Number(newOff.toFixed(1)));
      setSelectedDuration(Number(newDur.toFixed(1)));
      setLengthMode('custom');
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingWindowRef.current = false;
    isResizingWindowRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Clicking anywhere on the track jumps the selection window center to that point
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!waveformTrackRef.current) return;
    const rect = waveformTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickSec = (clickX / rect.width) * songDuration;
    const newOff = Math.max(0, Math.min(songDuration - selectedDuration, clickSec - selectedDuration / 2));
    setOffset(Number(newOff.toFixed(1)));
    if (audioRef.current) {
      audioRef.current.currentTime = newOff;
    }
  };

  // Apply: "Use this part"
  const handleApply = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);

    // Cache the chosen audio snippet into IndexedDB in background for offline use
    if (songData?.previewUrl) {
      getCachedOrFetchAudioUrl(songData.previewUrl, {
        name: songData.name,
        artist: songData.artist,
        license: songData.license
      }).catch(() => {});
    }

    if (targetClip) {
      // Editing existing clip: maintain position, update offset and duration, fades, volume
      updateClipSpan(targetClip.id, targetClip.start, selectedDuration, offset);
      updateClipProperties(targetClip.id, {
        fadeIn,
        fadeOut,
        volume,
      });
      setActiveInspectorTab('audio');
    } else if (songData) {
      // Adding new audio clip at playhead
      addClipToTrack('track-audio', {
        title: `${songData.name} - ${songData.artist}`,
        type: 'audio',
        start: currentTime,
        duration: selectedDuration,
        sourceDuration: songDuration,
        offset: offset,
        thumbnail: songData.thumbnailUrl,
        src: songData.previewUrl,
        waveform: waveformPeaks,
        color: '#3d5a4f',
        properties: {
          volume,
          fadeIn,
          fadeOut,
          isMuted: false,
        }
      });
      setActiveInspectorTab('audio');
    }

    closeInstagramTrimmer();
  };

  // Time formatter: "01:12"
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const windowLeftPercent = (offset / songDuration) * 100;
  const windowWidthPercent = (selectedDuration / songDuration) * 100;
  const playheadPercent = songDuration > 0 ? (playheadTime / songDuration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#141418] border border-[#2E2E36] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#E8E6E1]"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        
        {/* 1. TOP HEADER: Song Cover, Title, Artist, License */}
        <div className="px-5 py-3.5 bg-[#18181E] border-b border-[#26262E] flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Cover art with pulsing vinyl ring */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#24242C] shrink-0 border border-white/10 shadow-md">
              {songData?.thumbnailUrl ? (
                <img
                  src={songData.thumbnailUrl}
                  alt={songData?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8A8A92]">
                  <Music className="w-6 h-6 text-[#C9A66B]" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white truncate max-w-md">
                  {songData?.name || 'Untitled Music Track'}
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#C9A66B]/20 text-[#C9A66B] border border-[#C9A66B]/30 font-bold shrink-0">
                  {songData?.licenseBadge || 'CC-BY'}
                </span>
              </div>
              <p className="text-[11px] text-[#A1A1AA] truncate">
                {songData?.artist || 'Music Artist'} • {formatTime(songDuration)} total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowAudioSettings(!showAudioSettings)}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                showAudioSettings 
                  ? 'bg-[#2A241D] text-[#C9A66B] border-[#C9A66B]/50' 
                  : 'bg-[#1E1E24] text-[#8A8A92] hover:text-white border-[#2E2E36]'
              }`}
              title="Fades and Volume Controls"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-[#8A8A92] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. OPTIONAL AUDIO SETTINGS: Fade In, Fade Out, Volume */}
        {showAudioSettings && (
          <div className="px-5 py-2.5 bg-[#101014] border-b border-[#26262E] grid grid-cols-3 gap-4 text-xs animate-in fade-in duration-100">
            <div>
              <div className="flex justify-between text-[10px] text-[#8A8A92] mb-1 font-mono">
                <span>Fade In</span>
                <span className="text-[#C9A66B]">{fadeIn.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.2"
                value={fadeIn}
                onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#C9A66B]"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-[#8A8A92] mb-1 font-mono">
                <span>Fade Out</span>
                <span className="text-[#C9A66B]">{fadeOut.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.2"
                value={fadeOut}
                onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#C9A66B]"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-[#8A8A92] mb-1 font-mono">
                <span>Volume</span>
                <span className="text-[#C9A66B]">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#262630] rounded cursor-pointer accent-[#C9A66B]"
              />
            </div>
          </div>
        )}

        {/* 3. LENGTH SELECTOR CHIPS + AUTO-SUGGEST "BEST PART" */}
        <div className="px-5 pt-4 pb-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A92]">
              Choose Snippet Length:
            </span>

            {/* "Best part" Auto-Suggest button using RMS energy */}
            <button
              type="button"
              onClick={handleAutoSuggestBestPart}
              className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#C9A66B]/20 to-[#E1306C]/20 hover:from-[#C9A66B]/30 hover:to-[#E1306C]/30 border border-[#C9A66B]/50 text-[#C9A66B] text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Automatically find the highest energy chorus / drop (RMS peak analysis)"
            >
              <Zap className="w-3 h-3 text-[#C9A66B] fill-current" />
              <span>⚡ Best Part (Auto-Drop)</span>
            </button>
          </div>

          {/* Chips: 5s, 15s, 30s, 60s, 90s, Custom, Fit to Video */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Fit to Video preset */}
            <button
              type="button"
              onClick={() => handleSelectLength(Math.min(songDuration, Number(videoDuration.toFixed(1))), 'custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                Math.abs(selectedDuration - videoDuration) < 0.2
                  ? 'bg-[#2A241D] text-[#C9A66B] border-[#C9A66B] shadow-xs'
                  : 'bg-[#18181E] text-[#8A8A92] hover:text-[#E8E6E1] border-[#2C2C33]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#C9A66B]" />
              <span>Fit to Video ({videoDuration.toFixed(1)}s)</span>
            </button>

            {[
              { label: '5s', sec: 5, mode: '5s' as const },
              { label: '15s', sec: 15, mode: '15s' as const },
              { label: '30s', sec: 30, mode: '30s' as const },
              { label: '60s', sec: 60, mode: '60s' as const },
              { label: '90s', sec: 90, mode: '90s' as const },
            ].map(chip => {
              const isDisabled = chip.sec > songDuration;
              const isSelected = lengthMode === chip.mode && Math.abs(selectedDuration - chip.sec) < 0.2;
              return (
                <button
                  key={chip.label}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectLength(chip.sec, chip.mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isDisabled 
                      ? 'opacity-30 cursor-not-allowed bg-[#18181E] border-transparent text-[#64646E]' 
                      : isSelected 
                      ? 'bg-[#2A241D] text-[#C9A66B] border-[#C9A66B] shadow-xs cursor-pointer' 
                      : 'bg-[#18181E] text-[#8A8A92] hover:text-[#E8E6E1] border-[#2C2C33] cursor-pointer'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}

            {/* Custom Mode Chip */}
            <button
              type="button"
              onClick={() => setLengthMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                lengthMode === 'custom' && Math.abs(selectedDuration - videoDuration) >= 0.2
                  ? 'bg-[#2A241D] text-[#C9A66B] border-[#C9A66B] shadow-xs'
                  : 'bg-[#18181E] text-[#8A8A92] hover:text-[#E8E6E1] border-[#2C2C33]'
              }`}
            >
              Custom ({selectedDuration.toFixed(1)}s)
            </button>
          </div>
        </div>

        {/* 4. TIME READOUT */}
        <div className="px-5 py-2 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#8A8A92]">Selected Window:</span>
            <span className="text-[#C9A66B] font-bold">
              {formatTime(offset)} to {formatTime(Math.min(songDuration, offset + selectedDuration))}
            </span>
          </div>
          <div className="text-[#8A8A92]">
            Length: <strong className="text-white font-bold">{selectedDuration.toFixed(1)}s</strong>
          </div>
        </div>

        {/* 5. FULL-WIDTH WAVEFORM & SELECTION WINDOW */}
        <div className="px-5 py-3">
          <div
            ref={waveformTrackRef}
            onPointerDown={handleTrackPointerDown}
            className="relative h-24 bg-[#101014] rounded-xl border border-[#26262E] flex items-center px-2 cursor-pointer overflow-hidden touch-none"
          >
            {/* Decoded Waveform Bars or Loading Skeleton */}
            {isDecodingAudio ? (
              <div className="w-full h-full flex items-center justify-between gap-[2px] pointer-events-none animate-pulse">
                {Array.from({ length: 80 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-1 rounded-full bg-[#C9A66B]/25"
                    style={{ height: `${30 + (idx % 6) * 10}%` }}
                  />
                ))}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-between gap-[2px] pointer-events-none select-none">
                {waveformPeaks.map((height, idx) => {
                  const barRatio = idx / waveformPeaks.length;
                  const barSec = barRatio * songDuration;
                  const isInSelectedRange = barSec >= offset && barSec <= (offset + selectedDuration);

                  return (
                    <div
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        isInSelectedRange
                          ? 'bg-[#C9A66B] shadow-xs'
                          : 'bg-white/15'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
            )}

            {/* Selection Window: Gold Border, Dimmed Outside */}
            <div
              onPointerDown={handleWindowPointerDown}
              className="absolute top-1 bottom-1 rounded-lg border-2 border-[#C9A66B] bg-[#C9A66B]/20 shadow-2xl cursor-grab active:cursor-grabbing flex items-center justify-between z-20 transition-[width,left] duration-75"
              style={{
                left: `${windowLeftPercent}%`,
                width: `${windowWidthPercent}%`,
              }}
            >
              {/* Left Resize Handle (Custom mode) */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 'start')}
                className="w-2 h-8 -ml-1 bg-[#C9A66B] hover:scale-125 rounded-sm cursor-ew-resize flex items-center justify-center transition-transform"
                title="Drag to resize start"
              >
                <div className="w-0.5 h-3 bg-black" />
              </div>

              {/* Center Floating Duration Tag */}
              <div className="px-2 py-0.5 rounded-full bg-black/80 border border-[#C9A66B]/40 text-[#C9A66B] font-mono text-[10px] font-bold shadow-md pointer-events-none">
                {selectedDuration.toFixed(1)}s
              </div>

              {/* Right Resize Handle (Custom mode) */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 'end')}
                className="w-2 h-8 -mr-1 bg-[#C9A66B] hover:scale-125 rounded-sm cursor-ew-resize flex items-center justify-center transition-transform"
                title="Drag to resize end"
              >
                <div className="w-0.5 h-3 bg-black" />
              </div>
            </div>

            {/* Playhead Line inside the waveform */}
            {isPlaying && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none z-30"
                style={{ left: `${playheadPercent}%` }}
              />
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] text-[#71717A] font-mono pt-1.5">
            <span>00:00</span>
            <span className="hidden sm:inline">Drag gold box left/right • Space to play • Arrow keys = ±0.5s</span>
            <span>{formatTime(songDuration)}</span>
          </div>
        </div>

        {/* 6. FOOTER: Play Button (Preview Slice Only), Cancel, "Use This Part" */}
        <div className="px-5 py-3.5 bg-[#18181E] border-t border-[#26262E] flex items-center justify-between">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              isPlaying
                ? 'bg-[#E1306C] text-white'
                : 'bg-[#2A241D] text-[#C9A66B] border border-[#C9A66B]/50 hover:bg-[#342D23]'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            <span>{isPlaying ? 'Pause Preview' : 'Preview Loop'}</span>
          </button>

          {/* Action Buttons: Cancel & "Use this part" */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#8A8A92] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-[#C9A66B] hover:bg-[#D4AF37] active:scale-95 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#C9A66B]/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Use This Part ({selectedDuration.toFixed(1)}s)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
