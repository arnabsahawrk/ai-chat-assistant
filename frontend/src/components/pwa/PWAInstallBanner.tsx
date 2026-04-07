import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * PWAInstallBanner
 *
 * - On Android/Chrome: shows a native-style install banner with a one-tap install button.
 * - On iOS Safari: shows a guide to use "Add to Home Screen" via the share sheet.
 * - Hidden once installed, dismissed, or in standalone mode.
 *
 * Renders as a slide-up bottom bar that doesn't interfere with main content.
 */
export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall, dismissInstall } =
    usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  // Delay showing to avoid flashing on initial load
  useEffect(() => {
    if (isStandalone || isInstalled) return;

    const timer = setTimeout(() => {
      if (isInstallable) setVisible(true);
      // On iOS show install hint after a short delay on first visit
      else if (isIOS && !sessionStorage.getItem("pwa-ios-hint-shown")) {
        setVisible(true);
        sessionStorage.setItem("pwa-ios-hint-shown", "true");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable, isIOS, isInstalled, isStandalone]);

  if (!visible || isInstalled || isStandalone) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setIosGuideOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome) setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    dismissInstall();
  };

  return (
    <>
      {/* Install banner */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          transform transition-transform duration-300 ease-out
          ${visible ? "translate-y-0" : "translate-y-full"}
        `}
        role="banner"
        aria-label="Install app"
      >
        {/* Safe area + frosted backdrop */}
        <div
          className="border-t border-line"
          style={{
            background: "rgba(16, 16, 19, 0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
            {/* App icon */}
            <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-line-strong flex items-center justify-center shrink-0">
              <img src="/icons/icon-72x72.png" alt="AI Chat" className="w-7 h-7 rounded-lg" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-ink-primary text-sm font-medium leading-tight">
                Install AI Chat Assistant
              </p>
              <p className="text-ink-muted text-xs mt-0.5 leading-tight truncate">
                {isIOS
                  ? "Tap Share → Add to Home Screen"
                  : "Fast access, works offline"}
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-surface-base text-xs font-semibold shrink-0 transition-opacity hover:opacity-90 active:scale-95"
            >
              {isIOS ? (
                <>
                  <Share size={12} />
                  How?
                </>
              ) : (
                <>
                  <Download size={12} />
                  Install
                </>
              )}
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="text-ink-muted hover:text-ink-primary transition-colors shrink-0 p-1 rounded-lg hover:bg-surface-overlay"
              aria-label="Dismiss install banner"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS "Add to Home Screen" guide modal */}
      {iosGuideOpen && (
        <div
          className="fixed inset-0 z-60 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setIosGuideOpen(false)}
        >
          <div
            className="w-full max-w-sm mx-4 mb-8 bg-surface-elevated border border-line rounded-2xl p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-ink-primary font-semibold text-sm">Add to Home Screen</h2>
              <button
                onClick={() => setIosGuideOpen(false)}
                className="text-ink-muted hover:text-ink-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { step: "1", text: 'Tap the Share button in Safari\'s toolbar' },
                { step: "2", text: 'Scroll down and tap "Add to Home Screen"' },
                { step: "3", text: 'Tap "Add" in the top-right corner' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-overlay border border-line text-ink-muted text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {step}
                  </span>
                  <p className="text-ink-secondary text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setIosGuideOpen(false);
                setVisible(false);
                dismissInstall();
              }}
              className="w-full py-2.5 rounded-xl bg-surface-overlay text-ink-secondary text-sm font-medium hover:bg-surface-active transition-colors mt-1"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
