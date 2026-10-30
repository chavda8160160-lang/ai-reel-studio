export interface VideoClipStateInput {
  start: number;
  offset: number;
  duration: number;
  speed?: number;
}

export interface VideoStateResult {
  active: boolean;
  sourceTime: number;
}

/**
 * Pure function to determine active state and source playback time.
 * active = clip.start <= t < clip.start + clip.duration
 * sourceTime = clip.offset + (t - clip.start) * (clip.speed || 1.0)
 */
export function getVideoState(clip: VideoClipStateInput, t: number): VideoStateResult {
  const speed = clip.speed ?? 1.0;
  const active = t >= clip.start && t < (clip.start + clip.duration);
  const sourceTime = Number((clip.offset + (t - clip.start) * speed).toFixed(4));
  return { active, sourceTime };
}

/**
 * Pure helper for left-edge trimming:
 * delta = how many seconds the left handle moves forward on the timeline
 */
export function trimLeft(clip: VideoClipStateInput, delta: number): VideoClipStateInput {
  const speed = clip.speed ?? 1.0;
  return {
    start: Number((clip.start + delta).toFixed(4)),
    offset: Number((clip.offset + delta * speed).toFixed(4)),
    duration: Number((clip.duration - delta).toFixed(4)),
    speed
  };
}

