import React, { useState } from 'react';
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
  Lock,
  Clock
} from 'lucide-react';
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
  const { activeLeftTab, setActiveLeftTab, addClipToTrack, setProModalOpen } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customUploads, setCustomUploads] = useState<AssetCard[]>([]);

  // Get assets for current active tab
  const getTabAssets = (): AssetCard[] => {
    switch (activeLeftTab) {
      case 'media':
        return [...customUploads, ...MOCK_MEDIA_ASSETS];
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

  // Extract unique categories for filter chips
  const categories = ['All', ...Array.from(new Set(currentAssets.map(a => a.category)))];

  // Filtered assets by search & category
  const filteredAssets = currentAssets.filter(asset => {
    const matchesCategory = activeCategory === 'All' || asset.category === activeCategory;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio');
      const newAsset: AssetCard = {
        id: `upload-${Date.now()}-${index}`,
        category: 'Custom Uploads',
        name: file.name,
        duration: 15.0,
        thumbnailUrl: isAudio 
          ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80'
          : 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300&q=80',
        type: isAudio ? 'audio' : 'video',
        tags: ['uploaded', 'local'],
        previewUrl: url,
      };
      setCustomUploads(prev => [newAsset, ...prev]);
    });
  };

  const handleAddAsset = (asset: AssetCard) => {
    if (asset.isPro) {
      setProModalOpen(true);
      return;
    }

    if (asset.type === 'video') {
      addClipToTrack('track-video', {
        title: asset.name,
        type: 'video',
        duration: asset.duration || 10,
        thumbnail: asset.thumbnailUrl,
        color: '#2563EB',
      });
    } else if (asset.type === 'audio') {
      addClipToTrack('track-audio', {
        title: asset.name,
        type: 'audio',
        duration: asset.duration || 30,
        waveform: [50, 70, 90, 60, 100, 80, 45, 90, 75, 60, 95, 85, 70, 65, 80, 90],
        color: '#059669',
      });
    } else if (asset.type === 'text' || asset.type === 'caption') {
      addClipToTrack('track-text', {
        title: asset.name,
        type: 'text',
        duration: 6,
        color: '#D97706',
        properties: {
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
          adjust: { brightness: 0, contrast: 100, saturation: 100, temperature: 0, vignette: 0, sharpen: 0 },
          filter: 'none',
          text: asset.name,
          fontColor: asset.id === 't-1' ? '#FACC15' : '#FFFFFF',
          fontStyle: asset.id === 't-1' ? 'hormozi' : 'clean',
        }
      });
    } else if (asset.type === 'sticker') {
      addClipToTrack('track-sticker', {
        title: asset.name,
        type: 'sticker',
        duration: 6,
        thumbnail: asset.thumbnailUrl,
        color: '#9333EA',
      });
    } else {
      // Effects or filters applied
      useEditorStore.getState().updateClipProperties(
        useEditorStore.getState().selectedClipId || 'clip-video-1',
        { filter: asset.id === 'f-1' ? 'cinematic' : (asset.id === 'f-3' ? 'noir' : 'vibrant') }
      );
    }
  };

  // Drag start handler for timeline drop
  const handleDragStart = (e: React.DragEvent, asset: AssetCard) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-[320px] h-full bg-[#18181B] border-r border-[#2A2A2D] flex select-none shrink-0 overflow-hidden">
      {/* 1. Left Vertical Icon Tabs Strip (64px) */}
      <nav className="w-16 bg-[#131316] border-r border-[#242428] py-2 flex flex-col items-center gap-1 shrink-0 overflow-y-auto">
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
              }}
              className={`w-12 py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                isActive 
                  ? 'bg-[#22D3EE]/15 text-[#22D3EE] font-semibold shadow-sm shadow-cyan-500/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1E1E22]'
              }`}
              title={tab.label}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 2. Main Content Panel (256px) */}
      <div className="flex-1 flex flex-col h-full bg-[#1A1A1D] overflow-hidden">
        {/* Panel Header */}
        <div className="p-3 border-b border-[#2A2A2D] flex flex-col gap-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              {TABS.find(t => t.id === activeLeftTab)?.label} Library
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">
              {filteredAssets.length} items
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeLeftTab}...`}
              className="w-full bg-[#131316] text-xs text-white placeholder-zinc-500 pl-8 pr-2.5 py-1.5 rounded-md border border-[#2A2A2D] focus:border-cyan-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-[#141416] text-zinc-400 hover:text-white border border-[#2A2A2D]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Assets Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Media Tab Specific: Import Dropzone */}
          {activeLeftTab === 'media' && (
            <label className="border-2 border-dashed border-[#34343B] hover:border-cyan-400/70 bg-[#141417]/60 hover:bg-cyan-950/10 rounded-lg p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group">
              <input
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-8 h-8 rounded-full bg-[#202026] group-hover:bg-cyan-500/20 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 transition-colors">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-zinc-300 group-hover:text-white">
                  Import Media
                </p>
                <p className="text-[10px] text-zinc-500">
                  Drag & drop video, audio or image
                </p>
              </div>
            </label>
          )}

          {/* Grid of Asset Cards */}
          <div className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                onClick={() => handleAddAsset(asset)}
                className="group relative bg-[#141417] hover:bg-[#202026] border border-[#2A2A2D] hover:border-cyan-400/50 rounded-md overflow-hidden cursor-pointer transition-all flex flex-col shadow-sm"
              >
                {/* Thumbnail Preview */}
                <div className="relative aspect-video w-full bg-[#0D0D10] overflow-hidden">
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Duration Badge */}
                  {asset.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-sm text-[9px] font-mono font-medium text-white px-1 rounded flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{asset.duration}s</span>
                    </div>
                  )}

                  {/* Pro Badge */}
                  {asset.isPro && (
                    <div className="absolute top-1 right-1 bg-amber-500/90 text-black text-[9px] font-bold px-1 rounded flex items-center gap-0.5 shadow-sm">
                      <Lock className="w-2.5 h-2.5" />
                      <span>PRO</span>
                    </div>
                  )}

                  {/* Hover Overlay with Add Button */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      className="w-7 h-7 rounded-full bg-cyan-400 text-black flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                      title="Add to timeline"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    {asset.type === 'audio' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Preview audio toggle
                        }}
                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                        title="Preview sound"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Name & Tag */}
                <div className="p-1.5 flex flex-col">
                  <span className="text-[11px] font-medium text-zinc-300 group-hover:text-cyan-300 truncate" title={asset.name}>
                    {asset.name}
                  </span>
                  <span className="text-[9px] text-zinc-500 truncate">
                    {asset.category}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredAssets.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No matching assets found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
