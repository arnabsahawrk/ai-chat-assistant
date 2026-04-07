import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { ArrowUp, CheckCircle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * PWAUpdatePrompt
 *
 * Shows a non-intrusive toast-style notification when a new version
 * of the service worker is ready to activate.
 *
 * Also briefly shows an "App ready for offline use" notice the
 * first time the service worker is installed.
 */
export function PWAUpdatePrompt() {
  const { needsUpdate, isUpdating, applyUpdate, offlineReady } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  // Auto-hide offline-ready toast after 4 seconds
  useEffect(() => {
    if (offlineReady && !offlineDismissed) {
      const t = setTimeout(() => setOfflineDismissed(true), 4000);
      return () => clearTimeout(t);
    }
  }, [offlineReady, offlineDismissed]);

  const showUpdate = needsUpdate && !dismissed;
  const showOfflineReady = offlineReady && !offlineDismissed && !needsUpdate;

  if (!showUpdate && !showOfflineReady) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: "calc(100vw - 2rem)" }}
    >
      {/* Offline-ready toast */}
      {showOfflineReady && (
        <div
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border border-line shadow-lg animate-in slide-in-from-top-4 duration-300"
          style={{
            background: "rgba(16, 16, 19, 0.92)",
            backdropFilter: "blur(16px)",
          }}
        >
          <CheckCircle size={16} className="text-green-400 shrink-0" />
          <p className="text-ink-primary text-sm">App ready for offline use</p>
          <button
            onClick={() => setOfflineDismissed(true)}
            className="text-ink-muted hover:text-ink-primary transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Update available toast */}
      {showUpdate && (
        <div
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border border-line shadow-lg animate-in slide-in-from-top-4 duration-300"
          style={{
            background: "rgba(16, 16, 19, 0.92)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex flex-col min-w-0 flex-1">
            <p className="text-ink-primary text-sm font-medium">Update available</p>
            <p className="text-ink-muted text-xs">Reload to get the latest version</p>
          </div>

          <button
            onClick={applyUpdate}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-surface-base text-xs font-semibold shrink-0 disabled:opacity-50 transition-all hover:opacity-90 active:scale-95"
          >
            {isUpdating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ArrowUp size={12} />
            )}
            {isUpdating ? "Updating…" : "Reload"}
          </button>

          <button
            onClick={() => setDismissed(true)}
            disabled={isUpdating}
            className="text-ink-muted hover:text-ink-primary transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
