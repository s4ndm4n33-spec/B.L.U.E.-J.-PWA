import { useCallback } from 'react';
import { useBlueJStore, type ChatMessage } from '@/lib/store';
import { useProgressStore } from '@/lib/progress-store';
import { useTextToSpeech } from '@/hooks/use-bluej-api';
import { isOfflineReady, chatOffline } from '@/lib/offline-ai';

export type { ChatMessage };

export function useChatStream() {
  const {
    sessionId,
    conversationId, setConversationId,
    selectedLanguage, selectedOs,
    hardwareInfo, learnerMode,
    messages, isTyping,
    addMessage, updateLastAssistantMessage, setIsTyping, addSystemMessage,
  } = useBlueJStore();

  const ttsMutation = useTextToSpeech();

  const sendMessage = useCallback(async (
    content: string,
    onAudioReceived?: (b64: string, fmt: string) => void,
    isVoice = false
  ) => {
    if (!content.trim()) return;

    // Track chat event for goals/achievements
    useProgressStore.getState().trackEvent('chat');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
      voiceInput: isVoice,
    };

    addMessage(userMsg);
    setIsTyping(true);

    const assistantMsgId = `a-${Date.now()}`;
    addMessage({
      id: assistantMsgId,
      role: 'assistant',
      content: "",
      timestamp: Date.now()
    });

    try {
      // Decide: offline AI or server API
      const useOffline = !navigator.onLine || isOfflineReady();

      if (useOffline && isOfflineReady()) {
        // ─── Offline: stream from local WebLLM model ───
        let assistantContent = "";

        // Build message history for context (last 10 messages)
        const recentMessages = messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .slice(-10)
          .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

        recentMessages.push({ role: "user", content });

        for await (const chunk of chatOffline(recentMessages, learnerMode, selectedLanguage)) {
          assistantContent += chunk;
          updateLastAssistantMessage(assistantMsgId, assistantContent);
        }

        setIsTyping(false);

        // TTS not available offline, skip audio
      } else {
        // ─── Online: stream from server API ───
        const response = await fetch(`/api/bluej/chat`, {
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
          })
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                assistantContent += data.content;
                updateLastAssistantMessage(assistantMsgId, assistantContent);
              }
              if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId);
              }
            } catch {
              // Partial JSON — will complete next read
            }
          }
        }

        setIsTyping(false);

        if (assistantContent && onAudioReceived) {
          const textForSpeech = assistantContent.replace(/```[\s\S]*?```/g, " [Code Block] ");
          ttsMutation.mutate({ data: { text: textForSpeech, voice: 'echo' } }, {
            onSuccess: (res) => onAudioReceived(res.audio, res.format)
          });
        }
      }

    } catch (err) {
      console.error("Chat error", err);
      setIsTyping(false);

      // If online failed but offline is available, try offline fallback
      if (isOfflineReady()) {
        try {
          let fallbackContent = "";
          updateLastAssistantMessage(assistantMsgId, "");
          setIsTyping(true);

          const recentMessages = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-10)
            .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
          recentMessages.push({ role: "user", content });

          for await (const chunk of chatOffline(recentMessages, learnerMode, selectedLanguage)) {
            fallbackContent += chunk;
            updateLastAssistantMessage(assistantMsgId, fallbackContent);
          }
          setIsTyping(false);
          return;
        } catch {
          setIsTyping(false);
        }
      }

      updateLastAssistantMessage(assistantMsgId,
        navigator.onLine
          ? "ERROR: Connection to J. interrupted. ULTRON protocol failsafe engaged."
          : "OFFLINE: No local AI model loaded. Tap the ⚡ icon in Settings to download the offline model (~2GB, one-time)."
      );
    }
  }, [
    sessionId, conversationId, selectedLanguage, selectedOs,
    hardwareInfo, learnerMode, messages, setConversationId,
    addMessage, updateLastAssistantMessage, setIsTyping, ttsMutation
  ]);

  return { messages, isTyping, sendMessage, addSystemMessage };
}
