import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type OperatingSystem = 'windows' | 'macos' | 'linux' | 'android' | 'ios';
export type ProgrammingLanguage = 'python' | 'cpp' | 'javascript';
export type LearnerMode = 'kids' | 'teen' | 'adult-beginner' | 'advanced';
export type SimHardwareProfile =
  | 'auto'
  | 'high-end'
  | 'mid-range'
  | 'budget-laptop'
  | 'raspberry-pi'
  | 'cloud-gpu';
export type ProviderMode = 'local' | 'cloud' | 'auto';
export type LocalModelStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'unavailable'
  | 'error';
export type VoiceMode = 'device-native' | 'cloud' | 'muted';
export type VoiceInteractionMode = 'tap-to-talk' | 'push-to-talk';
export type WorkspacePermissionMode = 'per-action' | 'project-session';
export type UnlockLevel = 'locked' | 'course' | 'admin';

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
  { id: 'auto', label: 'Auto-detect (My Specs)', shortLabel: 'AUTO', cores: null, ramGb: null, gpu: null, desc: 'Uses your detected hardware specs' },
  { id: 'high-end', label: 'High-End Workstation', shortLabel: 'BEAST', cores: 32, ramGb: 64, gpu: null, desc: '32-core CPU, 64GB RAM' },
  { id: 'mid-range', label: 'Mid-Range PC', shortLabel: 'MID', cores: 8, ramGb: 16, gpu: null, desc: '8-core CPU, 16GB RAM' },
  { id: 'budget-laptop', label: 'Budget Laptop', shortLabel: 'LITE', cores: 4, ramGb: 8, gpu: null, desc: '4-core CPU, 8GB RAM' },
  { id: 'raspberry-pi', label: 'Raspberry Pi 4', shortLabel: 'PI', cores: 4, ramGb: 4, gpu: null, desc: '4-core ARM64, 4GB RAM' },
  { id: 'cloud-gpu', label: 'Cloud GPU (NVIDIA T4)', shortLabel: 'GPU', cores: 8, ramGb: 16, gpu: 'NVIDIA T4 16GB VRAM', desc: '8-core CPU, 16GB RAM, NVIDIA T4' },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  voiceInput?: boolean;
  provider?: 'local' | 'cloud';
}

export interface PortfolioEntry {
  id: string;
  name: string;
  language: ProgrammingLanguage;
  code: string;
  timestamp: number;
  notes?: string;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  language: ProgrammingLanguage;
  content: string;
  originalContent: string;
  lastModified: number;
  status: 'clean' | 'modified' | 'proposed';
  pendingContent?: string;
  diffPreview?: string;
}

export interface HardwareInfo {
  cpuCores: number | null;
  ramGb: number | null;
  platform: string | null;
}

export const LEARNER_MODES: {
  id: LearnerMode;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'kids', label: 'Kids (8–12)', shortLabel: 'KIDS' },
  { id: 'teen', label: 'Teen (13–17)', shortLabel: 'TEEN' },
  { id: 'adult-beginner', label: 'Beginner', shortLabel: 'BEGINNER' },
  { id: 'advanced', label: 'Advanced', shortLabel: 'ADV' },
];

function detectOS(): OperatingSystem {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/mac/i.test(ua)) return 'macos';
  if (/win/i.test(ua)) return 'windows';
  return 'linux';
}

function inferLanguageFromCode(code: string, fallback: ProgrammingLanguage): ProgrammingLanguage {
  const lowered = code.toLowerCase();
  if (lowered.includes('#include') || lowered.includes('std::') || lowered.includes('int main(')) {
    return 'cpp';
  }
  if (
    lowered.includes('console.log') ||
    lowered.includes('const ') ||
    lowered.includes('let ') ||
    lowered.includes('function ')
  ) {
    return 'javascript';
  }
  return fallback;
}

function upsertWorkspaceFile(
  files: WorkspaceFile[],
  file: WorkspaceFile,
): WorkspaceFile[] {
  const existingIndex = files.findIndex((item) => item.id === file.id);
  if (existingIndex === -1) {
    return [file, ...files];
  }

  const next = [...files];
  next[existingIndex] = file;
  return next;
}

interface BlueJState {
  sessionId: string;
  conversationId: number | null;
  selectedLanguage: ProgrammingLanguage;
  selectedOs: OperatingSystem;
  hardwareMonitorEnabled: boolean;
  hardwarePermissionGranted: boolean | null;
  hardwareInfo: HardwareInfo;
  activeTab: 'chat' | 'ide' | 'goals' | 'achievements' | 'wellness';
  myCode: string;
  learnerMode: LearnerMode;
  diagnosticDone: boolean;
  simHardwareProfile: SimHardwareProfile;
  messages: ChatMessage[];
  isTyping: boolean;
  portfolio: PortfolioEntry[];
  providerMode: ProviderMode;
  localModelStatus: LocalModelStatus;
  localModelReady: boolean;
  speechEnabled: boolean;
  voiceMode: VoiceMode;
  preferredVoice: string;
  speechRate: number;
  autoReadReplies: boolean;
  voiceInteractionMode: VoiceInteractionMode;
  unlockLevel: UnlockLevel;
  adminUnlocked: boolean;
  courseGatePassed: boolean;
  workspacePermissionMode: WorkspacePermissionMode;
  workspaceSessionApproved: boolean;
  workspaceFiles: WorkspaceFile[];
  selectedWorkspaceFileId: string | null;

  setConversationId: (id: number | null) => void;
  setSimHardwareProfile: (profile: SimHardwareProfile) => void;
  setSelectedLanguage: (lang: ProgrammingLanguage) => void;
  setSelectedOs: (os: OperatingSystem) => void;
  setHardwareMonitorEnabled: (enabled: boolean) => void;
  grantHardwarePermission: () => void;
  denyHardwarePermission: () => void;
  setActiveTab: (tab: 'chat' | 'ide' | 'goals' | 'achievements' | 'wellness') => void;
  setMyCode: (code: string) => void;
  setLearnerMode: (mode: LearnerMode) => void;
  cycleLearnerMode: () => void;
  setDiagnosticDone: (done: boolean) => void;
  detectSystem: () => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (id: string, content: string) => void;
  setIsTyping: (value: boolean) => void;
  addSystemMessage: (content: string) => void;
  saveToPortfolio: (name: string, notes?: string) => void;
  loadFromPortfolio: (id: string) => void;
  deleteFromPortfolio: (id: string) => void;
  setProviderMode: (mode: ProviderMode) => void;
  setLocalModelStatus: (status: LocalModelStatus) => void;
  setLocalModelReady: (ready: boolean) => void;
  setSpeechEnabled: (enabled: boolean) => void;
  setVoiceMode: (mode: VoiceMode) => void;
  setPreferredVoice: (voice: string) => void;
  setSpeechRate: (rate: number) => void;
  setAutoReadReplies: (enabled: boolean) => void;
  setVoiceInteractionMode: (mode: VoiceInteractionMode) => void;
  setCourseGatePassed: (passed: boolean) => void;
  setUnlockLevel: (level: UnlockLevel) => void;
  setAdminUnlocked: (unlocked: boolean) => void;
  setWorkspacePermissionMode: (mode: WorkspacePermissionMode) => void;
  setWorkspaceSessionApproved: (approved: boolean) => void;
  importWorkspaceFile: (file: WorkspaceFile) => void;
  selectWorkspaceFile: (id: string | null) => void;
  updateSelectedWorkspaceContent: (content: string) => void;
  setWorkspacePendingPatch: (id: string, pendingContent: string, diffPreview: string) => void;
  acceptWorkspacePatch: (id: string) => void;
  rejectWorkspacePatch: (id: string) => void;
  markWorkspaceSaved: (id: string, content: string) => void;
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
        role: 'assistant',
        content: "Greetings. I am J. I understand we are to build a localized AI instance today. A clone of myself, if you will. Let us begin by evaluating your system environment.",
        timestamp: Date.now(),
        provider: 'cloud',
      }],
      isTyping: false,
      portfolio: [],
      providerMode: 'auto',
      localModelStatus: 'idle',
      localModelReady: false,
      speechEnabled: true,
      voiceMode: 'device-native',
      preferredVoice: '',
      speechRate: 1,
      autoReadReplies: true,
      voiceInteractionMode: 'tap-to-talk',
      unlockLevel: 'locked',
      adminUnlocked: false,
      courseGatePassed: false,
      workspacePermissionMode: 'per-action',
      workspaceSessionApproved: false,
      workspaceFiles: [],
      selectedWorkspaceFileId: null,

      setConversationId: (id) => set({ conversationId: id }),
      setSimHardwareProfile: (profile) => set({ simHardwareProfile: profile }),
      setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
      setSelectedOs: (os) => set({ selectedOs: os }),
      setHardwareMonitorEnabled: (enabled) => set({ hardwareMonitorEnabled: enabled }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setMyCode: (code) => {
        const selectedId = get().selectedWorkspaceFileId;
        set((state) => {
          if (!selectedId) {
            return { myCode: code };
          }

          const files = state.workspaceFiles.map((file) => {
            if (file.id !== selectedId) return file;
            return {
              ...file,
              content: code,
              status: code === file.originalContent ? 'clean' : 'modified',
            };
          });
          return { myCode: code, workspaceFiles: files };
        });
      },
      setLearnerMode: (mode) => set({ learnerMode: mode }),
      setDiagnosticDone: (done) => set({ diagnosticDone: done }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      updateLastAssistantMessage: (id, content) => set((state) => ({
        messages: state.messages.map((message) => (
          message.id === id ? { ...message, content } : message
        )),
      })),
      setIsTyping: (value) => set({ isTyping: value }),
      addSystemMessage: (content) => set((state) => ({
        messages: [...state.messages, {
          id: `sys-${Date.now()}`,
          role: 'system',
          content,
          timestamp: Date.now(),
        }],
      })),

      cycleLearnerMode: () => {
        const modes = LEARNER_MODES.map((mode) => mode.id);
        const current = get().learnerMode;
        const currentIndex = modes.indexOf(current);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        set({ learnerMode: nextMode });
      },

      grantHardwarePermission: () => {
        const cores = navigator.hardwareConcurrency || null;
        // @ts-expect-error Browser-specific API.
        const ram = navigator.deviceMemory || null;
        set({
          hardwarePermissionGranted: true,
          hardwareMonitorEnabled: true,
          hardwareInfo: {
            cpuCores: cores,
            ramGb: ram,
            platform: navigator.platform || null,
          },
        });
      },

      denyHardwarePermission: () => {
        set({
          hardwarePermissionGranted: false,
          hardwareMonitorEnabled: false,
          hardwareInfo: { cpuCores: null, ramGb: null, platform: null },
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
        set({ portfolio: [entry, ...portfolio].slice(0, 50) });
        window.dispatchEvent(new CustomEvent('bluej:portfolio-save'));
      },

      loadFromPortfolio: (id) => {
        const entry = get().portfolio.find((item) => item.id === id);
        if (entry) {
          set({
            myCode: entry.code,
            selectedLanguage: entry.language,
            activeTab: 'ide',
            selectedWorkspaceFileId: null,
          });
        }
      },

      deleteFromPortfolio: (id) => {
        set((state) => ({
          portfolio: state.portfolio.filter((entry) => entry.id !== id),
        }));
      },

      setProviderMode: (mode) => set({ providerMode: mode }),
      setLocalModelStatus: (status) => set({ localModelStatus: status }),
      setLocalModelReady: (ready) => set({ localModelReady: ready }),
      setSpeechEnabled: (enabled) => set({ speechEnabled: enabled }),
      setVoiceMode: (mode) => set({ voiceMode: mode }),
      setPreferredVoice: (voice) => set({ preferredVoice: voice }),
      setSpeechRate: (rate) => set({ speechRate: rate }),
      setAutoReadReplies: (enabled) => set({ autoReadReplies: enabled }),
      setVoiceInteractionMode: (mode) => set({ voiceInteractionMode: mode }),
      setCourseGatePassed: (passed) => set((state) => ({
        courseGatePassed: passed,
        unlockLevel: passed && state.unlockLevel === 'locked' ? 'course' : state.unlockLevel,
      })),
      setUnlockLevel: (level) => set({ unlockLevel: level }),
      setAdminUnlocked: (unlocked) => set({
        adminUnlocked: unlocked,
        unlockLevel: unlocked ? 'admin' : get().courseGatePassed ? 'course' : 'locked',
      }),
      setWorkspacePermissionMode: (mode) => set({ workspacePermissionMode: mode }),
      setWorkspaceSessionApproved: (approved) => set({ workspaceSessionApproved: approved }),

      importWorkspaceFile: (file) => set((state) => ({
        workspaceFiles: upsertWorkspaceFile(state.workspaceFiles, file),
        selectedWorkspaceFileId: file.id,
        myCode: file.content,
        selectedLanguage: file.language,
        activeTab: 'ide',
      })),

      selectWorkspaceFile: (id) => set((state) => {
        const nextFile = state.workspaceFiles.find((file) => file.id === id);
        if (!nextFile) {
          return { selectedWorkspaceFileId: null };
        }
        return {
          selectedWorkspaceFileId: id,
          myCode: nextFile.pendingContent ?? nextFile.content,
          selectedLanguage: nextFile.language,
          activeTab: 'ide',
        };
      }),

      updateSelectedWorkspaceContent: (content) => {
        const selectedId = get().selectedWorkspaceFileId;
        if (!selectedId) return;
        set((state) => ({
          myCode: content,
          workspaceFiles: state.workspaceFiles.map((file) => (
            file.id === selectedId
              ? {
                  ...file,
                  content,
                  status: content === file.originalContent ? 'clean' : 'modified',
                }
              : file
          )),
        }));
      },

      setWorkspacePendingPatch: (id, pendingContent, diffPreview) => set((state) => ({
        workspaceFiles: state.workspaceFiles.map((file) => (
          file.id === id
            ? {
                ...file,
                pendingContent,
                diffPreview,
                status: 'proposed',
              }
            : file
        )),
      })),

      acceptWorkspacePatch: (id) => set((state) => {
        const nextFiles = state.workspaceFiles.map((file) => {
          if (file.id !== id || !file.pendingContent) return file;
          return {
            ...file,
            content: file.pendingContent,
            pendingContent: undefined,
            diffPreview: undefined,
            status: file.pendingContent === file.originalContent ? 'clean' : 'modified',
          };
        });
        const selectedFile = nextFiles.find((file) => file.id === id);
        return {
          workspaceFiles: nextFiles,
          myCode: selectedFile ? selectedFile.content : state.myCode,
        };
      }),

      rejectWorkspacePatch: (id) => set((state) => ({
        workspaceFiles: state.workspaceFiles.map((file) => (
          file.id === id
            ? {
                ...file,
                pendingContent: undefined,
                diffPreview: undefined,
                status: file.content === file.originalContent ? 'clean' : 'modified',
              }
            : file
        )),
      })),

      markWorkspaceSaved: (id, content) => set((state) => ({
        workspaceFiles: state.workspaceFiles.map((file) => (
          file.id === id
            ? {
                ...file,
                content,
                originalContent: content,
                pendingContent: undefined,
                diffPreview: undefined,
                status: 'clean',
                lastModified: Date.now(),
              }
            : file
        )),
      })),
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
        providerMode: state.providerMode,
        localModelStatus: state.localModelStatus,
        localModelReady: state.localModelReady,
        speechEnabled: state.speechEnabled,
        voiceMode: state.voiceMode,
        preferredVoice: state.preferredVoice,
        speechRate: state.speechRate,
        autoReadReplies: state.autoReadReplies,
        voiceInteractionMode: state.voiceInteractionMode,
        unlockLevel: state.unlockLevel,
        adminUnlocked: state.adminUnlocked,
        courseGatePassed: state.courseGatePassed,
        workspacePermissionMode: state.workspacePermissionMode,
        workspaceSessionApproved: state.workspaceSessionApproved,
        workspaceFiles: state.workspaceFiles,
        selectedWorkspaceFileId: state.selectedWorkspaceFileId,
      }),
    },
  ),
);

export function createWorkspaceFile(
  name: string,
  path: string,
  content: string,
  language: ProgrammingLanguage,
): WorkspaceFile {
  return {
    id: uuidv4(),
    name,
    path,
    content,
    originalContent: content,
    language: inferLanguageFromCode(content, language),
    lastModified: Date.now(),
    status: 'clean',
  };
}
