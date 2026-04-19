import { useCallback } from 'react';
import { useBlueJStore, type ChatMessage } from '@/lib/store';
import { useProgressStore } from '@/lib/progress-store';
import { useTextToSpeech } from '@/hooks/use-bluej-api';
import { chatOffline, isOfflineReady } from '@/lib/offline-ai';
import { chatDirectOpenAI } from '@/lib/ai-provider';
import { useAIProviderStore } from '@/lib/ai-provider';
import { chatLocalServer } from '@/lib/local-server-ai';

export type { ChatMessage };

function shouldUseLocalModel(): boolean {
  const { providerMode, localModelReady } = useBlueJStore.getState();
  if (providerMode === 'local') {
    return localModelReady && isOfflineReady();
  }
  if (providerMode === 'cloud' || providerMode === 'local-server') {
    return false;
  }
  return (localModelReady && isOfflineReady()) || !navigator.onLine;
}

/** True when the user wants to use Ollama / LM Studio / llama.cpp. */
function shouldUseLocalServer(): boolean {
  const { providerMode, localServerReachable, localModel } = useAIProviderStore.getState();
  if (providerMode === 'local-server') return true;
  if (providerMode === 'auto' && localServerReachable && localModel) return true;
  return false;
}

/** True when the Express API server is NOT available (Electron / Capacitor / static). */
function isStandaloneMode(): boolean {
  return !useAIProviderStore.getState().hasServerAccess;
}

export function useChatStream() {
  const {
    sessionId,
    conversationId,
    setConversationId,
    selectedLanguage,
    selectedOs,
    hardwareInfo,
    learnerMode,
    messages,
    isTyping,
    addMessage,
    updateLastAssistantMessage,
    setIsTyping,
    addSystemMessage,
    providerMode,
    voiceMode,
    speechEnabled,
    autoReadReplies,
  } = useBlueJStore();

  const ttsMutation = useTextToSpeech();

  const sendMessage = useCallback(async (
    content: string,
    onAudioReceived?: (base64: string, format: string) => void,
    isVoice = false,
  ) => {
    if (!content.trim()) return;

    useProgressStore.getState().trackEvent('chat');

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
      voiceInput: isVoice,
    };

    addMessage(userMessage);
    setIsTyping(true);

    const assistantMessageId = `a-${Date.now()}`;
    addMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      provider: shouldUseLocalServer() ? 'local-server' : shouldUseLocalModel() ? 'local' : 'cloud',
    });

    try {
      // ── Path 0: Local server (Ollama / LM Studio / llama.cpp) ──
      if (shouldUseLocalServer()) {
        const recentMessages = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-10)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        recentMessages.push({ role: 'user', content });

        const systemMsg = {
          role: 'system' as const,
          content: `You are B.L.U.E.-J., an advanced AI coding simulator and learning companion. You help users learn programming in ${selectedLanguage || 'any language'}. Be precise, educational, and encouraging. Use code examples when helpful.${learnerMode ? ' The user is in learner mode — explain concepts step by step.' : ''}`,
        };

        let assistantContent = '';
        await chatLocalServer(
          [systemMsg, ...recentMessages],
          (chunk) => {
            assistantContent += chunk;
            updateLastAssistantMessage(assistantMessageId, assistantContent);
          },
        );

        setIsTyping(false);

        if (assistantContent && autoReadReplies && speechEnabled && onAudioReceived) {
          const textForSpeech = assistantContent.replace(/```[\s\S]*?```/g, ' [Code Block] ');
          onAudioReceived(textForSpeech, 'device-native');
        }
        return;
      }

      // ── Path 1: Local model (WebLLM — in-browser) ──────────────────────
      if (providerMode === 'local' && !isOfflineReady()) {
        throw new Error('Local model requested but not available.');
      }

      if (shouldUseLocalModel() && isOfflineReady()) {
        let assistantContent = '';
        const recentMessages = messages
          .filter((message) => message.role === 'user' || message.role === 'assistant')
          .slice(-10)
          .map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: message.content,
          }));

        recentMessages.push({ role: 'user', content });

        for await (const chunk of chatOffline(recentMessages, learnerMode, selectedLanguage)) {
          assistantContent += chunk;
          updateLastAssistantMessage(assistantMessageId, assistantContent);
        }

        setIsTyping(false);

        if (assistantContent && autoReadReplies && speechEnabled && onAudioReceived) {
          const textForSpeech = assistantContent.replace(/```[\s\S]*?```/g, ' [Code Block] ');
          onAudioReceived(textForSpeech, 'device-native');
        }
        return;
      }

      // ── Path 2: Standalone mode (Electron/Capacitor) — direct OpenAI ──
      const { apiKey } = useAIProviderStore.getState();
      if (isStandaloneMode() || (providerMode === 'cloud' && apiKey)) {
        if (!apiKey) {
          throw new Error('NO_API_KEY');
        }

        const recentMessages = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-10)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        recentMessages.push({ role: 'user', content });

        // Add system prompt
        const systemMsg = {
          role: 'system' as const,
          content: `You are B.L.U.E.-J., an advanced AI coding simulator and learning companion. You help users learn programming in ${selectedLanguage || 'any language'}. Be precise, educational, and encouraging. Use code examples when helpful.${learnerMode ? ' The user is in learner mode — explain concepts step by step.' : ''}`,
        };

        let assistantContent = '';
        await chatDirectOpenAI(
          [systemMsg, ...recentMessages],
          (chunk) => {
            assistantContent += chunk;
            updateLastAssistantMessage(assistantMessageId, assistantContent);
          },
        );

        setIsTyping(false);

        if (assistantContent && autoReadReplies && speechEnabled && onAudioReceived) {
          const textForSpeech = assistantContent.replace(/```[\s\S]*?```/g, ' [Code Block] ');
          if (voiceMode === 'device-native') {
            onAudioReceived(textForSpeech, 'device-native');
          } else {
            onAudioReceived(textForSpeech, 'device-native'); // Cloud TTS needs server; fallback
          }
        }
        return;
      }

      // ── Path 3: Hosted mode — Express server /api/bluej/chat ──
      const response = await fetch('/api/bluej/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: content,
          conversationId,
          language: selectedLanguage,
          os: selectedOs,
          phaseIndex: 0,
          taskIndex: 0,
          hardwareInfo,
          learnerMode,
          providerMode,
        }),
      });

      if (!response.ok) {
        // Server returned error — maybe API key not set server-side
        // Try direct OpenAI if we have a key
        const { apiKey: fallbackKey } = useAIProviderStore.getState();
        if (fallbackKey) {
          throw new Error('SERVER_ERROR_TRY_DIRECT');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr) as {
              content?: string;
              conversationId?: number;
            };
            if (data.content) {
              assistantContent += data.content;
              updateLastAssistantMessage(assistantMessageId, assistantContent);
            }
            if (data.conversationId && !conversationId) {
              setConversationId(data.conversationId);
            }
          } catch {
            // Partial JSON chunk — wait for the next read.
          }
        }
      }

      setIsTyping(false);

      if (!assistantContent || !autoReadReplies || !speechEnabled || !onAudioReceived) {
        return;
      }

      const textForSpeech = assistantContent.replace(/```[\s\S]*?```/g, ' [Code Block] ');
      if (voiceMode === 'cloud') {
        ttsMutation.mutate(
          { data: { text: textForSpeech, voice: 'nova' } },
          { onSuccess: (result) => onAudioReceived(result.audio, result.format) },
        );
      } else if (voiceMode === 'device-native') {
        onAudioReceived(textForSpeech, 'device-native');
      }
    } catch (error) {
      console.error('Chat error', error);

      const errMsg = error instanceof Error ? error.message : '';

      // ── Fallback A: Direct OpenAI if server failed but we have a key ──
      if (errMsg === 'SERVER_ERROR_TRY_DIRECT' || (errMsg !== 'NO_API_KEY' && useAIProviderStore.getState().apiKey)) {
        try {
          const recentMessages = messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .slice(-10)
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
          recentMessages.push({ role: 'user', content });

          const systemMsg = {
            role: 'system' as const,
            content: `You are B.L.U.E.-J., an advanced AI coding simulator. Help users learn ${selectedLanguage || 'programming'}.`,
          };

          let assistantContent = '';
          updateLastAssistantMessage(assistantMessageId, '');
          await chatDirectOpenAI(
            [systemMsg, ...recentMessages],
            (chunk) => {
              assistantContent += chunk;
              updateLastAssistantMessage(assistantMessageId, assistantContent);
            },
          );
          setIsTyping(false);

          if (assistantContent && autoReadReplies && speechEnabled && onAudioReceived) {
            onAudioReceived(
              assistantContent.replace(/```[\s\S]*?```/g, ' [Code Block] '),
              'device-native',
            );
          }
          return;
        } catch (directErr) {
          console.error('Direct OpenAI fallback also failed', directErr);
        }
      }

      // ── Fallback B: Local AI (WebLLM) ──
      setIsTyping(false);

      if (isOfflineReady()) {
        try {
          let fallbackContent = '';
          updateLastAssistantMessage(assistantMessageId, '');
          setIsTyping(true);

          const recentMessages = messages
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .slice(-10)
            .map((message) => ({
              role: message.role as 'user' | 'assistant',
              content: message.content,
            }));
          recentMessages.push({ role: 'user', content });

          for await (const chunk of chatOffline(recentMessages, learnerMode, selectedLanguage)) {
            fallbackContent += chunk;
            updateLastAssistantMessage(assistantMessageId, fallbackContent);
          }
          setIsTyping(false);

          if (fallbackContent && autoReadReplies && speechEnabled && onAudioReceived) {
            onAudioReceived(
              fallbackContent.replace(/```[\s\S]*?```/g, ' [Code Block] '),
              'device-native',
            );
          }
          return;
        } catch {
          setIsTyping(false);
        }
      }

      // ── No fallback available — show helpful error ──
      if (errMsg === 'NO_API_KEY') {
        updateLastAssistantMessage(
          assistantMessageId,
          '🔑 *API Key Required*\n\nTo chat with B.L.U.E.-J. in standalone mode, you need to configure an API key.\n\nOpen **System Controls** (gear icon) → **AI Provider Settings** → enter your OpenAI API key → tap **Save & Test**.\n\nNo key? Switch to **Local** mode to use the on-device AI (no internet needed).',
        );
      } else {
        updateLastAssistantMessage(
          assistantMessageId,
          navigator.onLine
            ? 'ERROR: Connection to J. interrupted. ULTRON protocol failsafe engaged.\n\nTip: Open System Controls → AI Provider Settings to configure your API key for standalone mode.'
            : 'OFFLINE: No local AI model loaded. Open system controls and prepare the local model.',
        );
      }
      addSystemMessage(
        'Voice and chat have fallen back to safe local mode rules. Check provider settings or prepare the local model.',
      );
    }
  }, [
    sessionId,
    conversationId,
    selectedLanguage,
    selectedOs,
    hardwareInfo,
    learnerMode,
    messages,
    setConversationId,
    addMessage,
    updateLastAssistantMessage,
    setIsTyping,
    addSystemMessage,
    providerMode,
    voiceMode,
    speechEnabled,
    autoReadReplies,
    ttsMutation,
  ]);

  return { messages, isTyping, sendMessage, addSystemMessage };
}
