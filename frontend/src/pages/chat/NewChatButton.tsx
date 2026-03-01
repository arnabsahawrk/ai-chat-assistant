import { SquarePen } from "lucide-react";

interface Props {
  onClick: () => void;
}

const NewChatButton = ({ onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all duration-200"
    >
      <SquarePen size={16} />
      New Chat
    </button>
  );
};

export default NewChatButton;
