export type TrackType = 'video' | 'audio' | 'text' | 'sticker' | 'effect';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface ClipAdjustments {
  brightness: number;  // -100 to 100
  contrast: number;    // 0 to 200
  saturation: number;  // 0 to 200
  temperature: number; // -100 to 100
  vignette: number;    // 0 to 100
  sharpen: number;     // 0 to 100
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
  // Text / Caption
  text?: string;
  fontSize?: number;
  fontColor?: string;
  fontBg?: string;
  fontStyle?: 'hormozi' | 'clean' | 'neon' | 'bold';
  // Animation
  inAnimation?: string;
  outAnimation?: string;
}

export interface ClipItem {
  id: string;
  trackId: string;
  type: TrackType;
  title: string;
  start: number;       // Start time on timeline in seconds
  duration: number;    // Duration on timeline in seconds
  sourceDuration: number; // Original media duration
  offset: number;      // Offset into source media
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
  | 'adjust';
