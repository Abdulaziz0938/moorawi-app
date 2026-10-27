// [ezo-reports] نافذة الإبلاغ عن مستخدم
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import { dialog } from "../lib/dialog";
import { X, AlertTriangle, Loader2, Check } from "lucide-react";

interface Props {
  userId: Id<"users">;
  userName: string;
  roomId?: Id<"rooms">;
  messageId?: Id<"messages">;
  onClose: () => void;
}

const REASONS = [
  "تحرش / مضايقة",
  "محتوى غير لائق",
  "انتحال شخصية",
  "إعلانات / سبام",
  "أخرى",
];

export default function ReportSheet({ userId, userName, roomId, messageId, onClose }: Props) {
  useBackButton(true, onClose);
  const submit = useMutation(api.reports.submit);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      dialog.alert("اختر سبباً أولاً");
      return;
    }
    setBusy(true);
    try {
      await submit({
        targetUserId: userId,
        reason,
        details: details.trim() || undefined,
        roomId,
        messageId,
        tokenOverride: getActiveToken(),
      });
      dialog.alert("✅ تم إرسال الإبلاغ — شكراً لك");
      onClose();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإرسال");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex items-end" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gradient-to-b from-slate-900 to-black rounded-t-3xl border-t border-red-400/40 max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-white text-base font-black">إبلاغ عن {userName}</h3>
              <p className="text-white/50 text-[10px]">سيتم مراجعة الإبلاغ من الإدارة</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-white/60 text-xs px-1 mb-1">اختر سبب الإبلاغ</p>
          {REASONS.map((r) => {
            const sel = reason === r;
            return (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full h-12 rounded-2xl border flex items-center justify-between px-4 active:scale-[0.99] transition ${
                  sel
                    ? "bg-red-500/20 border-red-400/60 text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <span className="text-sm font-black">{r}</span>
                {sel && (
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}

          <div className="pt-2">
            <p className="text-white/60 text-xs px-1 mb-2">تفاصيل إضافية (اختياري)</p>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اشرح ما حدث..."
              rows={3}
              maxLength={500}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white text-sm outline-none resize-none focus:border-red-400/40 placeholder:text-white/30"
            />
          </div>

          <p className="text-white/40 text-[10px] text-center leading-relaxed pt-1">
            الإبلاغ الكاذب قد يؤدي إلى تقييد حسابك
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSubmit}
            disabled={busy || !reason}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-500 to-red-700 text-white font-black text-sm active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <AlertTriangle size={16} />
                إرسال الإبلاغ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
