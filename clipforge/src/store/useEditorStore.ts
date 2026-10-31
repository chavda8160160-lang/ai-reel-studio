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
  TrackHeightMode,
  ToolMode,
  MediaTypeFilter
} from '../types/editor';
import { TRACK_HEADER_WIDTH, TIMELINE_END_PADDING } from '../types/editor';
import { scheduleAutoSave, loadProjectFromDB } from '../utils/indexedDb';

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
  blendMode: 'normal',
  isScaleLocked: true,
  isReversed: false,
  volume: 1,
  fadeIn: 0,
  fadeOut: 0,
  isMuted: false,
  audioBalance: 0,
  loudnessNormalized: false,
  noiseReduction: false,
  speed: 1,
  speedMode: 'constant',
  speedCurvePreset: 'default',
  speedCurvePoints: [
    { timePercent: 0, speed: 1.0 },
    { timePercent: 25, speed: 1.0 },
    { timePercent: 50, speed: 1.0 },
    { timePercent: 75, speed: 1.0 },
    { timePercent: 100, speed: 1.0 },
  ],
  adjust: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    highlights: 0,
    shadows: 0,
    vignette: 0,
    sharpen: 0,
    clarity: 0,
  },
  mask: {
    shape: 'none',
    size: 100,
    feather: 0,
    rotation: 0,
    inverted: false,
  },
  chromaKey: {
    enabled: false,
    color: '#00ff00',
    tolerance: 30,
    smoothness: 10,
  },
  hsl: {
    red: { hue: 0, saturation: 0, luminance: 0 },
    orange: { hue: 0, saturation: 0, luminance: 0 },
    yellow: { hue: 0, saturation: 0, luminance: 0 },
    green: { hue: 0, saturation: 0, luminance: 0 },
    cyan: { hue: 0, saturation: 0, luminance: 0 },
    blue: { hue: 0, saturation: 0, luminance: 0 },
    purple: { hue: 0, saturation: 0, luminance: 0 },
    magenta: { hue: 0, saturation: 0, luminance: 0 },
  },
  curves: {
    master: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
    red: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
    green: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
    blue: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
  },
  transition: {
    type: 'none',
    duration: 0.5,
  },
  videoEffect: 'none',
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
  comboAnimation: 'none',
  keyframes: [],
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
        start: 0,
        duration: 4.5,
        sourceDuration: 20.0,
        offset: 0,
        color: '#5c5246',
        properties: {
          ...INITIAL_PROPERTIES,
          text: 'THE ESSENCE OF MASTERY',
          fontColor: '#FFFFFF',
          fontSize: 26,
          posY: 130,
        }
      },
      {
        id: 'clip-text-2',
        trackId: 'track-text',
        type: 'text',
        title: 'PRECISION & CRAFT',
        start: 4.5,
        duration: 4.5,
        sourceDuration: 20.0,
        offset: 0,
        color: '#5c5246',
        properties: {
          ...INITIAL_PROPERTIES,
          text: 'PRECISION & CRAFT',
          fontColor: '#4f8cff',
          fontSize: 26,
          posY: 130,
        }
      },
      {
        id: 'clip-text-3',
        trackId: 'track-text',
        type: 'text',
        title: 'HIGH RETENTION',
        start: 9.0,
        duration: 5.0,
        sourceDuration: 20.0,
        offset: 0,
        color: '#5c5246',
        properties: {
          ...INITIAL_PROPERTIES,
          text: 'Every second counts in high-retention video.',
          fontColor: '#FFFFFF',
          fontSize: 24,
          posY: 130,
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
    clips: []
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
        color: '#3b4a63',
        src: '/rendered-reels/reel-demo.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&q=80',
        properties: {
          ...INITIAL_PROPERTIES,
          filter: 'cinematic',
          speedMode: 'curve',
          speedCurvePreset: 'montage',
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
        color: '#3b4a63',
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
        color: '#3d5a4f',
        src: '/rendered-reels/bgm-cyber.mp3',
        waveform: [35, 55, 75, 45, 85, 65, 40, 80, 90, 60, 50, 85, 70, 55, 75, 90, 95, 65, 45, 80, 85, 55, 40, 70, 90, 75, 60, 80, 90, 65],
        properties: {
          ...INITIAL_PROPERTIES,
          volume: 0.85,
          fadeIn: 2.0,
          fadeOut: 2.5,
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
  activeInstagramTrimmer: {
    isOpen: boolean;
    clipId?: string;
    song?: any;
    initialOffset?: number;
    initialDuration?: number;
  } | null;
  openInstagramTrimmer: (params: { clipId?: string; song?: any; initialOffset?: number; initialDuration?: number }) => void;
  closeInstagramTrimmer: () => void;
  isComparingFilter: boolean;
  videoSrc: string;
  audioSrc: string;
  activeTool: ToolMode;
  isLinkageEnabled: boolean;
  isSidebarCollapsed: boolean;
  isInspectorCollapsed: boolean;
  mediaTypeFilter: MediaTypeFilter;
  isRecordingVoice: boolean;
  coverThumbnail: string | null;

  // Actions
  setCoverThumbnail: (thumb: string | null) => void;
  setActiveTool: (tool: ToolMode) => void;
  toggleLinkage: () => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setMediaTypeFilter: (filter: MediaTypeFilter) => void;
  setIsRecordingVoice: (recording: boolean) => void;
  extractAudioFromVideo: (clipId?: string) => void;
  toggleClipMute: (clipId?: string) => void;
  groupClips: (clipIds: string[]) => void;
  ungroupClip: (clipId: string) => void;
  addVoiceRecording: (blobUrl: string, duration: number) => void;
  trimLeftToPlayhead: () => void;
  trimRightToPlayhead: () => void;
  selectAllClips: () => void;
  initAutoSave: () => Promise<void>;
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
  activeLeftTab: 'audio',
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
  activeTool: 'select',
  isLinkageEnabled: true,
  isSidebarCollapsed: false,
  isInspectorCollapsed: false,
  mediaTypeFilter: 'all',
  isRecordingVoice: false,
  coverThumbnail: null,
  activeInstagramTrimmer: null,

  setCoverThumbnail: (thumb) => set({ coverThumbnail: thumb }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleLinkage: () => set(s => ({ isLinkageEnabled: !s.isLinkageEnabled })),
  toggleSidebar: () => set(s => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  toggleInspector: () => set(s => ({ isInspectorCollapsed: !s.isInspectorCollapsed })),
  setMediaTypeFilter: (filter) => set({ mediaTypeFilter: filter }),
  setIsRecordingVoice: (recording) => set({ isRecordingVoice: recording }),

  extractAudioFromVideo: (clipId) => {
    const { selectedClipId, tracks, saveHistory } = get();
    const targetId = clipId || selectedClipId;
    if (!targetId) return;

    let videoClip: ClipItem | null = null;
    let videoTrackId: string | null = null;
    for (const t of tracks) {
      const c = t.clips.find(clip => clip.id === targetId);
      if (c && c.type === 'video') {
        videoClip = c;
        videoTrackId = t.id;
        break;
      }
    }
    if (!videoClip) return;

    saveHistory();

    const audioClipId = `audio-extracted-${Date.now()}`;
    const newAudioClip: ClipItem = {
      id: audioClipId,
      trackId: 'track-audio',
      type: 'audio',
      title: `Audio - ${videoClip.title.replace(/\.[^/.]+$/, '')}`,
      start: videoClip.start,
      duration: videoClip.duration,
      sourceDuration: videoClip.sourceDuration,
      offset: videoClip.offset,
      src: videoClip.src || get().videoSrc,
      waveform: [50, 75, 90, 65, 80, 85, 70, 95, 85, 60, 75, 90, 70, 60, 80],
      color: '#3d5a4f',
      properties: {
        ...INITIAL_PROPERTIES,
        volume: 1.0,
        isMuted: false,
      }
    };

    let audioTrackExists = false;
    let updatedTracks = tracks.map(t => {
      if (t.id === videoTrackId) {
        return {
          ...t,
          clips: t.clips.map(c => c.id === targetId ? {
            ...c,
            properties: { ...c.properties, isMuted: true }
          } : c)
        };
      }
      if (t.type === 'audio') {
        audioTrackExists = true;
        return {
          ...t,
          clips: [...t.clips, { ...newAudioClip, trackId: t.id }]
        };
      }
      return t;
    });

    if (!audioTrackExists) {
      const newAudioTrack: TrackItem = {
        id: `track-audio-${Date.now()}`,
        type: 'audio',
        name: 'A1 Audio',
        isLocked: false,
        isHidden: false,
        isMuted: false,
        clips: [newAudioClip]
      };
      updatedTracks.push(newAudioTrack);
    }

    const newDuration = computeTotalDuration(updatedTracks);
    set({
      tracks: updatedTracks,
      selectedClipId: audioClipId,
      selectedTrackId: 'track-audio',
      activeInspectorTab: 'audio',
      totalDuration: newDuration
    });

    scheduleAutoSave({
      projectName: get().projectName,
      tracks: updatedTracks,
      aspectRatio: get().aspectRatio,
      totalDuration: newDuration
    });
  },

  toggleClipMute: (clipId) => {
    const { selectedClipId, tracks, saveHistory } = get();
    const targetId = clipId || selectedClipId;
    if (!targetId) return;

    saveHistory();
    const updatedTracks = tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => c.id === targetId ? {
        ...c,
        properties: { ...c.properties, isMuted: !c.properties.isMuted }
      } : c)
    }));

    set({ tracks: updatedTracks });
    scheduleAutoSave({
      projectName: get().projectName,
      tracks: updatedTracks,
      aspectRatio: get().aspectRatio,
      totalDuration: get().totalDuration
    });
  },

  groupClips: (clipIds) => {
    if (!clipIds || clipIds.length < 2) return;
    const { tracks, saveHistory } = get();
    saveHistory();
    const groupId = `group-${Date.now()}`;
    const updatedTracks = tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => clipIds.includes(c.id) ? { ...c, groupId } : c)
    }));
    set({ tracks: updatedTracks });
    scheduleAutoSave({
      projectName: get().projectName,
      tracks: updatedTracks,
      aspectRatio: get().aspectRatio,
      totalDuration: get().totalDuration
    });
  },

  ungroupClip: (clipId) => {
    const { tracks, saveHistory } = get();
    let targetGroupId: string | undefined;
    for (const t of tracks) {
      const found = t.clips.find(c => c.id === clipId);
      if (found?.groupId) {
        targetGroupId = found.groupId;
        break;
      }
    }
    if (!targetGroupId) return;

    saveHistory();
    const updatedTracks = tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => c.groupId === targetGroupId ? { ...c, groupId: undefined } : c)
    }));
    set({ tracks: updatedTracks });
    scheduleAutoSave({
      projectName: get().projectName,
      tracks: updatedTracks,
      aspectRatio: get().aspectRatio,
      totalDuration: get().totalDuration
    });
  },

  addVoiceRecording: (blobUrl, duration) => {
    const { tracks, currentTime, saveHistory } = get();
    saveHistory();
    const newId = `voice-${Date.now()}`;
    const dur = Math.max(0.5, duration);
    const timeStr = new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
    const voiceClip: ClipItem = {
      id: newId,
      trackId: 'track-audio',
      type: 'audio',
      title: `Voiceover ${timeStr}`,
      start: currentTime,
      duration: dur,
      sourceDuration: dur,
      offset: 0,
      src: blobUrl,
      waveform: [35, 60, 85, 95, 80, 50, 75, 90, 85, 70, 60, 80, 55, 40],
      color: '#3d5a4f',
      properties: {
        ...INITIAL_PROPERTIES,
        volume: 1.0,
      }
    };

    let audioFound = false;
    const updatedTracks = tracks.map(t => {
      if (t.type === 'audio') {
        audioFound = true;
        return { ...t, clips: [...t.clips, voiceClip] };
      }
      return t;
    });

    if (!audioFound) {
      updatedTracks.push({
        id: `track-audio-${Date.now()}`,
        type: 'audio',
        name: 'A1 Audio',
        isLocked: false,
        isHidden: false,
        isMuted: false,
        clips: [voiceClip]
      });
    }

    const newTotalDuration = computeTotalDuration(updatedTracks);
    set({
      tracks: updatedTracks,
      selectedClipId: newId,
      selectedTrackId: 'track-audio',
      totalDuration: newTotalDuration,
      isRecordingVoice: false
    });

    scheduleAutoSave({
      projectName: get().projectName,
      tracks: updatedTracks,
      aspectRatio: get().aspectRatio,
      totalDuration: newTotalDuration
    });
  },

  initAutoSave: async () => {
    try {
      const saved = await loadProjectFromDB();
      if (saved && saved.tracks && saved.tracks.length > 0) {
        // Sanitize legacy mock data to avoid duplicate collisions
        const cleanTracks = saved.tracks.map(t => {
          if (t.type === 'sticker') {
            return {
              ...t,
              clips: t.clips.filter((c: ClipItem) => c.id !== 'clip-sticker-1' && (c.src || c.thumbnail || c.properties?.text))
            };
          }
          if (t.type === 'text') {
            return {
              ...t,
              clips: t.clips.map((c: ClipItem) => ({
                ...c,
                properties: {
                  ...c.properties,
                  posY: (!c.properties?.posY || c.properties.posY === 0) ? 130 : c.properties.posY
                }
              }))
            };
          }
          return t;
        });

        set({
          projectName: saved.projectName || 'Master Cinema Reel #1',
          tracks: cleanTracks,
          aspectRatio: (saved.aspectRatio as AspectRatio) || '16:9',
          totalDuration: saved.totalDuration || computeTotalDuration(cleanTracks),
        });
      }
    } catch (e) {
      console.warn('Auto-save load failed:', e);
    }
  },

  trimLeftToPlayhead: () => {
    const { selectedClipId, currentTime, tracks } = get();
    if (!selectedClipId) return;

    let targetClip: ClipItem | null = null;
    for (const t of tracks) {
      const c = t.clips.find(clip => clip.id === selectedClipId);
      if (c) {
        targetClip = c;
        break;
      }
    }

    if (!targetClip) return;
    const clipEnd = targetClip.start + targetClip.duration;
    // Playhead must be strictly inside the clip to trim in
    if (currentTime <= targetClip.start || currentTime >= clipEnd) return;

    get().saveHistory();
    const speed = targetClip.properties.speed || 1.0;
    const cutDelta = currentTime - targetClip.start;
    const newOffset = (targetClip.offset ?? 0) + cutDelta * speed;
    const newDuration = Number((clipEnd - currentTime).toFixed(2));
    const newStart = Number(currentTime.toFixed(2));

    const newTracks = tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => {
        if (c.id === selectedClipId) {
          return {
            ...c,
            start: newStart,
            duration: newDuration,
            offset: newOffset
          };
        }
        return c;
      })
    }));

    const durFit = computeDurationAndFit(newTracks, get());
    set({ tracks: newTracks, ...durFit });
    scheduleAutoSave({
      projectName: get().projectName,
      tracks: newTracks,
      aspectRatio: get().aspectRatio,
      totalDuration: durFit.totalDuration
    });
  },

  trimRightToPlayhead: () => {
    const { selectedClipId, currentTime, tracks } = get();
    if (!selectedClipId) return;

    let targetClip: ClipItem | null = null;
    for (const t of tracks) {
      const c = t.clips.find(clip => clip.id === selectedClipId);
      if (c) {
        targetClip = c;
        break;
      }
    }

    if (!targetClip) return;
    const clipEnd = targetClip.start + targetClip.duration;
    // Playhead must be strictly inside the clip to trim out
    if (currentTime <= targetClip.start || currentTime >= clipEnd) return;

    get().saveHistory();
    const newDuration = Number((currentTime - targetClip.start).toFixed(2));

    const newTracks = tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => {
        if (c.id === selectedClipId) {
          return {
            ...c,
            duration: newDuration
          };
        }
        return c;
      })
    }));

    const durFit = computeDurationAndFit(newTracks, get());
    set({ tracks: newTracks, ...durFit });
    scheduleAutoSave({
      projectName: get().projectName,
      tracks: newTracks,
      aspectRatio: get().aspectRatio,
      totalDuration: durFit.totalDuration
    });
  },

  selectAllClips: () => {
    const { tracks } = get();
    // Select first clip if not selected or activate all
    const allClips = tracks.flatMap(t => t.clips);
    if (allClips.length > 0) {
      set({ selectedClipId: allClips[0].id, selectedTrackId: allClips[0].trackId });
    }
  },

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
    const { isSnapEnabled, isLinkageEnabled, currentTime } = get();
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
      for (const t of state.tracks) {
        const found = t.clips.find(c => c.id === clipId);
        if (found) {
          movingClip = { ...found };
          break;
        }
      }

      if (!movingClip) return state;

      const origStart = movingClip.start;
      const finalTargetStart = Number(targetStart.toFixed(2));
      const deltaSec = finalTargetStart - origStart;

      const finalTrackId = newTrackId || movingClip.trackId;

      const newTracks = state.tracks.map(t => {
        // Linked Audio Shift: When moving a video clip and linkage is ON, move synchronized audio clips by same delta
        if (isLinkageEnabled && movingClip!.type === 'video' && t.type === 'audio' && Math.abs(deltaSec) > 0.01) {
          return {
            ...t,
            clips: t.clips.map(ac => {
              if (Math.abs(ac.start - origStart) <= 0.2) {
                return {
                  ...ac,
                  start: Number(Math.max(0, ac.start + deltaSec).toFixed(2))
                };
              }
              return ac;
            }).sort((a, b) => a.start - b.start)
          };
        }

        // Clean out and reinsert moving clip
        const otherClips = t.clips.filter(c => c.id !== clipId);
        if (t.id === finalTrackId) {
          const updatedClip: ClipItem = {
            ...movingClip!,
            trackId: finalTrackId,
            start: finalTargetStart
          };
          return {
            ...t,
            clips: [...otherClips, updatedClip].sort((a, b) => a.start - b.start)
          };
        }

        return { ...t, clips: otherClips };
      });

      const durFit = computeDurationAndFit(newTracks, state);
      scheduleAutoSave({
        projectName: state.projectName,
        tracks: newTracks,
        aspectRatio: state.aspectRatio,
        totalDuration: durFit.totalDuration
      });

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
    const clipType = (clipData.type || 'video') as TrackType;
    const defaultColor = 
      clipType === 'audio' ? '#3d5a4f' :
      clipType === 'text' ? '#5c5246' :
      (clipType === 'sticker' || clipType === 'effect') ? '#4d4560' :
      '#3b4a63';

    const track = tracks.find(t => t.id === trackId);
    let startPos = clipData.start ?? currentTime;
    if (track && track.clips.length > 0) {
      // Find any overlapping clip or snap to end of previous clip (no overlap)
      const prevClips = track.clips.filter(c => c.start <= startPos);
      if (prevClips.length > 0) {
        const lastPrev = prevClips.reduce((latest, c) => (c.start + c.duration > latest.start + latest.duration ? c : latest));
        const lastPrevEnd = lastPrev.start + lastPrev.duration;
        if (startPos < lastPrevEnd || Math.abs(startPos - lastPrevEnd) < 0.4) {
          startPos = lastPrevEnd;
        }
      }
    }

    const newClip: ClipItem = {
      id: `clip-${Date.now()}`,
      trackId,
      type: clipType,
      title: clipData.title || 'New Clip',
      start: Number(startPos.toFixed(2)),
      duration: clipData.duration || 6,
      sourceDuration: clipData.sourceDuration || 15,
      offset: clipData.offset ?? 0,
      color: clipData.color || defaultColor,
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
  openInstagramTrimmer: (params) => set({
    activeInstagramTrimmer: {
      isOpen: true,
      clipId: params.clipId,
      song: params.song,
      initialOffset: params.initialOffset ?? 0,
      initialDuration: params.initialDuration,
    }
  }),
  closeInstagramTrimmer: () => set({ activeInstagramTrimmer: null }),
}));
