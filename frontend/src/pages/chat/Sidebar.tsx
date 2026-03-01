import { useAuth } from "@/context/AuthContext";
import { LogOut, MessageSquare, X } from "lucide-react";
import NewChatButton from "./NewChatButton";

interface Props {
  onClose: () => void;
}

const mockSessions = [
  { id: "1", title: "How does React work?" },
  { id: "2", title: "Python sorting algorithms" },
  { id: "3", title: "CSS Grid vs Flexbox" },
];

const Sidebar = ({ onClose }: Props) => {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 h-full bg-surface-raised border-r border-line flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-line flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-ink-primary text-sm font-semibold tracking-tight">
            AI Chat Assistant
          </span>
          {/* Close button — only visible on mobile */}
          <button
            onClick={onClose}
            className="md:hidden text-ink-muted hover:text-ink-primary transition-colors p-1 rounded-lg hover:bg-surface-overlay"
          >
            <X size={16} />
          </button>
        </div>
        <NewChatButton onClick={() => {}} />
      </div>

      {/* Sessions list */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <p className="text-ink-muted text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
          Recent
        </p>
        <ul className="flex flex-col gap-0.5">
          {mockSessions.map((session) => (
            <li key={session.id}>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-ink-secondary hover:text-ink-primary hover:bg-surface-overlay text-sm transition-all duration-150 text-left group">
                <MessageSquare
                  size={13}
                  className="shrink-0 text-ink-muted group-hover:text-ink-secondary transition-colors"
                />
                <span className="truncate">{session.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User profile + logout */}
      <div className="p-3 border-t border-line">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-overlay transition-all duration-150 group">
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.full_name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-line-strong shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-surface-active flex items-center justify-center text-ink-secondary text-xs font-semibold shrink-0">
              {user?.first_name?.[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-ink-primary text-sm font-medium truncate leading-tight">
              {user?.full_name}
            </p>
            <p className="text-ink-muted text-xs truncate leading-tight mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-ink-muted hover:text-danger transition-colors duration-150 shrink-0 p-1 rounded-lg hover:bg-surface-active"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
