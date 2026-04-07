import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/auth/LoginPage";
import ChatPage from "@/pages/chat/ChatPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import { Navigate, Route, Routes } from "react-router-dom";
import { OfflineBanner, PWAInstallBanner, PWAUpdatePrompt } from "./components/pwa";

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* ── PWA Overlays ───────────────────────────────────────── */}
      {/* Offline connectivity indicator */}
      <OfflineBanner />

      {/* New service worker available — prompt user to refresh */}
      <PWAUpdatePrompt />

      {/* Install-to-home-screen banner (Android native + iOS guide) */}
      <PWAInstallBanner />

      {/* ── App Routes ─────────────────────────────────────────── */}
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/chat" replace /> : <LoginPage />}
        />
        <Route
          path="/chat"
          element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

export default App;
