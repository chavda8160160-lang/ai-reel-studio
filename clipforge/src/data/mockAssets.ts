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
  comingSoon?: boolean;
  textPayload?: {
    text: string;
    fontStyle: 'classic' | 'hormozi' | 'neon' | 'clean';
    fontColor?: string;
    fontSize?: number;
    scale?: number;
    posY?: number;
  };
}

export const MOCK_MEDIA_ASSETS: AssetCard[] = [
  {
    id: 'm-1',
    category: 'Stock Video',
    name: 'Cyberpunk Neon Alley',
    duration: 18.5,
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&q=80',
    type: 'video',
    tags: ['cyber', 'neon', 'urban', 'video'],
  },
  {
    id: 'm-2',
    category: 'Stock Video',
    name: 'Sunset Golden Coastline',
    duration: 24.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
    type: 'video',
    tags: ['nature', 'cinematic', 'beach', 'sunset'],
  },
  {
    id: 'm-3',
    category: 'Stock Video',
    name: 'Epic Night Highway Motion',
    duration: 15.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300&q=80',
    type: 'video',
    tags: ['city', 'traffic', 'speed', 'timelapse'],
  },
  {
    id: 'm-4',
    category: 'Stock Video',
    name: 'High Tech Server Room',
    duration: 20.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&q=80',
    type: 'video',
    tags: ['tech', 'ai', 'cloud', 'data'],
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
    previewUrl: '/rendered-reels/bgm-cyber.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    type: 'audio',
    tags: ['viral', 'phonk', 'bass', '140 bpm'],
  },
  {
    id: 'a-2',
    category: 'Soundtrack',
    name: 'Lofi Chill Study Beats',
    duration: 90,
    previewUrl: '/rendered-reels/bgm-cyber.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    type: 'audio',
    tags: ['lofi', 'chill', 'aesthetic', 'ambient'],
  },
  {
    id: 'a-3',
    category: 'Soundtrack',
    name: 'Cinematic Heroic Motivation',
    duration: 120,
    previewUrl: '/rendered-reels/bgm-cyber.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    type: 'audio',
    tags: ['epic', 'trailer', 'orchestral', 'cinematic'],
    isPro: true,
  },
  {
    id: 'a-4',
    category: 'Sound FX',
    name: 'Whoosh Hit Transition',
    duration: 2.5,
    previewUrl: '/rendered-reels/bgm-cyber.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=300&q=80',
    type: 'audio',
    tags: ['sfx', 'whoosh', 'impact', 'riser'],
  },
  {
    id: 'a-5',
    category: 'Sound FX',
    name: 'Glitch Camera Shutter',
    duration: 1.8,
    previewUrl: '/rendered-reels/bgm-cyber.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
    type: 'audio',
    tags: ['sfx', 'glitch', 'digital', 'snap'],
  }
];

export const MOCK_TEXT_ASSETS: AssetCard[] = [
  {
    id: 't-1',
    category: 'Viral Hook',
    name: 'Alex Hormozi Viral Yellow',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&q=80',
    type: 'text',
    tags: ['hormozi', 'yellow', 'bold', 'hook', 'viral'],
    textPayload: {
      text: 'THE SECRET NOBODY TOLD YOU',
      fontStyle: 'hormozi',
      fontColor: '#EAB308',
      fontSize: 32,
      scale: 1.1,
      posY: -40
    }
  },
  {
    id: 't-2',
    category: 'Viral Hook',
    name: 'Stop Scrolling Hook',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
    type: 'text',
    tags: ['hook', 'stop', 'viral', 'attention'],
    textPayload: {
      text: 'STOP SCROLLING RIGHT NOW!',
      fontStyle: 'hormozi',
      fontColor: '#EF4444',
      fontSize: 30,
      scale: 1.15,
      posY: -50
    }
  },
  {
    id: 't-3',
    category: 'Titles',
    name: 'Cinematic Master Title',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80',
    type: 'text',
    tags: ['title', 'cinematic', 'master', 'headline'],
    textPayload: {
      text: 'CHAPTER ONE: THE AWAKENING',
      fontStyle: 'classic',
      fontColor: '#E8E6E1',
      fontSize: 34,
      scale: 1.0,
      posY: 0
    }
  },
  {
    id: 't-4',
    category: 'Titles',
    name: 'Cyberpunk Glitch Neon',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80',
    type: 'text',
    tags: ['title', 'neon', 'glitch', 'cyber'],
    textPayload: {
      text: 'SYSTEM PROTOCOL 2077',
      fontStyle: 'neon',
      fontColor: '#34D399',
      fontSize: 28,
      scale: 1.05,
      posY: -20
    }
  },
  {
    id: 't-5',
    category: 'Minimalist',
    name: 'Clean Luxury Modern Header',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80',
    type: 'text',
    tags: ['minimalist', 'clean', 'modern', 'luxury'],
    textPayload: {
      text: 'PRECISION & ARCHITECTURE',
      fontStyle: 'clean',
      fontColor: '#F5F5F7',
      fontSize: 24,
      scale: 0.95,
      posY: 0
    }
  },
  {
    id: 't-6',
    category: 'Lower Third',
    name: 'Social Handle Instagram Card',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    type: 'text',
    tags: ['lower third', 'social', 'instagram', 'handle'],
    textPayload: {
      text: '@yourbrand • Follow for Daily Drops',
      fontStyle: 'clean',
      fontColor: '#C9A66B',
      fontSize: 20,
      scale: 0.85,
      posY: 120
    }
  },
  {
    id: 't-7',
    category: 'Subtitle',
    name: 'Clean Dialogue Subtitle Box',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&q=80',
    type: 'text',
    tags: ['subtitle', 'dialogue', 'captions', 'speech'],
    textPayload: {
      text: 'Every single frame must tell a meaningful story.',
      fontStyle: 'classic',
      fontColor: '#FFFFFF',
      fontSize: 22,
      scale: 0.9,
      posY: 90
    }
  },
  {
    id: 't-8',
    category: 'Quote',
    name: 'Inspirational Serif Quote',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&q=80',
    type: 'text',
    tags: ['quote', 'inspiration', 'wisdom', 'serif'],
    textPayload: {
      text: '“Simplicity is the ultimate sophistication.”',
      fontStyle: 'clean',
      fontColor: '#C9A66B',
      fontSize: 26,
      scale: 1.0,
      posY: 10
    }
  }
];

export const MOCK_STICKER_ASSETS: AssetCard[] = [
  {
    id: 's-1',
    category: 'Social',
    name: 'Subscribe Button & Bell 🔔',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&q=80',
    type: 'sticker',
    tags: ['youtube', 'subscribe', 'bell', 'social'],
  },
  {
    id: 's-2',
    category: 'Reactions',
    name: 'Fire Flame Emoji 🔥',
    thumbnailUrl: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=300&q=80',
    type: 'sticker',
    tags: ['fire', 'flame', 'hype', 'reaction', 'lit'],
  },
  {
    id: 's-3',
    category: 'Badges',
    name: '100% Verified Checkmark ✔️',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=300&q=80',
    type: 'sticker',
    tags: ['verified', 'badge', 'tick', 'official'],
  },
  {
    id: 's-4',
    category: 'Arrows',
    name: 'Neon Pulsing Pointer Arrow ↗️',
    thumbnailUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=300&q=80',
    type: 'sticker',
    tags: ['arrow', 'pointer', 'neon', 'direction'],
  },
  {
    id: 's-5',
    category: 'Reactions',
    name: 'Heart Like Reaction ❤️',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300&q=80',
    type: 'sticker',
    tags: ['heart', 'love', 'like', 'reaction'],
  },
  {
    id: 's-6',
    category: 'Reactions',
    name: 'Rocket Boost Launch 🚀',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=80',
    type: 'sticker',
    tags: ['rocket', 'boost', 'launch', 'growth'],
  }
];

export const MOCK_FILTER_ASSETS: AssetCard[] = [
  {
    id: 'f-1',
    category: 'Cinematic',
    name: 'Hollywood Teal & Orange',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
    type: 'filter',
    tags: ['teal', 'orange', 'blockbuster', 'hollywood', 'cinematic'],
  },
  {
    id: 'f-2',
    category: 'Warm',
    name: 'Golden Hour Sunset Glow',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
    type: 'filter',
    tags: ['warm', 'golden', 'sunset', 'soft'],
  },
  {
    id: 'f-3',
    category: 'Monochrome',
    name: 'Dark Noir High Contrast',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80',
    type: 'filter',
    tags: ['noir', 'bw', 'contrast', 'black and white'],
  },
  {
    id: 'f-4',
    category: 'Cyber',
    name: 'Tokyo Neon Cyberpunk',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80',
    type: 'filter',
    tags: ['cyber', 'neon', 'purple', 'futuristic'],
  },
  {
    id: 'f-5',
    category: 'Vibrant',
    name: 'Ultra Vibrant Color Pop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&q=80',
    type: 'filter',
    tags: ['vibrant', 'saturated', 'pop', 'punchy'],
  },
  {
    id: 'f-0',
    category: 'Raw',
    name: 'Raw Original Neutral',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&q=80',
    type: 'filter',
    tags: ['raw', 'reset', 'neutral', 'none'],
  }
];

export const MOCK_EFFECT_ASSETS: AssetCard[] = [
  {
    id: 'e-1',
    category: 'Visual FX',
    name: 'White Flash Impact Opener',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&q=80',
    type: 'effect',
    tags: ['flash', 'punch', 'impact', 'glare'],
  },
  {
    id: 'e-2',
    category: 'Visual FX',
    name: 'Cinematic Anamorphic Flare',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
    type: 'effect',
    tags: ['flare', 'light', 'lens', 'cinematic'],
  },
  {
    id: 'e-3',
    category: 'Retro',
    name: 'VHS 90s Tape Scanlines',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&q=80',
    type: 'effect',
    tags: ['vhs', 'retro', 'noise', 'analog'],
  },
  {
    id: 'e-4',
    category: 'Distortion',
    name: 'RGB Chromatic Glitch Shake',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&q=80',
    type: 'effect',
    tags: ['glitch', 'shake', 'rgb', 'displacement'],
  }
];

export const MOCK_TRANSITION_ASSETS: AssetCard[] = [
  {
    id: 'tr-1',
    category: 'Motion',
    name: 'Smooth Zoom In Push',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80',
    type: 'transition',
    tags: ['zoom', 'push', 'smooth', 'motion'],
  },
  {
    id: 'tr-2',
    category: 'Classic',
    name: 'Cinematic Dip to Black',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&q=80',
    type: 'transition',
    tags: ['fade', 'black', 'cut', 'cinematic'],
  },
  {
    id: 'tr-3',
    category: 'Light',
    name: 'White Flash Cut',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
    type: 'transition',
    tags: ['flash', 'white', 'cut', 'light'],
  },
  {
    id: 'tr-4',
    category: '3D Warp',
    name: '3D Sphere Spin Warp',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
    type: 'transition',
    tags: ['3d', 'warp', 'spin'],
    comingSoon: true,
  },
  {
    id: 'tr-5',
    category: 'Glitch',
    name: 'Digital Matrix Particle Dissolve',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&q=80',
    type: 'transition',
    tags: ['matrix', 'glitch', 'particles'],
    comingSoon: true,
  }
];

export const MOCK_CAPTION_ASSETS: AssetCard[] = [
  {
    id: 'c-1',
    category: 'Auto AI',
    name: 'Hormozi 1-Word Highlight',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&q=80',
    type: 'caption',
    tags: ['hormozi', 'word-by-word', 'yellow', 'captions'],
  },
  {
    id: 'c-2',
    category: 'Modern',
    name: 'Minimal Clean Box Subtitle',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    type: 'caption',
    tags: ['box', 'black-bg', 'clean', 'subtitles'],
  },
  {
    id: 'c-3',
    category: 'Creative',
    name: 'Neon Glowing Karaoke Subtitle',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80',
    type: 'caption',
    tags: ['karaoke', 'glow', 'cyan', 'creative'],
  }
];
