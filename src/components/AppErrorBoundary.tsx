// [ezo-ux] معالجة الأخطاء باحتراف
import { ErrorBoundary } from "react-error-boundary";
import type { ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

function Fallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 to-black" dir="rtl">
      <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mb-5">
        <AlertTriangle size={36} className="text-red-400" />
      </div>
      <h1 className="text-white text-lg font-black mb-2">حدث خطأ غير متوقع</h1>
      <p className="text-white/50 text-xs text-center mb-6 max-w-sm">
        {error?.message ?? "لم نتمكن من عرض هذه الصفحة"}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-white font-black text-sm flex items-center gap-2 active:scale-95"
      >
        <RotateCcw size={16} />
        إعادة المحاولة
      </button>
    </div>
  );
}

export default function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      onReset={() => window.location.reload()}
      onError={(error, info) => {
        console.error("[Ezo Error]", error, info);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
