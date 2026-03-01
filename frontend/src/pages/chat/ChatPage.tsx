import ChatWindow from "./ChatWindow";
import Sidebar from "./Sidebar";

const ChatPage = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <ChatWindow />
    </div>
  );
};

export default ChatPage;
