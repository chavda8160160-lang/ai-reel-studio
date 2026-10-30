export interface AssetCard {
  id: string;
  category: string;
  name: string;
  duration?: number;
  previewUrl?: string;
  thumbnailUrl: string;
  type: 'video' | 'audio' | 'text' | 'sticker' | 'effect' | 'transition' | 'filter' | 'caption';
  tags: string[];
  isPro?: boolean;
}

export const MOCK_MEDIA_ASSETS: AssetCard[] = [
  {
    id: 'm-1',
    category: 'Stock Video',
    name: 'Cyberpunk Neon Alley',
    duration: 18.5,
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&q=80',
    type: 'video',
    tags: ['cyber', 'neon', 'urban'],
  },
  {
    id: 'm-2',
    category: 'Stock Video',
    name: 'Sunset Golden Coastline',
    duration: 24.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
    type: 'video',
    tags: ['nature', 'cinematic', 'beach'],
  },
  {
    id: 'm-3',
    category: 'Stock Video',
    name: 'Epic Night Highway Motion',
    duration: 15.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300&q=80',
    type: 'video',
    tags: ['city', 'traffic', 'speed'],
  },
  {
    id: 'm-4',
    category: 'Stock Video',
    name: 'High Tech Server Room',
    duration: 20.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&q=80',
    type: 'video',
    tags: ['tech', 'ai', 'cloud'],
  },
  {
    id: 'm-5',
    category: 'Stock Video',
    name: 'Futuristic HUD Hologram',
    duration: 12.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80',
    type: 'video',
    tags: ['scifi', 'hud', 'motion'],
    isPro: true,
  },
  {
    id: 'm-6',
    category: 'Stock Video',
    name: 'Studio Portrait Model Light',
    duration: 16.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
    type: 'video',
    tags: ['fashion', 'beauty', 'portrait'],
  }
];

export const MOCK_AUDIO_ASSETS: AssetCard[] = [
  {
    id: 'a-1',
    category: 'Soundtrack',
    name: 'Phonk Midnight Drift',
    duration: 65,
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    type: 'audio',
    tags: ['viral', 'phonk', 'bass', '140 bpm'],
  },
  {
    id: 'a-2',
    category: 'Soundtrack',
    name: 'Lofi Chill Study Beats',
    duration: 90,
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    type: 'audio',
    tags: ['lofi', 'chill', 'aesthetic'],
  },
  {
    id: 'a-3',
    category: 'Soundtrack',
    name: 'Cinematic Heroic Motivation',
    duration: 120,
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    type: 'audio',
    tags: ['epic', 'trailer', 'orchestral'],
    isPro: true,
  },
  {
    id: 'a-4',
    category: 'Sound FX',
    name: 'Whoosh Hit Transition',
    duration: 2.5,
    thumbnailUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=300&q=80',
    type: 'audio',
    tags: ['sfx', 'whoosh', 'impact'],
  },
  {
    id: 'a-5',
    category: 'Sound FX',
    name: 'Glitch Camera Shutter',
    duration: 1.8,
    thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
    type: 'audio',
    tags: ['sfx', 'glitch', 'digital'],
  }
];

export const MOCK_TEXT_ASSETS: AssetCard[] = [
  {
    id: 't-1',
    category: 'Viral Hook',
    name: 'Alex Hormozi Viral Yellow',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&q=80',
    type: 'text',
    tags: ['hormozi', 'yellow', 'bold'],
  },
  {
    id: 't-2',
    category: 'Titles',
    name: 'Cyberpunk Glitch Title',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
    type: 'text',
    tags: ['neon', 'glitch', 'headline'],
    isPro: true,
  },
  {
    id: 't-3',
    category: 'Minimalist',
    name: 'Clean Luxury Modern Header',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80',
    type: 'text',
    tags: ['clean', 'serif', 'subtle'],
  },
  {
    id: 't-4',
    category: 'Lower Thirds',
    name: 'Social Handle Instagram Card',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    type: 'text',
    tags: ['social', 'lower third', 'badge'],
  }
];

export const MOCK_STICKER_ASSETS: AssetCard[] = [
  {
    id: 's-1',
    category: 'Social',
    name: 'Subscribe Button & Bell',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&q=80',
    type: 'sticker',
    tags: ['youtube', 'subscribe', 'bell'],
  },
  {
    id: 's-2',
    category: 'Reactions',
    name: 'Fire Flame Emoji Glow',
    thumbnailUrl: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=300&q=80',
    type: 'sticker',
    tags: ['fire', 'flame', 'hype'],
  },
  {
    id: 's-3',
    category: 'Badges',
    name: '100% Verified Checkmark',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=300&q=80',
    type: 'sticker',
    tags: ['verified', 'badge', 'tick'],
  },
  {
    id: 's-4',
    category: 'Arrows',
    name: 'Neon Pulsing Pointer Arrow',
    thumbnailUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=300&q=80',
    type: 'sticker',
    tags: ['arrow', 'pointer', 'neon'],
  }
];

export const MOCK_EFFECT_ASSETS: AssetCard[] = [
  {
    id: 'e-1',
    category: 'Viral FX',
    name: 'White Flash Opener',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&q=80',
    type: 'effect',
    tags: ['flash', 'punch', 'impact'],
  },
  {
    id: 'e-2',
    category: 'Cinematic',
    name: 'Cinematic Anamorphic Flare',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
    type: 'effect',
    tags: ['flare', 'light', 'lens'],
    isPro: true,
  },
  {
    id: 'e-3',
    category: 'Retro',
    name: 'VHS 90s Tape Scanlines',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&q=80',
    type: 'effect',
    tags: ['vhs', 'retro', 'noise'],
  },
  {
    id: 'e-4',
    category: 'Distortion',
    name: 'RGB Chromatic Glitch Shake',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&q=80',
    type: 'effect',
    tags: ['glitch', 'shake', 'rgb'],
  }
];

export const MOCK_FILTER_ASSETS: AssetCard[] = [
  {
    id: 'f-1',
    category: 'LUT',
    name: 'Hollywood Teal & Orange',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
    type: 'filter',
    tags: ['teal', 'orange', 'blockbuster'],
  },
  {
    id: 'f-2',
    category: 'LUT',
    name: 'Warm Sunset Glow',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
    type: 'filter',
    tags: ['warm', 'golden', 'film'],
  },
  {
    id: 'f-3',
    category: 'Monochrome',
    name: 'Dark Noir High Contrast',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80',
    type: 'filter',
    tags: ['noir', 'bw', 'contrast'],
  },
  {
    id: 'f-4',
    category: 'Cyber',
    name: 'Tokyo Neon Cyberpunk',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80',
    type: 'filter',
    tags: ['cyber', 'neon', 'purple'],
    isPro: true,
  }
];

export const MOCK_TRANSITION_ASSETS: AssetCard[] = [
  {
    id: 'tr-1',
    category: 'Motion',
    name: 'Smooth Zoom In Push',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80',
    type: 'transition',
    tags: ['zoom', 'push', 'smooth'],
  },
  {
    id: 'tr-2',
    category: 'Glitch',
    name: 'Digital Data Pixel Dissolve',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
    type: 'transition',
    tags: ['pixel', 'dissolve', 'data'],
    isPro: true,
  },
  {
    id: 'tr-3',
    category: 'Classic',
    name: 'Cinematic Dip to Black',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&q=80',
    type: 'transition',
    tags: ['fade', 'black', 'cut'],
  }
];

export const MOCK_CAPTION_ASSETS: AssetCard[] = [
  {
    id: 'c-1',
    category: 'Auto AI',
    name: 'Hormozi 1-Word Highlight',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&q=80',
    type: 'caption',
    tags: ['hormozi', 'word-by-word', 'yellow'],
  },
  {
    id: 'c-2',
    category: 'Modern',
    name: 'Minimal Clean Box Subtitle',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    type: 'caption',
    tags: ['box', 'black-bg', 'clean'],
  },
  {
    id: 'c-3',
    category: 'Creative',
    name: 'Neon Glowing Karaoke Subtitle',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
    type: 'caption',
    tags: ['karaoke', 'glow', 'cyan'],
    isPro: true,
  }
];
