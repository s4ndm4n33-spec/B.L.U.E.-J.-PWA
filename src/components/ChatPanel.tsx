import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStream } from '@/hooks/use-chat';
import { useAudioOutput, useVoiceRecording } from '@/hooks/use-audio';
import { useBlueJStore } from '@/lib/store';
import { Send, Mic, Volume2, VolumeX, Terminal as TerminalIcon, Loader2, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatPanel() {
  const { messages, isTyping, sendMessage } = useChatStream();
  const { voiceInteractionMode, speechEnabled } = useBlueJStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isPlaying, playBase64Audio, speakText, stopAudio } = useAudioOutput();

  const handlePlayback = useCallback((payload: string, format: string) => {
    if (format === 'device-native') {
      void speakText(payload);
      return;
    }
    playBase64Audio(payload, format);
  }, [playBase64Audio, speakText]);

  const handleTranscription = useCallback((text: string) => {
    if (text.trim()) {
      // Auto-submit voice input
      sendMessage(text, handlePlayback, true);
      setInput("");
    }
  }, [handlePlayback, sendMessage]);

  const { isRecording, isTranscribing, recordingState, startRecording, stopRecording } = useVoiceRecording(handleTranscription);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input, handlePlayback, false);
      setInput("");
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing) {
      startRecording();
    }
  };

  const micLabel =
    recordingState === 'recording' ? 'Stop recording' :
    recordingState === 'transcribing' ? 'Transcribing...' :
    recordingState === 'error' ? 'Mic error' :
    'Start voice input';

  return (
    <div className="h-full flex flex-col hud-panel">
      {/* Header */}
      <div className="px-4 py-2 border-b border-primary/20 bg-secondary/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-hud uppercase tracking-widest text-sm">
          <TerminalIcon className="w-4 h-4" />
          <span>Comm-Link // J.</span>
        </div>
        <button
          onClick={() => isPlaying ? stopAudio() : undefined}
          className={`p-1 rounded transition-colors ${isPlaying ? 'text-primary animate-pulse' : 'text-primary/30'}`}
          title={isPlaying ? 'Stop audio' : 'Audio off'}
        >
          {isPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 font-mono text-sm" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 opacity-50 text-xs">
                {msg.role === 'assistant' && <span className="text-primary">J.</span>}
                {msg.role === 'user' && (
                  <span className="text-accent flex items-center gap-1">
                    {msg.voiceInput && <Mic className="w-3 h-3" />}
                    OPERATOR
                  </span>
                )}
                {msg.role === 'system' && <span className="text-destructive">SYSTEM</span>}
              </div>
              <div className={`p-3 max-w-[90%] rounded-sm backdrop-blur-md border ${
                msg.role === 'user'
                  ? 'bg-accent/10 border-accent/30 text-accent-foreground'
                  : msg.role === 'system'
                  ? 'bg-destructive/10 border-destructive/50 text-destructive glow-border'
                  : 'bg-primary/5 border-primary/20 text-primary-foreground'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-primary/20 prose-a:text-primary max-w-none text-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center text-primary/50 text-xs font-hud">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-2 uppercase tracking-widest">Compiling Response...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recording Indicator Banner */}
      <AnimatePresence>
        {(isRecording || isTranscribing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-destructive/30 bg-destructive/10 overflow-hidden"
          >
            <div className="px-4 py-2 flex items-center gap-3 text-xs font-hud">
              {isRecording ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                  <span className="text-destructive uppercase tracking-widest">Recording — Click mic to stop</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-accent animate-spin flex-shrink-0" />
                  <span className="text-accent uppercase tracking-widest">Transcribing audio...</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 border-t border-primary/20 bg-secondary/30">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isTranscribing ? "Transcribing your voice..." : "Type or speak to J. (Enter to send, Shift+Enter for newline)"}
            disabled={isTranscribing}
            className="flex-1 bg-background border border-primary/30 rounded-sm p-3 text-sm font-mono text-primary placeholder:text-primary/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 resize-none min-h-[56px] max-h-[160px] disabled:opacity-50"
            rows={2}
          />

          {/* Mic Button */}
          <button
          onClick={handleMicClick}
          onMouseDown={() => {
            if (voiceInteractionMode === 'push-to-talk' && !isRecording && !isTranscribing) {
              void startRecording();
            }
          }}
          onMouseUp={() => {
            if (voiceInteractionMode === 'push-to-talk' && isRecording) {
              stopRecording();
            }
          }}
          onMouseLeave={() => {
            if (voiceInteractionMode === 'push-to-talk' && isRecording) {
              stopRecording();
            }
          }}
          disabled={isTranscribing || !speechEnabled}
          title={micLabel}
          className={`h-[56px] w-[48px] flex items-center justify-center rounded-sm border transition-all flex-shrink-0 ${
            recordingState === 'error'
                ? 'border-destructive/50 bg-destructive/10 text-destructive'
                : isRecording
                ? 'border-destructive bg-destructive/20 text-destructive animate-pulse'
                : isTranscribing
                ? 'border-accent/50 bg-accent/10 text-accent cursor-wait'
                : !speechEnabled
                ? 'border-primary/10 bg-secondary text-primary/20 cursor-not-allowed'
                : 'border-primary/30 bg-secondary text-primary/60 hover:text-primary hover:border-primary/60'
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : recordingState === 'error' ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping || isTranscribing}
            className="h-[56px] px-4 bg-primary/20 hover:bg-primary/40 border border-primary/50 text-primary rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
