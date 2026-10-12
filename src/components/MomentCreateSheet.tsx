// [ezo-moments] إنشاء منشور
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import { X, Plus, Loader2, Send, Image as ImageIcon } from "lucide-react";

interface Props { onClose: () => void; }

export default function MomentCreateSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const create = useMutation(api.moments.create);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const remaining = 9 - images.length;
      const list = Array.from(files).slice(0, remaining);
      const urls: string[] = [];
      for (const f of list) {
        const res = await uploadToCloudinary(f, "image");
        urls.push(res.url);
      }
      setImages((prev) => [...prev, ...urls]);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    if (!text.trim() && images.length === 0) return dialog.alert("أضف نصاً أو صورة");
    setBusy(true);
    try {
      await create({ text: text.trim() || undefined, imageUrls: images, tokenOverride: deviceId });
      dialog.alert("تم نشر اللحظة ✅");
      onClose();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل النشر");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95">
          <X size={20} />
        </button>
        <h2 className="text-white text-base font-black">لحظة جديدة</h2>
        <button
          onClick={handlePost}
          disabled={busy || uploading || (!text.trim() && images.length === 0)}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-black disabled:opacity-40 active:scale-95 flex items-center gap-1.5"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          نشر
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="بمَ تفكر؟"
          maxLength={500}
          rows={5}
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 text-sm outline-none focus:border-emerald-400/50 resize-none"
        />

        {/* Images grid */}
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-black/40">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {images.length < 9 && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = ""; }}
                disabled={uploading}
              />
              {uploading ? <Loader2 size={20} className="animate-spin text-white/40" /> : (
                <>
                  <Plus size={24} className="text-white/40" />
                  <span className="text-white/40 text-[10px] mt-1">{images.length}/9</span>
                </>
              )}
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
