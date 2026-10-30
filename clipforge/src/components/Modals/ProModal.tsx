import React from 'react';
import { X, Check, Award, Zap, ShieldCheck } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const ProModal: React.FC = () => {
  const { isProModalOpen, setProModalOpen } = useEditorStore();

  if (!isProModalOpen) return null;

  const PRO_PERKS = [
    'Export in 4K Ultra HD & 60 FPS ProRes',
    'Commercial Studio License & No Watermark',
    'Full Multi-Track Sequence Timeline Stacking',
    'Cinematic Hollywood LUTs & Color Precision Presets',
    'Lossless Audio Waveform Normalization & SFX Suite',
    'Priority Cloud Render & Archival Encoding',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-md bg-[#16161A] border border-[#2A2A30] rounded-lg shadow-2xl overflow-hidden flex flex-col text-[#E8E6E1]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#24242A] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[#C9A66B]/40 bg-[#C9A66B]/10 text-[#C9A66B] flex items-center justify-center">
              <Award className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E8E6E1] flex items-center gap-1.5">
                ClipForge Studio Pro
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#C9A66B]/20 text-[#C9A66B] border border-[#C9A66B]/30">
                  LIFETIME
                </span>
              </h3>
              <p className="text-[11px] text-[#8A8A92]">Hollywood-Grade Post-Production Suite</p>
            </div>
          </div>
          <button
            onClick={() => setProModalOpen(false)}
            className="p-1 rounded text-[#8A8A92] hover:text-[#E8E6E1] hover:bg-[#1F1F24] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Perks List */}
        <div className="p-5 space-y-2.5">
          {PRO_PERKS.map((perk, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs text-[#E8E6E1]">
              <div className="w-4 h-4 rounded-full border border-[#C9A66B]/40 bg-[#C9A66B]/15 text-[#C9A66B] flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" strokeWidth={2} />
              </div>
              <span className="font-normal text-[#D4D2CD]">{perk}</span>
            </div>
          ))}
        </div>

        {/* Pricing & Activation */}
        <div className="p-5 border-t border-[#24242A] bg-[#121215] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-mono font-semibold text-[#E8E6E1]">$19</span>
              <span className="text-xs text-[#8A8A92] ml-1.5">one-time payment</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Commercial License</span>
            </div>
          </div>

          <button
            onClick={() => {
              alert("ClipForge Studio Pro Activated! 4K exports and all pro features unlocked.");
              setProModalOpen(false);
            }}
            className="w-full py-2.5 rounded bg-[#C9A66B] hover:bg-[#B89357] text-[#121214] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" strokeWidth={1.5} />
            <span>Unlock Pro Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};
