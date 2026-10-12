// [ezo-pwa] usePWAInstall — كشف قابلية التثبيت + prompt
import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "ezo_pwa_dismissed_at";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 أيام

export function usePWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // standalone؟ (مثبّت أصلاً)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // iOS؟ (لا يدعم beforeinstallprompt)
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // dismissed سابقاً؟
    const ts = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (ts && Date.now() - ts < DISMISS_TTL) setDismissed(true);

    // قبل التثبيت
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // بعد التثبيت
    const installedHandler = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return { outcome: "unavailable" as const };
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setDeferred(null);
      setIsStandalone(true);
    }
    return choice;
  }, [deferred]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  const canInstall = !isStandalone && !dismissed && (!!deferred || isIOS);

  return { canInstall, isStandalone, isIOS, hasNativePrompt: !!deferred, promptInstall, dismiss };
}
