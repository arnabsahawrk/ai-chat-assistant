import { useAuth } from "@/context/AuthContext";
import { Menu, Sparkles } from "lucide-react";

const suggestions = [
  "Explain how React hooks work",
  "Write a Python function to sort a list",
  "What's the difference between REST and GraphQL?",
  "Help me debug my JavaScript code",
];

interface Props {
  onMenuClick: () => void;
}

const ChatWindow = ({ onMenuClick }: Props) => {
  const { user } = useAuth();

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
            alt={user.full_name}
            className="w-7 h-7 rounded-full object-cover ring-1 ring-line-strong"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-surface-active flex items-center justify-center text-ink-secondary text-xs font-medium">
            {user?.first_name?.[0]}
          </div>
        )}
      </header>

      {/* Empty / welcome state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 sm:px-8 py-12 overflow-y-auto">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface-elevated border border-line-strong flex items-center justify-center">
            <Sparkles size={20} className="text-ink-secondary" />
          </div>
          <div>
            <h1 className="text-ink-primary text-xl sm:text-2xl font-semibold tracking-tight">
              What can I help you with?
            </h1>
            <p className="text-ink-muted text-sm mt-1">Start a conversation or pick a suggestion</p>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="px-4 py-3 rounded-xl bg-surface-raised border border-line text-ink-secondary hover:text-ink-primary hover:border-line-strong hover:bg-surface-elevated text-sm text-left transition-all duration-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="px-4 py-4 border-t border-line shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-surface-raised border border-line rounded-2xl px-4 py-3 focus-within:border-line-strong transition-colors duration-200">
            <textarea
              placeholder="Message AI Chat Assistant…"
              rows={1}
              className="flex-1 bg-transparent text-ink-primary text-sm placeholder:text-ink-muted resize-none outline-none min-h-5 max-h-40"
            />
            <button className="w-8 h-8 rounded-xl bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors duration-200 shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="var(--color-surface-base)"
              >
                <path d="M12 5l0 14M5 12l7-7 7 7" />
              </svg>
            </button>
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
