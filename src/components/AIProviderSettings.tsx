/**
 * AI Provider Settings Panel — configure API key, model, and endpoint.
 *
 * Supports:
 * - OpenAI API key entry
 * - Model selection (chat + fast/utility)
 * - Custom endpoint for Ollama / LM Studio / any OpenAI-compatible API
 * - Provider mode toggle (Auto / Cloud / Local)
 */
import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Check, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useAIProviderStore, type ProviderMode } from '@/lib/ai-provider';

const POPULAR_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (recommended)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast & cheap)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (budget)' },
  { value: 'o1-mini', label: 'o1-mini (reasoning)' },
  { value: 'custom', label: 'Custom model...' },
];

const PROVIDER_MODES: Array<{ value: ProviderMode; label: string; desc: string }> = [
  { value: 'auto', label: 'Auto', desc: 'Uses local AI when available, falls back to cloud' },
  { value: 'cloud', label: 'Cloud', desc: 'Always use cloud API (requires API key)' },
  { value: 'local', label: 'Local', desc: 'Local AI only (WebLLM, no API key needed)' },
];

export function AIProviderSettings() {
  const {
    providerMode, setProviderMode,
    apiKey, setApiKey,
    baseUrl, setBaseUrl,
    chatModel, setChatModel,
    fastModel, setFastModel,
    localEndpoint, setLocalEndpoint,
    hasServerAccess,
    syncToServer,
  } = useAIProviderStore();

  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [customChatModel, setCustomChatModel] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);

  useEffect(() => { setKeyInput(apiKey); }, [apiKey]);

  const isCustomChat = !POPULAR_MODELS.some((m) => m.value === chatModel && m.value !== 'custom');

  const handleSave = async () => {
    setApiKey(keyInput);
    if (isCustomChat && customChatModel) setChatModel(customChatModel);
    await syncToServer();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const endpoint = (baseUrl || 'https://api.openai.com/v1') + '/models';
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${keyInput}` },
      });
      setTestResult(res.ok ? 'ok' : 'error');
    } catch {
      setTestResult('error');
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6 p-4 max-h-[70vh] overflow-y-auto">
      {/* Provider Mode */}
      <div>
        <label className="block text-xs font-hud text-primary/70 uppercase tracking-wider mb-2">
          Provider Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDER_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setProviderMode(mode.value)}
              className={`px-3 py-2 rounded-sm text-xs font-hud border transition-all ${
                providerMode === mode.value
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-primary/20 text-primary/50 hover:text-primary/80'
              }`}
            >
              <div className="font-bold">{mode.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      {providerMode !== 'local' && (
        <div>
          <label className="block text-xs font-hud text-primary/70 uppercase tracking-wider mb-2">
            OpenAI API Key
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-black/30 border border-primary/20 rounded-sm px-3 py-2 text-sm text-primary placeholder:text-primary/30 focus:border-primary/50 focus:outline-none font-mono"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary/70"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={!keyInput || testing}
              className="px-3 py-2 border border-primary/20 rounded-sm text-xs font-hud text-primary/70 hover:text-primary hover:border-primary/50 disabled:opacity-30 transition-all flex items-center gap-1"
            >
              {testing ? '...' : testResult === 'ok' ? <Check className="w-3 h-3 text-green-400" /> : testResult === 'error' ? <AlertTriangle className="w-3 h-3 text-red-400" /> : <Wifi className="w-3 h-3" />}
              Test
            </button>
          </div>
          {testResult === 'ok' && <p className="text-green-400 text-xs mt-1">✓ Connected successfully</p>}
          {testResult === 'error' && <p className="text-red-400 text-xs mt-1">✗ Connection failed — check key & endpoint</p>}
          <p className="text-primary/40 text-[10px] mt-1">Your key is stored locally on your device. Never shared.</p>
        </div>
      )}

      {/* Chat Model */}
      {providerMode !== 'local' && (
        <div>
          <label className="block text-xs font-hud text-primary/70 uppercase tracking-wider mb-2">
            Chat Model
          </label>
          <select
            value={isCustomChat ? 'custom' : chatModel}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setCustomChatModel(chatModel);
              } else {
                setChatModel(e.target.value);
                setCustomChatModel('');
              }
            }}
            className="w-full bg-black/30 border border-primary/20 rounded-sm px-3 py-2 text-sm text-primary focus:border-primary/50 focus:outline-none"
          >
            {POPULAR_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {(isCustomChat || customChatModel !== '') && (
            <input
              type="text"
              value={customChatModel || chatModel}
              onChange={(e) => { setCustomChatModel(e.target.value); setChatModel(e.target.value); }}
              placeholder="e.g. llama3, mistral, claude-3-opus..."
              className="w-full mt-2 bg-black/30 border border-primary/20 rounded-sm px-3 py-2 text-sm text-primary placeholder:text-primary/30 focus:border-primary/50 focus:outline-none font-mono"
            />
          )}
        </div>
      )}

      {/* Fast Model */}
      {providerMode !== 'local' && (
        <div>
          <label className="block text-xs font-hud text-primary/70 uppercase tracking-wider mb-2">
            Utility Model <span className="opacity-50">(optimizer, gauntlet)</span>
          </label>
          <input
            type="text"
            value={fastModel}
            onChange={(e) => setFastModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="w-full bg-black/30 border border-primary/20 rounded-sm px-3 py-2 text-sm text-primary placeholder:text-primary/30 focus:border-primary/50 focus:outline-none font-mono"
          />
        </div>
      )}

      {/* Custom Endpoint */}
      {providerMode !== 'local' && (
        <div>
          <label className="block text-xs font-hud text-primary/70 uppercase tracking-wider mb-2">
            Custom Endpoint <span className="opacity-50">(optional)</span>
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1 (default)"
            className="w-full bg-black/30 border border-primary/20 rounded-sm px-3 py-2 text-sm text-primary placeholder:text-primary/30 focus:border-primary/50 focus:outline-none font-mono"
          />
          <p className="text-primary/40 text-[10px] mt-1">
            Point to Ollama (http://localhost:11434/v1), LM Studio, or any OpenAI-compatible API
          </p>
        </div>
      )}

      {/* Local AI Endpoint */}
      {providerMode !== 'cloud' && (
        <div>
          <label className="block text-xs font-hud text-primary/70 uppercase tracking-wider mb-2">
            Local AI Endpoint <span className="opacity-50">(LM Studio / Ollama)</span>
          </label>
          <input
            type="text"
            value={localEndpoint}
            onChange={(e) => setLocalEndpoint(e.target.value)}
            placeholder="http://localhost:1234/v1"
            className="w-full bg-black/30 border border-primary/20 rounded-sm px-3 py-2 text-sm text-primary placeholder:text-primary/30 focus:border-primary/50 focus:outline-none font-mono"
          />
        </div>
      )}

      {/* Server Status */}
      <div className="flex items-center gap-2 text-xs text-primary/50">
        {hasServerAccess ? (
          <><Wifi className="w-3 h-3 text-green-400" /> Server connected</>
        ) : (
          <><WifiOff className="w-3 h-3 text-yellow-400" /> Standalone mode (direct API calls)</>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded-sm text-sm font-hud text-primary transition-all uppercase tracking-wider"
      >
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Settings</>}
      </button>
    </div>
  );
}
