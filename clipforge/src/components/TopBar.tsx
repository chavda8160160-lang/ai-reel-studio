import React, { useState } from 'react';
import { 
  Film, 
  RotateCcw, 
  RotateCw, 
  Keyboard, 
  Sparkles, 
  Download, 
  CheckCircle2,
  Pencil
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
    <header className="h-12 bg-[#141416] border-b border-[#2A2A2D] px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Brand Logo & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-300 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Film className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              ClipForge
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-mono font-semibold">PRO</span>
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#2A2A2D] mx-1" />

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-800/40">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="text-[11px]">Auto-saved</span>
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
            className="bg-[#202024] text-white text-xs font-semibold px-2.5 py-1 rounded border border-cyan-400/60 outline-none w-56 text-center focus:ring-1 focus:ring-cyan-400"
          />
        ) : (
          <button
            onClick={() => {
              setTempName(projectName);
              setIsEditingName(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#D4D4D8] hover:text-white px-3 py-1 rounded-md hover:bg-[#202024] transition-colors group"
            title="Click to rename project"
          >
            <span>{projectName}</span>
            <Pencil className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#1C1C1F] border border-[#2A2A2D] rounded-md p-0.5">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 rounded hover:bg-[#28282E] transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-[#2A2A2D]" />
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 rounded hover:bg-[#28282E] transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Shortcuts */}
        <button
          onClick={() => setShortcutsModalOpen(true)}
          className="p-1.5 text-zinc-400 hover:text-white bg-[#1C1C1F] hover:bg-[#28282E] border border-[#2A2A2D] rounded-md transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Pro Upgrade Button */}
        <button
          onClick={() => setProModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 border border-amber-500/40 text-amber-300 transition-all hover:scale-[1.02] shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Upgrade</span>
        </button>

        {/* Primary Export Button */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-md bg-[#22D3EE] hover:bg-[#06B6D4] active:bg-[#0891B2] text-black shadow-md shadow-cyan-500/25 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
