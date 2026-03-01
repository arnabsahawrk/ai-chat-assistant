import { useAuth } from "@/context/AuthContext";
import { LogOut, MessageSquare } from "lucide-react";
import NewChatButton from "./NewChatButton";

const Sidebar = () => {
  const { user, logout } = useAuth();

  const mockSessions = [
    { id: "1", title: "How does React work?" },
    { id: "2", title: "Python sorting algorithms" },
    { id: "3", title: "CSS Grid vs Flexbox" },
  ];

  return (
    <aside className="w-64 h-screen bg-[#111318] border-r border-[#1e2130] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#1e2130]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[#e8e8e8] text-sm font-semibold tracking-tight">
            AI Chat Assistant
          </span>
        </div>
        <NewChatButton onClick={() => {}} />
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        <p className="text-[#555] text-xs font-medium uppercase tracking-wider px-2 mb-2">Recent</p>
        <ul className="flex flex-col gap-0.5">
          {mockSessions.map((session) => (
            <li key={session.id}>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#aaa] hover:text-[#e8e8e8] hover:bg-[#1a1d27] text-sm transition-all duration-150 text-left group">
                <MessageSquare
                  size={14}
                  className="shrink-0 text-[#555] group-hover:text-indigo-400 transition-colors"
                />
                <span className="truncate">{session.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* User profile + logout */}
      <div className="p-3 border-t border-[#1e2130]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#1a1d27] transition-all duration-150 group">
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.full_name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#2a2d3e]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
              {user?.first_name?.[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[#e8e8e8] text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-[#555] text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-[#555] hover:text-red-400 transition-colors duration-150 shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
