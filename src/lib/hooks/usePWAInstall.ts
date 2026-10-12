// [ezo-pwa] usePWAInstall — reads early-captured event from window
import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "ezo_pwa_dismissed_at";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 أيام

export function usePWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    typeof window !== "undefined" ? (window as any).__ezo_deferred_prompt : null
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const ts = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (ts && Date.now() - ts < DISMISS_TTL) setDismissed(true);

    // Sync from global if not already set
    if (!deferred && (window as any).__ezo_deferred_prompt) {
      setDeferred((window as any).__ezo_deferred_prompt);
    }

    // Listen for the custom event
    const onReady = () => {
      const p = (window as any).__ezo_deferred_prompt;
      if (p) setDeferred(p);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener("ezo:beforeinstallprompt", onReady);
    window.addEventListener("ezo:appinstalled", onInstalled);

    return () => {
      window.removeEventListener("ezo:beforeinstallprompt", onReady);
      window.removeEventListener("ezo:appinstalled", onInstalled);
    };
  }, [deferred]);

  const promptInstall = useCallback(async () => {
    const p = deferred ?? (window as any).__ezo_deferred_prompt;
    if (!p) return { outcome: "unavailable" as const };
    try {
      await p.prompt();
      const choice = await p.userChoice;
      if (choice.outcome === "accepted") {
        setDeferred(null);
        (window as any).__ezo_deferred_prompt = null;
        setIsStandalone(true);
      }
      return choice;
    } catch (err) {
      console.error("[PWA] prompt error:", err);
      return { outcome: "unavailable" as const };
    }
  }, [deferred]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  const hasNativePrompt = !!(deferred || (typeof window !== "undefined" && (window as any).__ezo_deferred_prompt));
  const canInstall = !isStandalone && !dismissed && (hasNativePrompt || isIOS);

  return { canInstall, isStandalone, isIOS, hasNativePrompt, promptInstall, dismiss };
}
