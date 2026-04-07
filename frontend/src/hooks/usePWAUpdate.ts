import { useCallback, useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

interface UsePWAUpdateReturn {
  needsUpdate: boolean;
  isUpdating: boolean;
  applyUpdate: () => void;
  offlineReady: boolean;
}

/**
 * Hook to detect and apply service worker updates.
 *
 * Uses `vite-plugin-pwa`'s virtual module to register the SW.
 * All setState calls live inside SW lifecycle callbacks — never
 * synchronously in the effect body — to avoid cascading render warnings.
 */
export function usePWAUpdate(): UsePWAUpdateReturn {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Store the update function in a ref so applyUpdate never needs it as a dep
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // ✅ registerSW returns the update fn synchronously; we store it in a ref
    //    instead of calling setState, which would be a synchronous state update
    //    inside an effect body.
    updateSWRef.current = registerSW({
      // ✅ All setState here happen inside callbacks — not in the effect body
      onNeedRefresh() {
        setNeedsUpdate(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
        setTimeout(() => setOfflineReady(false), 4000);
      },
      onRegistered(registration) {
        if (!registration) return;
        // Poll for updates every 60 minutes while the tab is open
        const id = setInterval(() => registration.update().catch(console.error), 60 * 60 * 1000);
        // Clean up the interval if the hook unmounts
        return () => clearInterval(id);
      },
      onRegisterError(error) {
        console.error("[PWA] Service worker registration error:", error);
      },
      immediate: true,
    });
  }, []); // empty deps — runs once on mount

  const applyUpdate = useCallback(() => {
    const fn = updateSWRef.current;
    if (!fn) return;
    setIsUpdating(true);
    fn(true).catch(() => {
      setIsUpdating(false);
      window.location.reload();
    });
  }, []);

  return {
    needsUpdate,
    isUpdating,
    applyUpdate,
    offlineReady,
  };
}
