import { create } from 'zustand';
import type { 
  TrackItem, 
  ClipItem, 
  TrackType, 
  AspectRatio, 
  LeftPanelTab, 
  InspectorTab, 
  ClipProperties 
} from '../types/editor';

const INITIAL_PROPERTIES: ClipProperties = {
  posX: 0,
  posY: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
  flipH: false,
  flipV: false,
  volume: 1,
  fadeIn: 0,
  fadeOut: 0,
  isMuted: false,
  speed: 1,
  adjust: {
    brightness: 0,
    contrast: 100,
    saturation: 100,
    temperature: 0,
    vignette: 0,
    sharpen: 0,
  },
  filter: 'none',
  text: '★ THE TENSION IS REAL ★',
  fontSize: 32,
  fontColor: '#FACC15',
  fontStyle: 'hormozi',
};

const INITIAL_TRACKS: TrackItem[] = [
  {
    id: 'track-text',
    type: 'text',
    name: 'T1 Captions',
    isLocked: false,
    isHidden: false,
    isMuted: false,
    clips: [
      {
        id: 'clip-text-1',
        trackId: 'track-text',
        type: 'text',
        title: '★ THE TENSION IS REAL ★',
        start: 2,
        duration: 8,
        sourceDuration: 8,
        offset: 0,
        color: '#D97706',
        properties: {
          ...INITIAL_PROPERTIES,
          text: '★ THE TENSION IS REAL ★',
          fontColor: '#FACC15',
          fontStyle: 'hormozi',
        }
      },
      {
        id: 'clip-text-2',
        trackId: 'track-text',
        type: 'text',
        title: 'WAIT FOR THE REVEAL 🔥',
        start: 12,
        duration: 9,
        sourceDuration: 9,
        offset: 0,
        color: '#D97706',
        properties: {
          ...INITIAL_PROPERTIES,
          text: 'WAIT FOR THE REVEAL 🔥',
          fontColor: '#22C55E',
          fontStyle: 'neon',
        }
      }
    ]
  },
  {
    id: 'track-sticker',
    type: 'sticker',
    name: 'S1 Overlay',
    isLocked: false,
    isHidden: false,
    isMuted: false,
    clips: [
      {
        id: 'clip-sticker-1',
        trackId: 'track-sticker',
        type: 'sticker',
        title: '🔔 Subscribe & Bell',
        start: 5,
        duration: 6,
        sourceDuration: 6,
        offset: 0,
        color: '#9333EA',
        thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100&q=80',
        properties: {
          ...INITIAL_PROPERTIES,
          scale: 0.8,
          posX: 25,
          posY: -20,
        }
      }
    ]
  },
  {
    id: 'track-video',
    type: 'video',
    name: 'V1 Video',
    isLocked: false,
    isHidden: false,
    isMuted: false,
    clips: [
      {
        id: 'clip-video-1',
        trackId: 'track-video',
        type: 'video',
        title: 'Cyberpunk Neon Alley.mp4',
        start: 0,
        duration: 14,
        sourceDuration: 24,
        offset: 0,
        color: '#2563EB',
        thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&q=80',
        properties: {
          ...INITIAL_PROPERTIES,
          filter: 'cinematic',
        }
      },
      {
        id: 'clip-video-2',
        trackId: 'track-video',
        type: 'video',
        title: 'Sunset Coastline Drive.mp4',
        start: 14,
        duration: 16,
        sourceDuration: 25,
        offset: 0,
        color: '#3B82F6',
        thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80',
        properties: {
          ...INITIAL_PROPERTIES,
          filter: 'warm',
        }
      }
    ]
  },
  {
    id: 'track-audio',
    type: 'audio',
    name: 'A1 Audio',
    isLocked: false,
    isHidden: false,
    isMuted: false,
    clips: [
      {
        id: 'clip-audio-1',
        trackId: 'track-audio',
        type: 'audio',
        title: 'Phonk Midnight Drift (140 BPM)',
        start: 0,
        duration: 30,
        sourceDuration: 60,
        offset: 0,
        color: '#059669',
        waveform: [40, 60, 80, 50, 95, 70, 45, 85, 100, 65, 55, 90, 75, 60, 80, 95, 100, 70, 50, 85, 90, 60, 45, 75, 95, 80, 65, 85, 95, 70],
        properties: {
          ...INITIAL_PROPERTIES,
          volume: 0.8,
        }
      }
    ]
  }
];

interface EditorState {
  projectName: string;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  aspectRatio: AspectRatio;
  zoom: number; // Pixels per second (20 - 120)
  isSnapEnabled: boolean;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  activeLeftTab: LeftPanelTab;
  activeInspectorTab: InspectorTab;
  tracks: TrackItem[];
  undoStack: string[];
  redoStack: string[];
  isExportModalOpen: boolean;
  isShortcutsModalOpen: boolean;
  isProModalOpen: boolean;

  // Actions
  setProjectName: (name: string) => void;
  seek: (time: number) => void;
  stepFrame: (deltaSec: number) => void;
  togglePlay: () => void;
  pause: () => void;
  setAspectRatio: (aspect: AspectRatio) => void;
  setZoom: (zoom: number) => void;
  toggleSnap: () => void;
  setActiveLeftTab: (tab: LeftPanelTab) => void;
  setActiveInspectorTab: (tab: InspectorTab) => void;
  selectClip: (clipId: string | null, trackId?: string | null) => void;
  updateClipProperties: (clipId: string, partial: Partial<ClipProperties>) => void;
  moveClip: (clipId: string, newStart: number, newTrackId?: string) => void;
  trimClip: (clipId: string, edge: 'start' | 'end', deltaSec: number) => void;
  splitClipAtPlayhead: (clipId?: string) => void;
  deleteClip: (clipId?: string) => void;
  addClipToTrack: (trackId: string, clipData: Partial<ClipItem>) => void;
  addTrack: (type: TrackType) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackHide: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  setExportModalOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setProModalOpen: (open: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectName: 'Viral Reel Master #1',
  currentTime: 4.5,
  totalDuration: 30,
  isPlaying: false,
  aspectRatio: '16:9',
  zoom: 36, // ~36px per second
  isSnapEnabled: true,
  selectedClipId: 'clip-video-1',
  selectedTrackId: 'track-video',
  activeLeftTab: 'media',
  activeInspectorTab: 'video',
  tracks: INITIAL_TRACKS,
  undoStack: [],
  redoStack: [],
  isExportModalOpen: false,
  isShortcutsModalOpen: false,
  isProModalOpen: false,

  setProjectName: (name) => set({ projectName: name }),

  seek: (time) => {
    const { totalDuration } = get();
    const clamped = Math.max(0, Math.min(totalDuration, time));
    set({ currentTime: Number(clamped.toFixed(2)) });
  },

  stepFrame: (deltaSec) => {
    const { currentTime, totalDuration } = get();
    const next = Math.max(0, Math.min(totalDuration, currentTime + deltaSec));
    set({ currentTime: Number(next.toFixed(2)) });
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  pause: () => set({ isPlaying: false }),

  setAspectRatio: (aspectRatio) => set({ aspectRatio }),

  setZoom: (zoom) => set({ zoom: Math.max(16, Math.min(120, zoom)) }),

  toggleSnap: () => set((state) => ({ isSnapEnabled: !state.isSnapEnabled })),

  setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),

  setActiveInspectorTab: (tab) => set({ activeInspectorTab: tab }),

  selectClip: (clipId, trackId) => {
    set({ 
      selectedClipId: clipId,
      selectedTrackId: trackId !== undefined ? trackId : get().selectedTrackId
    });
  },

  saveHistory: () => {
    const { tracks, undoStack } = get();
    const snapshot = JSON.stringify(tracks);
    set({
      undoStack: [...undoStack.slice(-25), snapshot],
      redoStack: []
    });
  },

  undo: () => {
    const { undoStack, redoStack, tracks } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    set({
      tracks: JSON.parse(previous),
      undoStack: newUndo,
      redoStack: [JSON.stringify(tracks), ...redoStack]
    });
  },

  redo: () => {
    const { undoStack, redoStack, tracks } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    const newRedo = redoStack.slice(1);
    set({
      tracks: JSON.parse(next),
      undoStack: [...undoStack, JSON.stringify(tracks)],
      redoStack: newRedo
    });
  },

  updateClipProperties: (clipId, partial) => {
    get().saveHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            return {
              ...clip,
              properties: {
                ...clip.properties,
                ...partial,
                adjust: {
                  ...clip.properties.adjust,
                  ...(partial.adjust || {})
                }
              }
            };
          }
          return clip;
        })
      }))
    }));
  },

  moveClip: (clipId, newStart, newTrackId) => {
    get().saveHistory();
    const { isSnapEnabled, currentTime } = get();
    let targetStart = Math.max(0, newStart);

    // Magnetic Snapping logic
    if (isSnapEnabled) {
      const snapThreshold = 0.5; // 0.5s snap
      // Snap to playhead
      if (Math.abs(targetStart - currentTime) < snapThreshold) {
        targetStart = currentTime;
      }
      // Snap to 0 or 5s markers
      const nearest5s = Math.round(targetStart / 5) * 5;
      if (Math.abs(targetStart - nearest5s) < snapThreshold) {
        targetStart = nearest5s;
      }
    }

    set((state) => {
      let movingClip: ClipItem | null = null;
      // Extract clip
      const cleanedTracks = state.tracks.map(t => {
        const found = t.clips.find(c => c.id === clipId);
        if (found) movingClip = { ...found };
        return {
          ...t,
          clips: t.clips.filter(c => c.id !== clipId)
        };
      });

      if (!movingClip) return state;

      const finalTrackId = newTrackId || (movingClip as ClipItem).trackId;
      const updatedClip: ClipItem = {
        ...(movingClip as ClipItem),
        trackId: finalTrackId,
        start: Number(targetStart.toFixed(2))
      };

      return {
        tracks: cleanedTracks.map(t => {
          if (t.id === finalTrackId) {
            return { ...t, clips: [...t.clips, updatedClip].sort((a, b) => a.start - b.start) };
          }
          return t;
        })
      };
    });
  },

  trimClip: (clipId, edge, deltaSec) => {
    get().saveHistory();
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== clipId) return clip;
          if (edge === 'start') {
            const nextStart = Math.max(0, clip.start + deltaSec);
            const nextDuration = Math.max(0.5, clip.duration - deltaSec);
            return {
              ...clip,
              start: Number(nextStart.toFixed(2)),
              duration: Number(nextDuration.toFixed(2)),
              offset: clip.offset + deltaSec
            };
          } else {
            const nextDuration = Math.max(0.5, clip.duration + deltaSec);
            return {
              ...clip,
              duration: Number(nextDuration.toFixed(2))
            };
          }
        })
      }))
    }));
  },

  splitClipAtPlayhead: (specificClipId) => {
    get().saveHistory();
    const { currentTime, selectedClipId, tracks } = get();
    const targetClipId = specificClipId || selectedClipId;
    if (!targetClipId) return;

    let didSplit = false;
    const newTracks = tracks.map((track) => {
      const clipIndex = track.clips.findIndex((c) => c.id === targetClipId);
      if (clipIndex === -1) return track;

      const clip = track.clips[clipIndex];
      const splitOffset = currentTime - clip.start;
      if (splitOffset <= 0.3 || splitOffset >= clip.duration - 0.3) {
        return track; // Too close to edge to split
      }

      didSplit = true;
      const part1: ClipItem = {
        ...clip,
        id: `${clip.id}-p1`,
        duration: Number(splitOffset.toFixed(2))
      };

      const part2: ClipItem = {
        ...clip,
        id: `${clip.id}-p2`,
        start: Number(currentTime.toFixed(2)),
        duration: Number((clip.duration - splitOffset).toFixed(2)),
        offset: clip.offset + splitOffset
      };

      const updatedClips = [...track.clips];
      updatedClips.splice(clipIndex, 1, part1, part2);
      return { ...track, clips: updatedClips };
    });

    if (didSplit) {
      set({ tracks: newTracks });
    }
  },

  deleteClip: (specificClipId) => {
    get().saveHistory();
    const { selectedClipId } = get();
    const targetId = specificClipId || selectedClipId;
    if (!targetId) return;

    set((state) => ({
      selectedClipId: null,
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== targetId)
      }))
    }));
  },

  addClipToTrack: (trackId, clipData) => {
    get().saveHistory();
    const { currentTime } = get();
    const newClip: ClipItem = {
      id: `clip-${Date.now()}`,
      trackId,
      type: (clipData.type || 'video') as TrackType,
      title: clipData.title || 'New Clip',
      start: clipData.start ?? currentTime,
      duration: clipData.duration || 6,
      sourceDuration: clipData.sourceDuration || 15,
      offset: 0,
      color: clipData.color || '#3B82F6',
      thumbnail: clipData.thumbnail,
      waveform: clipData.waveform,
      src: clipData.src,
      properties: {
        ...INITIAL_PROPERTIES,
        ...(clipData.properties || {})
      }
    };

    set((state) => ({
      selectedClipId: newClip.id,
      tracks: state.tracks.map((t) => {
        if (t.id === trackId) {
          return {
            ...t,
            clips: [...t.clips, newClip].sort((a, b) => a.start - b.start)
          };
        }
        return t;
      })
    }));
  },

  addTrack: (type) => {
    get().saveHistory();
    const newTrack: TrackItem = {
      id: `track-${Date.now()}`,
      type,
      name: `${type.toUpperCase()} Track`,
      isLocked: false,
      isHidden: false,
      isMuted: false,
      clips: []
    };
    set((state) => ({ tracks: [...state.tracks, newTrack] }));
  },

  toggleTrackLock: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === trackId ? { ...t, isLocked: !t.isLocked } : t)
    }));
  },

  toggleTrackHide: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === trackId ? { ...t, isHidden: !t.isHidden } : t)
    }));
  },

  toggleTrackMute: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((t) => t.id === trackId ? { ...t, isMuted: !t.isMuted } : t)
    }));
  },

  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),
  setProModalOpen: (open) => set({ isProModalOpen: open }),
}));
