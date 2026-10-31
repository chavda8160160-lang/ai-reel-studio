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
        return <Video className="w-3.5 h-3.5 stroke-[1.5] text-[#8a8a93]" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 stroke-[1.5] text-[#8a8a93]" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 stroke-[1.5] text-[#8a8a93]" />;
      case 'sticker':
        return <Smile className="w-3.5 h-3.5 stroke-[1.5] text-[#8a8a93]" />;
      case 'effect':
      default:
        return <Sparkles className="w-3.5 h-3.5 stroke-[1.5] text-[#8a8a93]" />;
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
        color: track.type === 'video' ? '#3b4a63' : (track.type === 'audio' ? '#3d5a4f' : (track.type === 'text' ? '#5c5246' : '#4d4560')),
        properties: asset.textPayload ? {
          text: asset.textPayload.text,
          fontStyle: asset.textPayload.fontStyle,
          fontColor: asset.textPayload.fontColor || '#d4d4d8',
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
    <div className={`flex shrink-0 ${getLaneHeightClass()} border-b select-none border-[#38383d]`}>
      {/* 1. Track Left Header (TRACK_HEADER_WIDTH px exact match) */}
      <div 
        className="shrink-0 border-r px-1.5 flex items-center justify-between z-30 bg-[#2a2a2e] border-[#38383d] overflow-hidden"
        style={{ width: `${TRACK_HEADER_WIDTH}px` }}
      >
        <div className="flex items-center gap-1 min-w-0 flex-1 mr-1 overflow-hidden">
          {getTrackIcon()}
          <span className="text-[11px] font-medium text-[#d4d4d8] truncate" title={track.name}>
            {track.name}
          </span>
        </div>

        {/* Track Controls: Lock, Hide, Mute (14px icons) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => toggleTrackLock(track.id)}
            className={`p-1 rounded-[3px] hover:bg-[#3a3a40] transition-colors duration-150 cursor-pointer ${
              track.isLocked ? 'text-[#4f8cff]' : 'text-[#8a8a93] hover:text-[#d4d4d8]'
            }`}
            title={track.isLocked ? 'Unlock Track' : 'Lock Track'}
          >
            {track.isLocked ? <Lock className="w-3.5 h-3.5 stroke-[1.5]" /> : <Unlock className="w-3.5 h-3.5 stroke-[1.5]" />}
          </button>

          <button
            onClick={() => toggleTrackHide(track.id)}
            className={`p-1 rounded-[3px] hover:bg-[#3a3a40] transition-colors duration-150 cursor-pointer ${
              track.isHidden ? 'text-[#4f8cff]' : 'text-[#8a8a93] hover:text-[#d4d4d8]'
            }`}
            title={track.isHidden ? 'Unhide Track' : 'Hide Track'}
          >
            {track.isHidden ? <EyeOff className="w-3.5 h-3.5 stroke-[1.5]" /> : <Eye className="w-3.5 h-3.5 stroke-[1.5]" />}
          </button>

          {track.type === 'audio' && (
            <button
              onClick={() => toggleTrackMute(track.id)}
              className={`p-1 rounded-[3px] hover:bg-[#3a3a40] transition-colors duration-150 cursor-pointer ${
                track.isMuted ? 'text-[#4f8cff]' : 'text-[#8a8a93] hover:text-[#d4d4d8]'
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
        className={`flex-1 relative cursor-pointer transition-colors duration-150 ${
          isDragOver ? 'bg-[#2f2f36] ring-1 ring-inset ring-[#4f8cff]' : 'bg-[#232326] hover:bg-[#27272b]'
        } ${track.isLocked ? 'pointer-events-none opacity-50' : ''} ${track.isHidden ? 'opacity-30' : ''}`}
      >
        {track.clips.map((clip) => (
          <TimelineClip key={clip.id} clip={clip} zoom={zoom} />
        ))}
      </div>
    </div>
  );
};
