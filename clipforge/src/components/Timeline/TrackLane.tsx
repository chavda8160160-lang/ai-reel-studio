import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Video, 
  Music, 
  Type, 
  Smile, 
  Sparkles 
} from 'lucide-react';
import type { TrackItem } from '../../types/editor';
import { useEditorStore } from '../../store/useEditorStore';
import { TimelineClip } from './TimelineClip';

interface TrackLaneProps {
  track: TrackItem;
  zoom: number;
}

export const TrackLane: React.FC<TrackLaneProps> = ({ track, zoom }) => {
  const { 
    toggleTrackLock, 
    toggleTrackHide, 
    toggleTrackMute, 
    addClipToTrack,
    seek 
  } = useEditorStore();

  const [isDragOver, setIsDragOver] = useState(false);

  const getTrackIcon = () => {
    switch (track.type) {
      case 'video':
        return <Video className="w-3.5 h-3.5 text-blue-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-emerald-400" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-amber-400" />;
      case 'sticker':
        return <Smile className="w-3.5 h-3.5 text-purple-400" />;
      case 'effect':
      default:
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  // Drag over & Drop from Media Panel onto Track
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    try {
      const asset = JSON.parse(dataStr);
      const laneRect = e.currentTarget.getBoundingClientRect();
      const dropOffsetX = e.clientX - laneRect.left;
      const dropStartTime = Math.max(0, dropOffsetX / zoom);

      addClipToTrack(track.id, {
        title: asset.name,
        type: track.type,
        start: Number(dropStartTime.toFixed(1)),
        duration: asset.duration || 6,
        thumbnail: asset.thumbnailUrl,
      });
    } catch (err) {
      console.warn('Could not parse dropped asset data:', err);
    }
  };

  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If clicked empty space, seek to that time
    if (e.target === e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickTime = Math.max(0, (e.clientX - rect.left) / zoom);
      seek(clickTime);
    }
  };

  return (
    <div className="flex h-10 border-b border-[#202026] select-none group">
      {/* 1. Track Left Header (130px fixed) */}
      <div className="w-[130px] shrink-0 bg-[#141418] border-r border-[#24242C] px-2 flex items-center justify-between z-30">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {getTrackIcon()}
          <span className="text-[11px] font-semibold text-zinc-300 truncate" title={track.name}>
            {track.name}
          </span>
        </div>

        {/* Track Controls: Lock, Hide, Mute */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => toggleTrackLock(track.id)}
            className={`p-1 rounded hover:bg-[#202026] transition-colors ${
              track.isLocked ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={track.isLocked ? 'Unlock Track' : 'Lock Track'}
          >
            {track.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>

          <button
            onClick={() => toggleTrackHide(track.id)}
            className={`p-1 rounded hover:bg-[#202026] transition-colors ${
              track.isHidden ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={track.isHidden ? 'Unhide Track' : 'Hide Track'}
          >
            {track.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>

          {track.type === 'audio' && (
            <button
              onClick={() => toggleTrackMute(track.id)}
              className={`p-1 rounded hover:bg-[#202026] transition-colors ${
                track.isMuted ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
            >
              {track.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Track Content Lane */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleLaneClick}
        className={`flex-1 relative cursor-pointer transition-colors ${
          isDragOver ? 'bg-cyan-950/30 ring-1 ring-inset ring-cyan-400' : 'bg-[#0E0E12] hover:bg-[#111116]'
        }`}
      >
        {track.clips.map((clip) => (
          <TimelineClip key={clip.id} clip={clip} zoom={zoom} />
        ))}
      </div>
    </div>
  );
};
