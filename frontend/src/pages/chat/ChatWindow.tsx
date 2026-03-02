import { useAuth } from "@/context/AuthContext";
import type { Message } from "@/types";
import { ArrowUp, Loader2, Menu, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  isLoadingMessages: boolean;
  onSendMessage: (content: string) => void;
  onStopStreaming: () => void;
  onMenuClick: () => void;
  streamError: string | null;
  onRegenerate: () => void;
}

const suggestions = [
  "Explain something fascinating in simple words",
  "Give me one idea that could improve my life",
  "Teach me something I probably don't know",
  "Ask me a deep question that makes me think",
];

const ChatWindow = ({
  messages,
  isStreaming,
  streamingContent,
  isLoadingMessages,
  onSendMessage,
  onStopStreaming,
  onMenuClick,
  streamError,
  onRegenerate,
}: Props) => {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInput("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !isLoadingMessages;

  return (
    <div className="flex-1 min-w-0 h-full bg-surface-base flex flex-col">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-line shrink-0">
        <button
          onClick={onMenuClick}
          className="text-ink-secondary hover:text-ink-primary transition-colors p-1.5 rounded-lg hover:bg-surface-overlay"
        >
          <Menu size={18} />
        </button>
        <span className="text-ink-primary text-sm font-semibold flex-1 truncate">
          AI Chat Assistant
        </span>
        {user?.profile_picture ? (
          <img
            src={user.profile_picture}
            alt={user.full_name ?? ""}
            className="w-7 h-7 rounded-full object-cover ring-1 ring-line-strong"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-surface-active flex items-center justify-center text-ink-secondary text-xs font-medium">
            {user?.first_name?.[0]}
          </div>
        )}
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="text-ink-muted animate-spin" />
          </div>
        ) : isEmpty ? (
          /* Empty / welcome state */
          <div className="flex flex-col items-center justify-center h-full gap-6 px-4 sm:px-8 py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface-elevated border border-line-strong flex items-center justify-center">
                <Sparkles size={20} className="text-ink-secondary" />
              </div>
              <div>
                <h1 className="text-ink-primary text-xl sm:text-2xl font-semibold tracking-tight">
                  What can I help you with?
                </h1>
                <p className="text-ink-muted text-sm mt-1">
                  Start a conversation or pick a suggestion
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => onSendMessage(s)}
                  className="px-4 py-3 rounded-xl bg-surface-raised border border-line text-ink-secondary hover:text-ink-primary hover:border-line-strong hover:bg-surface-elevated text-sm text-left transition-all duration-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
            {messages.map((msg, idx) => {
              const isLastAssistant =
                msg.role === "assistant" &&
                idx === [...messages].map((m) => m.role).lastIndexOf("assistant");
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLast={isLastAssistant}
                  onRegenerate={onRegenerate}
                />
              );
            })}

            {/* Streaming assistant bubble */}
            {isStreaming && streamingContent && (
              <MessageBubble
                message={{
                  id: -1,
                  role: "assistant",
                  content: streamingContent,
                  provider: "",
                  model_used: "",
                  created_at: "",
                }}
                isStreaming
              />
            )}

            {/* Thinking indicator */}
            {isStreaming && !streamingContent && (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-surface-overlay border border-line flex items-center justify-center shrink-0">
                  <Sparkles size={12} className="text-ink-secondary" />
                </div>
                <div className="flex items-center gap-1.5 px-4 py-3 bg-surface-raised border border-line rounded-2xl rounded-tl-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {streamError && (
        <div className="max-w-2xl mx-auto px-4 pb-2">
          <div
            className="px-4 py-3 rounded-xl text-danger text-sm border"
            style={{
              background: "var(--color-danger-surface)",
              borderColor: "var(--color-danger-border)",
            }}
          >
            ⚠ {streamError} — please try again.
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-4 border-t border-line shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-surface-raised border border-line rounded-2xl px-4 py-3 focus-within:border-line-strong transition-colors duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Chat Assistant…"
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-ink-primary text-sm placeholder:text-ink-muted resize-none outline-none min-h-5 max-h-40 disabled:opacity-50"
            />
            {isStreaming ? (
              <button
                onClick={onStopStreaming}
                className="w-8 h-8 rounded-xl bg-surface-active hover:bg-surface-overlay border border-line flex items-center justify-center transition-colors duration-200 shrink-0"
                title="Stop generating"
              >
                <Square size={14} className="text-ink-primary" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-xl bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors duration-200 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp size={16} stroke="var(--color-surface-base)" strokeWidth={2.5} />
              </button>
            )}
          </div>
          <p className="text-center text-ink-muted text-xs mt-2">
            AI can make mistakes — verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
