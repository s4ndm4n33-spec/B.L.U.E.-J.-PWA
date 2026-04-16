import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

export function useGetProgress(sessionId: string) {
  return useQuery({
    queryKey: ['/api/bluej/progress', sessionId],
    queryFn: async (): Promise<UserProgress> => {
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
