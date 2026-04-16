import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type OperatingSystem = 'windows' | 'macos' | 'linux' | 'android' | 'ios';
export type ProgrammingLanguage = 'python' | 'cpp' | 'javascript';
export type LearnerMode = 'kids' | 'teen' | 'adult-beginner' | 'advanced';
export type SimHardwareProfile = 'auto' | 'high-end' | 'mid-range' | 'budget-laptop' | 'raspberry-pi' | 'cloud-gpu';

export interface SimProfile {
  id: SimHardwareProfile;
  label: string;
  shortLabel: string;
  cores: number | null;
  ramGb: number | null;
  gpu: string | null;
  desc: string;
}

export const SIM_PROFILES: SimProfile[] = [
  { id: 'auto',          label: 'Auto-detect (My Specs)',    shortLabel: 'AUTO',  cores: null, ramGb: null, gpu: null,           desc: 'Uses your detected hardware specs' },
  { id: 'high-end',      label: 'High-End Workstation',      shortLabel: 'BEAST', cores: 32,   ramGb: 64,   gpu: null,           desc: '32-core CPU, 64GB RAM' },
  { id: 'mid-range',     label: 'Mid-Range PC',              shortLabel: 'MID',   cores: 8,    ramGb: 16,   gpu: null,           desc: '8-core CPU, 16GB RAM' },
  { id: 'budget-laptop', label: 'Budget Laptop',             shortLabel: 'LITE',  cores: 4,    ramGb: 8,    gpu: null,           desc: '4-core CPU, 8GB RAM' },
  { id: 'raspberry-pi',  label: 'Raspberry Pi 4',            shortLabel: 'PI',    cores: 4,    ramGb: 4,    gpu: null,           desc: '4-core ARM64, 4GB RAM' },
  { id: 'cloud-gpu',     label: 'Cloud GPU (NVIDIA T4)',     shortLabel: 'GPU',   cores: 8,    ramGb: 16,   gpu: 'NVIDIA T4 16GB VRAM', desc: '8-core CPU, 16GB RAM, NVIDIA T4' },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  voiceInput?: boolean;
}

export interface PortfolioEntry {
  id: string;
  name: string;
  language: ProgrammingLanguage;
  code: string;
  timestamp: number;
  notes?: string;
}

export const LEARNER_MODES: { id: LearnerMode; label: string; shortLabel: string }[] = [
  { id: 'kids', label: 'Kids (8–12)', shortLabel: 'KIDS' },
  { id: 'teen', label: 'Teen (13–17)', shortLabel: 'TEEN' },
  { id: 'adult-beginner', label: 'Beginner', shortLabel: 'BEGINNER' },
  { id: 'advanced', label: 'Advanced', shortLabel: 'ADV' },
];

export interface HardwareInfo {
  cpuCores: number | null;
  ramGb: number | null;
  platform: string | null;
}

interface BlueJState {
  sessionId: string;
  conversationId: number | null;
  selectedLanguage: ProgrammingLanguage;
  selectedOs: OperatingSystem;
  hardwareMonitorEnabled: boolean;
  hardwarePermissionGranted: boolean | null;
  hardwareInfo: HardwareInfo;
  activeTab: 'chat' | 'ide' | 'goals' | 'achievements';
  myCode: string;
  learnerMode: LearnerMode;
  diagnosticDone: boolean;
  simHardwareProfile: SimHardwareProfile;
  messages: ChatMessage[];
  isTyping: boolean;
  portfolio: PortfolioEntry[];

  // Actions
  setConversationId: (id: number | null) => void;
  setSimHardwareProfile: (p: SimHardwareProfile) => void;
  setSelectedLanguage: (lang: ProgrammingLanguage) => void;
  setSelectedOs: (os: OperatingSystem) => void;
  setHardwareMonitorEnabled: (enabled: boolean) => void;
  grantHardwarePermission: () => void;
  denyHardwarePermission: () => void;
  setActiveTab: (tab: 'chat' | 'ide' | 'goals' | 'achievements') => void;
  setMyCode: (code: string) => void;
  setLearnerMode: (mode: LearnerMode) => void;
  cycleLearnerMode: () => void;
  setDiagnosticDone: (done: boolean) => void;
  detectSystem: () => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (id: string, content: string) => void;
  setIsTyping: (v: boolean) => void;
  addSystemMessage: (content: string) => void;
  saveToPortfolio: (name: string, notes?: string) => void;
  loadFromPortfolio: (id: string) => void;
  deleteFromPortfolio: (id: string) => void;
}

function detectOS(): OperatingSystem {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/mac/i.test(ua)) return 'macos';
  if (/win/i.test(ua)) return 'windows';
  return 'linux';
}

export const useBlueJStore = create<BlueJState>()(
  persist(
    (set, get) => ({
      sessionId: uuidv4(),
      conversationId: null,
      selectedLanguage: 'python',
      selectedOs: 'linux',
      hardwareMonitorEnabled: true,
      hardwarePermissionGranted: null,
      hardwareInfo: { cpuCores: null, ramGb: null, platform: null },
      activeTab: 'chat',
      myCode: "# Your code goes here...\n\nprint('Hello, J.')",
      learnerMode: 'adult-beginner',
      diagnosticDone: false,
      simHardwareProfile: 'auto',
      messages: [{
        id: 'welcome',
        role: 'assistant' as const,
        content: "Greetings. I am J. I understand we are to build a localized AI instance today. A clone of myself, if you will. Let us begin by evaluating your system environment.",
        timestamp: Date.now()
      }],
      isTyping: false,
      portfolio: [],

      setConversationId: (id) => set({ conversationId: id }),
      setSimHardwareProfile: (p) => set({ simHardwareProfile: p }),
      setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
      setSelectedOs: (os) => set({ selectedOs: os }),
      setHardwareMonitorEnabled: (enabled) => set({ hardwareMonitorEnabled: enabled }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setMyCode: (code) => set({ myCode: code }),
      setLearnerMode: (mode) => set({ learnerMode: mode }),
      setDiagnosticDone: (done) => set({ diagnosticDone: done }),
      addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
      updateLastAssistantMessage: (id, content) => set(s => ({
        messages: s.messages.map(m => m.id === id ? { ...m, content } : m)
      })),
      setIsTyping: (v) => set({ isTyping: v }),
      addSystemMessage: (content) => set(s => ({
        messages: [...s.messages, {
          id: `sys-${Date.now()}`,
          role: 'system' as const,
          content,
          timestamp: Date.now()
        }]
      })),

      cycleLearnerMode: () => {
        const modes = LEARNER_MODES.map(m => m.id);
        const current = get().learnerMode;
        const idx = modes.indexOf(current);
        const next = modes[(idx + 1) % modes.length];
        set({ learnerMode: next });
      },

      grantHardwarePermission: () => {
        const cores = navigator.hardwareConcurrency || null;
        // @ts-ignore
        const ram = navigator.deviceMemory || null;
        set({
          hardwarePermissionGranted: true,
          hardwareMonitorEnabled: true,
          hardwareInfo: {
            cpuCores: cores,
            ramGb: ram,
            platform: navigator.platform || null
          }
        });
      },

      denyHardwarePermission: () => {
        set({
          hardwarePermissionGranted: false,
          hardwareMonitorEnabled: false,
          hardwareInfo: { cpuCores: null, ramGb: null, platform: null }
        });
      },

      detectSystem: () => {
        const os = detectOS();
        if (!get().selectedOs || get().selectedOs === 'linux') {
          set({ selectedOs: os });
        }
      },

      saveToPortfolio: (name, notes) => {
        const { myCode, selectedLanguage, portfolio } = get();
        const entry: PortfolioEntry = {
          id: uuidv4(),
          name: name.trim() || `${selectedLanguage} project`,
          language: selectedLanguage,
          code: myCode,
          timestamp: Date.now(),
          notes: notes?.trim() || undefined,
        };
        set({ portfolio: [entry, ...portfolio].slice(0, 50) }); // cap at 50 entries
        // Track for gamification goals — fire event async to avoid circular deps
        window.dispatchEvent(new CustomEvent('bluej:portfolio-save'));
      },

      loadFromPortfolio: (id) => {
        const entry = get().portfolio.find(e => e.id === id);
        if (entry) {
          set({ myCode: entry.code, selectedLanguage: entry.language, activeTab: 'ide' });
        }
      },

      deleteFromPortfolio: (id) => {
        set(s => ({ portfolio: s.portfolio.filter(e => e.id !== id) }));
      },
    }),
    {
      name: 'bluej-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        conversationId: state.conversationId,
        selectedLanguage: state.selectedLanguage,
        selectedOs: state.selectedOs,
        hardwareMonitorEnabled: state.hardwareMonitorEnabled,
        hardwarePermissionGranted: state.hardwarePermissionGranted,
        myCode: state.myCode,
        learnerMode: state.learnerMode,
        simHardwareProfile: state.simHardwareProfile,
        portfolio: state.portfolio,
      })
    }
  )
);
