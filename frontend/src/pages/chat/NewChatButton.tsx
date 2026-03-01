import { SquarePen } from "lucide-react";

interface Props {
  onClick: () => void;
}

const NewChatButton = ({ onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-surface-overlay hover:bg-surface-active border border-line text-ink-primary text-sm font-medium transition-all duration-200"
    >
      <SquarePen size={14} className="text-ink-secondary" />
      New Chat
    </button>
  );
};

export default NewChatButton;
