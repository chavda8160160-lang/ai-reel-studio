import React from 'react';
import { TopBar } from './components/TopBar';
import { MediaPanel } from './components/MediaPanel';
import { Player } from './components/Player';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline/Timeline';
import { ExportModal } from './components/Modals/ExportModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { ProModal } from './components/Modals/ProModal';

export const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-[#0F0F10] text-[#E4E4E7] flex flex-col overflow-hidden select-none font-sans min-w-[1280px]">
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
    </div>
  );
};

export default App;
