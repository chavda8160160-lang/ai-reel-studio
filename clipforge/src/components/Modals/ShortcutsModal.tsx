import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause Video' },
  { key: 'A', desc: 'Selection Tool' },
  { key: 'Ctrl + B / S', desc: 'Split clip at playhead' },
  { key: 'Q', desc: 'Ripple Trim left to playhead' },
  { key: 'W', desc: 'Ripple Trim right to playhead' },
  { key: 'Ctrl + A', desc: 'Select all clips' },
  { key: 'Delete / Backspace', desc: 'Remove selected clip' },
  { key: 'Ctrl + Z', desc: 'Undo last action' },
  { key: 'Ctrl + Shift + Z / Ctrl + Y', desc: 'Redo last action' },
  { key: 'Ctrl + = / -', desc: 'Zoom in / Zoom out' },
  { key: 'Ctrl + Wheel', desc: 'Zoom in / out on timeline' },
  { key: 'Left / Right Arrow', desc: 'Step 1 second backward / forward' },
  { key: 'N', desc: 'Toggle magnetic snapping' },
  { key: 'M', desc: 'Mute / unmute active audio' },
];

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useEditorStore();

  if (!isShortcutsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-md bg-[#16161A] border border-[#2A2A30] rounded-lg shadow-2xl overflow-hidden flex flex-col text-[#E8E6E1]">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#24242A] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-[#C9A66B]/30 bg-[#C9A66B]/10 text-[#C9A66B] flex items-center justify-center">
              <Keyboard className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E8E6E1]">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1 rounded text-[#8A8A92] hover:text-[#E8E6E1] hover:bg-[#1F1F24] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto">
          {SHORTCUTS.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded bg-[#18181C] border border-[#26262B] text-xs"
            >
              <span className="text-[#8A8A92] font-medium">{sc.desc}</span>
              <kbd className="px-2 py-0.5 bg-[#121214] border border-[#33333A] rounded text-[#C9A66B] font-mono text-[11px] font-medium">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#24242A] bg-[#121215] flex justify-end">
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="px-4 py-1.5 rounded bg-[#202026] hover:bg-[#26262E] border border-[#33333A] text-[#E8E6E1] text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
