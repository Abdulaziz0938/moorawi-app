// [moorawi-services] المصادقة — كاميرا + صورة شخصية
import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { smartUpload } from "../lib/uploadAssets";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header, Spinner } from "./VisitsSheet";
import { Camera, Upload, Loader2, Check, Clock, ShieldCheck, X, RotateCcw } from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props { onClose: () => void; }

export default function VerificationSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: getActiveToken() ?? deviceId });
  const submit = useMutation(api.verification.submit);

  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  if (me === undefined) {
    return (
      <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
        <Header onClose={onClose} title="المصادقة" />
        <Spinner />
      </div>
    );
  }

  const status = (me as any)?.verificationStatus;

  // ===== فتح الكاميرا =====
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 720 },
      });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (e: any) {
      dialog.alert("لم يتمكن من الوصول للكاميرا — استخدم الرفع اليدوي");
    }
  };

  // ===== إغلاق الكاميرا =====
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  // ===== التقاط صورة =====
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
    closeCamera();
  };

  // ===== رفع الملف =====
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ===== إرسال =====
  const handleSubmit = async () => {
    if (!preview) return dialog.alert("التقط صورة أولاً");
    setBusy(true);
    try {
      // حوّل dataURL → File
      const blob = await fetch(preview).then((r) => r.blob());
      const file = new File([blob], `verify-${Date.now()}.jpg`, { type: "image/jpeg" });

      const res = await smartUpload(file, { allowVideo: false });
      await submit({ imageUrl: res.url, tokenOverride: getActiveToken() ?? deviceId });
      dialog.alert("تم إرسال طلبك — سيتم المراجعة قريباً ✅");
      onClose();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإرسال");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="المصادقة" assetKey="ui.sheet.verify" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Header status */}
        <div className="text-center mb-2">
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
             "التقط صورة واضحة لوجهك للحصول على التوثيق"}
          </p>
        </div>

        {/* Only show camera when NOT approved/pending */}
        {status !== "approved" && status !== "pending" && (
          <>
            {/* Camera view */}
            {cameraOn ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <button
                  onClick={closeCamera}
                  className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
                >
                  <X size={18} />
                </button>
                <button
                  onClick={capture}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-white/50 shadow-2xl active:scale-95 transition"
                />
              </div>
            ) : preview ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPreview(null)}
                  className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Open camera */}
                <button
                  onClick={openCamera}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 py-5 text-white font-black text-base flex items-center justify-center gap-3 active:scale-95"
                >
                  <Camera size={24} />
                  افتح الكاميرا والتقط صورة
                </button>

                {/* Upload alternative */}
                <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-white/20 bg-white/5 py-4 text-center active:scale-95 transition">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                  <Upload size={22} className="text-white/50 mx-auto mb-1" />
                  <p className="text-white/60 text-xs font-black">أو ارفع صورة من الجهاز</p>
                </label>
              </div>
            )}

            {/* Submit */}
            {preview && (
              <button
                onClick={handleSubmit}
                disabled={busy}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                إرسال للمراجعة
              </button>
            )}

            {/* Info */}
            <div className="rounded-2xl bg-blue-500/10 border border-blue-400/30 p-4">
              <p className="text-blue-200 font-black text-xs mb-1.5">نصائح لصورة ناجحة</p>
              <ul className="text-blue-100/70 text-[11px] space-y-0.5 pr-3">
                <li>• إضاءة جيدة ووجهك واضح</li>
                <li>• بدون نظارات أو قبعة</li>
                <li>• لا تحمل الصورة لأشخاص آخرين</li>
              </ul>
            </div>
          </>
        )}

        {status === "pending" && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 text-center">
            <p className="text-amber-200 text-sm font-black">طلبك قيد المراجعة</p>
            <p className="text-amber-100/60 text-xs mt-1">سنتواصل معك خلال 24 ساعة</p>
          </div>
        )}
      </div>

      {/* Hidden refs */}
      <input ref={fileRef} type="file" className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
