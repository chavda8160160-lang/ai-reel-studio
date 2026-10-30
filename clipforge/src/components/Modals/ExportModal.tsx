import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Lock, 
  CheckCircle2, 
  FileVideo, 
  Settings2,
  HardDrive
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const ExportModal: React.FC = () => {
  const { 
    isExportModalOpen, 
    setExportModalOpen, 
    setProModalOpen, 
    projectName 
  } = useEditorStore();

  const [resolution, setResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [frameRate, setFrameRate] = useState<'24fps' | '30fps' | '60fps'>('30fps');
  const [format, setFormat] = useState<'mp4' | 'mov' | 'webm'>('mp4');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!isExportModalOpen) return null;

  const handleStartExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    setIsFinished(false);

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setIsFinished(true);
          return 100;
        }
        return prev + 15;
      });
    }, 250);
  };

  const handleDownload = () => {
    // Simulated file download
    const dummyBlob = new Blob(['ClipForge HD Rendered Video'], { type: 'video/mp4' });
    const url = URL.createObjectURL(dummyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_${resolution}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#16161A] border border-[#2E2E36] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#25252C] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileVideo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Export Video</h3>
              <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[220px]">
                {projectName}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#202026] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {!isFinished ? (
            <>
              {/* 1. Resolution */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>Resolution</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Output Quality</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setResolution('720p')}
                    className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                      resolution === '720p'
                        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-400'
                        : 'bg-[#1C1C22] text-zinc-400 border-[#2A2A32] hover:text-white'
                    }`}
                  >
                    <div>720p HD</div>
                    <div className="text-[10px] font-mono text-zinc-500">Fast</div>
                  </button>

                  <button
                    onClick={() => setResolution('1080p')}
                    className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                      resolution === '1080p'
                        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/20'
                        : 'bg-[#1C1C22] text-zinc-400 border-[#2A2A32] hover:text-white'
                    }`}
                  >
                    <div>1080p FHD</div>
                    <div className="text-[10px] font-mono text-cyan-400">Recommended</div>
                  </button>

                  <button
                    onClick={() => {
                      setProModalOpen(true);
                    }}
                    className="p-2 rounded-lg border text-xs font-semibold bg-[#1C1C22] text-zinc-400 border-[#2A2A32] hover:border-amber-400/50 flex flex-col items-center justify-center relative group"
                  >
                    <div className="flex items-center gap-1 text-amber-400">
                      <span>4K Ultra</span>
                      <Lock className="w-3 h-3" />
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">Pro Only</div>
                  </button>
                </div>
              </div>

              {/* 2. Frame Rate & Format */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                    Frame Rate
                  </label>
                  <select
                    value={frameRate}
                    onChange={(e) => setFrameRate(e.target.value as any)}
                    className="w-full bg-[#1C1C22] text-xs text-white p-2 rounded-lg border border-[#2A2A32] outline-none cursor-pointer focus:border-cyan-400"
                  >
                    <option value="24fps">24 fps (Cinema)</option>
                    <option value="30fps">30 fps (Standard)</option>
                    <option value="60fps">60 fps (Smooth Pro)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                    File Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full bg-[#1C1C22] text-xs text-white p-2 rounded-lg border border-[#2A2A32] outline-none cursor-pointer focus:border-cyan-400 font-mono"
                  >
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="mov">MOV (Apple ProRes)</option>
                    <option value="webm">WebM (VP9)</option>
                  </select>
                </div>
              </div>

              {/* 3. Watermark Option */}
              <div className="p-2.5 bg-[#1C1C22] rounded-lg border border-[#2A2A32] flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-300">Remove ClipForge Watermark</p>
                  <p className="text-[10px] text-zinc-500">Export clean commercial-ready reel</p>
                </div>
                <button
                  onClick={() => setProModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Pro</span>
                </button>
              </div>

              {/* Progress Bar (If exporting) */}
              {isExporting && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                      <Settings2 className="w-3.5 h-3.5 animate-spin" />
                      Rendering frames...
                    </span>
                    <span className="font-mono font-bold text-cyan-400">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#202028] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-300 transition-all duration-200"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Finished Screen */
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Render Completed!</h4>
                <p className="text-xs text-zinc-400">
                  Your video is encoded in {resolution} at {frameRate}.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-2.5 rounded-lg bg-[#22D3EE] hover:bg-[#06B6D4] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>Save to Computer</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isFinished && (
          <div className="p-3 border-t border-[#25252C] bg-[#121215] flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-mono">
              Est. size: ~18.4 MB
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartExport}
                disabled={isExporting}
                className="px-4 py-1.5 rounded-md bg-[#22D3EE] hover:bg-[#06B6D4] disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Rendering...' : 'Start Export'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
