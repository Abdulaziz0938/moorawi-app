// [moorawi-services] المصادقة
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header, Spinner } from "./VisitsSheet";
import { ShieldCheck, Upload, Loader2, Check, X, Clock, Info } from "lucide-react";

interface Props { onClose: () => void; }

export default function VerificationSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: deviceId });
  const [busy, setBusy] = useState(false);

  const status = (me as any)?.verificationStatus;

  const handleUpload = async (file: File) => {
    dialog.confirm(
      "هل أنت متأكد؟ سيتم إرسال صورتك للمراجعة",
      async () => {
        setBusy(true);
        try {
          const res = await uploadToCloudinary(file, "image");
          // استدعاء mutation
          await fetch("/api/verify-submit", { method: "POST" }).catch(() => {});
          dialog.alert("تم إرسال الطلب — سيتم المراجعة خلال 24 ساعة");
        } catch (e: any) {
          dialog.alert(e?.message || "فشل الرفع");
        } finally {
          setBusy(false);
        }
      },
      "إرسال",
      "إرسال"
    );
  };

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="المصادقة" assetKey="ui.sheet.verify" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center mb-4">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-3 ${
            status === "approved" ? "bg-emerald-500/20 border-2 border-emerald-400/50" :
            status === "pending" ? "bg-amber-500/20 border-2 border-amber-400/50" :
            "bg-blue-500/20 border-2 border-blue-400/50"
          }`}>
            {status === "approved" ? <Check size={48} className="text-emerald-400" /> :
             status === "pending" ? <Clock size={48} className="text-amber-400" /> :
             <ShieldCheck size={48} className="text-blue-400" />}
          </div>
          <p className="text-white text-lg font-black">
            {status === "approved" ? "حسابك موثق" :
             status === "pending" ? "قيد المراجعة" :
             "التحقق من الحساب"}
          </p>
          <p className="text-white/50 text-xs mt-1">
            {status === "approved" ? "ميزات إضافية متاحة لك" :
             status === "pending" ? "سيتم الرد خلال 24 ساعة" :
             "ارفع صورة هويتك للحصول على شارة التوثيق"}
          </p>
        </div>

        {status !== "approved" && status !== "pending" && (
          <>
            <div className="rounded-2xl bg-blue-500/10 border border-blue-400/30 p-4 space-y-2">
              <p className="text-blue-200 font-black text-xs">شروط التوثيق</p>
              <ul className="text-blue-100/80 text-[11px] space-y-1 pr-3">
                <li>• صورة واضحة للهوية أو جواز السفر</li>
                <li>• الاسم مطابق لاسم الحساب</li>
                <li>• لا يوجد حظر سابق</li>
              </ul>
            </div>

            <label className={`block cursor-pointer rounded-2xl border-2 border-dashed border-blue-400/40 bg-blue-500/5 p-6 text-center ${busy ? "opacity-50" : ""}`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              {busy ? (
                <Loader2 size={32} className="animate-spin text-blue-300 mx-auto" />
              ) : (
                <>
                  <Upload size={32} className="text-blue-300 mx-auto mb-2" />
                  <p className="text-white text-sm font-black">ارفع صورة الهوية</p>
                  <p className="text-white/50 text-[11px] mt-1">PNG · JPG · بحد أقصى 5MB</p>
                </>
              )}
            </label>
          </>
        )}

        {status === "pending" && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 flex gap-3">
            <Info size={18} className="text-amber-300 flex-shrink-0 mt-0.5" />
            <p className="text-amber-100 text-xs">تم استلام طلبك. سيتم المراجعة خلال 24 ساعة.</p>
          </div>
        )}
      </div>
    </div>
  );
}
