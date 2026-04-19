/**
 * NEW: AI Provider Settings panel — toggle between Local / Cloud / Auto.
 *
 * Features:
 * - One-tap toggle: Auto | Cloud | Local
 * - Local model download progress indicator
 * - Custom endpoint input (for Ollama, LM Studio, etc.)
 * - WebGPU support detection
 */
import { useState } from 'react';
import { useAIProviderStore, type AIProvider } from '@/lib/ai-provider';
import { Cpu, Cloud, Zap, Download, Trash2, Plus, X, Loader2, AlertTriangle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PROVIDER_OPTIONS: { id: AIProvider; label: string; desc: string; icon: typeof Cpu }[] = [
  { id: 'auto', label: 'AUTO', desc: 'Cloud when online, local when offline', icon: Zap },
  { id: 'cloud', label: 'CLOUD', desc: 'OpenAI API or custom endpoint', icon: Cloud },
  { id: 'local', label: 'LOCAL', desc: 'In-browser AI (Phi-3.5-mini, ~2GB)', icon: Cpu },
];

export function AIProviderSettings() {
  const {
    provider, setProvider,
    localModelStatus, downloadProgress, downloadText,
    downloadLocalModel, removeLocalModel,
    cloudEndpoint, setCloudEndpoint,
    customCloudEndpoints, addCustomEndpoint, removeCustomEndpoint,
  } = useAIProviderStore();

  const [newEndpoint, setNewEndpoint] = useState('');
  const [showEndpoints, setShowEndpoints] = useState(false);
  const isOnline = navigator.onLine;

  return (
    <div className="space-y-4">
      {/* Provider Toggle */}
      <div>
        <h3 className="text-xs font-hud uppercase tracking-widest text-primary/60 mb-2">AI Engine</h3>
        <div className="flex border border-primary/30 rounded-sm overflow-hidden bg-secondary/50">
          {PROVIDER_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = provider === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setProvider(opt.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 transition-all text-center ${
                  active
                    ? 'bg-primary/20 text-primary border-b-2 border-primary'
                    : 'text-primary/40 hover:text-primary/70 border-b-2 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-hud uppercase tracking-wider">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-primary/30 mt-1.5 font-mono">
          {PROVIDER_OPTIONS.find(o => o.id === provider)?.desc}
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2 text-xs font-mono">
        {isOnline ? (
          <><Wifi className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400/70">Online</span></>
        ) : (
          <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400/70">Offline</span></>
        )}
        {localModelStatus === 'ready' && (
          <span className="text-primary/40 ml-2">· Local AI ready</span>
        )}
      </div>

      {/* Local Model Section */}
      <div className="bg-secondary/30 rounded-sm border border-primary/15 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-hud uppercase tracking-widest text-primary/50">Local Model</h4>
          {localModelStatus === 'ready' && (
            <span className="flex items-center gap-1 text-green-400 text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> Loaded
            </span>
          )}
        </div>

        {localModelStatus === 'unsupported' && (
          <div className="flex items-start gap-2 text-[11px] text-yellow-400/80">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>WebGPU not supported on this device. Local AI requires Chrome 113+ or Edge 113+ with WebGPU enabled.</span>
          </div>
        )}

        {localModelStatus === 'not-downloaded' && (
          <button
            onClick={() => downloadLocalModel()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-sm text-xs font-hud uppercase tracking-wider transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download Offline Model (~2GB)
          </button>
        )}

        {localModelStatus === 'downloading' && (
          <div className="space-y-2">
            <div className="w-full h-2 bg-background rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                animate={{ width: `${downloadProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-primary/40 font-mono">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{downloadText} ({downloadProgress}%)</span>
            </div>
          </div>
        )}

        {localModelStatus === 'ready' && (
          <button
            onClick={() => removeLocalModel()}
            className="flex items-center gap-2 text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Remove local model
          </button>
        )}

        {localModelStatus === 'error' && (
          <div className="space-y-2">
            <p className="text-[10px] text-red-400/70">Download failed. Check your connection and try again.</p>
            <button
              onClick={() => downloadLocalModel()}
              className="text-[10px] text-primary/60 hover:text-primary underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Custom Endpoints (for self-hosted LLMs) */}
      <div className="bg-secondary/30 rounded-sm border border-primary/15 p-3 space-y-2">
        <button
          onClick={() => setShowEndpoints(v => !v)}
          className="flex items-center justify-between w-full text-[10px] font-hud uppercase tracking-widest text-primary/50"
        >
          <span>Cloud Endpoints</span>
          <span className="text-primary/30">{showEndpoints ? '▼' : '▶'}</span>
        </button>

        <AnimatePresence>
          {showEndpoints && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2"
            >
              <p className="text-[10px] text-primary/30 font-mono">
                Point to Ollama, LM Studio, or any OpenAI-compatible endpoint.
              </p>

              {/* Current endpoint */}
              <div className="text-[10px] font-mono">
                <span className="text-primary/40">Active: </span>
                <span className="text-primary/70">{cloudEndpoint}</span>
              </div>

              {/* Saved endpoints */}
              {customCloudEndpoints.map(ep => (
                <div key={ep} className="flex items-center gap-2">
                  <button
                    onClick={() => setCloudEndpoint(ep)}
                    className={`flex-1 text-left text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                      cloudEndpoint === ep
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-primary/10 text-primary/40 hover:text-primary/70'
                    }`}
                  >
                    {ep}
                  </button>
                  <button onClick={() => removeCustomEndpoint(ep)} className="text-red-400/50 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add new */}
              <div className="flex gap-2">
                <input
                  value={newEndpoint}
                  onChange={e => setNewEndpoint(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="flex-1 bg-background border border-primary/20 rounded-sm px-2 py-1 text-[10px] font-mono text-primary placeholder:text-primary/20 focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={() => { addCustomEndpoint(newEndpoint); setCloudEndpoint(newEndpoint); setNewEndpoint(''); }}
                  disabled={!newEndpoint.trim()}
                  className="px-2 py-1 bg-primary/10 border border-primary/30 text-primary rounded-sm disabled:opacity-30"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Reset to default */}
              <button
                onClick={() => setCloudEndpoint('/api/bluej')}
                className="text-[10px] text-primary/30 hover:text-primary/60 font-mono underline"
              >
                Reset to default server
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
