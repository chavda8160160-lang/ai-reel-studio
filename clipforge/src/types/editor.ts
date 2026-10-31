export type TrackType = 'video' | 'audio' | 'text' | 'sticker' | 'effect';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export type ThemeMode = 'dark' | 'light';

export interface ClipAdjustments {
  brightness: number;  // -100 to 100, default 0
  contrast: number;    // -100 to 100, default 0
  saturation: number;  // -100 to 100, default 0
  temperature: number; // -100 to 100, default 0
  tint?: number;       // -100 to 100, default 0
  highlights?: number; // -100 to 100, default 0
  shadows?: number;    // -100 to 100, default 0
  vignette: number;    // 0 to 100, default 0
  sharpen: number;     // 0 to 100, default 0
  clarity?: number;    // 0 to 100, default 0
}

export type MaskShape = 'none' | 'circle' | 'rectangle' | 'horizontal' | 'mirror';

export interface MaskConfig {
  shape: MaskShape;
  size: number;        // 10 to 200, default 100
  feather: number;     // 0 to 100, default 0
  rotation: number;    // 0 to 360, default 0
  inverted: boolean;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  color: string;       // e.g. '#00ff00'
  tolerance: number;   // 0 to 100, default 30
  smoothness: number;  // 0 to 100, default 10
}

export type HslColorName = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'magenta';

export interface HslItem {
  hue: number;
  saturation: number;
  luminance: number;
}

export type CurveChannel = 'master' | 'red' | 'green' | 'blue';

export interface CurveControlPoint {
  x: number; // 0 to 100
  y: number; // 0 to 100
}

export interface TransitionConfig {
  type: 'none' | 'fade' | 'dissolve' | 'wipe-left' | 'wipe-right' | 'zoom-in';
  duration: number; // 0.2 to 2.0s
}

export interface SpeedCurvePoint {
  timePercent: number; // 0 to 100%
  speed: number;       // 0.1x to 10.0x
}

export type SpeedMode = 'constant' | 'curve';

export interface KeyframePoint {
  id: string;
  timeOffset: number; // seconds relative to clip.start
  scale?: number;
  posX?: number;
  posY?: number;
  opacity?: number;
  rotation?: number;
}

export type BlendMode = 
  | 'normal' 
  | 'screen' 
  | 'darken' 
  | 'multiply' 
  | 'overlay' 
  | 'lighten' 
  | 'color-dodge' 
  | 'soft-light';

export interface ClipProperties {
  // Transform
  posX: number;
  posY: number;
  scale: number;       // 0.1 to 3.0
  rotation: number;    // 0 to 360
  opacity: number;     // 0 to 1
  flipH: boolean;
  flipV: boolean;
  blendMode?: BlendMode;
  isScaleLocked?: boolean;
  isReversed?: boolean;
  // Audio
  volume: number;      // 0 to 2
  fadeIn: number;      // seconds
  fadeOut: number;     // seconds
  isMuted: boolean;
  audioBalance?: number;      // -1.0 (Left) to 1.0 (Right), default 0 (Center)
  loudnessNormalized?: boolean;
  noiseReduction?: boolean;
  // Speed
  speed: number;       // 0.1 to 10
  speedMode?: SpeedMode;
  speedCurvePreset?: string;
  speedCurvePoints?: SpeedCurvePoint[];
  // Adjust & Filter
  adjust: ClipAdjustments;
  filter: string;      // 'none' | 'cinematic' | 'vibrant' | 'warm' | 'noir' | 'cyberpunk'
  mask?: MaskConfig;
  chromaKey?: ChromaKeyConfig;
  hsl?: Partial<Record<HslColorName, HslItem>>;
  curves?: Record<CurveChannel, CurveControlPoint[]>;
  transition?: TransitionConfig;
  videoEffect?: string;
  isAdjustmentLayer?: boolean;
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
  comboAnimation?: string;
  keyframes?: KeyframePoint[];
}

export type TrackHeightMode = 'compact' | 'normal';
export type ToolMode = 'select' | 'split';
export type MediaTypeFilter = 'all' | 'video' | 'audio' | 'image';

export const TRACK_HEADER_WIDTH = 130;
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
  groupId?: string;
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
