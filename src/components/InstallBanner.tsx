// [ezo-pwa] InstallBanner — بانر تثبيت التطبيق
import { useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { usePWAInstall } from "../lib/hooks/usePWAInstall";
import { useEffect } from "react";

export default function InstallBanner() {
  const { canInstall, isStandalone, isIOS, hasNativePrompt, promptInstall, dismiss } = usePWAInstall();
  const [showIOSHint, setShowIOSHint] = useState(false);

  // [PWA-DEBUG] سجل حالة PWA (احذفه لاحقاً)
  useEffect(() => {
    console.log("[PWA-DEBUG]", {
      canInstall,
      isStandalone,
      isIOS,
      hasNativePrompt,
      globalPrompt: typeof window !== "undefined" ? !!(window as any).__ezo_deferred_prompt : false,
    });
  }, [canInstall, isStandalone, isIOS, hasNativePrompt]);

  if (!canInstall) return null;

  const handleInstall = async () => {
    if (hasNativePrompt) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOSHint(true);
    }
  };

  if (showIOSHint) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[400] max-w-md mx-auto" dir="rtl">
        <div className="rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/20 shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Download size={20} className="text-purple-300" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-black mb-1">لتثبيت التطبيق على iOS</p>
              <div className="text-white/70 text-xs space-y-1">
                <p className="flex items-center gap-2">
                  1) اضغط <Share size={12} className="inline text-blue-300" /> في الأسفل
                </p>
                <p className="flex items-center gap-2">
                  2) اختر <Plus size={12} className="inline text-purple-300" /> "إضافة للشاشة الرئيسية"
                </p>
              </div>
              <button
                onClick={() => { setShowIOSHint(false); dismiss(); }}
                className="mt-3 text-xs font-black text-purple-300"
              >
                تم، فهمت
              </button>
            </div>
            <button
              onClick={() => setShowIOSHint(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[400] max-w-md mx-auto" dir="rtl">
      <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-2xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Download size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-black">ثبّت EZO GROUP</p>
          <p className="text-white/80 text-[10px]">تجربة أسرع وأفضل بدون متصفح</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl bg-white text-purple-700 text-xs font-black active:scale-95 transition"
        >
          تثبيت
        </button>
        <button
          onClick={dismiss}
          className="p-1 rounded-lg hover:bg-white/20 text-white/70"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
