import { create } from 'zustand';
import type { 
  TrackItem, 
  ClipItem, 
  TrackType, 
  AspectRatio, 
  LeftPanelTab, 
  InspectorTab, 
  ClipProperties,
  ThemeMode,
  HistorySnapshot,
  TrackHeightMode
} from '../types/editor';
import { TRACK_HEADER_WIDTH, TIMELINE_END_PADDING } from '../types/editor';

export const computeTotalDuration = (tracks: TrackItem[]): number => {
  let maxEnd = 0;
  for (const track of tracks) {
    for (const clip of track.clips) {
      const end = clip.start + clip.duration;
      if (end > maxEnd) maxEnd = end;
    }
  }
  return maxEnd > 0 ? Number(maxEnd.toFixed(2)) : 5.0;
};

export const computeDurationAndFit = (
  tracks: TrackItem[], 
  state: { isAutoFit: boolean; zoom: number; minZoom?: number; timelineViewportWidth: number }
) => {
  const newDuration = computeTotalDuration(tracks);
  if (state.timelineViewportWidth > 0) {
    const availableWidth = Math.max(100, state.timelineViewportWidth - TRACK_HEADER_WIDTH - 24);
    const durationToFit = Math.max(0.5, newDuration + TIMELINE_END_PADDING);
    const fitPx = Number((availableWidth / durationToFit).toFixed(2));
    const newMinZoom = Math.max(1, fitPx);
    if (state.isAutoFit || state.zoom < newMinZoom) {
      return {
        totalDuration: newDuration,
        minZoom: newMinZoom,
        zoom: fitPx,
      };
    }
    return {
      totalDuration: newDuration,
      minZoom: newMinZoom,
    };
  }
  return { 
    totalDuration: newDuration,
    minZoom: state.minZoom || 16,
  };
};

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
    contrast: 0,
    saturation: 0,
    temperature: 0,
    vignette: 0,
    sharpen: 0,
  },
  filter: 'none',
  text: 'THE ESSENCE OF MASTERY',
  fontFamily: 'Inter',
  fontSize: 28,
  fontWeight: '700',
  isItalic: false,
  letterSpacing: 0,
  lineHeight: 1.2,
  textAlign: 'center',
  fontColor: '#E8E6E1',
  fontBg: '#000000',
  bgOpacity: 0.5,
  bgPadding: 8,
  bgRadius: 4,
  outlineColor: '#000000',
  outlineWidth: 0,
  shadowColor: 'rgba(0,0,0,0.7)',
  shadowBlur: 8,
  fontStyle: 'classic',
};

const INITIAL_TRACKS: TrackItem[] = [
  {
    id: 'track-text',
    type: 'text',
    name: 'T1 Subtitles',
    isLocked: false,
    isHidden: false,
    isMuted: false,
    clips: [
      {
        id: 'clip-text-1',
        trackId: 'track-text',
        type: 'text',
        title: 'THE ESSENCE OF MASTERY',
        start: 1.5,
        duration: 7.5,
        sourceDuration: 20.0,
        offset: 0,
        color: '#7C5C30',
        properties: {
          ...INITIAL_PROPERTIES,
          text: 'THE ESSENCE OF MASTERY',
          fontColor: '#C9A66B',
          fontStyle: 'classic',
        }
      },
      {
        id: 'clip-text-2',
        trackId: 'track-text',
        type: 'text',
        title: 'PRECISION & CRAFT',
        start: 7.5,
        duration: 6.0,
        sourceDuration: 20.0,
        offset: 0,
        color: '#7C5C30',
        properties: {
          ...INITIAL_PROPERTIES,
          text: 'PRECISION & CRAFT',
          fontColor: '#E8E6E1',
          fontStyle: 'classic',
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
        title: '✦ Royal Heritage',
        start: 4,
        duration: 5,
        sourceDuration: 20,
        offset: 0,
        color: '#634368',
        properties: {
          ...INITIAL_PROPERTIES,
          text: 'Royal Heritage',
          fontFamily: 'Cinzel',
          fontSize: 24,
          fontColor: '#F3E8FF',
          scale: 0.9,
          posX: 20,
          posY: -25,
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
        title: 'reel-demo.mp4',
        start: 0,
        duration: 15,
        sourceDuration: 30,
        offset: 0,
        color: '#384357',
        src: '/rendered-reels/reel-demo.mp4',
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
        title: 'Cinematic_B_Roll.mp4',
        start: 15,
        duration: 15,
        sourceDuration: 25,
        offset: 0,
        color: '#424D63',
        src: '/rendered-reels/reel-demo.mp4',
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
        title: 'Cinematic Ambient Score',
        start: 0,
        duration: 30,
        sourceDuration: 60,
        offset: 0,
        color: '#345242',
        src: '/rendered-reels/bgm-cyber.mp3',
        waveform: [35, 55, 75, 45, 85, 65, 40, 80, 90, 60, 50, 85, 70, 55, 75, 90, 95, 65, 45, 80, 85, 55, 40, 70, 90, 75, 60, 80, 90, 65],
        properties: {
          ...INITIAL_PROPERTIES,
          volume: 0.85,
        }
      }
    ]
  }
];

interface EditorState {
  theme: ThemeMode;
  projectName: string;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  aspectRatio: AspectRatio;
  zoom: number; // Pixels per second
  minZoom: number; // Minimum fit zoom level (zoom out never goes below this)
  isAutoFit: boolean;
  timelineViewportWidth: number;
  isSnapEnabled: boolean;
  snapGuideTime: number | null;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  activeLeftTab: LeftPanelTab;
  activeInspectorTab: InspectorTab;
  tracks: TrackItem[];
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  transactionSnapshot: HistorySnapshot | null;
  trackHeightMode: TrackHeightMode;
  editingClipId: string | null;
  isExportModalOpen: boolean;
  isShortcutsModalOpen: boolean;
  isProModalOpen: boolean;
  isComparingFilter: boolean;
  videoSrc: string;
  audioSrc: string;

  // Actions
  toggleTheme: () => void;
  setProjectName: (name: string) => void;
  setTrackHeightMode: (mode: TrackHeightMode) => void;
  toggleTrackHeightMode: () => void;
  setEditingClipId: (id: string | null) => void;
  duplicateSelectedClip: () => void;
  setIsComparingFilter: (isComparing: boolean) => void;
  seek: (time: number) => void;
  stepFrame: (deltaSec: number) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  setAspectRatio: (aspect: AspectRatio) => void;
  setZoom: (zoom: number) => void;
  setTimelineViewportWidth: (width: number) => void;
  fitToView: (explicitWidth?: number) => void;
  toggleSnap: () => void;
  setSnapGuideTime: (time: number | null) => void;
  setActiveLeftTab: (tab: LeftPanelTab) => void;
  setActiveInspectorTab: (tab: InspectorTab) => void;
  selectClip: (clipId: string | null, trackId?: string | null) => void;
  updateClipProperties: (clipId: string, partial: Partial<ClipProperties>) => void;
  updateClipSpan: (clipId: string, newStart: number, newDuration: number, newOffset?: number) => void;
  moveClip: (clipId: string, newStart: number, newTrackId?: string) => void;
  trimClip: (clipId: string, edge: 'start' | 'end', newTime: number) => { 
    hitSourceLimit: boolean; 
    offset: number; 
    sourceOut: number; 
    duration: number; 
    start: number; 
  } | null;
  splitClipAtPlayhead: (clipId?: string) => void;
  deleteClip: (clipId?: string) => void;
  addClipToTrack: (trackId: string, clipData: Partial<Omit<ClipItem, 'properties'>> & { properties?: Partial<ClipProperties> }) => void;
  addTrack: (type: TrackType) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackHide: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  setVideoSrc: (src: string) => void;
  setAudioSrc: (src: string) => void;
  loadVideoMedia: (name: string, url: string, duration?: number) => void;
  loadAudioMedia: (name: string, url: string, duration?: number) => void;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  beginTransaction: () => void;
  commitTransaction: () => void;
  setExportModalOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setProModalOpen: (open: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  theme: 'dark',
  projectName: 'Master Cinema Reel #1',
  currentTime: 3.5,
  totalDuration: computeTotalDuration(INITIAL_TRACKS),
  isPlaying: false,
  aspectRatio: '16:9',
  zoom: 36,
  minZoom: 16,
  isAutoFit: true,
  timelineViewportWidth: 0,
  isSnapEnabled: true,
  snapGuideTime: null,
  selectedClipId: 'clip-video-1',
  selectedTrackId: 'track-video',
  activeLeftTab: 'media',
  activeInspectorTab: 'video',
  tracks: INITIAL_TRACKS,
  undoStack: [],
  redoStack: [],
  transactionSnapshot: null,
  trackHeightMode: 'compact',
  editingClipId: null,
  isExportModalOpen: false,
  isShortcutsModalOpen: false,
  isProModalOpen: false,
  isComparingFilter: false,
  videoSrc: '/rendered-reels/reel-demo.mp4',
  audioSrc: '/rendered-reels/bgm-cyber.mp3',

  setTrackHeightMode: (mode) => set({ trackHeightMode: mode }),
  toggleTrackHeightMode: () => set(s => ({ trackHeightMode: s.trackHeightMode === 'compact' ? 'normal' : 'compact' })),
  setEditingClipId: (id) => set({ editingClipId: id }),

  duplicateSelectedClip: () => {
    get().saveHistory();
    const { selectedClipId, tracks } = get();
    if (!selectedClipId) return;

    let duplicatedClip: ClipItem | null = null;
    const newTracks = tracks.map(t => {
      const found = t.clips.find(c => c.id === selectedClipId);
      if (found) {
        const newStart = Number((found.start + found.duration).toFixed(2));
        duplicatedClip = {
          ...found,
          id: `clip-${Date.now()}`,
          start: newStart,
          title: found.title,
          properties: JSON.parse(JSON.stringify(found.properties))
        };
        return {
          ...t,
          clips: [...t.clips, duplicatedClip].sort((a, b) => a.start - b.start)
        };
      }
      return t;
    });

    if (duplicatedClip) {
      const durFit = computeDurationAndFit(newTracks, get());
      set({
        tracks: newTracks,
        selectedClipId: (duplicatedClip as ClipItem).id,
        ...durFit
      });
    }
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    set({ theme: nextTheme });
  },

  setProjectName: (name) => set({ projectName: name }),
  setIsComparingFilter: (isComparing) => set({ isComparingFilter: isComparing }),

  seek: (time) => {
    const { totalDuration } = get();
    const clamped = Math.max(0, Math.min(totalDuration, time));
    set({ currentTime: Number(clamped.toFixed(3)) });
  },

  stepFrame: (deltaSec) => {
    const { currentTime, totalDuration } = get();
    const next = Math.max(0, Math.min(totalDuration, currentTime + deltaSec));
    set({ currentTime: Number(next.toFixed(2)) });
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  setAspectRatio: (aspectRatio) => {
    set((state) => {
      const newTracks = state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => ({
          ...c,
          properties: {
            ...c.properties,
            posX: 0,
            posY: 0
          }
        }))
      }));
      return {
        aspectRatio,
        tracks: newTracks
      };
    });
  },

  setTimelineViewportWidth: (width: number) => {
    set({ timelineViewportWidth: width });
  },

  fitToView: (explicitWidth?: number) => {
    const state = get();
    const width = explicitWidth ?? state.timelineViewportWidth;
    if (!width || width <= 0) return;

    const availableWidth = Math.max(100, width - TRACK_HEADER_WIDTH - 24);
    const durationToFit = Math.max(0.5, state.totalDuration + TIMELINE_END_PADDING);
    const pxPerSecond = Number((availableWidth / durationToFit).toFixed(2));
    const newMinZoom = Math.max(1, pxPerSecond);

    set({
      timelineViewportWidth: width,
      minZoom: newMinZoom,
      zoom: pxPerSecond,
      isAutoFit: true,
    });
  },

  setZoom: (newZoom: number) => {
    const { minZoom } = get();
    const clamped = Math.max(minZoom || 1, Math.min(250, newZoom));
    set({ 
      zoom: Number(clamped.toFixed(2)), 
      isAutoFit: Math.abs(clamped - (minZoom || 1)) < 0.2 
    });
  },

  toggleSnap: () => set((state) => ({ isSnapEnabled: !state.isSnapEnabled })),

  setSnapGuideTime: (time) => set({ snapGuideTime: time }),

  setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),

  setActiveInspectorTab: (tab) => set({ activeInspectorTab: tab }),

  selectClip: (clipId, trackId) => {
    set({ 
      selectedClipId: clipId,
      selectedTrackId: trackId !== undefined ? trackId : get().selectedTrackId
    });
  },

  beginTransaction: () => {
    const { tracks, selectedClipId, selectedTrackId, currentTime } = get();
    set({
      transactionSnapshot: {
        tracks: JSON.parse(JSON.stringify(tracks)),
        selectedClipId,
        selectedTrackId,
        currentTime
      }
    });
  },

  commitTransaction: () => {
    const { transactionSnapshot, tracks, undoStack } = get();
    if (!transactionSnapshot) return;
    const currentJson = JSON.stringify(tracks);
    const snapJson = JSON.stringify(transactionSnapshot.tracks);
    if (currentJson !== snapJson) {
      set({
        undoStack: [...undoStack.slice(-30), transactionSnapshot],
        redoStack: [],
        transactionSnapshot: null
      });
    } else {
      set({ transactionSnapshot: null });
    }
  },

  saveHistory: () => {
    const { tracks, selectedClipId, selectedTrackId, currentTime, undoStack } = get();
    const snapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      selectedClipId,
      selectedTrackId,
      currentTime
    };
    set({
      undoStack: [...undoStack.slice(-30), snapshot],
      redoStack: []
    });
  },

  undo: () => {
    const { undoStack, redoStack, tracks, selectedClipId, selectedTrackId, currentTime } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const currentSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      selectedClipId,
      selectedTrackId,
      currentTime
    };
    const nextTracks = previous.tracks;
    const durFit = computeDurationAndFit(nextTracks, get());
    set({
      tracks: nextTracks,
      selectedClipId: previous.selectedClipId,
      selectedTrackId: previous.selectedTrackId,
      currentTime: Math.min(previous.currentTime, durFit.totalDuration),
      ...durFit,
      undoStack: newUndo,
      redoStack: [currentSnapshot, ...redoStack]
    });
  },

  redo: () => {
    const { undoStack, redoStack, tracks, selectedClipId, selectedTrackId, currentTime } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    const newRedo = redoStack.slice(1);
    const currentSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      selectedClipId,
      selectedTrackId,
      currentTime
    };
    const nextTracks = next.tracks;
    const durFit = computeDurationAndFit(nextTracks, get());
    set({
      tracks: nextTracks,
      selectedClipId: next.selectedClipId,
      selectedTrackId: next.selectedTrackId,
      currentTime: Math.min(next.currentTime, durFit.totalDuration),
      ...durFit,
      undoStack: [...undoStack, currentSnapshot],
      redoStack: newRedo
    });
  },

  updateClipProperties: (clipId, partial) => {
    set((state) => {
      const newTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            let nextDuration = clip.duration;
            if (partial.speed !== undefined && partial.speed > 0 && partial.speed !== clip.properties.speed) {
              const oldSpeed = clip.properties.speed || 1.0;
              const newSpeed = partial.speed;
              const currentOffset = clip.offset ?? 0;
              const sourceOut = currentOffset + clip.duration * oldSpeed;
              nextDuration = Number(Math.max(0.1, (sourceOut - currentOffset) / newSpeed).toFixed(2));
            }

            return {
              ...clip,
              title: partial.text !== undefined ? partial.text : clip.title,
              duration: nextDuration,
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
      }));

      const durFit = computeDurationAndFit(newTracks, state);
      return {
        tracks: newTracks,
        ...durFit
      };
    });
  },

  moveClip: (clipId, newStart, newTrackId) => {
    const { isSnapEnabled, currentTime } = get();
    let targetStart = Math.max(0, newStart);

    // Magnetic Snapping logic
    if (isSnapEnabled) {
      const snapThreshold = 0.4;
      if (Math.abs(targetStart - currentTime) < snapThreshold) {
        targetStart = currentTime;
      }
      const nearest5s = Math.round(targetStart / 5) * 5;
      if (Math.abs(targetStart - nearest5s) < snapThreshold) {
        targetStart = nearest5s;
      }
    }

    set((state) => {
      let movingClip: ClipItem | null = null;
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

      const newTracks = cleanedTracks.map(t => {
        if (t.id === finalTrackId) {
          return { ...t, clips: [...t.clips, updatedClip].sort((a, b) => a.start - b.start) };
        }
        return t;
      });

      const durFit = computeDurationAndFit(newTracks, state);
      return {
        tracks: newTracks,
        ...durFit
      };
    });
  },

  updateClipSpan: (clipId, newStart, newDuration, newOffset) => {
    set((state) => {
      const newTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id !== clipId) return clip;
          return {
            ...clip,
            start: Number(Math.max(0, newStart).toFixed(2)),
            duration: Number(Math.max(0.2, newDuration).toFixed(2)),
            offset: newOffset !== undefined ? Number(Math.max(0, newOffset).toFixed(2)) : clip.offset
          };
        })
      }));
      const durFit = computeDurationAndFit(newTracks, state);
      return {
        tracks: newTracks,
        ...durFit
      };
    });
  },

  trimClip: (clipId, edge, newTime) => {
    let result: {
      hitSourceLimit: boolean;
      offset: number;
      sourceOut: number;
      duration: number;
      start: number;
    } | null = null;

    set((state) => {
      let foundClip: ClipItem | null = null;
      let foundTrack: TrackItem | null = null;

      for (const track of state.tracks) {
        const c = track.clips.find((item) => item.id === clipId);
        if (c) {
          foundClip = c;
          foundTrack = track;
          break;
        }
      }

      if (!foundClip || !foundTrack) return {};

      const speed = foundClip.properties.speed || 1.0;
      const sourceDuration = foundClip.sourceDuration || 30;
      const currentOffset = foundClip.offset ?? 0;

      // Find adjacent clips on the same track
      const otherClips = foundTrack.clips.filter((c) => c.id !== clipId);
      const prevClips = otherClips.filter((c) => c.start < foundClip!.start);
      const nextClips = otherClips.filter((c) => c.start > foundClip!.start);

      const prevClip = prevClips.length > 0
        ? prevClips.reduce((latest, c) => (c.start + c.duration > latest.start + latest.duration ? c : latest))
        : null;
      const nextClip = nextClips.length > 0
        ? nextClips.reduce((earliest, c) => (c.start < earliest.start ? c : earliest))
        : null;

      if (edge === 'end') {
        // RIGHT EDGE TRIM (dragging right handle)
        // newTime is the proposed timeline end (start + duration)
        const candidateDuration = newTime - foundClip.start;
        const minDuration = 0.1;
        const maxDurFromSource = (sourceDuration - currentOffset) / speed;
        const maxDurFromNext = nextClip ? (nextClip.start - foundClip.start) : Infinity;
        const maxDuration = Math.max(minDuration, Math.min(maxDurFromSource, maxDurFromNext));

        const newDuration = Number(Math.max(minDuration, Math.min(maxDuration, candidateDuration)).toFixed(2));
        const newSourceOut = Number((currentOffset + newDuration * speed).toFixed(2));

        const hitSourceLimit = newSourceOut >= sourceDuration - 0.05 || (nextClip !== null && (foundClip.start + newDuration) >= nextClip.start - 0.05);

        result = {
          hitSourceLimit,
          offset: currentOffset,
          sourceOut: newSourceOut,
          duration: newDuration,
          start: foundClip.start
        };

        const newTracks = state.tracks.map((t) => {
          if (t.id !== foundTrack!.id) return t;
          return {
            ...t,
            clips: t.clips.map((c) => {
              if (c.id !== clipId) return c;
              return {
                ...c,
                duration: newDuration,
                offset: currentOffset
              };
            })
          };
        });

        const durFit = computeDurationAndFit(newTracks, state);
        return {
          tracks: newTracks,
          ...durFit
        };
      } else {
        // LEFT EDGE TRIM (dragging left handle)
        // newTime is the proposed timeline start
        const fixedRight = foundClip.start + foundClip.duration;
        const maxStart = fixedRight - 0.1;

        const minStartFromSource = foundClip.start - (currentOffset / speed);
        const minStartFromPrev = prevClip ? (prevClip.start + prevClip.duration) : 0;
        const minStart = Math.max(0, minStartFromPrev, minStartFromSource);

        const newStart = Number(Math.max(minStart, Math.min(maxStart, newTime)).toFixed(2));
        const newDuration = Number((fixedRight - newStart).toFixed(2));

        const deltaTimeline = newStart - foundClip.start;
        const calculatedOffset = currentOffset + deltaTimeline * speed;
        const newOffset = Number(Math.max(0, Math.min(sourceDuration - 0.1 * speed, calculatedOffset)).toFixed(2));
        const newSourceOut = Number((newOffset + newDuration * speed).toFixed(2));

        const hitSourceLimit = newOffset <= 0.05 || (prevClip !== null && newStart <= (prevClip.start + prevClip.duration) + 0.05) || newStart <= 0.05;

        result = {
          hitSourceLimit,
          offset: newOffset,
          sourceOut: newSourceOut,
          duration: newDuration,
          start: newStart
        };

        const newTracks = state.tracks.map((t) => {
          if (t.id !== foundTrack!.id) return t;
          return {
            ...t,
            clips: t.clips.map((c) => {
              if (c.id !== clipId) return c;
              return {
                ...c,
                start: newStart,
                duration: newDuration,
                offset: newOffset
              };
            })
          };
        });

        const durFit = computeDurationAndFit(newTracks, state);
        return {
          tracks: newTracks,
          ...durFit
        };
      }
    });

    return result;
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
      if (splitOffset <= 0.1 || splitOffset >= clip.duration - 0.1) {
        return track;
      }

      didSplit = true;
      const speed = clip.properties.speed || 1.0;
      const clipOffset = clip.offset ?? 0;
      const sourceDuration = clip.sourceDuration || 30;

      const part1Duration = Number(splitOffset.toFixed(2));
      const part2Duration = Number((clip.duration - splitOffset).toFixed(2));
      const part2Offset = Number((clipOffset + splitOffset * speed).toFixed(2));

      const part1: ClipItem = {
        ...clip,
        id: `${clip.id}-p1`,
        duration: part1Duration,
        offset: clipOffset,
        sourceDuration: sourceDuration
      };

      const part2: ClipItem = {
        ...clip,
        id: `${clip.id}-p2`,
        start: Number(currentTime.toFixed(2)),
        duration: part2Duration,
        offset: part2Offset,
        sourceDuration: sourceDuration
      };

      const updatedClips = [...track.clips];
      updatedClips.splice(clipIndex, 1, part1, part2);
      return { ...track, clips: updatedClips };
    });

    if (didSplit) {
      const durFit = computeDurationAndFit(newTracks, get());
      set({ 
        tracks: newTracks,
        ...durFit
      });
    }
  },

  deleteClip: (specificClipId) => {
    get().saveHistory();
    const { selectedClipId, tracks, currentTime } = get();
    const targetId = specificClipId || selectedClipId;
    if (!targetId) return;

    const newTracks = tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((c) => c.id !== targetId)
    }));

    const durFit = computeDurationAndFit(newTracks, get());
    set({
      selectedClipId: null,
      tracks: newTracks,
      currentTime: Math.min(currentTime, durFit.totalDuration),
      ...durFit
    });
  },

  addClipToTrack: (trackId, clipData) => {
    get().saveHistory();
    const { currentTime, tracks } = get();
    const newClip: ClipItem = {
      id: `clip-${Date.now()}`,
      trackId,
      type: (clipData.type || 'video') as TrackType,
      title: clipData.title || 'New Clip',
      start: clipData.start ?? currentTime,
      duration: clipData.duration || 6,
      sourceDuration: clipData.sourceDuration || 15,
      offset: 0,
      color: clipData.color || '#384357',
      thumbnail: clipData.thumbnail,
      waveform: clipData.waveform,
      src: clipData.src,
      properties: {
        ...INITIAL_PROPERTIES,
        ...(clipData.properties || {})
      }
    };

    const newTracks = tracks.map((t) => {
      if (t.id === trackId) {
        return {
          ...t,
          clips: [...t.clips, newClip].sort((a, b) => a.start - b.start)
        };
      }
      return t;
    });

    const durFit = computeDurationAndFit(newTracks, get());
    set({
      selectedClipId: newClip.id,
      tracks: newTracks,
      ...durFit
    });
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

  setVideoSrc: (src) => set({ videoSrc: src }),
  setAudioSrc: (src) => set({ audioSrc: src }),

  loadVideoMedia: (name: string, url: string, duration = 15) => {
    const state = get();
    const cleanDuration = Math.max(0.2, Number(duration.toFixed(2)));
    const newTracks = state.tracks.map((track) => {
      if (track.type === 'video') {
        return {
          ...track,
          clips: [
            {
              id: `clip-video-${Date.now()}`,
              trackId: track.id,
              type: 'video' as TrackType,
              title: name,
              start: 0,
              duration: cleanDuration,
              sourceDuration: cleanDuration,
              offset: 0,
              color: '#384357',
              src: url,
              thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=200&q=80',
              properties: {
                ...INITIAL_PROPERTIES,
                filter: 'none',
              }
            }
          ]
        };
      } else {
        // Automatically fit existing subtitle / sticker / audio clips inside the new video timeline
        return {
          ...track,
          clips: track.clips.map((clip) => {
            let newStart = clip.start;
            let newDuration = clip.duration;
            if (newStart >= cleanDuration) {
              newStart = Math.max(0, Number((cleanDuration - Math.min(newDuration, 5)).toFixed(2)));
            }
            if (newStart + newDuration > cleanDuration) {
              newDuration = Math.max(0.5, Number((cleanDuration - newStart).toFixed(2)));
            }
            return {
              ...clip,
              start: newStart,
              duration: newDuration
            };
          })
        };
      }
    });

    const activeClip = newTracks.find((t) => t.type === 'video')?.clips[0];
    const durFit = computeDurationAndFit(newTracks, { ...get(), isAutoFit: true });

    set({
      videoSrc: url,
      tracks: newTracks,
      currentTime: 0,
      ...durFit,
      projectName: name.replace(/\.[^/.]+$/, '') || state.projectName,
      selectedClipId: activeClip?.id || null,
      selectedTrackId: 'track-video',
      isPlaying: false
    });
  },

  loadAudioMedia: (name: string, url: string, duration = 30) => {
    const state = get();
    const cleanDuration = Math.max(0.2, Number(duration.toFixed(2)));
    const newTracks = state.tracks.map((track) => {
      if (track.type === 'audio') {
        return {
          ...track,
          clips: [
            {
              id: `clip-audio-${Date.now()}`,
              trackId: track.id,
              type: 'audio' as TrackType,
              title: name,
              start: 0,
              duration: cleanDuration,
              sourceDuration: cleanDuration,
              offset: 0,
              color: '#345242',
              src: url,
              waveform: [40, 60, 80, 50, 90, 70, 45, 80, 70, 60, 85, 80, 65, 60, 75, 85],
              properties: {
                ...INITIAL_PROPERTIES,
                volume: 1.0,
              }
            }
          ]
        };
      }
      return track;
    });

    const durFit = computeDurationAndFit(newTracks, { ...get(), isAutoFit: true });

    set({
      audioSrc: url,
      tracks: newTracks,
      currentTime: 0,
      ...durFit
    });
  },

  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),
  setProModalOpen: (open) => set({ isProModalOpen: open }),
}));
