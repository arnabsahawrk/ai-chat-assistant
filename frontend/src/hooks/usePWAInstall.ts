import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface UsePWAInstallReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | null>;
  dismissInstall: () => void;
}

// Computed once outside React to avoid running on every render
function getIsStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

/**
 * Hook to manage PWA install prompt.
 * All setState calls live inside event callbacks — never called
 * synchronously in the effect body — to avoid cascading render warnings.
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = getIsStandalone();
  const isInstalled = isStandalone;

  // Use a ref for the deferred prompt so we never need it in deps
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (isStandalone) return;
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

    // ✅ setState is inside the event handler callback, not in the effect body
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return null;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    deferredPromptRef.current = null;
    setIsInstallable(false);

    if (outcome === "dismissed") {
      sessionStorage.setItem("pwa-install-dismissed", "true");
    }

    return outcome;
  }, []);

  const dismissInstall = useCallback(() => {
    setIsInstallable(false);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  }, []);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isStandalone,
    promptInstall,
    dismissInstall,
  };
}
