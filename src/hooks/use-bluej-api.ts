import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAIProviderStore } from "@/lib/ai-provider";

export interface UserProgress {
  sessionId: string;
  currentPhase: number;
  currentTask: number;
  completedTasks: number[];
  selectedLanguage: string;
  selectedOs: string;
}

export interface CompleteTaskBody {
  sessionId: string;
  phaseIndex: number;
  taskIndex: number;
  selectedLanguage?: string;
  selectedOs?: string;
}

export interface TtsRequestBody {
  text: string;
  voice?: string;
}

export interface TtsResponse {
  audio: string;
  format: string;
}

export interface UnlockRequestBody {
  sessionId: string;
  password: string;
  courseGatePassed: boolean;
}

export interface UnlockResponse {
  unlocked: boolean;
  level: "locked" | "course" | "admin";
  message: string;
}

export interface PatchFileRequestBody {
  content: string;
  instruction: string;
  language: string;
}

export interface PatchFileResponse {
  updatedContent: string;
  summary: string;
}

/**
 * SHA-256 hash for client-side password comparison in standalone mode.
 * The actual password is never stored in the source code.
 */
const ADMIN_HASH = 'b70e9184b9ce0a5036eab678eb6e3aca9cadc4fb38ca9e819e58ca9dc5eaa361';

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function unlockStandalone(data: UnlockRequestBody): Promise<UnlockResponse> {
  const hash = await sha256(data.password);
  if (hash === ADMIN_HASH) {
    return {
      unlocked: true,
      level: 'admin',
      message: 'Admin override accepted. Autonomous coding suite unlocked inside approved workspaces.',
    };
  }
  if (data.courseGatePassed) {
    return {
      unlocked: true,
      level: 'course',
      message: 'Course gate confirmed. Guided advanced agent mode is now available.',
    };
  }
  return {
    unlocked: false,
    level: 'locked',
    message: 'Unlock denied. Complete the course gate or provide the admin password.',
  };
}

export function useGetProgress(sessionId: string) {
  return useQuery({
    queryKey: ['/api/bluej/progress', sessionId],
    queryFn: async (): Promise<UserProgress> => {
      if (!useAIProviderStore.getState().hasServerAccess) {
        // Standalone: use local storage
        const stored = localStorage.getItem(`bluej-progress-${sessionId}`);
        if (stored) return JSON.parse(stored);
        return {
          sessionId,
          currentPhase: 1,
          currentTask: 1,
          completedTasks: [],
          selectedLanguage: 'python',
          selectedOs: 'linux',
        };
      }
      const res = await fetch(`/api/bluej/progress?sessionId=${sessionId}`);
      if (!res.ok) {
        return {
          sessionId,
          currentPhase: 1,
          currentTask: 1,
          completedTasks: [],
          selectedLanguage: 'python',
          selectedOs: 'linux',
        };
      }
      return res.json();
    }
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CompleteTaskBody): Promise<UserProgress> => {
      if (!useAIProviderStore.getState().hasServerAccess) {
        // Standalone: persist to localStorage
        const key = `bluej-progress-${data.sessionId}`;
        const stored = localStorage.getItem(key);
        const progress: UserProgress = stored
          ? JSON.parse(stored)
          : { sessionId: data.sessionId, currentPhase: 1, currentTask: 1, completedTasks: [], selectedLanguage: 'python', selectedOs: 'linux' };
        progress.completedTasks.push(data.taskIndex);
        progress.currentTask = data.taskIndex + 1;
        localStorage.setItem(key, JSON.stringify(progress));
        return progress;
      }
      const res = await fetch('/api/bluej/progress/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to complete task');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/bluej/progress', data.sessionId], data);
    }
  });
}

export function useTextToSpeech() {
  return useMutation({
    mutationFn: async ({ data }: { data: TtsRequestBody }): Promise<TtsResponse> => {
      if (!useAIProviderStore.getState().hasServerAccess) {
        // Standalone: use device-native speech synthesis (no audio blob needed)
        throw new Error('TTS_USE_NATIVE');
      }
      const res = await fetch('/api/bluej/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('TTS Failed');
      return res.json();
    }
  });
}

export function useUnlockAgent() {
  return useMutation({
    mutationFn: async (data: UnlockRequestBody): Promise<UnlockResponse> => {
      if (!useAIProviderStore.getState().hasServerAccess) {
        return unlockStandalone(data);
      }
      const res = await fetch('/api/bluej/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error('Unlock failed');
      }
      return res.json();
    },
  });
}

export function usePatchWorkspaceFile() {
  return useMutation({
    mutationFn: async (data: PatchFileRequestBody): Promise<PatchFileResponse> => {
      if (!useAIProviderStore.getState().hasServerAccess) {
        // Standalone: use local AI or direct OpenAI for patch proposals
        const { apiKey, baseUrl, fastModel } = useAIProviderStore.getState();
        if (!apiKey) throw new Error('API key required for code patches in standalone mode');

        const endpoint = (baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: fastModel || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Return only valid JSON with keys "updatedContent" and "summary". Apply the patch instruction to the code.' },
              { role: 'user', content: `Instruction: ${data.instruction}\n\nLanguage: ${data.language}\n\nCode:\n${data.content}` },
            ],
            temperature: 0.1,
          }),
        });
        const result = await res.json();
        const raw = result.choices?.[0]?.message?.content ?? '';
        try {
          return JSON.parse(raw);
        } catch {
          return { updatedContent: data.content, summary: 'Could not parse patch result.' };
        }
      }
      const res = await fetch('/api/bluej/workspace/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error('Patch proposal failed');
      }
      return res.json();
    },
  });
}
