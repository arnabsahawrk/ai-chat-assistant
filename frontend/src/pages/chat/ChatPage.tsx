import { useChat } from "@/hooks/useChat";
import { useEffect, useState } from "react";
import ChatWindow from "./ChatWindow";
import Sidebar from "./Sidebar";

const ChatPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chat = useChat();

  useEffect(() => {
    chat.loadSessions();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          sessions={chat.sessions}
          activeSessionId={chat.activeSessionId}
          isLoading={chat.isLoadingSessions}
          onSelectSession={(id) => {
            chat.selectSession(id);
            setSidebarOpen(false);
          }}
          onNewChat={chat.startNewSession}
          onDeleteSession={chat.removeSession}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <ChatWindow
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        streamingContent={chat.streamingContent}
        isLoadingMessages={chat.isLoadingMessages}
        streamError={chat.streamError}
        onSendMessage={chat.sendMessage}
        onStopStreaming={chat.stopStreaming}
        onMenuClick={() => setSidebarOpen(true)}
      />
    </div>
  );
};

export default ChatPage;
