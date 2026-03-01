import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useAuth } from "@/context/AuthContext";
import type { Message } from "@/types";
import { Sparkles } from "lucide-react";

interface Props {
  message: Message;
  isStreaming?: boolean;
}

const MessageBubble = ({ message, isStreaming = false }: Props) => {
  const { user } = useAuth();
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 items-start">
        <div className="max-w-[80%] px-4 py-3 bg-surface-overlay border border-line rounded-2xl rounded-tr-sm text-ink-primary text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
        {user?.profile_picture ? (
          <img
            src={user.profile_picture}
            alt={user.full_name ?? ""}
            className="w-7 h-7 rounded-full object-cover ring-1 ring-line-strong shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-surface-active flex items-center justify-center text-ink-secondary text-xs font-semibold shrink-0 mt-0.5">
            {user?.first_name?.[0]}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-surface-overlay border border-line flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={12} className="text-ink-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <MarkdownRenderer content={message.content} isStreaming={isStreaming} />
        {!isStreaming && message.provider && (
          <p className="text-ink-muted text-[10px] mt-2">
            {message.provider} · {message.model_used}
          </p>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
