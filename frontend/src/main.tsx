import { AuthProvider } from "@/providers/AuthProvider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

// Mount React app
const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);

// ── Service Worker registration ─────────────────────────────────────────────
// We use registerType: "prompt" in vite.config.ts so the SW does NOT
// auto-reload — the PWAUpdatePrompt component handles that flow.
// The actual registration call is in usePWAUpdate.ts via virtual:pwa-register.
// We just log SW lifecycle events here for debugging.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        if (regs.length > 0) {
          console.debug("[PWA] Service worker active:", regs[0].scope);
        }
      })
      .catch(() => {
        // SW access denied — not a fatal error
      });
  });
}
