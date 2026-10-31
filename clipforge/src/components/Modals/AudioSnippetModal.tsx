import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Scissors, Sparkles, Check, Music2 } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export interface AudioSnippetTarget {
  id: string;
  name: string;
  artist: string;
  duration: number;
  thumbnailUrl?: string;
  previewUrl: string;
  category?: string;
  waveform?: number[];
}

interface AudioSnippetModalProps {
  song: AudioSnippetTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (offset: number, duration: number) => void;
}

export const AudioSnippetModal: React.FC<AudioSnippetModalProps> = ({
  song,
  isOpen,
  onClose,
  onApply,
}) => {
  const { tracks } = useEditorStore();
  
  // Calculate total video length from video track
  const videoTrack = tracks.find(t => t.type === 'video');
  const videoDuration = Math.max(1, videoTrack?.clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0) || 15);

  const songDuration = song ? Math.max(1, song.duration) : 30;

  // Initial duration matches video duration, bounded by song duration
  const [selectedDuration, setSelectedDuration] = useState<number>(15);
  const [offset, setOffset] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [previewTime, setPreviewTime] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize or reset when song opens
  useEffect(() => {
    if (isOpen && song) {
      // Default to matching video duration if it fits, or 30s
      const initialDur = Math.min(song.duration, Number(videoDuration.toFixed(1)));
      setSelectedDuration(initialDur > 0 ? initialDur : Math.min(30, song.duration));
      setOffset(0);
      setIsPlaying(false);
      setPreviewTime(0);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  }, [isOpen, song, videoDuration]);

  // Keep offset within valid boundary if duration changes
  useEffect(() => {
    const maxOffset = Math.max(0, songDuration - selectedDuration);
    if (offset > maxOffset) {
      setOffset(Number(maxOffset.toFixed(1)));
    }
  }, [selectedDuration, songDuration, offset]);

  // Handle Audio Playback of the selected snippet slice
  useEffect(() => {
    if (!song || !isOpen) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.src = song.previewUrl;

    const updatePreviewLoop = () => {
      if (audio && !audio.paused) {
        setPreviewTime(audio.currentTime);
        // Loop when reaching the end of the selected slice
        if (audio.currentTime >= offset + selectedDuration || audio.currentTime >= songDuration) {
          audio.currentTime = offset;
        }
        animFrameRef.current = requestAnimationFrame(updatePreviewLoop);
      }
    };

    if (isPlaying) {
      audio.currentTime = Math.max(offset, Math.min(audio.currentTime, offset + selectedDuration));
      audio.play().then(() => {
        animFrameRef.current = requestAnimationFrame(updatePreviewLoop);
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
  }, [isPlaying, offset, selectedDuration, song, isOpen, songDuration]);

  // Cleanup on unmount or close
  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    onClose();
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (audioRef.current.currentTime < offset || audioRef.current.currentTime >= offset + selectedDuration) {
        audioRef.current.currentTime = offset;
      }
      setIsPlaying(true);
    }
  };

  const handleApply = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    onApply(offset, selectedDuration);
  };

  if (!isOpen || !song) return null;

  const maxOffset = Math.max(0, songDuration - selectedDuration);
  const endPoint = Math.min(songDuration, offset + selectedDuration);

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = (s % 60).toFixed(1);
    return `${mins < 10 ? '0' : ''}${mins}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
  };

  // Mock waveform if not provided
  const waveform = song.waveform || [35, 55, 75, 90, 60, 85, 95, 70, 80, 65, 85, 90, 100, 75, 60, 80, 95, 70, 50, 40];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-xl bg-[#18181b] border border-[#2e2e33] rounded-xl shadow-2xl overflow-hidden flex flex-col text-[#e4e4e7] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-sm">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                <span>Audio Snippet & Cut</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#4f8cff]/15 text-[#4f8cff] border border-[#4f8cff]/20">
                  Instagram Reel Style
                </span>
              </h3>
              <p className="text-[11px] text-[#8a8a93]">Select exact chorus, hook & duration to fit your video</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-[#8a8a93] hover:text-white hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Song Info Bar */}
        <div className="px-5 py-3 bg-[#1e1e24] border-b border-[#2a2a30] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {song.thumbnailUrl ? (
              <img
                src={song.thumbnailUrl}
                alt={song.name}
                className="w-11 h-11 rounded-md object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-md bg-[#2a2a32] flex items-center justify-center text-[#8a8a93] shrink-0">
                <Music2 className="w-5 h-5 text-[#4f8cff]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{song.name}</p>
              <p className="text-[11px] text-[#a1a1aa] truncate">{song.artist}</p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#71717a] font-mono">
                <span>Full: {formatSec(songDuration)}</span>
                {song.category && (
                  <>
                    <span>•</span>
                    <span className="text-[#38bdf8]">{song.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTogglePlay}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              isPlaying
                ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                : 'bg-[#4f8cff] text-white hover:bg-[#3b72db]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause Slice' : 'Preview Slice'}</span>
          </button>
        </div>

        {/* Duration Selection Presets */}
        <div className="p-5 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                1. Choose Duration (કટ કરેલો સમય)
              </label>
              <span className="text-[11px] font-mono text-[#4f8cff] font-bold">
                {selectedDuration.toFixed(1)}s Selected
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {/* Match Video Preset (Highlight) */}
              <button
                type="button"
                onClick={() => setSelectedDuration(Math.min(songDuration, Number(videoDuration.toFixed(1))))}
                className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                  Math.abs(selectedDuration - videoDuration) < 0.2
                    ? 'bg-gradient-to-r from-[#4f8cff]/20 to-[#38bdf8]/20 border-[#4f8cff] text-white shadow-sm ring-1 ring-[#4f8cff]/50'
                    : 'bg-[#222227] hover:bg-[#2a2a30] border-[#33333a] text-[#d4d4d8]'
                }`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <Sparkles className="w-3 h-3 text-[#38bdf8]" />
                  <span>Match Video</span>
                </div>
                <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                  {videoDuration.toFixed(1)}s
                </span>
              </button>

              {/* 15s Preset */}
              <button
                type="button"
                onClick={() => setSelectedDuration(Math.min(songDuration, 15))}
                className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                  selectedDuration === 15 && Math.abs(selectedDuration - videoDuration) >= 0.2
                    ? 'bg-[#4f8cff]/20 border-[#4f8cff] text-white'
                    : 'bg-[#222227] hover:bg-[#2a2a30] border-[#33333a] text-[#d4d4d8]'
                }`}
              >
                <span className="font-semibold text-[11px]">⚡ 15s</span>
                <span className="text-[9.5px] text-[#8a8a93]">Story/Reel</span>
              </button>

              {/* 30s Preset */}
              <button
                type="button"
                onClick={() => setSelectedDuration(Math.min(songDuration, 30))}
                className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                  selectedDuration === 30 && Math.abs(selectedDuration - videoDuration) >= 0.2
                    ? 'bg-[#4f8cff]/20 border-[#4f8cff] text-white'
                    : 'bg-[#222227] hover:bg-[#2a2a30] border-[#33333a] text-[#d4d4d8]'
                }`}
              >
                <span className="font-semibold text-[11px]">🔥 30s</span>
                <span className="text-[9.5px] text-[#8a8a93]">Shorts</span>
              </button>

              {/* 60s Preset */}
              <button
                type="button"
                onClick={() => setSelectedDuration(Math.min(songDuration, 60))}
                className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                  selectedDuration === 60 && Math.abs(selectedDuration - videoDuration) >= 0.2
                    ? 'bg-[#4f8cff]/20 border-[#4f8cff] text-white'
                    : 'bg-[#222227] hover:bg-[#2a2a30] border-[#33333a] text-[#d4d4d8]'
                }`}
              >
                <span className="font-semibold text-[11px]">⏱️ 60s</span>
                <span className="text-[9.5px] text-[#8a8a93]">1 Minute</span>
              </button>

              {/* Full Song */}
              <button
                type="button"
                onClick={() => setSelectedDuration(songDuration)}
                className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                  selectedDuration === songDuration && Math.abs(selectedDuration - videoDuration) >= 0.2
                    ? 'bg-[#4f8cff]/20 border-[#4f8cff] text-white'
                    : 'bg-[#222227] hover:bg-[#2a2a30] border-[#33333a] text-[#d4d4d8]'
                }`}
              >
                <span className="font-semibold text-[11px]">🎵 Full</span>
                <span className="text-[9.5px] text-[#8a8a93] font-mono">{formatSec(songDuration)}</span>
              </button>
            </div>

            {/* Custom Duration Slider */}
            <div className="mt-2.5 flex items-center gap-3">
              <input
                type="range"
                min="3"
                max={songDuration}
                step="0.5"
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#2a2a30] rounded-lg appearance-none cursor-pointer accent-[#4f8cff]"
              />
            </div>
          </div>

          {/* Song Scrubber / Part Selector */}
          <div className="p-3.5 bg-[#141417] border border-[#27272a] rounded-lg space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <label className="font-semibold uppercase tracking-wider text-[#a1a1aa] flex items-center gap-1.5">
                <span>2. Select Song Part (શરૂઆતનો ભાગ - Chorus / Hook)</span>
              </label>
              <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-white bg-[#222228] px-2 py-0.5 rounded border border-[#33333b]">
                <span className="text-[#38bdf8]">{formatSec(offset)}</span>
                <span className="text-[#8a8a93]">→</span>
                <span className="text-[#38bdf8]">{formatSec(endPoint)}</span>
              </div>
            </div>

            {/* Visual Waveform with Slice Window */}
            <div className="relative h-14 bg-[#1e1e24] rounded-md border border-[#2e2e36] flex items-center px-2 overflow-hidden">
              {/* Waveform Bars */}
              <div className="w-full h-full flex items-center justify-between gap-1 opacity-70">
                {waveform.concat(waveform).map((height, idx) => (
                  <div
                    key={idx}
                    className="w-1.5 rounded-full bg-[#52525b] transition-all"
                    style={{ height: `${Math.max(12, height)}%` }}
                  />
                ))}
              </div>

              {/* Highlighted Window for Selected Range */}
              {songDuration > 0 && (
                <div
                  className="absolute top-0 bottom-0 border-y-2 border-x-2 border-[#4f8cff] bg-[#4f8cff]/25 rounded-sm flex items-center justify-between pointer-events-none transition-[left,width] duration-75"
                  style={{
                    left: `${(offset / songDuration) * 100}%`,
                    width: `${Math.min(100 - (offset / songDuration) * 100, (selectedDuration / songDuration) * 100)}%`,
                  }}
                >
                  <div className="w-1 h-full bg-[#4f8cff]" />
                  <div className="text-[9px] font-mono text-white font-bold bg-[#4f8cff] px-1 py-0.5 rounded-xs shadow">
                    {selectedDuration.toFixed(1)}s
                  </div>
                  <div className="w-1 h-full bg-[#4f8cff]" />
                </div>
              )}

              {/* Playhead indicator during preview */}
              {isPlaying && songDuration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-20"
                  style={{ left: `${(previewTime / songDuration) * 100}%` }}
                />
              )}
            </div>

            {/* Scrubber Range Input */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={maxOffset}
                step="0.5"
                value={offset}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setOffset(val);
                  if (audioRef.current) {
                    audioRef.current.currentTime = val;
                  }
                }}
                className="w-full h-2 bg-[#27272f] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
              />
              <div className="flex justify-between text-[10px] text-[#71717a] font-mono">
                <span>Start: 00:00.0</span>
                <span>Drag slider to pick the favorite part / drop</span>
                <span>End: {formatSec(songDuration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#121215] border-t border-[#27272a] flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[#a1a1aa] hover:text-white hover:bg-[#222228] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#4f8cff] to-[#38bdf8] hover:from-[#3b72db] hover:to-[#0284c7] text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#4f8cff]/20 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Add {selectedDuration.toFixed(1)}s Snippet to Video</span>
          </button>
        </div>

      </div>
    </div>
  );
};

