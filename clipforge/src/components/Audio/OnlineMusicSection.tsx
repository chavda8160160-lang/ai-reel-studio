import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Play, 
  Plus, 
  Star, 
  ShieldCheck, 
  RefreshCw, 
  WifiOff, 
  FileText, 
  Copy, 
  Check, 
  Sparkles,
  Clock
} from 'lucide-react';
import { 
  musicProvider, 
  ONLINE_MUSIC_CATEGORIES, 
  type OnlineMusicCategory, 
  type MusicTrack,
  getFavoriteTracks,
  isFavoriteTrack,
  toggleFavoriteTrack,
  getRecentTracks,
  addRecentTrack,
  getProjectAttributions,
  addProjectAttribution,
  generateCreditsText
} from '../../services/musicService';
import { useEditorStore } from '../../store/useEditorStore';

interface OnlineMusicSectionProps {
  onAddTrack?: (track: MusicTrack) => void;
}

export const OnlineMusicSection: React.FC<OnlineMusicSectionProps> = ({ onAddTrack }) => {
  const { openInstagramTrimmer } = useEditorStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OnlineMusicCategory>('Trending');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'favorites' | 'recent' | 'attributions'>('all');

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Audio Preview Management (STRICT: only one preview plays at a time)
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Favorites & Recents state for reactivity
  const [favoritesList, setFavoritesList] = useState<MusicTrack[]>([]);
  const [recentList, setRecentList] = useState<MusicTrack[]>([]);
  const [attributionList, setAttributionList] = useState<MusicTrack[]>([]);
  const [isCopiedCredits, setIsCopiedCredits] = useState(false);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync favorites & recents on load
  const syncLocalLists = useCallback(() => {
    setFavoritesList(getFavoriteTracks());
    setRecentList(getRecentTracks());
    setAttributionList(getProjectAttributions());
  }, []);

  useEffect(() => {
    syncLocalLists();
  }, [syncLocalLists]);

  // Stop preview on unmount
  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.src = '';
      }
    };
  }, []);

  // 400ms Debounced Search & Category Fetching
  const fetchTracks = useCallback(async (query: string, category: string, pageNum = 1, append = false) => {
    if (isOffline) {
      setIsError(true);
      setErrorMessage('You are currently offline. Check your internet connection.');
      return;
    }

    if (pageNum === 1) {
      setIsLoading(true);
      setIsError(false);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const data = await musicProvider.search(query, pageNum, category);
      if (append) {
        setTracks(prev => [...prev, ...data.results]);
      } else {
        setTracks(data.results);
      }
      setHasMore(data.hasMore);
      setIsError(false);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Failed to load online music. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isOffline]);

  // Debounced effect for query and category changes
  useEffect(() => {
    if (activeSubTab !== 'all') return;

    setPage(1);
    const timer = setTimeout(() => {
      fetchTracks(searchQuery, selectedCategory, 1, false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, activeSubTab, fetchTracks]);

  // Toggle Single Audio Preview (Strict: pauses previous if active)
  const togglePreview = (track: MusicTrack) => {
    if (previewingTrackId === track.id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPreviewingTrackId(null);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
      }
      const audio = audioPreviewRef.current;
      audio.pause();
      audio.src = track.audioUrl;
      audio.currentTime = 0;
      audio.play().catch(e => {
        console.warn('Playback blocked or failed:', e);
        setPreviewingTrackId(null);
      });
      audio.onended = () => setPreviewingTrackId(null);
      audio.onerror = () => setPreviewingTrackId(null);
      setPreviewingTrackId(track.id);
    }
  };

  // Add Track Handler
  const handleAdd = (track: MusicTrack) => {
    // Add to recent & project attribution
    addRecentTrack(track);
    addProjectAttribution(track);
    syncLocalLists();

    if (onAddTrack) {
      onAddTrack(track);
      return;
    }

    // Default: Open the Instagram Trimmer or add directly to audio track
    openInstagramTrimmer({
      song: {
        id: track.id,
        name: track.title,
        artist: track.artist,
        duration: track.duration,
        thumbnailUrl: track.coverUrl,
        previewUrl: track.audioUrl,
        category: selectedCategory,
      }
    });
  };

  // Toggle Favorite
  const handleToggleFavorite = (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteTrack(track);
    syncLocalLists();
  };

  // Load More (Pagination / Infinite scroll)
  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTracks(searchQuery, selectedCategory, nextPage, true);
  };

  // Copy Credits to Clipboard
  const handleCopyCredits = () => {
    const text = generateCreditsText(attributionList);
    navigator.clipboard.writeText(text);
    setIsCopiedCredits(true);
    setTimeout(() => setIsCopiedCredits(false), 2400);
  };

  const formatSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Active track list depending on sub-tab
  const displayedTracks = activeSubTab === 'favorites' 
    ? favoritesList 
    : activeSubTab === 'recent' 
    ? recentList 
    : tracks;

  return (
    <div className="space-y-3 font-sans select-none">
      
      {/* 1. Header with Champagne Gold Accent */}
      <div className="flex items-center justify-between pb-1 border-b border-[#2A241D]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#C9A66B]/15 border border-[#C9A66B]/40 flex items-center justify-center text-[#C9A66B]">
            <Sparkles className="w-3 h-3" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#E8E6E1]">
              Online Music Library
            </span>
            <span className="text-[9px] text-[#C9A66B] font-mono block">
              100% Royalty-Free & CC-Licensed
            </span>
          </div>
        </div>

        {/* View Switcher Chips (All, Stars, Recents, Credits) */}
        <div className="flex items-center gap-1 bg-[#16161A] p-0.5 rounded border border-[#2A2A30]">
          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`px-2 py-0.5 text-[9.5px] font-medium rounded transition-colors ${
              activeSubTab === 'all'
                ? 'bg-[#C9A66B] text-black font-bold'
                : 'text-[#8A8A92] hover:text-[#E8E6E1]'
            }`}
            title="Browse Online Catalog"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('favorites');
              syncLocalLists();
            }}
            className={`px-2 py-0.5 text-[9.5px] font-medium rounded flex items-center gap-1 transition-colors ${
              activeSubTab === 'favorites'
                ? 'bg-[#C9A66B] text-black font-bold'
                : 'text-[#8A8A92] hover:text-[#E8E6E1]'
            }`}
            title="Starred Favorites"
          >
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>{favoritesList.length}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('recent');
              syncLocalLists();
            }}
            className={`px-2 py-0.5 text-[9.5px] font-medium rounded flex items-center gap-1 transition-colors ${
              activeSubTab === 'recent'
                ? 'bg-[#C9A66B] text-black font-bold'
                : 'text-[#8A8A92] hover:text-[#E8E6E1]'
            }`}
            title="Recently Used"
          >
            <Clock className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('attributions');
              syncLocalLists();
            }}
            className={`px-1.5 py-0.5 text-[9.5px] font-medium rounded transition-colors ${
              activeSubTab === 'attributions'
                ? 'bg-[#C9A66B] text-black font-bold'
                : 'text-[#8A8A92] hover:text-[#E8E6E1]'
            }`}
            title="Project Attributions & CC Credits"
          >
            <FileText className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* 2. Search Box (Debounced 400ms) */}
      {activeSubTab === 'all' && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8A92]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search royalty-free songs, artists, lofi..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded bg-[#16161A] border border-[#2E2E36] text-[#E8E6E1] placeholder-[#64646E] outline-none focus:border-[#C9A66B] transition-colors"
          />
        </div>
      )}

      {/* 3. Category Chips with Horizontal Scroll */}
      {activeSubTab === 'all' && (
        <div 
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]"
          style={{ maskImage: 'linear-gradient(to right, black 90%, transparent 100%)' }}
        >
          {ONLINE_MUSIC_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full border whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2A241D] text-[#C9A66B] border-[#C9A66B] font-bold shadow-xs'
                    : 'bg-[#18181C] text-[#8A8A92] hover:text-[#E8E6E1] border-[#2C2C33]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="p-2 rounded bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>You are offline. Showing cached / favorite tracks.</span>
        </div>
      )}

      {/* 4. ATTRIBUTION & CREDITS TAB */}
      {activeSubTab === 'attributions' && (
        <div className="p-3 bg-[#16161A] rounded-lg border border-[#2A2A30] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#C9A66B] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Project CC Attributions ({attributionList.length})</span>
            </span>
            <button
              type="button"
              onClick={handleCopyCredits}
              className="px-2 py-1 rounded bg-[#2A241D] hover:bg-[#342D23] border border-[#C9A66B]/40 text-[#C9A66B] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              {isCopiedCredits ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{isCopiedCredits ? 'Copied!' : 'Export Credits Text'}</span>
            </button>
          </div>

          <p className="text-[10px] text-[#8A8A92]">
            When publishing video reels, include these Creative Commons credits in your video description or credits:
          </p>

          {attributionList.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-[#71717A]">
              No online tracks added yet. Use "Add" on any online song to automatically track its CC license here.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {attributionList.map((t, idx) => (
                <div key={idx} className="p-2 rounded bg-[#1C1C22] border border-[#2A2A32] text-[10.5px] space-y-1">
                  <div className="flex justify-between items-center text-[#E8E6E1] font-semibold">
                    <span className="truncate">{t.title}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#C9A66B]/20 text-[#C9A66B] border border-[#C9A66B]/30 font-mono">
                      {t.licenseBadge}
                    </span>
                  </div>
                  <p className="text-[#8A8A92] text-[10px]">Artist: {t.artist} • Source: {t.provider}</p>
                  <p className="text-[9px] text-[#71717A] font-mono truncate">{t.license}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. RESULTS LIST */}
      {activeSubTab !== 'attributions' && (
        <div className="space-y-1.5">
          
          {/* Loading Skeletons */}
          {isLoading && (
            <div className="space-y-1.5 animate-pulse">
              {[1, 2, 3, 4, 5].map((k) => (
                <div key={k} className="h-14 bg-[#18181E] rounded-lg border border-[#26262E] flex items-center p-2 gap-2.5">
                  <div className="w-10 h-10 rounded bg-[#262630]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-[#262630] rounded w-3/4" />
                    <div className="h-2 bg-[#222228] rounded w-1/2" />
                  </div>
                  <div className="w-12 h-6 bg-[#262630] rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error State with Retry Button */}
          {!isLoading && isError && (
            <div className="py-6 px-3 bg-[#1C1616] border border-red-500/30 rounded-lg text-center space-y-2">
              <p className="text-xs text-red-300 font-medium">{errorMessage}</p>
              <button
                type="button"
                onClick={() => fetchTracks(searchQuery, selectedCategory, 1, false)}
                className="px-3 py-1 rounded bg-[#2A241D] hover:bg-[#342D23] border border-[#C9A66B]/50 text-[#C9A66B] text-[10.5px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Search</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && displayedTracks.length === 0 && (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-[#8A8A92]">
                {activeSubTab === 'favorites' 
                  ? 'No favorite tracks saved yet. Click the star icon on any song.' 
                  : activeSubTab === 'recent'
                  ? 'No recently used tracks yet.'
                  : `No songs found for "${searchQuery || selectedCategory}"`}
              </p>
              {activeSubTab === 'all' && searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-[#C9A66B] underline cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Track Items */}
          {!isLoading && !isError && displayedTracks.map((track) => {
            const isPlaying = previewingTrackId === track.id;
            const isFav = isFavoriteTrack(track.id);

            return (
              <div
                key={track.id}
                className={`group flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer bg-[#141418] hover:bg-[#1A1A22] ${
                  isPlaying
                    ? 'border-[#C9A66B] ring-1 ring-[#C9A66B]/40 shadow-md'
                    : 'border-[#26262E] hover:border-[#C9A66B]/40'
                }`}
                onClick={() => togglePreview(track)}
              >
                {/* 1. Cover Art with Play/Pause Button */}
                <div 
                  className="relative w-10 h-10 rounded-md overflow-hidden bg-[#24242C] shrink-0 border border-white/10 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePreview(track);
                  }}
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Play / Equalizer Overlay */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                    isPlaying ? 'bg-black/60 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'
                  }`}>
                    {isPlaying ? (
                      <div className="flex items-end gap-[2px] h-3.5">
                        <span className="w-[2.5px] bg-[#C9A66B] rounded-full animate-bounce h-2" />
                        <span className="w-[2.5px] bg-[#C9A66B] rounded-full animate-bounce h-3.5" style={{ animationDelay: '150ms' }} />
                        <span className="w-[2.5px] bg-[#C9A66B] rounded-full animate-bounce h-2.5" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md">
                        <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Middle: Track Info & License Badge */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-[11px] font-bold text-[#E8E6E1] truncate group-hover:text-white" title={track.title}>
                    {track.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8A8A92] truncate">
                    <span className="truncate">{track.artist}</span>
                    <span>•</span>
                    <span className="font-mono">{formatSec(track.duration)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-[#C9A66B]/15 text-[#C9A66B] border border-[#C9A66B]/25 font-semibold">
                      {track.licenseBadge}
                    </span>
                    <span className="text-[8.5px] text-[#71717A] truncate font-mono">
                      {track.provider}
                    </span>
                  </div>
                </div>

                {/* 3. Star (Favorite) Button */}
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(track, e)}
                  className={`p-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer ${
                    isFav ? 'text-[#C9A66B]' : 'text-[#71717A] hover:text-[#C9A66B]'
                  }`}
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                </button>

                {/* 4. "Add" Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd(track);
                  }}
                  className="h-6.5 px-2.5 rounded bg-[#C9A66B] hover:bg-[#D4AF37] active:scale-95 text-black text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all shadow-xs cursor-pointer"
                  title="Add to Timeline"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>
            );
          })}

          {/* Pagination / Load More Button */}
          {!isLoading && !isError && activeSubTab === 'all' && hasMore && displayedTracks.length > 0 && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full py-1.5 rounded bg-[#1A1A20] hover:bg-[#22222A] border border-[#2A2A34] text-[10.5px] text-[#C9A66B] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Loading more tracks...</span>
                  </>
                ) : (
                  <span>Load More Tracks</span>
                )}
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
