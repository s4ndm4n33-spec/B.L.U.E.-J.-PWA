/**
 * NEW: AI Provider Toggle — Local vs Cloud LLM selection.
 *
 * Users can choose:
 * - "cloud"  → OpenAI API via server (requires internet)
 * - "local"  → WebLLM in-browser (Phi-3.5-mini, no internet after download)
 * - "auto"   → Cloud when online, auto-fallback to local when offline
 *
 * This store persists the user's preference and manages provider state.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initOfflineAI, isOfflineReady, supportsWebGPU, disposeOfflineAI, type DownloadProgress } from './offline-ai';

export type AIProvider = 'auto' | 'cloud' | 'local';

export interface AIProviderState {
  provider: AIProvider;
  localModelStatus: 'not-downloaded' | 'downloading' | 'ready' | 'error' | 'unsupported';
  downloadProgress: number;
  downloadText: string;
  cloudEndpoint: string; // For self-hosted: can point to local Ollama, LM Studio, etc.
  customCloudEndpoints: string[]; // Saved custom endpoints

  // Actions
  setProvider: (p: AIProvider) => void;
  downloadLocalModel: () => Promise<boolean>;
  removeLocalModel: () => Promise<void>;
  setCloudEndpoint: (url: string) => void;
  addCustomEndpoint: (url: string) => void;
  removeCustomEndpoint: (url: string) => void;
}

export const useAIProviderStore = create<AIProviderState>()(
  persist(
    (set, get) => ({
      provider: 'auto',
      localModelStatus: supportsWebGPU() ? 'not-downloaded' : 'unsupported',
      downloadProgress: 0,
      downloadText: '',
      cloudEndpoint: '/api/bluej', // Default: same server
      customCloudEndpoints: [],

      setProvider: (provider) => {
        // If switching to local, check readiness
        if (provider === 'local' && !isOfflineReady()) {
          // Auto-start download if not ready
          get().downloadLocalModel();
        }
        set({ provider });
      },

      downloadLocalModel: async () => {
        if (!supportsWebGPU()) {
          set({ localModelStatus: 'unsupported' });
          return false;
        }
        set({ localModelStatus: 'downloading', downloadProgress: 0, downloadText: 'Initializing...' });
        try {
          const success = await initOfflineAI((p) => {
            set({ downloadProgress: p.progress, downloadText: p.text });
          });
          set({
            localModelStatus: success ? 'ready' : 'error',
            downloadProgress: success ? 100 : 0,
            downloadText: success ? 'Model ready' : 'Download failed',
          });
          return success;
        } catch {
          set({ localModelStatus: 'error', downloadProgress: 0, downloadText: 'Download failed' });
          return false;
        }
      },

      removeLocalModel: async () => {
        await disposeOfflineAI();
        set({ localModelStatus: 'not-downloaded', downloadProgress: 0, downloadText: '' });
      },

      setCloudEndpoint: (url) => set({ cloudEndpoint: url }),

      addCustomEndpoint: (url) => {
        const trimmed = url.trim();
        if (!trimmed) return;
        const current = get().customCloudEndpoints;
        if (!current.includes(trimmed)) {
          set({ customCloudEndpoints: [...current, trimmed] });
        }
      },

      removeCustomEndpoint: (url) => {
        set({ customCloudEndpoints: get().customCloudEndpoints.filter(e => e !== url) });
      },
    }),
    {
      name: 'bluej-ai-provider',
      partialize: (state) => ({
        provider: state.provider,
        cloudEndpoint: state.cloudEndpoint,
        customCloudEndpoints: state.customCloudEndpoints,
      }),
    }
  )
);

/**
 * Resolve which provider to use RIGHT NOW based on settings + connectivity.
 */
export function resolveProvider(): 'cloud' | 'local' {
  const { provider } = useAIProviderStore.getState();

  if (provider === 'local') {
    return isOfflineReady() ? 'local' : 'cloud'; // fallback to cloud if local not ready
  }
  if (provider === 'cloud') {
    return 'cloud';
  }
  // auto: prefer cloud when online, local when offline
  if (!navigator.onLine && isOfflineReady()) return 'local';
  return 'cloud';
}
