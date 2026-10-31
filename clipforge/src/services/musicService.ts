/**
 * Music Service Client for ClipForge Studio
 * Supports licensed & royalty-free music search, categories, favorites, recent tracks, and CC attribution
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number; // in seconds
  audioUrl: string;
  license: string;
  licenseBadge: string;
  sourceUrl: string;
  provider: string;
  credit: string;
}

export interface MusicSearchResponse {
  success: boolean;
  page: number;
  hasMore: boolean;
  count: number;
  results: MusicTrack[];
  error?: string;
}

export interface MusicProvider {
  search(query: string, page?: number, category?: string): Promise<MusicSearchResponse>;
  getTrack(id: string): Promise<MusicTrack | null>;
}

export const ONLINE_MUSIC_CATEGORIES = [
  'Trending',
  'Pop',
  'Lo-fi',
  'Hip-hop',
  'Cinematic',
  'Devotional',
  'Bollywood-style instrumental',
  'Chill',
  'Energetic'
] as const;

export type OnlineMusicCategory = typeof ONLINE_MUSIC_CATEGORIES[number];

class ApiMusicProvider implements MusicProvider {
  private baseUrl = '/api/music';

  async search(query: string, page = 1, category = ''): Promise<MusicSearchResponse> {
    const params = new URLSearchParams({
      q: query.trim(),
      page: String(page),
      limit: '20',
      category: category === 'Trending' ? '' : category
    });

    const res = await fetch(`${this.baseUrl}/search?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  }

  async getTrack(id: string): Promise<MusicTrack | null> {
    const res = await fetch(`${this.baseUrl}/track/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.track || null;
  }
}

export const musicProvider = new ApiMusicProvider();

// Local Storage Helpers for Favorites and Recently Used
const FAVORITES_KEY = 'clipforge_favorite_music_tracks';
const RECENT_KEY = 'clipforge_recent_music_tracks';
const ATTRIBUTION_KEY = 'clipforge_project_attributions';

export function getFavoriteTracks(): MusicTrack[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isFavoriteTrack(id: string): boolean {
  return getFavoriteTracks().some(t => t.id === id);
}

export function toggleFavoriteTrack(track: MusicTrack): boolean {
  const current = getFavoriteTracks();
  const exists = current.some(t => t.id === track.id);
  let updated: MusicTrack[];
  if (exists) {
    updated = current.filter(t => t.id !== track.id);
  } else {
    updated = [track, ...current];
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return !exists;
}

export function getRecentTracks(): MusicTrack[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentTrack(track: MusicTrack): void {
  const current = getRecentTracks().filter(t => t.id !== track.id);
  const updated = [track, ...current].slice(0, 30);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

// Project Attribution & Credits
export function getProjectAttributions(): MusicTrack[] {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addProjectAttribution(track: MusicTrack): void {
  const current = getProjectAttributions().filter(t => t.id !== track.id);
  const updated = [...current, track];
  localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(updated));
}

export function generateCreditsText(tracks: MusicTrack[]): string {
  if (!tracks.length) return 'No online music tracks added to this project yet.';
  
  const lines = [
    '=== MUSIC CREDITS & ATTRIBUTION (Creative Commons) ===',
    `Project: ClipForge Studio Post-Production Sequence`,
    `Generated: ${new Date().toLocaleDateString()}`,
    ''
  ];

  tracks.forEach((t, i) => {
    lines.push(`${i + 1}. "${t.title}" by ${t.artist}`);
    lines.push(`   License: ${t.license}`);
    lines.push(`   Source: ${t.sourceUrl}`);
    lines.push(`   Provider: ${t.provider}`);
    lines.push('');
  });

  lines.push('All audio tracks used in accordance with their respective Creative Commons and Royalty-Free licenses.');
  return lines.join('\n');
}

