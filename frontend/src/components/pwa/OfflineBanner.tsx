import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * OfflineBanner
 *
 * Shows a slim persistent banner when the device is offline.
 * Goes green with "Back online" briefly when reconnected.
 *
 * All setState calls are inside timeout/event callbacks —
 * never called synchronously in an effect body.
 */
export function OfflineBanner() {
  const { isOnline, isOffline, wasOffline } = useNetworkStatus();

  // Controls the transient "Back online" flash
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (!isOnline || !wasOffline) return;

    // ✅ setState is inside a setTimeout callback, not in the effect body
    const id = setTimeout(() => setShowBackOnline(true), 0);
    const clearId = setTimeout(() => setShowBackOnline(false), 3000);

    return () => {
      clearTimeout(id);
      clearTimeout(clearId);
    };
  }, [isOnline, wasOffline]);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium transition-all duration-300"
      style={{
        background: isOffline ? "rgba(248, 113, 113, 0.12)" : "rgba(52, 211, 153, 0.12)",
        borderBottom: isOffline
          ? "1px solid rgba(248, 113, 113, 0.25)"
          : "1px solid rgba(52, 211, 153, 0.25)",
        color: isOffline ? "#f87171" : "#34d399",
      }}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <WifiOff size={12} />
          <span>You&apos;re offline — some features may be unavailable</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>Back online</span>
        </>
      )}
    </div>
  );
}
