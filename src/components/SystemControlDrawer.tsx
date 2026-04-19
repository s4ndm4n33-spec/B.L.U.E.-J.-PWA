import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  KeyRound,
  Settings2,
  ShieldCheck,
  Sparkles,
  Volume2,
  Cpu,
} from 'lucide-react';
import { useBlueJStore } from '@/lib/store';
import { listDeviceVoices } from '@/lib/native-bridge';
import { useUnlockAgent } from '@/hooks/use-bluej-api';
import { AIProviderSettings } from './AIProviderSettings';
import { LocalModelPicker } from './LocalModelPicker';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SystemControlDrawer({ open, onClose }: Props) {
  const {
    providerMode,
    setProviderMode,
    localModelStatus,
    localModelReady,
    voiceMode,
    setVoiceMode,
    speechEnabled,
    setSpeechEnabled,
    preferredVoice,
    setPreferredVoice,
    speechRate,
    setSpeechRate,
    autoReadReplies,
    setAutoReadReplies,
    voiceInteractionMode,
    setVoiceInteractionMode,
    workspacePermissionMode,
    setWorkspacePermissionMode,
    workspaceSessionApproved,
    setWorkspaceSessionApproved,
    unlockLevel,
    adminUnlocked,
    courseGatePassed,
    setUnlockLevel,
    setAdminUnlocked,
    sessionId,
  } = useBlueJStore();

  const [password, setPassword] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const unlockMutation = useUnlockAgent();

  useEffect(() => {
    setVoices(listDeviceVoices());
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        setVoices(listDeviceVoices());
      };
    }
  }, []);

  const unlockStateLabel = useMemo(() => {
    if (adminUnlocked || unlockLevel === 'admin') return 'Admin unlocked';
    if (unlockLevel === 'course') return 'Course gate cleared';
    return 'Learning mode';
  }, [adminUnlocked, unlockLevel]);

  const handleUnlock = async () => {
    try {
      const result = await unlockMutation.mutateAsync({
        sessionId,
        password,
        courseGatePassed,
      });
      setUnlockLevel(result.level);
      setAdminUnlocked(result.level === 'admin');
      setPassword('');
    } catch (error) {
      console.error('Unlock failed', error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex justify-end bg-black/50 backdrop-blur-sm">
      <button
        aria-label="Close system controls"
        className="flex-1"
        onClick={onClose}
      />
      <aside className="w-full max-w-md border-l border-primary/20 bg-background/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3">
          <div className="flex items-center gap-2 text-primary">
            <Settings2 className="h-4 w-4" />
            <span className="font-hud text-sm uppercase tracking-widest">
              System Controls
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-primary/20 px-2 py-1 text-xs font-hud text-primary/70 hover:border-primary/40 hover:text-primary"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-4 text-sm">
          {/* AI Provider Settings — API key, model, endpoint */}
          <section className="hud-panel space-y-3 p-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Cpu className="h-4 w-4" />
              <h3 className="font-hud text-xs uppercase tracking-widest">
                AI Provider Settings
              </h3>
            </div>
            <AIProviderSettings />
          </section>

          {/* On-Device AI Model Picker */}
          <section className="hud-panel space-y-3 p-4">
            <div className="flex items-center gap-2 text-green-400">
              <Bot className="h-4 w-4" />
              <h3 className="font-hud text-xs uppercase tracking-widest">
                On-Device AI Models
              </h3>
            </div>
            <p className="text-[11px] text-primary/50">
              Download a model to run AI completely on your device — no internet, no API key, no cost.
            </p>
            <LocalModelPicker />
          </section>

          <section className="hud-panel space-y-3 p-4">
            <div className="flex items-center gap-2 text-accent">
              <Volume2 className="h-4 w-4" />
              <h3 className="font-hud text-xs uppercase tracking-widest">
                Voice
              </h3>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-xs font-hud uppercase tracking-wider text-primary/70">
                Speech enabled
              </span>
              <input
                type="checkbox"
                checked={speechEnabled}
                onChange={(event) => setSpeechEnabled(event.target.checked)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-hud uppercase tracking-wider text-primary/70">
                Voice mode
              </span>
              <select
                value={voiceMode}
                onChange={(event) => setVoiceMode(event.target.value as typeof voiceMode)}
                className="w-full rounded border border-primary/20 bg-black/30 px-3 py-2 font-mono text-xs text-primary"
              >
                <option value="device-native">Device-native</option>
                <option value="cloud">Cloud</option>
                <option value="muted">Muted</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-hud uppercase tracking-wider text-primary/70">
                Preferred voice
              </span>
              <select
                value={preferredVoice}
                onChange={(event) => setPreferredVoice(event.target.value)}
                className="w-full rounded border border-primary/20 bg-black/30 px-3 py-2 font-mono text-xs text-primary"
              >
                <option value="">System default</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.name}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-hud uppercase tracking-wider text-primary/70">
                Speech rate
              </span>
              <input
                type="range"
                min="0.7"
                max="1.2"
                step="0.05"
                value={speechRate}
                onChange={(event) => setSpeechRate(Number(event.target.value))}
                className="w-full"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-xs font-hud uppercase tracking-wider text-primary/70">
                Auto-read replies
              </span>
              <input
                type="checkbox"
                checked={autoReadReplies}
                onChange={(event) => setAutoReadReplies(event.target.checked)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-hud uppercase tracking-wider text-primary/70">
                Voice input mode
              </span>
              <select
                value={voiceInteractionMode}
                onChange={(event) => setVoiceInteractionMode(event.target.value as typeof voiceInteractionMode)}
                className="w-full rounded border border-primary/20 bg-black/30 px-3 py-2 font-mono text-xs text-primary"
              >
                <option value="tap-to-talk">Tap to talk</option>
                <option value="push-to-talk">Push to talk</option>
              </select>
            </label>
          </section>

          <section className="hud-panel space-y-3 p-4">
            <div className="flex items-center gap-2 text-green-400">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="font-hud text-xs uppercase tracking-widest">
                Workspace Permissions
              </h3>
            </div>
            <select
              value={workspacePermissionMode}
              onChange={(event) => setWorkspacePermissionMode(event.target.value as typeof workspacePermissionMode)}
              className="w-full rounded border border-primary/20 bg-black/30 px-3 py-2 font-mono text-xs text-primary"
            >
              <option value="per-action">Per-action approval</option>
              <option value="project-session">Approved workspace session</option>
            </select>
            <label className="flex items-center justify-between gap-3">
              <span className="text-xs font-hud uppercase tracking-wider text-primary/70">
                Workspace session approved
              </span>
              <input
                type="checkbox"
                checked={workspaceSessionApproved}
                onChange={(event) => setWorkspaceSessionApproved(event.target.checked)}
              />
            </label>
          </section>

          <section className="hud-panel space-y-3 p-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Sparkles className="h-4 w-4" />
              <h3 className="font-hud text-xs uppercase tracking-widest">
                Agent Unlock
              </h3>
            </div>
            <p className="text-xs font-mono text-primary/60">
              State: {unlockStateLabel}
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-hud uppercase tracking-wider text-primary/70">
                Admin override
              </span>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter override code"
                  className="flex-1 rounded border border-primary/20 bg-black/30 px-3 py-2 font-mono text-xs text-primary"
                />
                <button
                  onClick={handleUnlock}
                  disabled={unlockMutation.isPending || !password.trim()}
                  className="rounded border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-xs font-hud uppercase tracking-widest text-yellow-300 disabled:opacity-50"
                >
                  {unlockMutation.isPending ? '...' : 'Unlock'}
                </button>
              </div>
            </label>
            <p className="text-xs font-mono text-primary/45">
              Course gate status: {courseGatePassed ? 'passed' : 'locked'}
            </p>
            <div className="rounded border border-primary/10 bg-black/30 p-3 text-xs font-mono text-primary/50">
              Normal users stay in guided mode. Admin or course-cleared mode unlocks multi-step coding inside the approved workspace.
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
