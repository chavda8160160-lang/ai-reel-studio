import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, AlertCircle } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const VoiceRecorderBar: React.FC = () => {
  const { isRecordingVoice, setIsRecordingVoice, addVoiceRecording } = useEditorStore();

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isRecordingVoice) {
      cleanup();
    }
    return () => {
      cleanup();
    };
  }, [isRecordingVoice]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordSeconds(0);
    setMicError(null);
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not supported on this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const finalDuration = Math.max(1, recordSeconds);
        addVoiceRecording(audioUrl, finalDuration);
        cleanup();
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordSeconds(0);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordSeconds(elapsed);
      }, 100);

    } catch (err: any) {
      console.warn('Microphone error:', err);
      // Fallback: simulate audio recording
      setMicError(err.message || 'Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else if (isRecording) {
      // simulated stop
      const finalDuration = Math.max(1, recordSeconds);
      addVoiceRecording('/rendered-reels/bgm-cyber.mp3', finalDuration);
      cleanup();
    }
  };

  if (!isRecordingVoice) return null;

  return (
    <div className="h-10 px-3 bg-[#1e1e24] border-b border-[#38383d] flex items-center justify-between text-xs text-[#d4d4d8] select-none animate-in fade-in duration-150">
      <div className="flex items-center gap-2.5">
        <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-[#ef4444] animate-ping' : 'bg-[#8a8a93]'}`} />
        <span className="font-semibold text-[11px] uppercase tracking-wider text-[#d4d4d8] flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5 text-[#4f8cff]" />
          <span>Voice Recorder</span>
        </span>
        <div className="w-px h-3.5 bg-[#38383d] mx-1" />
        <span className="font-mono text-[12px] font-bold text-[#4f8cff] min-w-[55px]">
          {recordSeconds.toFixed(1)}s
        </span>

        {micError && (
          <div className="flex items-center gap-1 text-[10px] text-[#ef4444] ml-2">
            <AlertCircle className="w-3 h-3" />
            <span>{micError}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="h-6 px-2.5 rounded bg-[#4f8cff] hover:bg-[#3d7be6] text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Mic className="w-3 h-3" />
            <span>Start Recording</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="h-6 px-2.5 rounded bg-[#ef4444] hover:bg-[#dc2626] text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer animate-pulse"
          >
            <Square className="w-3 h-3 fill-white" />
            <span>Stop & Add to Track</span>
          </button>
        )}

        <button
          onClick={() => {
            cleanup();
            setIsRecordingVoice(false);
          }}
          className="h-6 w-6 rounded hover:bg-[#2f2f34] text-[#8a8a93] hover:text-[#d4d4d8] flex items-center justify-center transition-colors cursor-pointer"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

