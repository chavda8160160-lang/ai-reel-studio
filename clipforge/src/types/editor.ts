export type TrackType = 'video' | 'audio' | 'text' | 'sticker' | 'effect';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export type ThemeMode = 'dark' | 'light';

export interface ClipAdjustments {
  brightness: number;  // -100 to 100, default 0
  contrast: number;    // -100 to 100, default 0
  saturation: number;  // -100 to 100, default 0
  temperature: number; // -100 to 100, default 0
  vignette: number;    // 0 to 100, default 0
  sharpen: number;     // 0 to 100, default 0
}

export interface ClipProperties {
  // Transform
  posX: number;
  posY: number;
  scale: number;       // 0.1 to 3.0
  rotation: number;    // 0 to 360
  opacity: number;     // 0 to 1
  flipH: boolean;
  flipV: boolean;
  // Audio
  volume: number;      // 0 to 2
  fadeIn: number;      // seconds
  fadeOut: number;     // seconds
  isMuted: boolean;
  // Speed
  speed: number;       // 0.1 to 10
  // Adjust & Filter
  adjust: ClipAdjustments;
  filter: string;      // 'none' | 'cinematic' | 'vibrant' | 'warm' | 'noir' | 'cyberpunk'
  // Text / Typography & Styling
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  isItalic?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontColor?: string;
  fontBg?: string;
  bgOpacity?: number;
  bgPadding?: number;
  bgRadius?: number;
  outlineColor?: string;
  outlineWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  fontStyle?: 'classic' | 'hormozi' | 'clean' | 'neon';
  // Animation
  inAnimation?: string;
  outAnimation?: string;
}

export type TrackHeightMode = 'compact' | 'normal';

export const TRACK_HEADER_WIDTH = 120;
export const TIMELINE_END_PADDING = 1.0;

export interface HistorySnapshot {
  tracks: TrackItem[];
  selectedClipId: string | null;
  selectedTrackId: string | null;
  currentTime: number;
}

export interface ClipItem {
  id: string;
  trackId: string;
  type: TrackType;
  title: string;
  start: number;       // Start time on timeline in seconds
  duration: number;    // Duration on timeline in seconds
  sourceDuration: number; // Original media duration
  offset: number;      // Source media start offset in seconds
  color: string;
  thumbnail?: string;
  waveform?: number[];
  src?: string;
  properties: ClipProperties;
}

export interface TrackItem {
  id: string;
  type: TrackType;
  name: string;
  isLocked: boolean;
  isHidden: boolean;
  isMuted: boolean;
  clips: ClipItem[];
}

export type LeftPanelTab = 
  | 'media' 
  | 'audio' 
  | 'text' 
  | 'stickers' 
  | 'effects' 
  | 'transitions' 
  | 'filters' 
  | 'captions';

export type InspectorTab = 
  | 'video' 
  | 'audio' 
  | 'speed' 
  | 'animation' 
  | 'adjust'
  | 'text'
  | 'sticker'
  | 'transform';
