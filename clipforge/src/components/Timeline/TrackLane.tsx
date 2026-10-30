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
import { TRACK_HEADER_WIDTH, type TrackItem } from '../../types/editor';
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
    totalDuration,
    trackHeightMode,
    seek 
  } = useEditorStore();

  const [isDragOver, setIsDragOver] = useState(false);

  const getLaneHeightClass = () => {
    if (trackHeightMode === 'compact') {
      switch (track.type) {
        case 'video': return 'h-[44px]';
        case 'audio': return 'h-[36px]';
        case 'text':
        case 'sticker':
        default: return 'h-[30px]';
      }
    } else {
      switch (track.type) {
        case 'video': return 'h-[64px]';
        case 'audio': return 'h-[50px]';
        case 'text':
        case 'sticker':
        default: return 'h-[42px]';
      }
    }
  };

  const getTrackIcon = () => {
    switch (track.type) {
      case 'video':
        return <Video className="w-3.5 h-3.5 stroke-[1.5] text-[#93C5FD]" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 stroke-[1.5] text-[#86EFAC]" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 stroke-[1.5] text-[#FDE047]" />;
      case 'sticker':
        return <Smile className="w-3.5 h-3.5 stroke-[1.5] text-[#D8B4FE]" />;
      case 'effect':
      default:
        return <Sparkles className="w-3.5 h-3.5 stroke-[1.5] text-[#C9A66B]" />;
    }
  };

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
        duration: asset.type === 'text' ? 3.0 : (asset.duration || 6),
        thumbnail: asset.thumbnailUrl,
        src: asset.previewUrl || '/rendered-reels/reel-demo.mp4',
        color: track.type === 'video' ? '#384357' : (track.type === 'audio' ? '#345242' : (track.type === 'text' ? '#7C5C30' : '#634368')),
        properties: asset.textPayload ? {
          text: asset.textPayload.text,
          fontStyle: asset.textPayload.fontStyle,
          fontColor: asset.textPayload.fontColor || '#E8E6E1',
          fontSize: asset.textPayload.fontSize || 28,
          scale: asset.textPayload.scale || 1.0,
          posY: asset.textPayload.posY || 0
        } : undefined
      });
    } catch (err) {
      console.warn('Could not parse dropped asset data:', err);
    }
  };

  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickTime = Math.max(0, Math.min(totalDuration, (e.clientX - rect.left) / zoom));
      seek(clickTime);
    }
  };

  return (
    <div className={`flex shrink-0 ${getLaneHeightClass()} border-b select-none border-[#202026]`}>
      {/* 1. Track Left Header (TRACK_HEADER_WIDTH px exact match = 120px) */}
      <div 
        className="shrink-0 border-r px-2 flex items-center justify-between z-30 bg-[#141418] border-[#222228]"
        style={{ width: `${TRACK_HEADER_WIDTH}px` }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {getTrackIcon()}
          <span className="text-[11px] font-medium text-[#D8D6D1] truncate" title={track.name}>
            {track.name}
          </span>
        </div>

        {/* Track Controls: Lock, Hide, Mute (14px icons) */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => toggleTrackLock(track.id)}
            className={`p-1 rounded hover:bg-[#202026] transition-colors ${
              track.isLocked ? 'text-[#C9A66B]' : 'text-[#64646E] hover:text-[#A6A6B0]'
            }`}
            title={track.isLocked ? 'Unlock Track' : 'Lock Track'}
          >
            {track.isLocked ? <Lock className="w-3.5 h-3.5 stroke-[1.5]" /> : <Unlock className="w-3.5 h-3.5 stroke-[1.5]" />}
          </button>

          <button
            onClick={() => toggleTrackHide(track.id)}
            className={`p-1 rounded hover:bg-[#202026] transition-colors ${
              track.isHidden ? 'text-[#EF4444]' : 'text-[#64646E] hover:text-[#A6A6B0]'
            }`}
            title={track.isHidden ? 'Unhide Track' : 'Hide Track'}
          >
            {track.isHidden ? <EyeOff className="w-3.5 h-3.5 stroke-[1.5]" /> : <Eye className="w-3.5 h-3.5 stroke-[1.5]" />}
          </button>

          {track.type === 'audio' && (
            <button
              onClick={() => toggleTrackMute(track.id)}
              className={`p-1 rounded hover:bg-[#202026] transition-colors ${
                track.isMuted ? 'text-[#EF4444]' : 'text-[#64646E] hover:text-[#A6A6B0]'
              }`}
              title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
            >
              {track.isMuted ? <VolumeX className="w-3.5 h-3.5 stroke-[1.5]" /> : <Volume2 className="w-3.5 h-3.5 stroke-[1.5]" />}
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
          isDragOver ? 'bg-[#2A251D] ring-1 ring-inset ring-[#C9A66B]' : 'bg-[#0E0E11] hover:bg-[#111115]'
        } ${track.isLocked ? 'pointer-events-none opacity-50' : ''} ${track.isHidden ? 'opacity-30' : ''}`}
      >
        {track.clips.map((clip) => (
          <TimelineClip key={clip.id} clip={clip} zoom={zoom} />
        ))}
      </div>
    </div>
  );
};
