import React, { useState } from 'react';
import { 
  Film, 
  RotateCcw, 
  RotateCw, 
  Keyboard, 
  Sparkles, 
  Download, 
  Check, 
  Pencil,
  Sun,
  Moon
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export const TopBar: React.FC = () => {
  const { 
    projectName, 
    setProjectName, 
    undo, 
    redo, 
    undoStack, 
    redoStack,
    theme,
    toggleTheme,
    setExportModalOpen,
    setShortcutsModalOpen,
    setProModalOpen 
  } = useEditorStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      setProjectName(tempName.trim());
    } else {
      setTempName(projectName);
    }
    setIsEditingName(false);
  };

  return (
    <header className="h-12 border-b px-4 flex items-center justify-between shrink-0 select-none z-30 transition-colors bg-[#17171B] border-[#2A2A30] text-[#E8E6E1]">
      {/* Left: Brand Identity & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <div className="w-7 h-7 rounded-md bg-[#24242B] border border-[#36363F] flex items-center justify-center text-[#C9A66B] group-hover:border-[#C9A66B]/60 transition-colors">
            <Film className="w-3.5 h-3.5 stroke-[1.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs tracking-tight">ClipForge Studio</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-[#202026] border-[#36363F] text-[#C9A66B]">
              PRO
            </span>
          </div>
        </div>

        <div className="h-3.5 w-px bg-[#2E2E36] mx-1" />

        <div className="flex items-center gap-1.5 text-[11px] text-[#8A8A92]">
          <Check className="w-3 h-3 text-[#C9A66B]" />
          <span>Auto-Saved</span>
        </div>
      </div>

      {/* Center: Editable Project Name */}
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
            className="text-xs font-medium px-2.5 py-1 rounded border outline-none w-60 text-center bg-[#222228] border-[#C9A66B] text-white focus:ring-1 focus:ring-[#C9A66B]"
          />
        ) : (
          <button
            onClick={() => {
              setTempName(projectName);
              setIsEditingName(true);
            }}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded border border-transparent hover:border-[#2E2E36] hover:bg-[#202026] text-[#D8D6D1] transition-colors group"
            title="Click to rename project"
          >
            <span>{projectName}</span>
            <Pencil className="w-3 h-3 text-[#6E6E77] group-hover:text-[#C9A66B] transition-colors" />
          </button>
        )}
      </div>

      {/* Right: Tools, Theme Toggle & Export */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center border rounded-md p-0.5 bg-[#1F1F24] border-[#2C2C33]">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded disabled:opacity-25 hover:bg-[#2A2A32] text-[#A6A6B0] hover:text-[#E8E6E1] transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          <div className="w-px h-3 bg-[#2E2E36]" />
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded disabled:opacity-25 hover:bg-[#2A2A32] text-[#A6A6B0] hover:text-[#E8E6E1] transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>

        {/* Theme Switcher: Classic Warm Paper vs Obsidian Dark */}
        <button
          onClick={toggleTheme}
          className="p-1.5 border rounded-md text-[#A6A6B0] hover:text-[#E8E6E1] bg-[#1F1F24] border-[#2C2C33] hover:bg-[#2A2A32] transition-colors"
          title={theme === 'dark' ? "Switch to Classic Warm Paper Theme" : "Switch to Obsidian Dark Theme"}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 stroke-[1.5]" /> : <Moon className="w-3.5 h-3.5 stroke-[1.5]" />}
        </button>

        {/* Shortcuts */}
        <button
          onClick={() => setShortcutsModalOpen(true)}
          className="p-1.5 border rounded-md text-[#A6A6B0] hover:text-[#E8E6E1] bg-[#1F1F24] border-[#2C2C33] hover:bg-[#2A2A32] transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>

        {/* Pro Badge */}
        <button
          onClick={() => setProModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border text-[#C9A66B] bg-[#2A251D] border-[#C9A66B]/30 hover:border-[#C9A66B]/60 transition-colors"
        >
          <Sparkles className="w-3 h-3 stroke-[1.5]" />
          <span>Pro</span>
        </button>

        {/* Primary Export Button */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-md text-[#121214] bg-[#C9A66B] hover:bg-[#D9B77C] active:bg-[#B88E4B] transition-colors cursor-pointer shadow-sm"
        >
          <Download className="w-3.5 h-3.5 stroke-[2]" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
