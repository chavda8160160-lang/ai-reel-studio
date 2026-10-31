import React, { useState, useRef } from 'react';
import { 
  FolderPlus, 
  Music, 
  Type, 
  Smile, 
  Sparkles, 
  Layers, 
  SlidersHorizontal, 
  Subtitles, 
  Search, 
  UploadCloud, 
  Plus, 
  Play, 
  Square,
  Lock,
  Clock,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Radio
} from 'lucide-react';
import { AudioSnippetModal, type AudioSnippetTarget } from './Modals/AudioSnippetModal';
import { OnlineMusicSection } from './Audio/OnlineMusicSection';
import { useEditorStore } from '../store/useEditorStore';
import type { LeftPanelTab } from '../types/editor';
import { 
  MOCK_MEDIA_ASSETS, 
  MOCK_AUDIO_ASSETS, 
  MOCK_TEXT_ASSETS, 
  MOCK_STICKER_ASSETS, 
  MOCK_EFFECT_ASSETS, 
  MOCK_FILTER_ASSETS,
  MOCK_TRANSITION_ASSETS,
  MOCK_CAPTION_ASSETS,
  type AssetCard
} from '../data/mockAssets';

interface TabConfig {
  id: LeftPanelTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { id: 'media', label: 'Media', icon: FolderPlus },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'stickers', label: 'Stickers', icon: Smile },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'transitions', label: 'Transitions', icon: Layers },
  { id: 'filters', label: 'Filters', icon: SlidersHorizontal },
  { id: 'captions', label: 'Captions', icon: Subtitles },
];

export const MediaPanel: React.FC = () => {
  const { 
    activeLeftTab, 
    setActiveLeftTab, 
    addClipToTrack, 
    selectClip,
    setActiveInspectorTab,
    selectedClipId,
    tracks,
    updateClipProperties,
    currentTime,
    setProModalOpen, 
    loadVideoMedia, 
    loadAudioMedia,
    isSidebarCollapsed,
    openInstagramTrimmer,
    toggleSidebar,
    mediaTypeFilter,
    setMediaTypeFilter 
  } = useEditorStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customUploads, setCustomUploads] = useState<AssetCard[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [audioSourceMode, setAudioSourceMode] = useState<'online' | 'local'>('online');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [snippetTarget, setSnippetTarget] = useState<AudioSnippetTarget | null>(null);

  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Get active video clip to show active filter / grade
  const activeVideoClip = tracks.find(t => t.type === 'video')?.clips.find(c => c.id === selectedClipId) 
    || tracks.find(t => t.type === 'video')?.clips[0];

  // Get assets for current active tab
  const getTabAssets = (): AssetCard[] => {
    switch (activeLeftTab) {
      case 'media': {
        const allMedia = [...customUploads, ...MOCK_MEDIA_ASSETS];
        if (mediaTypeFilter === 'video') return allMedia.filter(a => a.type === 'video');
        if (mediaTypeFilter === 'audio') return allMedia.filter(a => a.type === 'audio');
        if (mediaTypeFilter === 'image') return allMedia.filter(a => a.type === 'sticker' || a.tags.includes('image'));
        return allMedia;
      }
      case 'audio':
        return MOCK_AUDIO_ASSETS;
      case 'text':
        return MOCK_TEXT_ASSETS;
      case 'stickers':
        return MOCK_STICKER_ASSETS;
      case 'effects':
        return MOCK_EFFECT_ASSETS;
      case 'transitions':
        return MOCK_TRANSITION_ASSETS;
      case 'filters':
        return MOCK_FILTER_ASSETS;
      case 'captions':
        return MOCK_CAPTION_ASSETS;
      default:
        return MOCK_MEDIA_ASSETS;
    }
  };

  const currentAssets = getTabAssets();
  const categories = ['All', ...Array.from(new Set(currentAssets.map(a => a.category)))];

  // AND logic: active category AND search query
  const filteredAssets = currentAssets.filter(asset => {
    const matchesCategory = activeCategory === 'All' || asset.category.toLowerCase() === activeCategory.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      asset.name.toLowerCase().includes(query) || 
      asset.tags.some(t => t.toLowerCase().includes(query)) ||
      asset.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const processFiles = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name);
      const isVideo = file.type.startsWith('video') || /\.(mp4|mov|webm|mkv|avi|m4v|3gp|flv|wmv|ts)$/i.test(file.name);
      const isImage = file.type.startsWith('image') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);

      if (isVideo) {
        // 1. Immediately load video media so UI updates instantly without waiting
        loadVideoMedia(file.name, url, 15);
        setToastMessage(`✓ Imported video: "${file.name}"`);
        setTimeout(() => setToastMessage(null), 3000);

        // 2. When metadata loads, refine with exact duration
        const tempVid = document.createElement('video');
        tempVid.preload = 'metadata';
        tempVid.src = url;
        tempVid.onloadedmetadata = () => {
          const realDur = Math.round(tempVid.duration) || 15;
          loadVideoMedia(file.name, url, realDur);
        };

        const newAsset: AssetCard = {
          id: `upload-${Date.now()}-${index}`,
          category: 'Custom Uploads',
          name: file.name,
          duration: 15.0,
          thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300&q=80',
          type: 'video',
          tags: ['uploaded', 'local', 'video'],
          previewUrl: url,
        };
        setCustomUploads(prev => [newAsset, ...prev]);
        setActiveCategory('All');
      } else if (isImage) {
        const newAsset: AssetCard = {
          id: `upload-${Date.now()}-${index}`,
          category: 'Custom Uploads',
          name: file.name,
          duration: 5.0,
          thumbnailUrl: url,
          type: 'sticker',
          tags: ['uploaded', 'local', 'image', 'logo', 'overlay'],
          previewUrl: url,
        };
        setCustomUploads(prev => [newAsset, ...prev]);
        setToastMessage(`✓ Imported image: "${file.name}"`);
        setTimeout(() => setToastMessage(null), 3000);
      } else if (isAudio) {
        loadAudioMedia(file.name, url, 30);
        setToastMessage(`✓ Imported audio: "${file.name}"`);
        setTimeout(() => setToastMessage(null), 3000);

        const tempAud = new Audio(url);
        tempAud.onloadedmetadata = () => {
          const realDur = Math.round(tempAud.duration) || 30;
          loadAudioMedia(file.name, url, realDur);
        };

        const newAsset: AssetCard = {
          id: `upload-${Date.now()}-${index}`,
          category: 'Custom Uploads',
          name: file.name,
          duration: 30.0,
          thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
          type: 'audio',
          tags: ['uploaded', 'local', 'audio'],
          previewUrl: url,
        };
        setCustomUploads(prev => [newAsset, ...prev]);
        setActiveCategory('All');
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Audio Preview Handler
  const toggleAudioPreview = (asset: AssetCard) => {
    if (previewingAudioId === asset.id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.currentTime = 0;
      }
      setPreviewingAudioId(null);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
      }
      const audio = audioPreviewRef.current;
      audio.src = asset.previewUrl || '/rendered-reels/bgm-cyber.mp3';
      audio.currentTime = 0;
      audio.play().catch(() => {});
      audio.onended = () => setPreviewingAudioId(null);
      setPreviewingAudioId(asset.id);
    }
  };

  const handleApplySnippet = (offset: number, duration: number) => {
    if (!snippetTarget) return;

    addClipToTrack('track-audio', {
      title: `${snippetTarget.name} - ${snippetTarget.artist}`,
      type: 'audio',
      start: currentTime,
      duration: duration,
      sourceDuration: snippetTarget.duration,
      offset: offset,
      thumbnail: snippetTarget.thumbnailUrl,
      src: snippetTarget.previewUrl,
      waveform: snippetTarget.waveform,
      color: '#3d5a4f',
      properties: {
        volume: 0.9,
        fadeIn: 0.5,
        fadeOut: 1.0,
        isMuted: false,
      }
    });

    setToastMessage(`✓ Added ${duration.toFixed(1)}s slice of "${snippetTarget.name}" to Audio Track`);
    setTimeout(() => setToastMessage(null), 3200);
    setActiveInspectorTab('audio');
    setSnippetTarget(null);
  };

  const handleAddAsset = (asset: AssetCard) => {
    if (asset.isPro) {
      setProModalOpen(true);
      return;
    }

    if (asset.comingSoon) {
      return; // Disabled item
    }

    if (asset.type === 'video') {
      const dur = asset.duration || 15;
      addClipToTrack('track-video', {
        title: asset.name,
        type: 'video',
        start: currentTime,
        duration: dur,
        sourceDuration: dur,
        offset: 0,
        thumbnail: asset.thumbnailUrl,
        src: asset.previewUrl || '/rendered-reels/reel-demo.mp4',
        color: '#3b4a63',
      });
    } else if (asset.type === 'audio') {
      const dur = asset.duration || 30;
      openInstagramTrimmer({
        song: {
          id: asset.id,
          name: asset.name,
          artist: asset.category || 'Soundtrack',
          duration: dur,
          previewUrl: asset.previewUrl || '/rendered-reels/bgm-cyber.mp3',
          category: asset.category,
          waveform: [40, 60, 80, 50, 90, 70, 45, 80, 70, 60, 85, 80, 65, 60, 75, 85],
        }
      });
      return;
    } else if (asset.type === 'text' || asset.type === 'caption') {
      // Rule 3: Text presets add a text clip on text track at playhead (default 3s), selected immediately with inline edit mode
      const payload = asset.textPayload || {
        text: asset.name,
        fontStyle: 'classic',
        fontColor: '#E8E6E1',
        fontSize: 28,
        scale: 1,
        posY: 0
      };

      addClipToTrack('track-text', {
        title: asset.name,
        type: 'text',
        start: currentTime,
        duration: 3.0, // default 3s
        sourceDuration: 20.0,
        offset: 0,
        color: '#5c5246',
        properties: {
          posX: 0,
          posY: payload.posY || 0,
          scale: payload.scale || 1,
          rotation: 0,
          opacity: 1,
          flipH: false,
          flipV: false,
          volume: 1,
          fadeIn: 0,
          fadeOut: 0,
          isMuted: false,
          speed: 1,
          adjust: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, vignette: 0, sharpen: 0 },
          filter: 'none',
          text: payload.text,
          fontColor: payload.fontColor || '#E8E6E1',
          fontStyle: payload.fontStyle || 'classic',
          fontSize: payload.fontSize || 28,
        }
      });
      setActiveInspectorTab('text');
    } else if (asset.type === 'sticker') {
      // Rule 4: Stickers add overlay clip at playhead
      addClipToTrack('track-sticker', {
        title: asset.name,
        type: 'sticker',
        start: currentTime,
        duration: 3.0,
        sourceDuration: 20.0,
        offset: 0,
        thumbnail: asset.thumbnailUrl,
        src: asset.previewUrl || asset.thumbnailUrl,
        color: '#4d4560',
        properties: {
          scale: 0.9,
          rotation: 0,
          posX: 0,
          posY: -20,
          opacity: 1,
          blendMode: 'normal'
        }
      });
      setActiveInspectorTab('sticker');
    } else if (asset.type === 'filter') {
      // Real filter application on video clip
      const filterMap: Record<string, string> = {
        'f-1': 'cinematic',
        'f-2': 'warm',
        'f-3': 'noir',
        'f-4': 'cyberpunk',
        'f-5': 'vibrant',
        'f-0': 'none'
      };
      const chosenFilter = filterMap[asset.id] || 'cinematic';
      const targetVideo = tracks.find(t => t.type === 'video')?.clips.find(c => c.id === selectedClipId) 
        || tracks.find(t => t.type === 'video')?.clips[0];
      if (targetVideo) {
        updateClipProperties(targetVideo.id, { filter: chosenFilter });
        selectClip(targetVideo.id, 'track-video');
        setActiveInspectorTab('adjust');
      }
    } else if (asset.type === 'effect') {
      // Real visual effect
      const targetVideo = tracks.find(t => t.type === 'video')?.clips.find(c => c.id === selectedClipId) 
        || tracks.find(t => t.type === 'video')?.clips[0];
      const effectFilters: Record<string, any> = {
        'e-1': { filter: 'vibrant', inAnimation: 'Fade In' },
        'e-2': { filter: 'warm', inAnimation: 'Zoom In' },
        'e-3': { filter: 'noir', inAnimation: 'Dissolve' },
        'e-4': { filter: 'cyberpunk', inAnimation: 'Slide Left' }
      };
      if (targetVideo) {
        updateClipProperties(targetVideo.id, effectFilters[asset.id] || { filter: 'cinematic' });
        selectClip(targetVideo.id, 'track-video');
        setActiveInspectorTab('animation');
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, asset: AssetCard) => {
    if (asset.comingSoon) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className={`${isSidebarCollapsed ? 'w-14' : 'w-[320px]'} h-full border-r flex select-none shrink-0 overflow-hidden bg-[#18181C] border-[#2A2A30] transition-[width] duration-150`}>
      {/* 1. Left Vertical Icon Tabs Strip (58px) */}
      <nav className="w-14 border-r py-2 flex flex-col items-center gap-1 shrink-0 overflow-y-auto bg-[#141417] border-[#242429]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeLeftTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveLeftTab(tab.id);
                setActiveCategory('All');
                setSearchQuery('');
                if (isSidebarCollapsed) toggleSidebar();
              }}
              className={`w-11 py-2 px-0.5 rounded-md flex flex-col items-center justify-center gap-1 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A66B] ${
                isActive 
                  ? 'bg-[#2A241D] text-[#C9A66B] font-semibold border border-[#C9A66B]/50 shadow-sm' 
                  : 'text-[#8A8A92] hover:text-[#E8E6E1] hover:bg-[#1E1E22]'
              }`}
              title={tab.label}
            >
              <Icon className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="text-[9.5px] tracking-tight leading-none">{tab.label}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-2 border-t border-[#242429] w-full flex justify-center">
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 rounded flex items-center justify-center text-[#8A8A92] hover:text-[#E8E6E1] hover:bg-[#1E1E22] transition-colors"
            title={isSidebarCollapsed ? "Expand Panel" : "Collapse Panel"}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* 2. Main Content Panel (262px) */}
      {!isSidebarCollapsed && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#18181C]">
          {/* Panel Header */}
          <div className="p-3 border-b flex flex-col gap-2 shrink-0 border-[#26262D]">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#D8D6D1]">
                {TABS.find(t => t.id === activeLeftTab)?.label} Library
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8A8A92] font-mono">
                  {filteredAssets.length} items
                </span>
                <button
                  onClick={toggleSidebar}
                  className="p-1 rounded text-[#8A8A92] hover:text-[#E8E6E1] hover:bg-[#1F1F24] transition-colors"
                  title="Collapse panel"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Audio Tab: Mode Switcher (Online Licensed Music vs Local SFX) */}
            {activeLeftTab === 'audio' && (
              <div className="flex items-center p-0.5 rounded-md bg-[#121215] border border-[#2A2A32]">
                <button
                  type="button"
                  onClick={() => {
                    setAudioSourceMode('online');
                  }}
                  className={`flex-1 py-1 px-1.5 rounded text-[10px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                    audioSourceMode === 'online'
                      ? 'bg-[#2A241D] text-[#C9A66B] border border-[#C9A66B]/50 font-bold shadow-xs'
                      : 'text-[#8A8A92] hover:text-[#E8E6E1]'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-[#C9A66B]" />
                  <span>Online Music</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudioSourceMode('local');
                    setSearchQuery('');
                  }}
                  className={`flex-1 py-1 px-1.5 rounded text-[10px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                    audioSourceMode === 'local'
                      ? 'bg-[#2A2A32] text-white font-bold shadow-sm'
                      : 'text-[#8A8A92] hover:text-[#E8E6E1]'
                  }`}
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>SFX & Local</span>
                </button>
              </div>
            )}

            {/* Media Type Filter Chips (When on Media Tab) */}
            {activeLeftTab === 'media' && (
              <div className="flex items-center gap-1">
                {(['all', 'video', 'audio', 'image'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setMediaTypeFilter(filterType)}
                    className={`flex-1 text-[10px] py-1 rounded text-center font-medium capitalize transition-colors ${
                      mediaTypeFilter === filterType
                        ? 'bg-[#4f8cff] text-white font-semibold shadow-xs'
                        : 'bg-[#232326] text-[#8a8a93] hover:text-[#d4d4d8]'
                    }`}
                  >
                    {filterType === 'all' ? 'All' : filterType === 'video' ? 'Videos' : filterType === 'audio' ? 'Audio' : 'Images'}
                  </button>
                ))}
              </div>
            )}

            {/* Search Box & Category Filter Chips (For tabs other than Online Music, which has its own dedicated search suite) */}
            {!(activeLeftTab === 'audio' && audioSourceMode === 'online') && (
              <>
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64646E]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeLeftTab}...`}
                    className="w-full text-xs placeholder-[#64646E] pl-7 pr-7 py-1 rounded border outline-none bg-[#1F1F24] border-[#2E2E36] text-[#E8E6E1] focus:border-[#4f8cff] transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787882] hover:text-[#E8E6E1] p-0.5"
                      title="Clear input"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Category Filter Chips with Horizontal Fading Scroll */}
                <div 
                  className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar"
                  style={{ maskImage: 'linear-gradient(to right, black 88%, transparent 100%)' }}
                >
                  {categories.map((cat) => {
                    const isSelected = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border whitespace-nowrap transition-colors ${
                          isSelected
                            ? 'bg-[#2A251D] text-[#C9A66B] border-[#C9A66B]/50 font-semibold shadow-sm'
                            : 'bg-[#1F1F24] text-[#8A8A92] hover:text-[#E8E6E1] border-[#2C2C33]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Assets Content Area */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 relative">
            {/* Quick banner in Media tab when Audio filter is active */}
            {activeLeftTab === 'media' && mediaTypeFilter === 'audio' && (
              <div 
                onClick={() => {
                  setActiveLeftTab('audio');
                  setAudioSourceMode('online');
                }}
                className="p-2.5 rounded-md bg-gradient-to-r from-[#833AB4]/20 via-[#FD1D1D]/20 to-[#F56040]/20 border border-[#FD1D1D]/40 flex items-center justify-between cursor-pointer hover:border-[#FD1D1D] transition-all shadow-xs group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#833AB4] to-[#F56040] flex items-center justify-center text-white">
                    <Radio className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold text-white group-hover:text-[#F56040] transition-colors">
                      Browse Online Songs (Instagram Reels)
                    </div>
                    <div className="text-[9px] text-[#A1A1AA]">25+ trending viral songs ready to use</div>
                  </div>
                </div>
                <span className="text-[10px] text-[#F56040] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            )}

            {/* CASE 1: Online Licensed Royalty-Free Music Library */}
            {activeLeftTab === 'audio' && audioSourceMode === 'online' ? (
              <OnlineMusicSection />
            ) : (
              /* CASE 2: Standard Media / SFX grid */
              <>
                {/* Media Tab Specific: Import Dropzone */}
                {activeLeftTab === 'media' && (
                  <label 
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-md p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors group ${
                      isDraggingOver 
                        ? 'border-[#C9A66B] bg-[#282218]' 
                        : 'border-[#3A3A44] hover:border-[#C9A66B]/70 bg-[#141418]'
                    }`}
                  >
                    <input
                      type="file"
                      multiple
                      accept="video/*,audio/*,image/*,.mp4,.mov,.webm,.mkv,.avi,.mp3,.wav,.m4v,.png,.jpg,.jpeg,.webp,.svg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-7 h-7 rounded-full bg-[#202026] group-hover:bg-[#2A251D] flex items-center justify-center text-[#8A8A92] group-hover:text-[#C9A66B] transition-colors">
                      <UploadCloud className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <p className="text-[11px] font-medium text-[#D8D6D1] group-hover:text-white">
                      {isDraggingOver ? 'Drop Media Now' : 'Import Local Footage'}
                    </p>
                    <p className="text-[9.5px] text-[#787882]">
                      Click or drag video (MP4, MOV) or audio (MP3)
                    </p>
                  </label>
                )}

                {/* Local SFX Import Dropzone */}
                {activeLeftTab === 'audio' && audioSourceMode === 'local' && (
                  <label 
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-md p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors group ${
                      isDraggingOver 
                        ? 'border-[#4f8cff] bg-[#1e293b]' 
                        : 'border-[#3A3A44] hover:border-[#4f8cff]/70 bg-[#141418]'
                    }`}
                  >
                    <input
                      type="file"
                      multiple
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-6 h-6 rounded-full bg-[#202026] group-hover:bg-[#1E293B] flex items-center justify-center text-[#8A8A92] group-hover:text-[#4f8cff] transition-colors">
                      <UploadCloud className="w-3.5 h-3.5 stroke-[1.5]" />
                    </div>
                    <p className="text-[10.5px] font-medium text-[#D8D6D1] group-hover:text-white">
                      Import Custom Audio (MP3, WAV)
                    </p>
                  </label>
                )}

                {/* Grid of Asset Cards */}
                <div className="grid grid-cols-2 gap-2">
                  {filteredAssets.map((asset) => {
                    const isAudioPreviewing = previewingAudioId === asset.id;
                    const isFilterActive = asset.type === 'filter' && (
                      (asset.id === 'f-1' && activeVideoClip?.properties.filter === 'cinematic') ||
                      (asset.id === 'f-2' && activeVideoClip?.properties.filter === 'warm') ||
                      (asset.id === 'f-3' && activeVideoClip?.properties.filter === 'noir') ||
                      (asset.id === 'f-4' && activeVideoClip?.properties.filter === 'cyberpunk') ||
                      (asset.id === 'f-5' && activeVideoClip?.properties.filter === 'vibrant') ||
                      (asset.id === 'f-0' && (!activeVideoClip?.properties.filter || activeVideoClip?.properties.filter === 'none'))
                    );

                    return (
                      <div
                        key={asset.id}
                        draggable={!asset.comingSoon}
                        onDragStart={(e) => handleDragStart(e, asset)}
                        onClick={() => handleAddAsset(asset)}
                        className={`group relative border rounded-md overflow-hidden transition-all flex flex-col bg-[#141418] ${
                          asset.comingSoon 
                            ? 'border-[#222228] opacity-60 cursor-not-allowed'
                            : isFilterActive
                            ? 'border-[#C9A66B] ring-1 ring-[#C9A66B]/50 cursor-pointer shadow-md'
                            : 'border-[#272730] hover:border-[#C9A66B]/60 cursor-pointer'
                        }`}
                      >
                        <div className="relative aspect-video w-full bg-[#0D0D10] overflow-hidden flex items-center justify-center">
                          <img
                            src={asset.thumbnailUrl}
                            alt={asset.name}
                            className={`w-full h-full object-cover transition-transform duration-300 ${
                              asset.comingSoon ? 'grayscale' : 'group-hover:scale-105'
                            }`}
                            loading="lazy"
                          />

                          {/* Active Filter Check Badge */}
                          {isFilterActive && (
                            <div className="absolute top-1 left-1 bg-[#C9A66B] text-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}

                          {/* Duration Badge */}
                          {asset.duration && (
                            <div className="absolute bottom-1 right-1 bg-black/85 text-[8.5px] font-mono font-medium text-white px-1 rounded flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 stroke-[1.5]" />
                              <span>{asset.duration}s</span>
                            </div>
                          )}

                          {/* Pro Badge */}
                          {asset.isPro && (
                            <div className="absolute top-1 right-1 bg-[#C9A66B] text-black text-[8.5px] font-bold px-1 rounded flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5 stroke-[2]" />
                              <span>PRO</span>
                            </div>
                          )}

                          {/* Coming Soon Badge (Rule 6: No fake items) */}
                          {asset.comingSoon && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#C9A66B] bg-[#1F1F24] border border-[#C9A66B]/40 px-2 py-0.5 rounded shadow">
                                Coming Soon
                              </span>
                            </div>
                          )}

                          {/* Hover Overlay Actions */}
                          {!asset.comingSoon && (
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {asset.type === 'audio' ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAudioPreview(asset);
                                    }}
                                    className="w-7 h-7 rounded-full bg-[#1F1F24] border border-[#3C3C48] text-white flex items-center justify-center hover:bg-[#C9A66B] hover:text-black hover:border-transparent transition-all shadow"
                                    title={isAudioPreviewing ? "Stop Preview" : "Preview Sound"}
                                  >
                                    {isAudioPreviewing ? (
                                      <Square className="w-3 h-3 fill-current" />
                                    ) : (
                                      <Play className="w-3 h-3 fill-current ml-0.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddAsset(asset);
                                    }}
                                    className="w-7 h-7 rounded-full bg-[#C9A66B] text-black flex items-center justify-center hover:scale-105 transition-transform shadow"
                                    title="Add to Audio Track"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="w-7 h-7 rounded-full bg-[#C9A66B] text-black flex items-center justify-center hover:scale-105 transition-transform shadow"
                                  title="Add to Timeline"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="p-1.5 flex flex-col">
                          <span className="text-[10.5px] font-medium text-[#D8D6D1] truncate" title={asset.name}>
                            {asset.name}
                          </span>
                          <span className="text-[9px] text-[#787882] truncate">
                            {asset.category}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty Search Result (Rule 2) */}
                {filteredAssets.length === 0 && (
                  <div className="text-center py-8 px-3 space-y-2.5">
                    <p className="text-[11px] text-[#8A8A92]">
                      No results for <span className="text-[#E8E6E1] font-semibold">"{searchQuery || activeCategory}"</span>
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('All');
                      }}
                      className="text-[10px] text-[#C9A66B] bg-[#2A241D] border border-[#C9A66B]/40 px-2.5 py-1 rounded hover:bg-[#342D23] transition-colors"
                    >
                      Clear search & filters
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Floating Toast Notification */}
            {toastMessage && (
              <div className="sticky bottom-2 left-0 right-0 bg-[#1e293b] border border-[#3b82f6]/50 text-white text-[11px] font-medium py-2 px-3 rounded-lg shadow-2xl flex items-center justify-between z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
                  <span className="truncate">{toastMessage}</span>
                </div>
                <button 
                  onClick={() => setToastMessage(null)} 
                  className="text-zinc-400 hover:text-white ml-2 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
      </div>
    )}

    {/* Instagram Audio Snippet / Trim Modal */}
    <AudioSnippetModal
      song={snippetTarget}
      isOpen={!!snippetTarget}
      onClose={() => setSnippetTarget(null)}
      onApply={handleApplySnippet}
    />
  </div>
);
};
