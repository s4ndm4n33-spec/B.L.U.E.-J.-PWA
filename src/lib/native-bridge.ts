import { useBlueJStore } from '@/lib/store';

type SpeechRecognitionCtor = new () => SpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isNativeApp(): boolean {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

export function supportsNativeSpeechRecognition(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

export function listDeviceVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

export async function speakWithDeviceVoice(text: string): Promise<void> {
  const { speechEnabled, preferredVoice, speechRate } = useBlueJStore.getState();
  if (!speechEnabled || !('speechSynthesis' in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = listDeviceVoices();
    const selectedVoice = voices.find((voice) => voice.name === preferredVoice);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = speechRate;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopDeviceSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function startDeviceSpeechRecognition(
  onResult: (transcript: string) => void,
  onError: () => void,
): SpeechRecognition | null {
  const RecognitionCtor = getSpeechRecognitionCtor();
  if (!RecognitionCtor) {
    return null;
  }

  const recognition = new RecognitionCtor();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? '';
    onResult(transcript);
  };
  recognition.onerror = () => {
    onError();
  };
  recognition.onnomatch = () => {
    onError();
  };
  recognition.start();
  return recognition;
}
