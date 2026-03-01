import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/auth/LoginPage";
import ChatPage from "@/pages/chat/ChatPage";
import { Navigate, Route, Routes } from "react-router-dom";

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/chat" replace /> : <LoginPage />}
      />
      <Route
        path="/chat"
        element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
