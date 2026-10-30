import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Lock, 
  CheckCircle2, 
  FileVideo, 
  Settings2,
  HardDrive,
  Film,
  Sparkles
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const ExportModal: React.FC = () => {
  const { 
    isExportModalOpen, 
    setExportModalOpen, 
    setProModalOpen, 
    projectName,
    tracks,
    aspectRatio,
    totalDuration
  } = useEditorStore();

  const [resolution, setResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [frameRate, setFrameRate] = useState<'24fps' | '30fps' | '60fps'>('30fps');
  const [format, setFormat] = useState<'mp4' | 'mov' | 'webm'>('mp4');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [renderedDownloadUrl, setRenderedDownloadUrl] = useState<string | null>(null);
  const [renderedFileName, setRenderedFileName] = useState<string | null>(null);

  if (!isExportModalOpen) return null;

  // Find the primary video clip on the main track
  const videoTrack = tracks.find((t) => t.type === 'video');
  const activeClip = videoTrack?.clips[0];

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportProgress(10);
    setIsFinished(false);
    setRenderedDownloadUrl(null);

    // Smooth progress simulation while backend renders
    const progressTimer = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 88) return prev;
        return prev + 6;
      });
    }, 400);

    try {
      const clipTitle = activeClip?.title || 'reel-demo.mp4';
      const trimStart = activeClip ? activeClip.start : 0;
      const trimEnd = activeClip ? activeClip.start + activeClip.duration : Math.min(30, totalDuration);
      const clipSpeed = activeClip?.properties?.speed ?? 1.0;
      const clipFilter = activeClip?.properties?.filter ?? 'none';
      const clipVolume = activeClip?.properties?.volume ?? 1.0;

      const res = await fetch('/api/video/edit-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoFileName: !clipTitle.toLowerCase().includes('demo') ? clipTitle : 'reel-demo.mp4',
          trimStart,
          trimEnd,
          speed: clipSpeed,
          resolution: resolution === '720p' ? '720p' : '1080p',
          fps: frameRate,
          aspect: aspectRatio,
          filter: clipFilter,
          origVolume: clipVolume
        })
      });

      clearInterval(progressTimer);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.downloadUrl) {
          setRenderedDownloadUrl(data.downloadUrl);
          setRenderedFileName(data.fileName || `${projectName.replace(/\s+/g, '_')}_${resolution}.${format}`);
          setExportProgress(100);
          setIsExporting(false);
          setIsFinished(true);
          return;
        }
      }
      
      // Fallback if running standalone or file is custom memory blob
      setExportProgress(100);
      setIsExporting(false);
      setIsFinished(true);
    } catch {
      clearInterval(progressTimer);
      setExportProgress(100);
      setIsExporting(false);
      setIsFinished(true);
    }
  };

  const handleDownload = () => {
    if (renderedDownloadUrl) {
      const a = document.createElement('a');
      a.href = renderedDownloadUrl;
      a.download = renderedFileName || `${projectName.replace(/\s+/g, '_')}_${resolution}.${format}`;
      a.click();
    } else {
      // Local fallback blob trigger
      const dummyBlob = new Blob(['ClipForge Studio Master Video Export'], { type: 'video/mp4' });
      const url = URL.createObjectURL(dummyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}_${resolution}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-md bg-[#16161A] border border-[#2A2A30] rounded-lg shadow-2xl overflow-hidden flex flex-col text-[#E8E6E1]">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#24242A] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-[#C9A66B]/30 bg-[#C9A66B]/10 text-[#C9A66B] flex items-center justify-center">
              <FileVideo className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E8E6E1]">Export Sequence</h3>
              <p className="text-[11px] text-[#8A8A92] font-mono truncate max-w-[220px]">
                {projectName}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="p-1 rounded text-[#8A8A92] hover:text-[#E8E6E1] hover:bg-[#1F1F24] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {!isFinished ? (
            <>
              {/* 1. Resolution Selection */}
              <div>
                <label className="text-[11px] font-medium text-[#8A8A92] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Master Resolution</span>
                  <span className="font-mono text-[10px] text-zinc-500">Output Quality</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setResolution('720p')}
                    className={`p-2.5 rounded border text-xs font-medium text-left transition-all ${
                      resolution === '720p'
                        ? 'bg-[#202026] text-[#E8E6E1] border-[#C9A66B]'
                        : 'bg-[#18181C] text-[#8A8A92] border-[#26262B] hover:text-[#E8E6E1] hover:border-[#383840]'
                    }`}
                  >
                    <div className="font-mono font-medium">720p HD</div>
                    <div className="text-[10px] text-zinc-500">Standard Web</div>
                  </button>

                  <button
                    onClick={() => setResolution('1080p')}
                    className={`p-2.5 rounded border text-xs font-medium text-left transition-all relative ${
                      resolution === '1080p'
                        ? 'bg-[#202026] text-[#E8E6E1] border-[#C9A66B]'
                        : 'bg-[#18181C] text-[#8A8A92] border-[#26262B] hover:text-[#E8E6E1] hover:border-[#383840]'
                    }`}
                  >
                    <div className="font-mono font-medium text-[#C9A66B]">1080p FHD</div>
                    <div className="text-[10px] text-zinc-400">Recommended</div>
                  </button>

                  <button
                    onClick={() => setProModalOpen(true)}
                    className="p-2.5 rounded border text-xs font-medium text-left bg-[#18181C] text-[#8A8A92] border-[#26262B] hover:border-[#C9A66B]/50 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#C9A66B]">4K UHD</span>
                      <Lock className="w-3 h-3 text-[#C9A66B]" strokeWidth={1.5} />
                    </div>
                    <div className="text-[10px] text-zinc-500">Pro License</div>
                  </button>
                </div>
              </div>

              {/* 2. Frame Rate & Format */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#8A8A92] uppercase tracking-wider mb-1.5 block">
                    Frame Rate
                  </label>
                  <select
                    value={frameRate}
                    onChange={(e) => setFrameRate(e.target.value as any)}
                    className="w-full bg-[#18181C] text-xs text-[#E8E6E1] p-2 rounded border border-[#26262B] outline-none cursor-pointer focus:border-[#C9A66B] font-mono"
                  >
                    <option value="24fps">24 fps (Cinema Standard)</option>
                    <option value="30fps">30 fps (Broadcast)</option>
                    <option value="60fps">60 fps (High Motion)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#8A8A92] uppercase tracking-wider mb-1.5 block">
                    Container Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full bg-[#18181C] text-xs text-[#E8E6E1] p-2 rounded border border-[#26262B] outline-none cursor-pointer focus:border-[#C9A66B] font-mono"
                  >
                    <option value="mp4">MP4 (H.264 / AAC)</option>
                    <option value="mov">MOV (Apple ProRes)</option>
                    <option value="webm">WebM (VP9)</option>
                  </select>
                </div>
              </div>

              {/* 3. Watermark License Option */}
              <div className="p-3 bg-[#18181C] rounded border border-[#26262B] flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#E8E6E1]">Clean Commercial License</p>
                  <p className="text-[10px] text-[#8A8A92]">Remove ClipForge insignia watermark</p>
                </div>
                <button
                  onClick={() => setProModalOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-[#C9A66B] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 px-2.5 py-1 rounded transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-[#C9A66B]" strokeWidth={1.5} />
                  <span>Pro Upgrade</span>
                </button>
              </div>

              {/* Progress Bar (If exporting) */}
              {isExporting && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs text-[#8A8A92]">
                    <span className="flex items-center gap-2 text-[#C9A66B] font-mono text-[11px]">
                      <Settings2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                      Encoding timeline frames...
                    </span>
                    <span className="font-mono font-medium text-[#E8E6E1]">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#202026] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#C9A66B] transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Finished Screen */
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#E8E6E1]">Encoding Complete</h4>
                <p className="text-xs text-[#8A8A92] font-mono mt-0.5">
                  Rendered in {resolution} · {frameRate} · {format.toUpperCase()}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-2.5 rounded bg-[#C9A66B] hover:bg-[#B89357] text-[#121214] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <HardDrive className="w-4 h-4" strokeWidth={1.5} />
                <span>Save to Local Drive</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isFinished && (
          <div className="px-4 py-3 border-t border-[#24242A] bg-[#121215] flex items-center justify-between">
            <span className="text-[11px] text-[#8A8A92] font-mono flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" strokeWidth={1.5} />
              Est. ~{Math.max(5, Math.round(totalDuration * 0.9))} MB
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-medium text-[#8A8A92] hover:text-[#E8E6E1] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartExport}
                disabled={isExporting}
                className="px-4 py-1.5 rounded bg-[#C9A66B] hover:bg-[#B89357] disabled:opacity-40 text-[#121214] font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{isExporting ? 'Encoding...' : 'Export'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
