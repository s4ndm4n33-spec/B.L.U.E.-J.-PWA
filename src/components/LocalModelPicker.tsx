/**
 * Local Model Picker — choose, download, and manage on-device AI models.
 * Uses WebLLM (MLC) to run models entirely in the browser via WebGPU.
 */
import { useState, useEffect, useCallback } from 'react';
import { Download, Check, Loader2, Trash2, Cpu, AlertTriangle, Zap } from 'lucide-react';
import { useBlueJStore } from '@/lib/store';
import { initOfflineAI, isOfflineReady, disposeOfflineAI, supportsWebGPU, checkWebGPUDeep } from '@/lib/offline-ai';

interface ModelOption {
  id: string;
  label: string;
  description: string;
  size: string;
  ramNeeded: string;
  tier: 'compact' | 'balanced' | 'powerful';
}

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi-3.5 Mini',
    description: 'Microsoft — great balance of speed & quality',
    size: '~1.5 GB',
    ramNeeded: '~3 GB',
    tier: 'balanced',
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    label: 'Gemma 2 2B',
    description: 'Google — tiny & fast, good for lower-end phones',
    size: '~1.0 GB',
    ramNeeded: '~2 GB',
    tier: 'compact',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen 2.5 1.5B',
    description: 'Alibaba — smallest option, very fast',
    size: '~0.8 GB',
    ramNeeded: '~2 GB',
    tier: 'compact',
  },
  {
    id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.1 8B',
    description: 'Meta — powerful, needs more RAM',
    size: '~4.0 GB',
    ramNeeded: '~6 GB',
    tier: 'powerful',
  },
  {
    id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
    label: 'Mistral 7B',
    description: 'Mistral AI — solid all-rounder',
    size: '~3.5 GB',
    ramNeeded: '~5 GB',
    tier: 'powerful',
  },
];

const TIER_COLORS = {
  compact: 'text-green-400 border-green-400/30',
  balanced: 'text-cyan-400 border-cyan-400/30',
  powerful: 'text-purple-400 border-purple-400/30',
};

const TIER_LABELS = {
  compact: 'Compact',
  balanced: 'Balanced',
  powerful: 'Powerful',
};

export function LocalModelPicker() {
  const {
    localModelStatus,
    localModelReady,
    setLocalModelStatus,
    setLocalModelReady,
  } = useBlueJStore();

  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('bluej-local-model') || 'Phi-3.5-mini-instruct-q4f16_1-MLC'
  );
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [hasWebGPU, setHasWebGPU] = useState(true);
  const [gpuReason, setGpuReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Quick check first, then deep probe
    setHasWebGPU(supportsWebGPU());
    checkWebGPUDeep().then(({ supported, reason }) => {
      setHasWebGPU(supported);
      setGpuReason(reason);
    });
  }, []);

  const handleLoadModel = useCallback(async (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('bluej-local-model', modelId);
    setLocalModelStatus('downloading');
    setDownloadProgress(0);
    setProgressText('Initializing...');
    setErrorMsg('');

    try {
      // Deep-check WebGPU first so we get a real error instead of silent crash
      const gpu = await checkWebGPUDeep();
      if (!gpu.supported) {
        setLocalModelStatus('error');
        setErrorMsg(`WebGPU check failed: ${gpu.reason}`);
        return;
      }

      // Dispose existing model first
      if (isOfflineReady()) {
        await disposeOfflineAI();
        setLocalModelReady(false);
      }

      const success = await initOfflineAI(
        (progress) => {
          setDownloadProgress(progress.progress);
          setProgressText(progress.text);
        },
        modelId,
      );

      if (success) {
        setLocalModelStatus('ready');
        setLocalModelReady(true);
        setProgressText('');
        setErrorMsg('');
      } else {
        setLocalModelStatus('error');
        setErrorMsg('Model failed to load — your device may not have enough RAM for this model. Try a smaller one.');
      }
    } catch (err) {
      console.error('Model load error:', err);
      setLocalModelStatus('error');
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Load error: ${msg}`);
    }
  }, [setLocalModelStatus, setLocalModelReady]);

  const handleUnload = useCallback(async () => {
    await disposeOfflineAI();
    setLocalModelReady(false);
    setLocalModelStatus('idle');
    setProgressText('');
  }, [setLocalModelReady, setLocalModelStatus]);

  if (!hasWebGPU) {
    return (
      <div className="rounded border border-yellow-400/20 bg-yellow-400/5 p-3">
        <div className="flex items-center gap-2 text-yellow-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="font-hud uppercase tracking-wider">WebGPU Not Available</span>
        </div>
        <p className="text-xs text-primary/50 mt-2">
          This device doesn't support WebGPU, which is needed for on-device AI.
          Try Chrome 113+ or a newer phone. You can still use Cloud mode with an API key.
        </p>
        {gpuReason && (
          <p className="text-[10px] text-primary/30 mt-1 font-mono break-all">
            Diagnostic: {gpuReason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Model Cards */}
      {AVAILABLE_MODELS.map((model) => {
        const isSelected = selectedModel === model.id;
        const isLoaded = isSelected && localModelReady;
        const isLoading = isSelected && localModelStatus === 'downloading';
        const isError = isSelected && localModelStatus === 'error';

        return (
          <div
            key={model.id}
            className={`rounded border p-3 transition-all cursor-pointer ${
              isLoaded
                ? 'border-green-400/50 bg-green-400/5'
                : isError
                ? 'border-red-400/40 bg-red-400/5'
                : isSelected
                ? 'border-primary/40 bg-primary/5'
                : 'border-primary/10 hover:border-primary/25'
            }`}
            onClick={() => !isLoading && setSelectedModel(model.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLoaded ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Cpu className="w-4 h-4 text-primary/50" />
                )}
                <span className="text-sm font-hud text-primary">{model.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TIER_COLORS[model.tier]}`}>
                  {TIER_LABELS[model.tier]}
                </span>
              </div>
              <span className="text-[10px] font-mono text-primary/40">{model.size}</span>
            </div>

            <p className="text-[11px] text-primary/50 mt-1 ml-6">{model.description}</p>
            <p className="text-[10px] text-primary/30 mt-0.5 ml-6">RAM: {model.ramNeeded}</p>

            {/* Load / Unload buttons */}
            {isSelected && (
              <div className="mt-2 ml-6 flex gap-2">
                {isLoaded ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnload(); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-400/30 text-red-400/70 text-[11px] font-hud uppercase tracking-wider hover:border-red-400/50 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" /> Unload
                  </button>
                ) : isLoading ? (
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-primary/60">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{progressText || 'Loading...'}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-primary/10 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400/60 transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : isError ? (
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-[11px] text-red-400">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span className="break-words">{errorMsg || 'Unknown error'}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLoadModel(model.id); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-cyan-400/30 text-cyan-400/70 text-[11px] font-hud uppercase tracking-wider hover:border-cyan-400/50 hover:text-cyan-400"
                      >
                        <Download className="w-3 h-3" /> Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLoadModel(model.id); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-cyan-400/30 text-cyan-400/70 text-[11px] font-hud uppercase tracking-wider hover:border-cyan-400/50 hover:text-cyan-400"
                  >
                    <Download className="w-3 h-3" />
                    {model.id === selectedModel ? 'Load Model' : 'Download & Load'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Status bar */}
      <div className="flex items-center gap-2 text-[11px] text-primary/40 pt-1">
        <Zap className="w-3 h-3" />
        {localModelReady
          ? `${AVAILABLE_MODELS.find(m => m.id === selectedModel)?.label || 'Model'} loaded — fully offline`
          : 'No model loaded — select one above'}
      </div>
    </div>
  );
}
