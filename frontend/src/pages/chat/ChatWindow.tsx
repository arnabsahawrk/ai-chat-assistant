import { Sparkles } from "lucide-react";

const suggestions = [
  "Explain how React hooks work",
  "Write a Python function to sort a list",
  "What's the difference between REST and GraphQL?",
  "Help me debug my JavaScript code",
];

const ChatWindow = () => {
  return (
    <div className="flex-1 h-screen bg-[#0d0f14] flex flex-col">
      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Sparkles size={24} className="text-indigo-400" />
          </div>
          <h1 className="text-[#e8e8e8] text-2xl font-semibold tracking-tight">
            What can I help you with?
          </h1>
          <p className="text-[#555] text-sm">Start a conversation or pick a suggestion below</p>
        </div>

        {/* Suggestion chips */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="px-4 py-3 rounded-xl bg-[#111318] border border-[#1e2130] text-[#aaa] hover:text-[#e8e8e8] hover:border-indigo-500/40 hover:bg-[#1a1d27] text-sm text-left transition-all duration-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="p-4 border-t border-[#1e2130]">
        <div className="max-w-3xl mx-auto flex items-end gap-3 bg-[#111318] border border-[#1e2130] rounded-2xl px-4 py-3 focus-within:border-indigo-500/50 transition-colors duration-200">
          <textarea
            placeholder="Message AI Assistant..."
            rows={1}
            className="flex-1 bg-transparent text-[#e8e8e8] text-sm placeholder:text-[#444] resize-none outline-none max-h-40"
          />
          <button className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-colors duration-200 shrink-0">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-white fill-none stroke-current stroke-2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[#333] text-xs mt-2">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
