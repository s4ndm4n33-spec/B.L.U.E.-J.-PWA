/**
 * NEW: Continuous voice chat mode — always-listening conversational AI.
 *
 * Features:
 * - VAD (Voice Activity Detection) via Web Speech API
 * - Hands-free conversation: speak → J. responds via TTS → listens again
 * - Push-to-talk fallback for browsers without continuous recognition
 * - Visual feedback: listening, processing, speaking states
 * - Auto-pause when J. is speaking (prevents feedback loop)
 *
 * This replaces push-to-talk with a full voice conversation mode.
 * The mic stays hot — user speaks, J. responds, mic re-activates.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceChatState =
  | 'inactive'      // Voice mode off
  | 'listening'     // Mic hot, waiting for speech
  | 'processing'    // User finished speaking, sending to STT/AI
  | 'responding'    // J. is generating response
  | 'speaking'      // J. is speaking TTS response
  | 'error';        // Error state (auto-recovers)

interface UseVoiceChatOptions {
  onTranscription: (text: string) => void;   // Called with user's speech text
  onStateChange?: (state: VoiceChatState) => void;
  language?: string;                          // BCP-47 language code
  continuous?: boolean;                       // Keep listening after each utterance
  interimResults?: boolean;                   // Show partial results while speaking
}

// Check browser support
const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;

export function useVoiceChat({
  onTranscription,
  onStateChange,
  language = 'en-US',
  continuous = true,
  interimResults = true,
}: UseVoiceChatOptions) {
  const [state, setState] = useState<VoiceChatState>('inactive');
  const [interimText, setInterimText] = useState('');
  const [isSupported] = useState(hasSpeechRecognition);

  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateState = useCallback((newState: VoiceChatState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  // Create and configure recognition instance
  const createRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript) {
        setInterimText(interimTranscript);
      }

      if (finalTranscript.trim()) {
        setInterimText('');
        // Clear silence timer — user just spoke
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        updateState('processing');
        onTranscription(finalTranscript.trim());
      }
    };

    recognition.onspeechend = () => {
      // User stopped speaking — wait briefly then check if we should restart
      silenceTimerRef.current = setTimeout(() => {
        if (isActiveRef.current && state !== 'speaking') {
          // User is done, we're still in voice mode — listen again
          updateState('listening');
        }
      }, 1500);
    };

    recognition.onerror = (event: any) => {
      console.warn('[VoiceChat] Recognition error:', event.error);

      // Don't treat "no-speech" or "aborted" as fatal
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (isActiveRef.current) {
          // Restart listening after a brief pause
          restartTimerRef.current = setTimeout(() => {
            if (isActiveRef.current) startListening();
          }, 500);
        }
        return;
      }

      updateState('error');
      // Auto-recover after 2 seconds
      setTimeout(() => {
        if (isActiveRef.current) {
          updateState('listening');
          startListening();
        }
      }, 2000);
    };

    recognition.onend = () => {
      // Recognition ended — restart if still in voice mode
      if (isActiveRef.current && state !== 'speaking' && state !== 'responding') {
        restartTimerRef.current = setTimeout(() => {
          if (isActiveRef.current) startListening();
        }, 300);
      }
    };

    return recognition;
  }, [continuous, interimResults, language, onTranscription, updateState, state]);

  const startListening = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      recognitionRef.current = createRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.start();
        updateState('listening');
      }
    } catch (err) {
      console.error('[VoiceChat] Failed to start:', err);
    }
  }, [createRecognition, updateState]);

  // Activate voice chat mode
  const activate = useCallback(async () => {
    if (!isSupported) return false;

    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // Release immediately, just checking permission
    } catch {
      console.error('[VoiceChat] Microphone permission denied');
      return false;
    }

    isActiveRef.current = true;
    startListening();
    return true;
  }, [isSupported, startListening]);

  // Deactivate voice chat mode
  const deactivate = useCallback(() => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    setInterimText('');
    updateState('inactive');
  }, [updateState]);

  // Pause listening (while J. is speaking TTS)
  const pauseForResponse = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  // Resume listening (after J. finishes speaking)
  const resumeListening = useCallback(() => {
    if (isActiveRef.current) {
      startListening();
    }
  }, [startListening]);

  // Signal that J. is now responding / speaking
  const setResponding = useCallback(() => {
    pauseForResponse();
    updateState('responding');
  }, [pauseForResponse, updateState]);

  const setSpeaking = useCallback(() => {
    pauseForResponse();
    updateState('speaking');
  }, [pauseForResponse, updateState]);

  const setDoneSpeaking = useCallback(() => {
    updateState('listening');
    resumeListening();
  }, [updateState, resumeListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) recognitionRef.current.abort();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  return {
    state,
    interimText,
    isSupported,
    isActive: isActiveRef.current,
    activate,
    deactivate,
    setResponding,
    setSpeaking,
    setDoneSpeaking,
    pauseForResponse,
    resumeListening,
  };
}
