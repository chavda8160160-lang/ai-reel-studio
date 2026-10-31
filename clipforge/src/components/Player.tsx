import React, { useRef, useState, useEffect, useMemo } from 'react';
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
  RectangleVertical,
  Scaling
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import type { AspectRatio, ClipItem } from '../types/editor';
import { getVideoState, type VideoStateResult } from '../utils/videoState';

export const Player: React.FC = () => {
  const { 
    currentTime, 
    totalDuration, 
    isPlaying, 
    togglePlay, 
    stepFrame, 
    seek,
    aspectRatio, 
    setAspectRatio,
    tracks,
    videoSrc,
    audioSrc,
    isComparingFilter,
    selectedClipId,
    selectClip,
    updateClipProperties,
    editingClipId,
    setEditingClipId,
    setActiveInspectorTab,
    beginTransaction,
    commitTransaction
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentLoadedVideoSrc = useRef<string>('');
  const currentLoadedAudioSrc = useRef<string>('');
  const activeVideoClipIdRef = useRef<string | null>(null);
  const activeAudioClipIdRef = useRef<string | null>(null);
  const preloadedClipIdRef = useRef<string | null>(null);
  const lastStoreTimeRef = useRef<number>(currentTime);

  const [isLooping, setIsLooping] = useState(true);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [showDebugOverlay, setShowDebugOverlay] = useState<boolean>(false);
  const [liveVideoTime, setLiveVideoTime] = useState<number>(0);
  const [snapGuideX, setSnapGuideX] = useState<boolean>(false);
  const [snapGuideY, setSnapGuideY] = useState<boolean>(false);
  const [stageDimensions, setStageDimensions] = useState({ width: 800, height: 450 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableW = Math.max(100, rect.width - 32);
        const availableH = Math.max(100, rect.height - 32);
        setStageDimensions({ width: availableW, height: availableH });
      }
    };
    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Toggle debug overlay with Ctrl+Shift+D (Ctrl+D is reserved for duplicate clip)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setShowDebugOverlay(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Safe seek helper for paused scrubbing / preloading
  const safeSeekVideo = (vid: HTMLVideoElement, targetTime: number, andPlay = false) => {
    const t = Math.max(0, targetTime);
    if (vid.readyState >= 1) {
      if (Math.abs(vid.currentTime - t) > 0.02) {
        vid.currentTime = t;
      }
      if (andPlay && vid.paused) {
        vid.play().catch(() => {});
      }
    } else {
      const onMeta = () => {
        vid.removeEventListener('loadedmetadata', onMeta);
        vid.currentTime = t;
        if (andPlay && vid.paused) {
          vid.play().catch(() => {});
        }
      };
      vid.addEventListener('loadedmetadata', onMeta, { once: true });
    }
  };

  const isSeekingRef = useRef<boolean>(false);

  // Entry seek helper: waits for 'seeked' before calling play(), ensuring playback never starts from 0
  const seekAndPlayOnEntry = (vid: HTMLVideoElement, targetTime: number) => {
    const t = Math.max(0, targetTime);
    isSeekingRef.current = true;

    const doSeekAndPlay = () => {
      if (Math.abs(vid.currentTime - t) < 0.03) {
        isSeekingRef.current = false;
        if (vid.paused) vid.play().catch(() => {});
        return;
      }
      const onSeeked = () => {
        vid.removeEventListener('seeked', onSeeked);
        isSeekingRef.current = false;
        if (vid.paused) vid.play().catch(() => {});
      };
      vid.addEventListener('seeked', onSeeked, { once: true });
      try {
        vid.currentTime = t;
      } catch (e) {
        isSeekingRef.current = false;
      }
    };

    if (vid.readyState >= 1) {
      doSeekAndPlay();
    } else {
      const onMeta = () => {
        vid.removeEventListener('loadedmetadata', onMeta);
        doSeekAndPlay();
      };
      vid.addEventListener('loadedmetadata', onMeta, { once: true });
    }
  };

  const safeSeekAudio = (aud: HTMLAudioElement, targetTime: number, andPlay = false) => {
    const t = Math.max(0, targetTime);
    if (aud.readyState >= 1) {
      if (Math.abs(aud.currentTime - t) > 0.04) {
        aud.currentTime = t;
      }
      if (andPlay && aud.paused) {
        aud.play().catch(() => {});
      }
    } else {
      const onMeta = () => {
        aud.removeEventListener('loadedmetadata', onMeta);
        aud.currentTime = t;
        if (andPlay && aud.paused) {
          aud.play().catch(() => {});
        }
      };
      aud.addEventListener('loadedmetadata', onMeta, { once: true });
    }
  };

  // Format seconds to mm:ss.ms
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Active clip & state detection using pure getVideoState
  const activeVideoTrack = tracks.find(t => t.type === 'video' && !t.isHidden);
  let activeVideoClip: ClipItem | null = null;
  let activeVideoState: VideoStateResult = { active: false, sourceTime: 0 };

  if (activeVideoTrack) {
    for (const c of activeVideoTrack.clips) {
      const st = getVideoState({
        start: c.start,
        offset: c.offset ?? 0,
        duration: c.duration,
        speed: c.properties.speed || 1.0
      }, currentTime);
      if (st.active) {
        activeVideoClip = c;
        activeVideoState = st;
        break;
      }
    }
  }

  const activeAudioTrack = tracks.find(t => t.type === 'audio' && !t.isMuted);
  const activeAudioClip = activeAudioTrack?.clips.find(
    c => currentTime >= c.start && currentTime < (c.start + c.duration)
  ) || null;

  // Active text, stickers/images, and PiP clips across all upper tracks
  const activeOverlays = tracks
    .filter(t => !t.isHidden)
    .flatMap(t => t.clips.map(c => ({ clip: c, track: t })))
    .filter(({ clip, track }) => 
      (clip.type === 'text' || clip.type === 'sticker' || (clip.type === 'video' && track.id !== 'track-video')) && 
      currentTime >= clip.start && 
      currentTime < (clip.start + clip.duration)
    );

  // 1. Scrubbing & Seeking when Paused (pure getVideoState driven)
  useEffect(() => {
    if (isPlaying) return;

    const video = videoRef.current;
    const audio = audioRef.current;

    // Handle Video when Paused / Scrubbing
    if (video) {
      if (activeVideoClip && activeVideoState.active) {
        const targetSrc = activeVideoClip.src || videoSrc;
        if (targetSrc && currentLoadedVideoSrc.current !== targetSrc) {
          currentLoadedVideoSrc.current = targetSrc;
          video.src = targetSrc;
          video.load();
        }

        const speed = activeVideoClip.properties.speed || 1.0;
        video.playbackRate = speed;
        video.volume = activeVideoTrack?.isMuted ? 0 : Math.min(1, activeVideoClip.properties.volume ?? 1);
        safeSeekVideo(video, activeVideoState.sourceTime, false);
        video.pause();
        activeVideoClipIdRef.current = activeVideoClip.id;
      } else {
        video.pause();
        activeVideoClipIdRef.current = null;

        const upcomingClip = activeVideoTrack?.clips.find(c => c.start > currentTime);
        if (upcomingClip) {
          const targetSrc = upcomingClip.src || videoSrc;
          if (targetSrc && currentLoadedVideoSrc.current !== targetSrc) {
            currentLoadedVideoSrc.current = targetSrc;
            video.src = targetSrc;
            video.load();
          }
          const upOffset = upcomingClip.offset ?? 0;
          safeSeekVideo(video, upOffset, false);
        }
      }
    }

    // Handle Audio when Paused / Scrubbing
    if (audio) {
      if (activeAudioClip) {
        const targetSrc = activeAudioClip.src || audioSrc;
        if (targetSrc && currentLoadedAudioSrc.current !== targetSrc) {
          currentLoadedAudioSrc.current = targetSrc;
          audio.src = targetSrc;
          audio.load();
        }

        const offset = activeAudioClip.offset ?? 0;
        const targetAudioTime = offset + (currentTime - activeAudioClip.start);
        audio.volume = activeAudioTrack?.isMuted ? 0 : Math.min(1, activeAudioClip.properties.volume ?? 0.85);
        safeSeekAudio(audio, targetAudioTime, false);
        audio.pause();
        activeAudioClipIdRef.current = activeAudioClip.id;
      } else {
        audio.pause();
        activeAudioClipIdRef.current = null;
        const upcomingAudio = activeAudioTrack?.clips.find(c => c.start > currentTime);
        if (upcomingAudio) {
          const upOffset = upcomingAudio.offset ?? 0;
          safeSeekAudio(audio, upOffset, false);
        }
      }
    }
  }, [currentTime, isPlaying, activeVideoClip, activeVideoState.active, activeVideoState.sourceTime, activeAudioClip, activeVideoTrack?.isMuted, activeAudioTrack?.isMuted, videoSrc, audioSrc]);

  // 2. Play / Pause Transitions
  useEffect(() => {
    if (!isPlaying) {
      videoRef.current?.pause();
      audioRef.current?.pause();
      activeVideoClipIdRef.current = null;
      activeAudioClipIdRef.current = null;
      preloadedClipIdRef.current = null;
    }
  }, [isPlaying]);

  // 3. Master Playback Clock (Rules 3, 4, 5, 6, 8, 9)
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();
    lastStoreTimeRef.current = useEditorStore.getState().currentTime;

    const loop = (now: number) => {
      const deltaSec = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const store = useEditorStore.getState();
      const currentT = store.currentTime;

      // Check if user jumped or seeked externally (e.g. clicked timeline or pressed step frame)
      const userSeeked = Math.abs(currentT - lastStoreTimeRef.current) > 0.35;

      const video = videoRef.current;
      const audio = audioRef.current;

      const vTrack = store.tracks.find(t => t.type === 'video' && !t.isHidden);
      let vClip: ClipItem | null = null;
      let vState: VideoStateResult = { active: false, sourceTime: 0 };
      if (vTrack) {
        for (const c of vTrack.clips) {
          const st = getVideoState({
            start: c.start,
            offset: c.offset ?? 0,
            duration: c.duration,
            speed: c.properties.speed || 1.0
          }, currentT);
          if (st.active) {
            vClip = c;
            vState = st;
            break;
          }
        }
      }

      const aTrack = store.tracks.find(t => t.type === 'audio' && !t.isMuted);
      const aClip = aTrack?.clips.find(c => currentT >= c.start && currentT < (c.start + c.duration)) || null;

      let nextTimelineTime = currentT;

      // --- Handle Video Playback ---
      if (video) {
        if (vClip && vState.active) {
          const speed = vClip.properties.speed || 1.0;
          const clipOffset = vClip.offset ?? 0;

          // Case A: Entering a new clip, or user jumped/seeked while playing
          if (activeVideoClipIdRef.current !== vClip.id || userSeeked) {
            const targetSrc = vClip.src || videoSrc;
            if (targetSrc && currentLoadedVideoSrc.current !== targetSrc) {
              currentLoadedVideoSrc.current = targetSrc;
              video.src = targetSrc;
              video.load();
            }

            video.playbackRate = speed;
            const isVidMuted = vTrack?.isMuted || vClip.properties.isMuted;
            video.volume = isVidMuted ? 0 : Math.min(1, vClip.properties.volume ?? 1);
            seekAndPlayOnEntry(video, vState.sourceTime);
            activeVideoClipIdRef.current = vClip.id;
            nextTimelineTime = currentT + deltaSec;
          } 
          // Case B: Video is actively playing and decoded - Active Video is the Master Clock!
          else if (!isSeekingRef.current && video.readyState >= 2 && !video.paused) {
            const currentSourceTime = video.currentTime;
            const videoTimelineTime = vClip.start + (currentSourceTime - clipOffset) / speed;
            const clipEndTime = vClip.start + vClip.duration;

            // Check if clip has reached its duration
            if (videoTimelineTime >= clipEndTime) {
              video.pause();
              activeVideoClipIdRef.current = null;
              nextTimelineTime = clipEndTime;
            } else {
              // Smooth PLL sync: advance with deltaSec, gently converge to video presentation time
              const drift = videoTimelineTime - currentT;
              if (Math.abs(drift) > 0.3) {
                // If drift is significant, snap timeline to video
                nextTimelineTime = Math.max(vClip.start, Math.min(clipEndTime, videoTimelineTime));
              } else {
                // Gentle nudge so timeline movement is 60fps buttery-smooth without any micro-jitter
                nextTimelineTime = Math.max(vClip.start, Math.min(clipEndTime, currentT + deltaSec + drift * 0.18));
              }
            }
          } 
          // Case C: Video is buffering/paused or seeking
          else {
            if (video.paused && !video.ended && !isSeekingRef.current) {
              video.play().catch(() => {});
            }
            nextTimelineTime = currentT + deltaSec;
          }
        } else {
          // In gap or past video clips: pause video element
          if (activeVideoClipIdRef.current !== null) {
            video.pause();
            activeVideoClipIdRef.current = null;
          }
          nextTimelineTime = currentT + deltaSec;

          // Preload upcoming clip 1 second before it starts
          const upcoming = vTrack?.clips.find(c => c.start > nextTimelineTime && c.start <= nextTimelineTime + 1.0);
          if (upcoming && preloadedClipIdRef.current !== upcoming.id) {
            preloadedClipIdRef.current = upcoming.id;
            const targetSrc = upcoming.src || videoSrc;
            if (targetSrc && currentLoadedVideoSrc.current !== targetSrc) {
              currentLoadedVideoSrc.current = targetSrc;
              video.src = targetSrc;
              video.load();
            }
            const upOffset = upcoming.offset ?? 0;
            safeSeekVideo(video, upOffset, false);
            video.pause();
          }
        }

        // Keep debug overlay synchronized (only when open, throttled)
        if (showDebugOverlay && Math.floor(now / 150) !== Math.floor((now - deltaSec * 1000) / 150)) {
          setLiveVideoTime(Number(video.currentTime.toFixed(2)));
        }
      } else {
        nextTimelineTime = currentT + deltaSec;
      }

      // --- Handle Audio Playback ---
      if (audio) {
        if (aClip) {
          const offset = aClip.offset ?? 0;
          const expectedAudioTime = offset + (nextTimelineTime - aClip.start);

          if (activeAudioClipIdRef.current !== aClip.id || userSeeked) {
            const targetSrc = aClip.src || audioSrc;
            if (targetSrc && currentLoadedAudioSrc.current !== targetSrc) {
              currentLoadedAudioSrc.current = targetSrc;
              audio.src = targetSrc;
              audio.load();
            }
            const isAudMuted = aTrack?.isMuted || aClip.properties.isMuted;
            let effVol = isAudMuted ? 0 : Math.min(1, aClip.properties.volume ?? 0.85);
            // Dynamic Audio Fade In / Fade Out
            const elapsedOnClip = nextTimelineTime - aClip.start;
            const remainingOnClip = (aClip.start + aClip.duration) - nextTimelineTime;
            if (aClip.properties.fadeIn && aClip.properties.fadeIn > 0 && elapsedOnClip < aClip.properties.fadeIn) {
              effVol *= Math.max(0, elapsedOnClip / aClip.properties.fadeIn);
            }
            if (aClip.properties.fadeOut && aClip.properties.fadeOut > 0 && remainingOnClip < aClip.properties.fadeOut) {
              effVol *= Math.max(0, remainingOnClip / aClip.properties.fadeOut);
            }
            audio.volume = Math.min(1, Math.max(0, effVol));
            safeSeekAudio(audio, expectedAudioTime, true);
            activeAudioClipIdRef.current = aClip.id;
          } else {
            // While audio is actively playing: update volume and fades smoothly
            const isAudMuted = aTrack?.isMuted || aClip.properties.isMuted;
            let effVol = isAudMuted ? 0 : Math.min(1, aClip.properties.volume ?? 0.85);
            const elapsedOnClip = nextTimelineTime - aClip.start;
            const remainingOnClip = (aClip.start + aClip.duration) - nextTimelineTime;
            if (aClip.properties.fadeIn && aClip.properties.fadeIn > 0 && elapsedOnClip < aClip.properties.fadeIn) {
              effVol *= Math.max(0, elapsedOnClip / aClip.properties.fadeIn);
            }
            if (aClip.properties.fadeOut && aClip.properties.fadeOut > 0 && remainingOnClip < aClip.properties.fadeOut) {
              effVol *= Math.max(0, remainingOnClip / aClip.properties.fadeOut);
            }
            audio.volume = Math.min(1, Math.max(0, effVol));

            // Only resync audio if drift is substantial (> 0.75s) to prevent audio stutter
            if (audio.readyState >= 1 && Math.abs(audio.currentTime - expectedAudioTime) > 0.75) {
              audio.currentTime = Math.max(0, expectedAudioTime);
            }
            if (audio.paused && !audio.ended) {
              audio.play().catch(() => {});
            }
          }
        } else {
          if (activeAudioClipIdRef.current !== null) {
            audio.pause();
            activeAudioClipIdRef.current = null;
          }
        }
      }

      // Check boundary & loop
      if (nextTimelineTime >= store.totalDuration) {
        if (isLooping) {
          lastStoreTimeRef.current = 0;
          store.seek(0);
          activeVideoClipIdRef.current = null;
          activeAudioClipIdRef.current = null;
        } else {
          lastStoreTimeRef.current = store.totalDuration;
          store.seek(store.totalDuration);
          store.pause();
        }
      } else {
        lastStoreTimeRef.current = nextTimelineTime;
        store.seek(nextTimelineTime);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isLooping, videoSrc, audioSrc, showDebugOverlay]);

  // Active adjustment layer across tracks if any
  const activeAdjustmentClip = tracks
    .filter(t => !t.isHidden)
    .flatMap(t => t.clips)
    .find(c => c.properties.isAdjustmentLayer && currentTime >= c.start && currentTime < (c.start + c.duration));

  // Compute CSS filter string: real filter + color matrix presets with live adjustments, curves, HSL, and effects
  const getMaskClipPath = (mask?: any) => {
    if (!mask || mask.shape === 'none') return undefined;
    const size = mask.size || 100;
    switch (mask.shape) {
      case 'circle':
        return `circle(${Math.round(size / 2)}% at 50% 50%)`;
      case 'rectangle': {
        const inset = Math.max(0, Math.round(50 - size / 2));
        return `inset(${inset}% ${inset}% round 4px)`;
      }
      case 'horizontal': {
        const half = Math.max(0, Math.round(50 - size / 2));
        const bot = Math.min(100, Math.round(50 + size / 2));
        return `polygon(0% ${half}%, 100% ${half}%, 100% ${bot}%, 0% ${bot}%)`;
      }
      case 'mirror': {
        const band = Math.max(0, Math.round(50 - size / 4));
        const bot = Math.min(100, Math.round(50 + size / 4));
        return `polygon(0% 0%, 100% 0%, 100% ${band}%, 0% ${band}%, 0% ${bot}%, 100% ${bot}%, 100% 100%, 0% 100%)`;
      }
      default:
        return undefined;
    }
  };

  const getFilterStyle = (
    filterName: string, 
    adj?: any, 
    hsl?: any, 
    curves?: any, 
    videoEffect?: string,
    chromaKey?: any
  ) => {
    if (isComparingFilter) return 'none';

    // Layer active adjustment layer if present
    const effectiveAdj = activeAdjustmentClip ? { ...(adj || {}), ...(activeAdjustmentClip.properties.adjust || {}) } : adj;
    const effectiveFilter = (activeAdjustmentClip && activeAdjustmentClip.properties.filter !== 'none') 
      ? activeAdjustmentClip.properties.filter 
      : filterName;

    let base = '';
    switch (effectiveFilter) {
      case 'cinematic': // Teal & Gold
        base = 'contrast(1.18) saturate(1.25) sepia(0.18) hue-rotate(-12deg)';
        break;
      case 'vibrant': // Vibrant punch
        base = 'saturate(1.45) contrast(1.12) brightness(1.02)';
        break;
      case 'warm': // Golden hour
        base = 'sepia(0.32) saturate(1.28) brightness(1.04) hue-rotate(-4deg)';
        break;
      case 'noir': // High-contrast B&W
        base = 'grayscale(1) contrast(1.35) brightness(0.96)';
        break;
      case 'cyberpunk': // Cyber neon
        base = 'hue-rotate(185deg) saturate(1.55) contrast(1.22)';
        break;
      default:
        base = '';
    }

    if (effectiveAdj) {
      // Scale: -100 to 100, where 0 is neutral (1.0x)
      const b = Math.max(0, 1 + ((effectiveAdj.brightness || 0) + (effectiveAdj.highlights || 0) * 0.4) / 100);
      const c = Math.max(0, 1 + ((effectiveAdj.contrast || 0) + (effectiveAdj.clarity || 0) * 0.3) / 100);
      const s = Math.max(0, 1 + (effectiveAdj.saturation || 0) / 100);
      const temp = effectiveAdj.temperature || 0;
      const tint = effectiveAdj.tint || 0;
      const tempFilter = temp !== 0 
        ? (temp > 0 ? `sepia(${temp / 200}) hue-rotate(-${temp * 0.12}deg)` : `hue-rotate(${Math.abs(temp) * 0.15}deg) saturate(${1 + Math.abs(temp) / 300})`)
        : '';
      const tintFilter = tint !== 0 ? `hue-rotate(${tint * 0.2}deg)` : '';
      base += ` brightness(${b.toFixed(2)}) contrast(${c.toFixed(2)}) saturate(${s.toFixed(2)}) ${tempFilter} ${tintFilter}`;
    }

    // Curves influence: Master mid.y alters brightness, Red/Blue mid.y alter tint
    if (curves) {
      const masterMid = curves.master?.[1]?.y ?? 50;
      const redMid = curves.red?.[1]?.y ?? 50;
      const blueMid = curves.blue?.[1]?.y ?? 50;
      if (masterMid !== 50) {
        const factor = 1 + (masterMid - 50) / 100;
        base += ` brightness(${Math.max(0.2, factor).toFixed(2)})`;
      }
      if (redMid !== 50 || blueMid !== 50) {
        const shift = ((redMid - 50) - (blueMid - 50)) * 0.4;
        base += ` hue-rotate(${shift.toFixed(1)}deg)`;
      }
    }

    // HSL adjustments influence
    if (hsl) {
      const entries = Object.values(hsl) as Array<{ hue?: number; saturation?: number; luminance?: number }>;
      if (entries.length > 0) {
        const avgSat = entries.reduce((acc, cur) => acc + (cur.saturation || 0), 0) / entries.length;
        const avgLum = entries.reduce((acc, cur) => acc + (cur.luminance || 0), 0) / entries.length;
        if (avgSat !== 0) {
          base += ` saturate(${(1 + avgSat / 100).toFixed(2)})`;
        }
        if (avgLum !== 0) {
          base += ` brightness(${(1 + avgLum / 100).toFixed(2)})`;
        }
      }
    }

    // Video Effects
    if (videoEffect && videoEffect !== 'none') {
      if (videoEffect === 'blur') base += ' blur(3px)';
      if (videoEffect === 'flash') base += ' brightness(1.7) contrast(1.3)';
      if (videoEffect === 'glitch') base += ' contrast(1.6) hue-rotate(90deg)';
    }

    // Chroma key color simulation
    if (chromaKey && chromaKey.enabled) {
      base += ' drop-shadow(0 0 10px rgba(0,0,0,0.5))';
    }

    return base.trim() || 'none';
  };

  const hexToRgba = (hex: string, alpha: number) => {
    if (!hex) return 'transparent';
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16) || 0;
      const g = parseInt(cleanHex[1] + cleanHex[1], 16) || 0;
      const b = parseInt(cleanHex[2] + cleanHex[2], 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

  // Aspect ratio geometries
  const aspectConfig: Record<AspectRatio, { ratio: string; w: number; h: number }> = {
    '16:9': { ratio: '16/9', w: 16, h: 9 },
    '9:16': { ratio: '9/16', w: 9, h: 16 },
    '1:1': { ratio: '1/1', w: 1, h: 1 },
    '4:5': { ratio: '4/5', w: 4, h: 5 }
  };
  const activeAspect = aspectConfig[aspectRatio] || aspectConfig['16:9'];

  const canvasDimensions = useMemo(() => {
    const targetRatio = activeAspect.w / activeAspect.h;
    const stageRatio = stageDimensions.width / stageDimensions.height;
    if (stageRatio > targetRatio) {
      const height = stageDimensions.height;
      const width = height * targetRatio;
      return { width: Math.round(width), height: Math.round(height) };
    } else {
      const width = stageDimensions.width;
      const height = width / targetRatio;
      return { width: Math.round(width), height: Math.round(height) };
    }
  }, [stageDimensions, activeAspect]);

  const videoProps = activeVideoClip?.properties;

  // Transition computation for active video clip
  let transitionOpacity = 1;
  let transitionTransform = '';
  let transitionClipPath: string | undefined = undefined;

  if (activeVideoClip && videoProps?.transition && videoProps.transition.type !== 'none') {
    const elapsed = currentTime - activeVideoClip.start;
    const dur = videoProps.transition.duration || 0.5;
    if (elapsed >= 0 && elapsed < dur) {
      const progress = Math.min(1, Math.max(0, elapsed / dur));
      if (videoProps.transition.type === 'fade' || videoProps.transition.type === 'dissolve') {
        transitionOpacity = progress;
      } else if (videoProps.transition.type === 'zoom-in') {
        transitionTransform = `scale(${1 + (1 - progress) * 0.3})`;
      } else if (videoProps.transition.type === 'wipe-left') {
        transitionClipPath = `inset(0 0 0 ${(1 - progress) * 100}%)`;
      } else if (videoProps.transition.type === 'wipe-right') {
        transitionClipPath = `inset(0 ${(1 - progress) * 100}% 0 0)`;
      }
    }
  }

  // Keyframe interpolation computation for active video clip
  let kfScale = videoProps?.scale ?? 1.0;
  let kfPosX = videoProps?.posX ?? 0;
  let kfPosY = videoProps?.posY ?? 0;
  let kfOpacity = videoProps?.opacity ?? 1.0;
  let kfRotation = videoProps?.rotation ?? 0;

  if (activeVideoClip && videoProps?.keyframes && videoProps.keyframes.length > 0) {
    const timeOffset = currentTime - activeVideoClip.start;
    const kfs = videoProps.keyframes;
    if (timeOffset <= kfs[0].timeOffset) {
      const first = kfs[0];
      if (first.scale !== undefined) kfScale = first.scale;
      if (first.posX !== undefined) kfPosX = first.posX;
      if (first.posY !== undefined) kfPosY = first.posY;
      if (first.opacity !== undefined) kfOpacity = first.opacity;
      if (first.rotation !== undefined) kfRotation = first.rotation;
    } else if (timeOffset >= kfs[kfs.length - 1].timeOffset) {
      const last = kfs[kfs.length - 1];
      if (last.scale !== undefined) kfScale = last.scale;
      if (last.posX !== undefined) kfPosX = last.posX;
      if (last.posY !== undefined) kfPosY = last.posY;
      if (last.opacity !== undefined) kfOpacity = last.opacity;
      if (last.rotation !== undefined) kfRotation = last.rotation;
    } else {
      for (let i = 0; i < kfs.length - 1; i++) {
        if (timeOffset >= kfs[i].timeOffset && timeOffset <= kfs[i + 1].timeOffset) {
          const kfA = kfs[i];
          const kfB = kfs[i + 1];
          const span = kfB.timeOffset - kfA.timeOffset;
          const factor = span > 0 ? (timeOffset - kfA.timeOffset) / span : 0;
          const lerp = (a: number, b: number) => a + (b - a) * factor;

          kfScale = lerp(kfA.scale ?? videoProps.scale ?? 1.0, kfB.scale ?? videoProps.scale ?? 1.0);
          kfPosX = lerp(kfA.posX ?? videoProps.posX ?? 0, kfB.posX ?? videoProps.posX ?? 0);
          kfPosY = lerp(kfA.posY ?? videoProps.posY ?? 0, kfB.posY ?? videoProps.posY ?? 0);
          kfOpacity = lerp(kfA.opacity ?? videoProps.opacity ?? 1.0, kfB.opacity ?? videoProps.opacity ?? 1.0);
          kfRotation = lerp(kfA.rotation ?? videoProps.rotation ?? 0, kfB.rotation ?? videoProps.rotation ?? 0);
          break;
        }
      }
    }
  }

  // Animation preset effects
  let animOpacityMultiplier = 1.0;
  let animScaleMultiplier = 1.0;
  if (activeVideoClip && videoProps) {
    const elapsed = currentTime - activeVideoClip.start;

    // In Animation
    if (videoProps.inAnimation && elapsed >= 0 && elapsed < 0.6) {
      const progress = elapsed / 0.6;
      if (videoProps.inAnimation === 'Fade In') {
        animOpacityMultiplier *= progress;
      } else if (videoProps.inAnimation === 'Zoom In') {
        animScaleMultiplier *= (0.7 + 0.3 * progress);
      }
    }

    // Out Animation
    const rem = (activeVideoClip.start + activeVideoClip.duration) - currentTime;
    if (videoProps.outAnimation && rem >= 0 && rem < 0.6) {
      const progress = rem / 0.6;
      if (videoProps.outAnimation === 'Fade Out') {
        animOpacityMultiplier *= progress;
      } else if (videoProps.outAnimation === 'Zoom Out') {
        animScaleMultiplier *= (0.7 + 0.3 * progress);
      }
    }

    // Combo Animation
    if (videoProps.comboAnimation === 'Pulse') {
      animScaleMultiplier *= (1 + 0.05 * Math.sin(currentTime * 4));
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none relative bg-[#121215]">
      {/* 1. Main Viewport Stage */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-[#0D0D10]"
      >
        {/* Exact Aspect Ratio Canvas Container (Contain Fit) */}
        <div 
          className="relative flex items-center justify-center bg-black overflow-hidden shadow-2xl border border-[#26262B] transition-all"
          style={{
            width: `${canvasDimensions.width}px`,
            height: `${canvasDimensions.height}px`,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {/* Pure Black Background Frame (Always present if gap or beyond clips) */}
          <div className="absolute inset-0 bg-black pointer-events-none z-0" />

          {/* Real HTML5 Video Player: stable DOM element, never remounts during playback */}
          <video
            ref={videoRef}
            playsInline
            onTimeUpdate={() => {
              if (showDebugOverlay && videoRef.current) {
                setLiveVideoTime(Number(videoRef.current.currentTime.toFixed(2)));
              }
            }}
            muted={activeVideoTrack?.isMuted || false}
            className={`w-full h-full pointer-events-none relative z-10 transition-opacity duration-75 ${
              fitMode === 'contain' ? 'object-contain' : 'object-cover'
            } ${activeVideoClip && activeVideoState.active ? 'opacity-100' : 'opacity-0'}`}
            style={{
              transform: `${videoProps 
                ? `translate(${kfPosX}px, ${kfPosY}px) rotate(${kfRotation}deg) scale(${kfScale * animScaleMultiplier}) scaleX(${videoProps.flipH ? -1 : 1}) scaleY(${videoProps.flipV ? -1 : 1})`
                : 'none'} ${transitionTransform}`.trim(),
              filter: videoProps ? getFilterStyle(videoProps.filter, videoProps.adjust, videoProps.hsl, videoProps.curves, videoProps.videoEffect, videoProps.chromaKey) : 'none',
              opacity: kfOpacity * animOpacityMultiplier * transitionOpacity,
              mixBlendMode: videoProps?.blendMode || 'normal',
              clipPath: transitionClipPath || getMaskClipPath(videoProps?.mask),
            }}
          />

          {/* Real Audio Player */}
          <audio ref={audioRef} preload="auto" />

          {/* Active Color Compare Badge (When Before/After is held) */}
          {isComparingFilter && (
            <div 
              data-testid="compare-badge"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#4f8cff] text-[#121214] font-mono text-[10.5px] font-extrabold px-3 py-1 rounded shadow-2xl uppercase tracking-wider flex items-center gap-1.5 pointer-events-none"
            >
              <span>● COMPARE (BEFORE / RAW)</span>
            </div>
          )}

          {/* On-Screen Debug Overlay (Temporary, toggle with Ctrl+D) */}
          {showDebugOverlay && (
            <div 
              data-testid="debug-overlay"
              className="absolute top-3 right-3 z-50 bg-black/90 backdrop-blur-md border border-[#3C3C48] rounded-md p-2.5 text-[10px] font-mono shadow-2xl text-zinc-300 max-w-[240px] pointer-events-none select-none"
            >
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-zinc-800 font-semibold text-[#4f8cff]">
                <span>DEBUG OVERLAY (Ctrl+D)</span>
                <span className={activeVideoState.active ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                  {activeVideoState.active ? "● ACTIVE" : "○ INACTIVE"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Timeline t:</span>
                  <span className="text-white font-bold">{currentTime.toFixed(2)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Clip ID:</span>
                  <span className="text-zinc-200 truncate max-w-[130px]">{activeVideoClip?.id || 'none'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">clip.start:</span>
                  <span>{activeVideoClip ? `${activeVideoClip.start.toFixed(2)}s` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">clip.offset:</span>
                  <span className="text-[#4f8cff] font-semibold">{activeVideoClip ? `${(activeVideoClip.offset ?? 0).toFixed(2)}s` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">clip.duration:</span>
                  <span>{activeVideoClip ? `${activeVideoClip.duration.toFixed(2)}s` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">expected sourceTime:</span>
                  <span className="text-emerald-400 font-bold">{activeVideoState.active ? `${activeVideoState.sourceTime.toFixed(2)}s` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">video.currentTime:</span>
                  <span className="text-white font-bold">{liveVideoTime.toFixed(2)}s</span>
                </div>
                {activeVideoState.active && Math.abs(liveVideoTime - activeVideoState.sourceTime) > 0.3 && (
                  <div className="mt-1 pt-1 border-t border-red-900/60 bg-red-950/80 text-red-400 font-bold px-1.5 py-0.5 rounded text-center animate-pulse">
                    ⚠️ DRIFT &gt; 0.3s (diff: {Math.abs(liveVideoTime - activeVideoState.sourceTime).toFixed(2)}s)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Snapping Center Guides */}
          {snapGuideX && (
            <div className="absolute inset-y-0 left-1/2 w-px border-l border-dashed border-[#22D3EE] pointer-events-none z-50 shadow-[0_0_8px_#22D3EE]" />
          )}
          {snapGuideY && (
            <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-[#22D3EE] pointer-events-none z-50 shadow-[0_0_8px_#22D3EE]" />
          )}

          {/* Active Text & Overlay (Sticker) Elements with Bounding Box & Canvas Inline Editing */}
          {activeOverlays.map(({ clip, track }) => {
            const isSelected = selectedClipId === clip.id;
            const isEditing = editingClipId === clip.id;
            const textContent = clip.properties.text ?? clip.title ?? '';
            const scale = clip.properties.scale || 1;
            const posX = clip.properties.posX || 0;
            const posY = clip.properties.posY || 0;
            const rotation = clip.properties.rotation || 0;
            const opacity = clip.properties.opacity ?? 1;

            const handlePointerDownMove = (e: React.PointerEvent) => {
              if (isEditing) return;
              if ((e.target as HTMLElement).dataset.handle) return;
              e.stopPropagation();
              selectClip(clip.id, track.id);
              setActiveInspectorTab('text');

              beginTransaction();
              const startClientX = e.clientX;
              const startClientY = e.clientY;
              const initialPosX = posX;
              const initialPosY = posY;

              const onPointerMove = (moveEvt: PointerEvent) => {
                const deltaX = moveEvt.clientX - startClientX;
                const deltaY = moveEvt.clientY - startClientY;
                let nextX = Math.round(initialPosX + deltaX);
                let nextY = Math.round(initialPosY + deltaY);

                // Snapping to Center (tolerance: 6px)
                if (Math.abs(nextX) < 6) {
                  nextX = 0;
                  setSnapGuideX(true);
                } else {
                  setSnapGuideX(false);
                }

                if (Math.abs(nextY) < 6) {
                  nextY = 0;
                  setSnapGuideY(true);
                } else {
                  setSnapGuideY(false);
                }

                updateClipProperties(clip.id, { posX: nextX, posY: nextY });
              };

              const onPointerUp = () => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                setSnapGuideX(false);
                setSnapGuideY(false);
                commitTransaction();
              };

              window.addEventListener('pointermove', onPointerMove);
              window.addEventListener('pointerup', onPointerUp);
            };

            const handlePointerDownScale = (e: React.PointerEvent) => {
              e.stopPropagation();
              beginTransaction();
              const startClientX = e.clientX;
              const initialScale = scale;

              const onPointerMove = (moveEvt: PointerEvent) => {
                const deltaX = moveEvt.clientX - startClientX;
                const newScale = Number(Math.max(0.2, Math.min(3.0, initialScale + (deltaX / 100))).toFixed(2));
                updateClipProperties(clip.id, { scale: newScale });
              };

              const onPointerUp = () => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                commitTransaction();
              };

              window.addEventListener('pointermove', onPointerMove);
              window.addEventListener('pointerup', onPointerUp);
            };

            const handlePointerDownRotate = (e: React.PointerEvent) => {
              e.stopPropagation();
              beginTransaction();
              const targetEl = (e.currentTarget.parentElement) as HTMLElement;
              const rect = targetEl.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;

              const onPointerMove = (moveEvt: PointerEvent) => {
                const rad = Math.atan2(moveEvt.clientY - centerY, moveEvt.clientX - centerX);
                let deg = Math.round((rad * 180) / Math.PI) + 90;
                if (deg < 0) deg += 360;
                updateClipProperties(clip.id, { rotation: deg % 360 });
              };

              const onPointerUp = () => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                commitTransaction();
              };

              window.addEventListener('pointermove', onPointerMove);
              window.addEventListener('pointerup', onPointerUp);
            };

            const computedTextStyle: React.CSSProperties = {
              fontFamily: clip.properties.fontFamily || 'Inter',
              fontSize: `${clip.properties.fontSize || 28}px`,
              fontWeight: clip.properties.fontWeight || '700',
              fontStyle: clip.properties.isItalic ? 'italic' : 'normal',
              letterSpacing: `${clip.properties.letterSpacing || 0}px`,
              lineHeight: clip.properties.lineHeight || 1.2,
              textAlign: clip.properties.textAlign || 'center',
              color: clip.properties.fontColor || '#E8E6E1',
              backgroundColor: clip.properties.fontBg 
                ? hexToRgba(clip.properties.fontBg, clip.properties.bgOpacity ?? 0.5) 
                : 'transparent',
              padding: `${clip.properties.bgPadding ?? 8}px`,
              borderRadius: `${clip.properties.bgRadius ?? 4}px`,
              WebkitTextStroke: clip.properties.outlineWidth 
                ? `${clip.properties.outlineWidth}px ${clip.properties.outlineColor || '#000000'}` 
                : undefined,
              textShadow: clip.properties.shadowBlur 
                ? `0 2px ${clip.properties.shadowBlur}px ${clip.properties.shadowColor || 'rgba(0,0,0,0.7)'}` 
                : undefined,
              opacity: opacity,
            };

            return (
              <div
                key={clip.id}
                onPointerDown={handlePointerDownMove}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  selectClip(clip.id, track.id);
                  setActiveInspectorTab('text');
                  setEditingClipId(clip.id);
                }}
                className={`absolute z-30 flex items-center justify-center transition-[box-shadow] select-none ${
                  isSelected ? 'cursor-move ring-1 ring-[#4f8cff] ring-offset-2 ring-offset-black/40' : 'cursor-pointer hover:ring-1 hover:ring-white/30'
                }`}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Inline Canvas Textarea, Styled Text, or Image/PiP Overlay */}
                {isEditing ? (
                  <textarea
                    autoFocus
                    rows={Math.max(1, (textContent.match(/\n/g) || []).length + 1)}
                    value={textContent}
                    onChange={(e) => updateClipProperties(clip.id, { text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        setEditingClipId(null);
                        commitTransaction();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingClipId(null);
                      }
                    }}
                    onBlur={() => {
                      setEditingClipId(null);
                      commitTransaction();
                    }}
                    className="outline-none bg-transparent resize-none overflow-hidden text-center p-0 m-0 border-b-2 border-[#4f8cff] drop-shadow-xl"
                    style={computedTextStyle}
                  />
                ) : clip.type === 'text' ? (
                  <div style={computedTextStyle} className="whitespace-pre-wrap select-none">
                    {textContent}
                  </div>
                ) : clip.type === 'sticker' ? (
                  (clip.src || clip.thumbnail) ? (
                    <img
                      src={clip.src || clip.thumbnail}
                      alt={clip.title}
                      className="max-w-[260px] max-h-[260px] object-contain pointer-events-none select-none rounded-[2px]"
                      style={{
                        opacity: opacity,
                        mixBlendMode: clip.properties.blendMode || 'normal',
                        transform: `scaleX(${clip.properties.flipH ? -1 : 1}) scaleY(${clip.properties.flipV ? -1 : 1})`
                      }}
                    />
                  ) : clip.properties?.text ? (
                    <div style={computedTextStyle} className="whitespace-pre-wrap select-none">
                      {clip.properties.text}
                    </div>
                  ) : null
                ) : (
                  <video
                    src={clip.src || videoSrc}
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="w-[260px] h-[150px] object-cover pointer-events-none select-none rounded-[3px] shadow-2xl border border-white/20"
                    style={{
                      opacity: opacity,
                      mixBlendMode: clip.properties.blendMode || 'normal',
                      transform: `scaleX(${clip.properties.flipH ? -1 : 1}) scaleY(${clip.properties.flipV ? -1 : 1})`,
                      filter: getFilterStyle(clip.properties.filter, clip.properties.adjust, clip.properties.hsl, clip.properties.curves, clip.properties.videoEffect, clip.properties.chromaKey),
                      clipPath: getMaskClipPath(clip.properties.mask),
                    }}
                  />
                )}

                {/* Bounding Box: Corner Resize Handles & Rotate Pin (when selected) */}
                {isSelected && !isEditing && (
                  <>
                    {/* Top Rotate Handle */}
                    <div 
                      data-handle="rotate"
                      onPointerDown={handlePointerDownRotate}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing group/rot"
                      title="Rotate Handle"
                    >
                      <div className="w-3 h-3 rounded-full bg-[#4f8cff] border border-black shadow flex items-center justify-center group-hover/rot:scale-125 transition-transform" />
                      <div className="w-px h-3.5 bg-[#4f8cff]" />
                    </div>

                    {/* Corner Scale Handles */}
                    <div
                      data-handle="tl"
                      onPointerDown={handlePointerDownScale}
                      className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#4f8cff] border border-black rounded-sm cursor-nwse-resize shadow"
                      title="Resize Scale"
                    />
                    <div
                      data-handle="tr"
                      onPointerDown={handlePointerDownScale}
                      className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#4f8cff] border border-black rounded-sm cursor-nesw-resize shadow"
                      title="Resize Scale"
                    />
                    <div
                      data-handle="bl"
                      onPointerDown={handlePointerDownScale}
                      className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#4f8cff] border border-black rounded-sm cursor-nesw-resize shadow"
                      title="Resize Scale"
                    />
                    <div
                      data-handle="br"
                      onPointerDown={handlePointerDownScale}
                      className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#4f8cff] border border-black rounded-sm cursor-nwse-resize shadow"
                      title="Resize Scale"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Safe-Area Aspect Watermark */}
          <div className="absolute top-2 left-2 text-[10px] font-mono text-[#8A8A92] bg-black/70 px-1.5 py-0.5 rounded border border-white/10 pointer-events-none z-30">
            {aspectRatio}
          </div>
        </div>
      </div>

      {/* 2. Sleek Player Transport Control Bar */}
      <div className="h-11 border-t px-4 flex items-center justify-between shrink-0 select-none z-20 bg-[#16161A] border-[#26262D]">
        {/* Left: Aspect Ratio & Fit Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md p-0.5 text-xs bg-[#1F1F24] border-[#2C2C33]">
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`px-2 py-0.5 rounded font-mono text-[11px] font-medium flex items-center gap-1 ${
                aspectRatio === '16:9' ? 'bg-[#4f8cff] text-[#121214] font-semibold' : 'text-[#8A8A92] hover:text-[#E8E6E1]'
              }`}
              title="16:9 Landscape"
            >
              <Monitor className="w-3 h-3 stroke-[1.5]" />
              <span>16:9</span>
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`px-2 py-0.5 rounded font-mono text-[11px] font-medium flex items-center gap-1 ${
                aspectRatio === '9:16' ? 'bg-[#4f8cff] text-[#121214] font-semibold' : 'text-[#8A8A92] hover:text-[#E8E6E1]'
              }`}
              title="9:16 Portrait"
            >
              <Smartphone className="w-3 h-3 stroke-[1.5]" />
              <span>9:16</span>
            </button>
            <button
              onClick={() => setAspectRatio('1:1')}
              className={`px-2 py-0.5 rounded font-mono text-[11px] font-medium flex items-center gap-1 ${
                aspectRatio === '1:1' ? 'bg-[#4f8cff] text-[#121214] font-semibold' : 'text-[#8A8A92] hover:text-[#E8E6E1]'
              }`}
              title="1:1 Square"
            >
              <Square className="w-3 h-3 stroke-[1.5]" />
              <span>1:1</span>
            </button>
            <button
              onClick={() => setAspectRatio('4:5')}
              className={`px-2 py-0.5 rounded font-mono text-[11px] font-medium flex items-center gap-1 ${
                aspectRatio === '4:5' ? 'bg-[#4f8cff] text-[#121214] font-semibold' : 'text-[#8A8A92] hover:text-[#E8E6E1]'
              }`}
              title="4:5 Social"
            >
              <RectangleVertical className="w-3 h-3 stroke-[1.5]" />
              <span>4:5</span>
            </button>
          </div>

          {/* Fit vs Fill Mode Toggle */}
          <button
            onClick={() => setFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
            className={`flex items-center gap-1 border rounded-md px-2 py-0.5 text-xs font-mono transition-colors ${
              fitMode === 'cover' 
                ? 'bg-[#2A251D] border-[#4f8cff] text-[#4f8cff]' 
                : 'bg-[#1F1F24] border-[#2C2C33] text-[#8A8A92] hover:text-[#E8E6E1]'
            }`}
            title="Toggle between Contain (Fit full frame) and Cover (Fill entire screen)"
          >
            <Scaling className="w-3 h-3 stroke-[1.5]" />
            <span>{fitMode === 'contain' ? 'Fit' : 'Fill'}</span>
          </button>
        </div>

        {/* Center: Transport Playhead Controls */}
        <div className="flex items-center gap-2.5">
          <button
            data-testid="jump-to-start-btn"
            onClick={() => seek(0)}
            className="p-1.5 text-[#8A8A92] hover:text-[#E8E6E1] rounded hover:bg-[#222228] transition-colors"
            title="Jump to Start (0:00)"
          >
            <SkipBack className="w-3.5 h-3.5 stroke-[2] fill-current" />
          </button>

          <button
            onClick={() => stepFrame(-1)}
            className="p-1.5 text-[#8A8A92] hover:text-[#E8E6E1] rounded hover:bg-[#222228] transition-colors"
            title="Step Back 1s (Left Arrow)"
          >
            <SkipBack className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>

          <button
            data-testid="play-pause-btn"
            onClick={togglePlay}
            className="w-7 h-7 rounded-md bg-[#4f8cff] hover:bg-[#D9B77C] text-[#121214] flex items-center justify-center transition-colors cursor-pointer"
            title="Play / Pause (Spacebar)"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => stepFrame(1)}
            className="p-1.5 text-[#8A8A92] hover:text-[#E8E6E1] rounded hover:bg-[#222228] transition-colors"
            title="Step Forward 1s (Right Arrow)"
          >
            <SkipForward className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>

          {/* Time Counter: Current Time / Total Duration */}
          <div className="text-xs font-mono font-medium tracking-tight text-[#D8D6D1] ml-2">
            <span className="text-[#4f8cff]">{formatTime(currentTime)}</span>
            <span className="text-zinc-500 mx-1">/</span>
            <span className="text-zinc-400">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Right: Loop & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded transition-colors ${
              isLooping ? 'text-[#4f8cff] bg-[#2A251D]' : 'text-[#8A8A92] hover:text-[#E8E6E1]'
            }`}
            title={isLooping ? 'Loop Playback Active' : 'Loop Playback Off'}
          >
            <Repeat className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>

          <button
            onClick={handleFullscreen}
            className="p-1.5 text-[#8A8A92] hover:text-[#E8E6E1] rounded hover:bg-[#222228] transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};

