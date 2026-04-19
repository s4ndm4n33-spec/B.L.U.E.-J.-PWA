import { useState } from 'react';
import {
  Award,
  Bot,
  Code2,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Target,
  Terminal,
} from 'lucide-react';
import {
  LEARNER_MODES,
  type OperatingSystem,
  type ProgrammingLanguage,
  useBlueJStore,
} from '@/lib/store';
import { Tooltip } from './ui/tooltip';
import { HelpOverlay } from './HelpOverlay';
import { SystemControlDrawer } from './SystemControlDrawer';

export function HudHeader() {
  const {
    selectedLanguage,
    setSelectedLanguage,
    selectedOs,
    setSelectedOs,
    hardwareMonitorEnabled,
    setHardwareMonitorEnabled,
    hardwarePermissionGranted,
    activeTab,
    setActiveTab,
    learnerMode,
    cycleLearnerMode,
    providerMode,
    localModelReady,
    unlockLevel,
  } = useBlueJStore();

  const [showHelp, setShowHelp] = useState(false);
  const [showSystemControls, setShowSystemControls] = useState(false);

  const languages: { id: ProgrammingLanguage; label: string; tip: string }[] = [
    { id: 'python', label: 'PY', tip: 'Python 3.x — recommended for beginners and ML work' },
    { id: 'cpp', label: 'C++', tip: 'C++17 — systems programming, performance-critical code' },
    { id: 'javascript', label: 'JS', tip: 'JavaScript (ES2022+, Node.js) — web and scripting' },
  ];

  const operatingSystems: { id: OperatingSystem; label: string; tip: string }[] = [
    { id: 'windows', label: 'WIN', tip: 'Windows — PowerShell / cmd.exe context' },
    { id: 'macos', label: 'MAC', tip: 'macOS — zsh Terminal context' },
    { id: 'linux', label: 'LINUX', tip: 'Linux — bash Terminal context' },
    { id: 'android', label: 'AND', tip: 'Android — Termux or Capacitor mobile runtime context' },
    { id: 'ios', label: 'IOS', tip: 'iOS — mobile-native shell with scoped workspace access' },
  ];

  const currentLearnerLabel = LEARNER_MODES.find((mode) => mode.id === learnerMode)?.shortLabel ?? 'BEGINNER';
  const unlockLabel = unlockLevel === 'admin' ? 'ADMIN' : unlockLevel === 'course' ? 'COURSE' : 'LOCKED';
  const providerLabel = providerMode === 'auto'
    ? localModelReady ? 'AUTO/LOCAL' : 'AUTO/CLOUD'
    : providerMode.toUpperCase();

  return (
    <>
      <header className="relative z-40 border-b border-primary/20 bg-background/80 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-between gap-3 px-4 py-3 md:flex-row">
          <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-start">
            <div className="flex items-center gap-2">
              <div className="glow-border relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary">
                <div className="absolute inset-0 animate-pulse-glow bg-primary/20" />
                <span className="relative z-10 font-display text-sm font-bold text-primary">
                  J.
                </span>
              </div>
              <div>
                <h1 className="glow-text font-display text-xl font-bold leading-none tracking-widest text-primary">
                  B.L.U.E.-J.
                </h1>
                <p className="font-mono text-[0.6rem] uppercase leading-tight tracking-widest text-primary/50">
                  Build · Learn · Utilize · Engineer
                </p>
              </div>
            </div>

            <div className="flex rounded-sm border border-primary/30 bg-secondary p-1 md:hidden">
              <Tooltip content="Chat with J." position="bottom">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`rounded-sm px-2.5 py-1 text-xs font-hud transition-colors ${
                    activeTab === 'chat' ? 'bg-primary/20 text-primary' : 'text-primary/50'
                  }`}
                >
                  <Terminal className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="IDE / Code Editor" position="bottom">
                <button
                  onClick={() => setActiveTab('ide')}
                  className={`rounded-sm px-2.5 py-1 text-xs font-hud transition-colors ${
                    activeTab === 'ide' ? 'bg-primary/20 text-primary' : 'text-primary/50'
                  }`}
                >
                  <Code2 className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Daily Goals & Progress" position="bottom">
                <button
                  onClick={() => setActiveTab('goals')}
                  className={`rounded-sm px-2.5 py-1 text-xs font-hud transition-colors ${
                    activeTab === 'goals' ? 'bg-primary/20 text-primary' : 'text-primary/50'
                  }`}
                >
                  <Target className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Achievements & Milestones" position="bottom">
                <button
                  onClick={() => setActiveTab('achievements')}
                  className={`rounded-sm px-2.5 py-1 text-xs font-hud transition-colors ${
                    activeTab === 'achievements' ? 'bg-primary/20 text-primary' : 'text-primary/50'
                  }`}
                >
                  <Award className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-2 text-xs font-hud md:w-auto md:justify-end">
            <div className="flex items-center overflow-hidden rounded-sm border border-primary/30 bg-secondary/50">
              {languages.map((language) => (
                <Tooltip key={language.id} content={language.tip} position="bottom">
                  <button
                    onClick={() => setSelectedLanguage(language.id)}
                    className={`min-h-[32px] border-b-2 px-3 py-1.5 transition-all ${
                      selectedLanguage === language.id
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-transparent text-primary/50 hover:text-primary/80'
                    }`}
                  >
                    {language.label}
                  </button>
                </Tooltip>
              ))}
            </div>

            <div className="hidden items-center overflow-hidden rounded-sm border border-primary/30 bg-secondary/50 sm:flex">
              {operatingSystems.map((os) => (
                <Tooltip key={os.id} content={os.tip} position="bottom">
                  <button
                    onClick={() => setSelectedOs(os.id)}
                    className={`min-h-[32px] border-b-2 px-2 py-1.5 transition-all ${
                      selectedOs === os.id
                        ? 'border-accent bg-accent/20 text-accent'
                        : 'border-transparent text-primary/50 hover:text-primary/80'
                    }`}
                  >
                    {os.label}
                  </button>
                </Tooltip>
              ))}
            </div>

            <Tooltip content="Cycle learner mode — adjusts vocabulary, pacing, and code density" position="bottom">
              <button
                onClick={cycleLearnerMode}
                className="flex min-h-[32px] items-center gap-1.5 rounded-sm border border-accent/40 bg-accent/5 px-2.5 py-1.5 text-accent transition-all hover:bg-accent/15"
              >
                <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{currentLearnerLabel}</span>
              </button>
            </Tooltip>

            <Tooltip content="Hardware monitor — lets J. tailor guidance to your device" position="bottom">
              <button
                onClick={() => hardwarePermissionGranted && setHardwareMonitorEnabled(!hardwareMonitorEnabled)}
                disabled={!hardwarePermissionGranted}
                className={`flex min-h-[32px] min-w-[32px] items-center justify-center rounded-sm border p-1.5 transition-all ${
                  !hardwarePermissionGranted
                    ? 'cursor-not-allowed border-muted text-muted'
                    : hardwareMonitorEnabled
                      ? 'glow-border border-primary/50 bg-primary/10 text-primary'
                      : 'border-primary/20 text-primary/50'
                }`}
              >
                {hardwareMonitorEnabled ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              </button>
            </Tooltip>

            <div className="hidden items-center gap-2 rounded-sm border border-primary/20 bg-black/20 px-2.5 py-1.5 sm:flex">
              <Bot className="h-3.5 w-3.5 text-primary/70" />
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-primary/65">
                {providerLabel}
              </span>
            </div>

            <div className="hidden items-center gap-2 rounded-sm border border-yellow-500/20 bg-yellow-500/5 px-2.5 py-1.5 sm:flex">
              <KeyRound className="h-3.5 w-3.5 text-yellow-400/80" />
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-yellow-300/80">
                {unlockLabel}
              </span>
            </div>

            <Tooltip content="System controls — provider, voice, permissions, unlock state" position="bottom">
              <button
                onClick={() => setShowSystemControls(true)}
                className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-sm border border-primary/20 p-1.5 text-primary/60 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </Tooltip>

            <Tooltip content="Workspace guide — how to use every panel and switch" position="bottom">
              <button
                onClick={() => setShowHelp(true)}
                className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-sm border border-primary/20 p-1.5 text-primary/50 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="relative h-1 w-full bg-secondary">
          <div className="glow-border absolute left-0 top-0 h-full w-1/6 bg-primary transition-all duration-1000 ease-out" />
        </div>
      </header>

      <HelpOverlay open={showHelp} onClose={() => setShowHelp(false)} />
      <SystemControlDrawer
        open={showSystemControls}
        onClose={() => setShowSystemControls(false)}
      />
    </>
  );
}
