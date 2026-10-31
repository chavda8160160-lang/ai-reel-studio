import React, { useEffect } from 'react';
import { useEditorStore } from './store/useEditorStore';
import { TopBar } from './components/TopBar';
import { MediaPanel } from './components/MediaPanel';
import { Player } from './components/Player';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline/Timeline';
import { ExportModal } from './components/Modals/ExportModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { ProModal } from './components/Modals/ProModal';
import { InstagramAudioTrimmer } from './components/Modals/InstagramAudioTrimmer';

export const App: React.FC = () => {
  const { theme } = useEditorStore();
  const isLight = theme === 'light';

  useEffect(() => {
    (window as any).useEditorStore = useEditorStore;
  }, []);

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLight]);

  return (
    <div 
      className={`w-screen h-screen flex flex-col overflow-hidden select-none font-sans min-w-[1280px] transition-colors ${
        isLight ? 'bg-[#F5F3EE] text-[#1C1917]' : 'bg-[#121214] text-[#E8E6E1]'
      }`}
    >
      {/* 1. Top Navigation Bar (48px) */}
      <TopBar />

      {/* 2. Middle Workstation Workspace Stage */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Media & Asset Library (320px) */}
        <MediaPanel />

        {/* Center: Live Player & Canvas */}
        <Player />

        {/* Right: Clip Properties Inspector (300px) */}
        <Inspector />
      </main>

      {/* 3. Bottom Multi-Track Drag & Drop Timeline (~36%) */}
      <Timeline />

      {/* Modals & Overlays */}
      <ExportModal />
      <ShortcutsModal />
      <ProModal />
      <InstagramAudioTrimmer />
    </div>
  );
};

export default App;
