import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause Video' },
  { key: 'S', desc: 'Split clip at playhead position' },
  { key: 'Delete / Backspace', desc: 'Remove selected clip' },
  { key: 'Ctrl + Z', desc: 'Undo last action' },
  { key: 'Ctrl + Y', desc: 'Redo last action' },
  { key: 'Ctrl + Wheel', desc: 'Zoom in / out on timeline' },
  { key: 'Left / Right Arrow', desc: 'Step 1 second backward / forward' },
  { key: 'N', desc: 'Toggle magnetic snapping' },
  { key: 'M', desc: 'Mute / unmute active audio' },
];

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useEditorStore();

  if (!isShortcutsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#16161A] border border-[#2E2E36] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#25252C] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-2 text-white">
            <Keyboard className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#202026] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
          {SHORTCUTS.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2 rounded-lg bg-[#1C1C22] border border-[#26262E] text-xs"
            >
              <span className="text-zinc-300 font-medium">{sc.desc}</span>
              <kbd className="px-2 py-1 bg-[#121216] border border-[#34343E] rounded text-cyan-400 font-mono text-[11px] font-bold shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#25252C] bg-[#121215] flex justify-end">
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="px-4 py-1.5 rounded-md bg-[#22D3EE] text-black font-bold text-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
