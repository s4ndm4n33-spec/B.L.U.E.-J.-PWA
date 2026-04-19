import { useCallback } from 'react';
import { useBlueJStore, type ChatMessage } from '@/lib/store';
import { useProgressStore } from '@/lib/progress-store';
import { useTextToSpeech } from '@/hooks/use-bluej-api';
import { chatOffline, isOfflineReady } from '@/lib/offline-ai';

export type { ChatMessage };

function shouldUseLocalModel(): boolean {
  const { providerMode, localModelReady } = useBlueJStore.getState();
  if (providerMode === 'local') {
    return localModelReady && isOfflineReady();
  }
  if (providerMode === 'cloud') {
    return false;
  }
  return (localModelReady && isOfflineReady()) || !navigator.onLine;
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
      provider: shouldUseLocalModel() ? 'local' : 'cloud',
    });

    try {
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

      updateLastAssistantMessage(
        assistantMessageId,
        navigator.onLine
          ? 'ERROR: Connection to J. interrupted. ULTRON protocol failsafe engaged.'
          : 'OFFLINE: No local AI model loaded. Open system controls and prepare the local model.',
      );
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
