import { useState, useRef, useCallback } from 'react';
import { useBlueJStore } from '@/lib/store';
import {
  speakWithDeviceVoice,
  startDeviceSpeechRecognition,
  stopDeviceSpeech,
  supportsNativeSpeechRecognition,
} from '@/lib/native-bridge';

export function useAudioOutput() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playBase64Audio = useCallback((base64: string, format = 'mp3') => {
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
    audio.play().catch((error) => {
      console.error('[Audio] Failed to play TTS:', error);
      setIsPlaying(false);
    });
  }, []);

  const speakText = useCallback(async (text: string) => {
    setIsPlaying(true);
    try {
      await speakWithDeviceVoice(text);
    } finally {
      setIsPlaying(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stopDeviceSpeech();
    setIsPlaying(false);
  }, []);

  return { isPlaying, playBase64Audio, speakText, stopAudio };
}

export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'error';

export function useVoiceRecording(onTranscription: (text: string) => void) {
  const voiceMode = useBlueJStore((state) => state.voiceMode);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isRecording = recordingState === 'recording';
  const isTranscribing = recordingState === 'transcribing';

  const startBrowserRecording = useCallback(async () => {
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

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setRecordingState('transcribing');
        streamRef.current?.getTracks().forEach((track) => track.stop());

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let index = 0; index < bytes.byteLength; index += 1) {
            binary += String.fromCharCode(bytes[index]);
          }
          const base64 = btoa(binary);

          const response = await fetch('/api/bluej/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64, format: 'webm' }),
          });

          if (!response.ok) {
            throw new Error(`STT failed: ${response.status}`);
          }

          const { transcript } = await response.json() as { transcript: string };
          onTranscription(transcript || '');
          setRecordingState('idle');
        } catch (error) {
          console.error('[STT] Transcription error:', error);
          setRecordingState('error');
          setTimeout(() => setRecordingState('idle'), 3000);
        }
      };

      recorder.start();
      setRecordingState('recording');
    } catch (error) {
      console.error('[Voice] Microphone access denied:', error);
      setRecordingState('error');
      setTimeout(() => setRecordingState('idle'), 3000);
    }
  }, [onTranscription]);

  const startRecording = useCallback(async () => {
    if (voiceMode === 'device-native' && supportsNativeSpeechRecognition()) {
      setRecordingState('recording');
      const recognition = startDeviceSpeechRecognition(
        (transcript) => {
          setRecordingState('idle');
          onTranscription(transcript);
        },
        () => {
          setRecordingState('error');
          setTimeout(() => setRecordingState('idle'), 3000);
        },
      );

      if (recognition) {
        speechRecognitionRef.current = recognition;
        return;
      }
    }

    await startBrowserRecording();
  }, [onTranscription, startBrowserRecording, voiceMode]);

  const stopRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      setRecordingState('idle');
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    isTranscribing,
    recordingState,
    startRecording,
    stopRecording,
  };
}
