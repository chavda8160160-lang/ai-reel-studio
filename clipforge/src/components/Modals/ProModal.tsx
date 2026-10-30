import React from 'react';
import { X, Check, Crown, Zap, ShieldCheck } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const ProModal: React.FC = () => {
  const { isProModalOpen, setProModalOpen } = useEditorStore();

  if (!isProModalOpen) return null;

  const PRO_PERKS = [
    'Export in 4K Ultra HD & 60 FPS ProRes',
    '100% Commercial License & No Watermark',
    'AI Auto-Captions with 1-Word Hormozi Highlights',
    '1,000+ Trending Cinematic LUTs, Soundtracks & SFX',
    'Unlimited Multi-Track Sequence Stacking',
    'Cloud Auto-Backup & Cross-Device Sync',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-[#141418] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        {/* Glow Ambient Backdrop */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-500/15 via-cyan-500/10 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="p-5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                ClipForge Pro Suite
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-black font-mono">
                  LIFETIME
                </span>
              </h3>
              <p className="text-xs text-amber-200/80">Unlock Hollywood-Grade Editing Power</p>
            </div>
          </div>
          <button
            onClick={() => setProModalOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Perks List */}
        <div className="px-6 py-4 space-y-2.5 relative z-10">
          {PRO_PERKS.map((perk, idx) => (
            <div key={idx} className="flex items-center gap-3 text-xs text-zinc-200">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span className="font-medium">{perk}</span>
            </div>
          ))}
        </div>

        {/* Pricing Card */}
        <div className="p-5 border-t border-[#25252E] bg-[#0E0E12] relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-black text-white">$19</span>
              <span className="text-xs text-zinc-500 ml-1">/ one-time access</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>30-Day Money Back</span>
            </div>
          </div>

          <button
            onClick={() => {
              alert("ClipForge Pro Activated! 4K exports and all pro features unlocked.");
              setProModalOpen(false);
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Unlock Pro Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};
