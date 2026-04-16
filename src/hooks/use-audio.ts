import { useState, useRef, useCallback } from 'react';

export function useAudioOutput() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playBase64Audio = useCallback((base64: string, format: string = 'mp3') => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audioUrl = `data:audio/${format};base64,${base64}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio.play().catch(e => {
      console.error("[Audio] Failed to play TTS:", e);
      setIsPlaying(false);
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return { isPlaying, playBase64Audio, stopAudio };
}

export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'error';

export function useVoiceRecording(onTranscription: (text: string) => void) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isRecording = recordingState === 'recording';
  const isTranscribing = recordingState === 'transcribing';

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setRecordingState('transcribing');
        streamRef.current?.getTracks().forEach(t => t.stop());

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);

          const resp = await fetch(`/api/bluej/stt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64, format: 'webm' }),
          });

          if (!resp.ok) throw new Error(`STT failed: ${resp.status}`);
          const { transcript } = await resp.json() as { transcript: string };
          onTranscription(transcript || '');
          setRecordingState('idle');
        } catch (err) {
          console.error('[STT] Transcription error:', err);
          setRecordingState('error');
          setTimeout(() => setRecordingState('idle'), 3000);
        }
      };

      recorder.start();
      setRecordingState('recording');
    } catch (err) {
      console.error('[Voice] Microphone access denied:', err);
      setRecordingState('error');
      setTimeout(() => setRecordingState('idle'), 3000);
    }
  }, [onTranscription]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { isRecording, isTranscribing, recordingState, startRecording, stopRecording };
}
