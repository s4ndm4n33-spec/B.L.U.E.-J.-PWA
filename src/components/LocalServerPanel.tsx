/**
 * Local Server Panel — connect to Ollama, LM Studio, llama.cpp,
 * or any OpenAI-compatible server running on the user's machine.
 *
 * Auto-detects server type, fetches available models, and lets the
 * user pick which GGUF / local model to use.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Server, RefreshCw, Check, AlertTriangle, Loader2,
  Wifi, WifiOff, Cpu, ChevronDown,
} from 'lucide-react';
import { useAIProviderStore } from '@/lib/ai-provider';
import { probeLocalServer, type LocalModel } from '@/lib/local-server-ai';

const PRESET_ENDPOINTS = [
  { label: 'Ollama (default)', url: 'http://localhost:11434/v1' },
  { label: 'LM Studio', url: 'http://localhost:1234/v1' },
  { label: 'llama.cpp', url: 'http://localhost:8080/v1' },
  { label: 'Jan', url: 'http://localhost:1337/v1' },
  { label: 'Custom...', url: '' },
];

export function LocalServerPanel() {
  const {
    localEndpoint, setLocalEndpoint,
    localModel, setLocalModel,
    setLocalServerReachable,
  } = useAIProviderStore();

  const [models, setModels] = useState<LocalModel[]>([]);
  const [serverType, setServerType] = useState('');
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [customUrl, setCustomUrl] = useState(localEndpoint);

  const probe = useCallback(async (endpoint?: string) => {
    const url = endpoint || customUrl;
    setProbing(true);
    setError('');
    setModels([]);
    setConnected(false);
    setLocalServerReachable(false);

    const result = await probeLocalServer(url);

    if (result.reachable) {
      setConnected(true);
      setLocalServerReachable(true);
      setServerType(result.serverType);
      setModels(result.models);
      // Auto-select first model if none chosen
      if (!localModel && result.models.length > 0) {
        setLocalModel(result.models[0].id);
      }
    } else {
      setError(result.error || 'Server not reachable');
    }
    setProbing(false);
  }, [customUrl, localModel, setLocalModel, setLocalServerReachable]);

  // Probe on mount
  useEffect(() => {
    probe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndpointChange = (url: string) => {
    setCustomUrl(url);
    setLocalEndpoint(url);
    setConnected(false);
    setModels([]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-hud text-primary/70 uppercase tracking-wider">
        <Server className="w-3.5 h-3.5" />
        Local AI Server
      </div>

      {/* Preset selector */}
      <div className="relative">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-full flex items-center justify-between px-3 py-2 bg-black/30 border border-primary/20 rounded-sm text-sm text-primary hover:border-primary/40 transition-all"
        >
          <span>{PRESET_ENDPOINTS.find(p => p.url === customUrl)?.label || 'Custom endpoint'}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
        </button>
        {showPresets && (
          <div className="absolute z-10 w-full mt-1 bg-black/90 border border-primary/30 rounded-sm shadow-lg">
            {PRESET_ENDPOINTS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  if (preset.url) {
                    handleEndpointChange(preset.url);
                    probe(preset.url);
                  }
                  setShowPresets(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-all ${
                  customUrl === preset.url ? 'text-primary bg-primary/5' : 'text-primary/70'
                }`}
              >
                <div className="font-hud">{preset.label}</div>
                {preset.url && (
                  <div className="text-[10px] text-primary/40 font-mono">{preset.url}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom URL input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customUrl}
          onChange={(e) => handleEndpointChange(e.target.value)}
          placeholder="http://localhost:11434/v1"
          className="flex-1 bg-black/30 border border-primary/20 rounded-sm px-3 py-2 text-sm text-primary placeholder:text-primary/30 focus:border-primary/50 focus:outline-none font-mono"
        />
        <button
          onClick={() => probe()}
          disabled={probing}
          className="px-3 py-2 border border-primary/20 rounded-sm text-xs font-hud text-primary/70 hover:text-primary hover:border-primary/50 disabled:opacity-30 transition-all flex items-center gap-1"
        >
          {probing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {probing ? 'Scanning...' : 'Connect'}
        </button>
      </div>

      {/* Status */}
      {connected && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <Wifi className="w-3 h-3" />
          Connected to {serverType} — {models.length} model{models.length !== 1 ? 's' : ''} available
        </div>
      )}
      {error && (
        <div className="rounded border border-red-400/20 bg-red-400/5 p-3">
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
          <p className="text-[10px] text-primary/40 mt-2">
            Make sure Ollama / LM Studio / llama.cpp is running. For Ollama: <code className="text-primary/50">ollama serve</code>
          </p>
        </div>
      )}

      {/* Model list */}
      {models.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-hud text-primary/70 uppercase tracking-wider">
            Choose Model
          </label>
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => setLocalModel(model.id)}
              className={`w-full text-left rounded border p-3 transition-all ${
                localModel === model.id
                  ? 'border-green-400/50 bg-green-400/5'
                  : 'border-primary/10 hover:border-primary/25'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {localModel === model.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Cpu className="w-4 h-4 text-primary/40" />
                  )}
                  <span className="text-sm font-hud text-primary">{model.name}</span>
                  {model.quantization && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-primary/20 text-primary/50">
                      {model.quantization}
                    </span>
                  )}
                </div>
                {model.size && (
                  <span className="text-[10px] font-mono text-primary/40">{model.size}</span>
                )}
              </div>
              {model.family && (
                <p className="text-[10px] text-primary/30 mt-0.5 ml-6">{model.family}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Manual model name (in case auto-detect fails) */}
      <div>
        <label className="block text-xs font-hud text-primary/70 uppercase tracking-wider mb-2">
          Model Name <span className="opacity-50">(or type manually)</span>
        </label>
        <input
          type="text"
          value={localModel}
          onChange={(e) => setLocalModel(e.target.value)}
          placeholder="e.g. llama3, phi3, mistral, gemma2..."
          className="w-full bg-black/30 border border-primary/20 rounded-sm px-3 py-2 text-sm text-primary placeholder:text-primary/30 focus:border-primary/50 focus:outline-none font-mono"
        />
        <p className="text-primary/40 text-[10px] mt-1">
          This is the model name as your server knows it (e.g. <code>llama3.1:8b</code> for Ollama, or the filename for LM Studio)
        </p>
      </div>

      {/* How-to hint */}
      {!connected && !probing && (
        <div className="rounded border border-primary/10 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-primary/60 font-hud uppercase tracking-wider">Quick Setup</p>
          <div className="text-[11px] text-primary/50 space-y-1">
            <p>1. Install <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Ollama</a> (Mac/Win/Linux) or <a href="https://lmstudio.ai" target="_blank" rel="noreferrer" className="text-cyan-400 underline">LM Studio</a></p>
            <p>2. Pull a model: <code className="text-primary/60 bg-black/30 px-1 rounded">ollama pull phi3</code></p>
            <p>3. Start the server: <code className="text-primary/60 bg-black/30 px-1 rounded">ollama serve</code></p>
            <p>4. Hit <strong>Connect</strong> above — your models will appear</p>
          </div>
        </div>
      )}
    </div>
  );
}
