// [ezo-live] بدء البث المباشر — يتحقق من الأهلية
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getDeviceId } from "../../lib/device";
import { getActiveToken } from "../../lib/session";
import { dialog } from "../../lib/dialog";
import {
  X, Loader2, Radio, Camera, AlertCircle, Sparkles,
} from "lucide-react";
import { smartUpload } from "../../lib/uploadAssets";

interface Props {
  onClose: () => void;
  onStarted: (streamId: string) => void;
}

export default function LiveSetupSheet({ onClose, onStarted }: Props) {
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;
  const me = useQuery(api.profiles.me, { tokenOverride: token });
  const createStream = useMutation(api.live.createStream);

  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Ahlia check
  const canGoLive =
    me?.gender === "female" && me?.verificationStatus === "approved";

  const handleCoverPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await smartUpload(file, { allowVideo: false });
      setCoverUrl(res.url);
    } catch (err: any) {
      dialog.alert(err?.message || "فشل رفع الغلاف");
    } finally {
      setUploading(false);
    }
  };

  const handleStart = async () => {
    if (!canGoLive) {
      dialog.alert("البث المباشر متاح للإناث الموثقات فقط");
      return;
    }
    if (!title.trim()) {
      dialog.alert("اكتبي عنوان البث");
      return;
    }
    setBusy(true);
    try {
      const res = await createStream({
        title: title.trim(),
        coverUrl: coverUrl ?? undefined,
        tokenOverride: token,
      });
      onStarted(res.streamId);
    } catch (err: any) {
      dialog.alert(err?.message || "فشل بدء البث");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-end"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-md mx-auto rounded-t-3xl bg-gradient-to-b from-slate-900 to-black max-h-[90dvh] overflow-y-auto border-t border-red-400/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center">
              <Radio size={18} className="text-red-400" />
            </div>
            <h2 className="text-white text-base font-black">بدء بث مباشر</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Not eligible banner */}
        {!canGoLive && (
          <div className="mx-4 mt-4 p-3 rounded-2xl bg-red-500/10 border border-red-400/40 flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-white/90 text-xs">
              <div className="font-black mb-1">غير مؤهلة للبث المباشر</div>
              <div className="text-white/60">
                {me?.gender !== "female"
                  ? "البث المباشر متاح للإناث فقط"
                  : me?.verificationStatus !== "approved"
                  ? "يجب توثيق حسابك أولاً"
                  : "غير معروف"}
              </div>
            </div>
          </div>
        )}

        {/* Cover preview */}
        <div className="mx-4 mt-4">
          <div className="text-white/60 text-[11px] font-black mb-2">صورة الغلاف (اختياري)</div>
          <label className="block w-full aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-white/20 bg-white/5 active:scale-95 transition cursor-pointer relative">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/40">
                {uploading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={28} />
                    <span className="text-[10px] font-black">اضغطي لرفع غلاف</span>
                  </>
                )}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverPick}
              className="hidden"
              disabled={uploading}
            />
          </label>
          {coverUrl && (
            <button
              onClick={() => setCoverUrl(null)}
              className="mt-2 text-[10px] text-red-400 font-bold"
            >
              حذف الغلاف
            </button>
          )}
        </div>

        {/* Title */}
        <div className="mx-4 mt-4">
          <div className="text-white/60 text-[11px] font-black mb-2">عنوان البث</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: دردشة مسائية ☕"
            maxLength={60}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-red-400/60"
          />
          <div className="text-white/40 text-[9px] text-left mt-1">
            {title.length}/60
          </div>
        </div>

        {/* Tips */}
        <div className="mx-4 mt-4 p-3 rounded-2xl bg-amber-500/5 border border-amber-400/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={14} className="text-amber-300" />
            <span className="text-amber-200 text-[11px] font-black">تلميحات</span>
          </div>
          <ul className="text-white/70 text-[10px] space-y-1 list-disc list-inside pr-1">
            <li>الإضاءة الجيدة تحسّن تجربة المشاهدين</li>
            <li>يمكنك دعوة مذيعة أخرى لمنافسة PK</li>
            <li>الهدايا تزيد ترتيبك في التصنيفات</li>
          </ul>
        </div>

        {/* Start button */}
        <div className="p-4 pb-8 mt-4">
          <button
            onClick={handleStart}
            disabled={!canGoLive || busy || uploading || !title.trim()}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-black text-sm shadow-2xl active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Radio size={20} />
                بدء البث الآن
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
