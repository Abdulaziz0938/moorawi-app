// [ezo-bg-removal] نافذة السؤال قبل رفع الصور
import { useState, useEffect } from "react";
import { Sparkles, Check } from "lucide-react";
import {
  subscribeBgPrompt,
  getPendingBgPrompt,
  answerBgRemoval,
} from "../lib/bgRemovalPrompt";

export default function BgRemovalPrompt() {
  const [pending, setPending] = useState<any>(getPendingBgPrompt());
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const unsub = subscribeBgPrompt(() => {
      setPending(getPendingBgPrompt());
    });
    return unsub;
  }, []);

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-[500] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 to-black border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mb-3 shadow-lg">
            <Sparkles size={28} className="text-white" />
          </div>
          <h3 className="text-white text-lg font-black">إزالة خلفية الصورة؟</h3>
          <p className="text-white/60 text-xs mt-2 leading-relaxed">
            سيتم إزالة الخلفية تلقائياً لجعل الصورة شفافة
          </p>
        </div>

        {/* Preview */}
        {pending.filePreview && (
          <div className="px-5 pb-3">
            <div
              className="rounded-2xl p-3 flex items-center justify-center"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a2e 75%), linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                backgroundColor: "#0f0f1f",
              }}
            >
              <img src={pending.filePreview} alt="" className="max-h-24 max-w-full object-contain" />
            </div>
          </div>
        )}

        {/* Remember checkbox */}
        <button
          onClick={() => setRemember(!remember)}
          className="mx-5 mb-3 flex items-center gap-2 active:scale-95"
        >
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
            remember ? "bg-emerald-500 border-emerald-500" : "border-white/30"
          }`}>
            {remember && <Check size={12} className="text-white" strokeWidth={3} />}
          </div>
          <span className="text-white/70 text-xs font-bold">تذكر اختياري للمرات القادمة</span>
        </button>

        {/* Actions */}
        <div className="p-4 pt-0 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              answerBgRemoval(false, remember);
              setRemember(false);
            }}
            className="h-12 rounded-2xl bg-white/10 border border-white/20 text-white font-black text-sm active:scale-95"
          >
            لا، احتفظ بالخلفية
          </button>
          <button
            onClick={() => {
              answerBgRemoval(true, remember);
              setRemember(false);
            }}
            className="h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-sm active:scale-95 flex items-center justify-center gap-2 shadow-lg"
          >
            <Sparkles size={16} />
            نعم، أزل الخلفية
          </button>
        </div>
      </div>
    </div>
  );
}
