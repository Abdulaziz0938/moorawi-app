// [moorawi-bubbles] 9-Patch Visual Slicer — upload, adjust 4 insets, live preview, save
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import {
  Upload, Loader2, Save, Trash2, Plus, X, Edit3,
} from "lucide-react";

interface Props {
  token: string | null;
}

type Bubble = {
  _id: string;
  key: string;
  name: string;
  imageUrl: string;
  sliceTop: number;
  sliceRight: number;
  sliceBottom: number;
  sliceLeft: number;
  active: boolean;
};

const DEFAULT_FORM = {
  key: "",
  name: "",
  imageUrl: "",
  sliceTop: 30,
  sliceRight: 30,
  sliceBottom: 30,
  sliceLeft: 30,
};

export default function BubbleSlicer({ token }: Props) {
  const bubbles = useQuery(api.bubbles.list, {});
  const setBubble = useMutation(api.bubbles.set);
  const removeBubble = useMutation(api.bubbles.remove);

  const [editing, setEditing] = useState<Bubble | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Update form when editing changes
  useEffect(() => {
    if (editing) {
      setForm({
        key: editing.key,
        name: editing.name,
        imageUrl: editing.imageUrl,
        sliceTop: editing.sliceTop,
        sliceRight: editing.sliceRight,
        sliceBottom: editing.sliceBottom,
        sliceLeft: editing.sliceLeft,
      });
    }
  }, [editing]);

  const reset = () => {
    setEditing(null);
    setForm({ ...DEFAULT_FORM });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadToCloudinary(file, "image");
      setForm((f) => ({ ...f, imageUrl: res.url }));
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return dialog.alert("أدخل اسم الفقاعة");
    if (!form.key.trim()) return dialog.alert("أدخل المفتاح (مثل bubble.vip4)");
    if (!form.imageUrl) return dialog.alert("ارفع صورة أولاً");

    setBusy(true);
    try {
      await setBubble({
        id: editing?._id as any,
        key: form.key.trim(),
        name: form.name.trim(),
        imageUrl: form.imageUrl,
        sliceTop: form.sliceTop,
        sliceRight: form.sliceRight,
        sliceBottom: form.sliceBottom,
        sliceLeft: form.sliceLeft,
        active: true,
        tokenOverride: token ?? undefined,
      });
      dialog.alert(editing ? "تم التحديث" : "تمت الإضافة");
      reset();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (b: Bubble) => {
    dialog.confirm(`حذف "${b.name}"؟`, async () => {
      try {
        await removeBubble({ id: b._id as any, tokenOverride: token ?? undefined });
        if (editing?._id === b._id) reset();
      } catch (e: any) {
        dialog.alert(e?.message || "فشل الحذف");
      }
    }, "حذف", "حذف");
  };

  // Preview style — 9-patch via border-image
  const previewStyle: React.CSSProperties = form.imageUrl
    ? {
        borderStyle: "solid",
        borderWidth: `${form.sliceTop}px ${form.sliceRight}px ${form.sliceBottom}px ${form.sliceLeft}px`,
        borderImageSource: `url("${form.imageUrl}")`,
        borderImageSlice: `${form.sliceTop} ${form.sliceRight} ${form.sliceBottom} ${form.sliceLeft} fill`,
        borderImageRepeat: "stretch",
        color: "#fff",
        padding: "6px 10px",
        maxWidth: 260,
        minWidth: 100,
        wordBreak: "break-word",
        fontSize: 14,
        display: "inline-block",
      }
    : {};

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <p className="text-white text-sm font-black">
          فقاعات الشات (9-Patch)
        </p>
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg bg-purple-500/25 border border-purple-400/40 text-white text-[11px] font-black flex items-center gap-1 active:scale-95"
        >
          <Plus size={12} />
          {editing ? "جديد" : "تفريغ"}
        </button>
      </div>

      {/* ── Upload + Form ── */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-3">
        {/* Image */}
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
            {uploading ? (
              <Loader2 size={18} className="animate-spin text-white/50" />
            ) : form.imageUrl ? (
              <img src={form.imageUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-white/30 text-[9px]">لا صورة</span>
            )}
          </div>
          <label className="flex-1 py-2 rounded-xl bg-blue-500/25 border border-blue-400/40 text-white text-xs font-black cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition">
            <Upload size={13} />
            {form.imageUrl ? "استبدال الصورة" : "رفع صورة 9-patch"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* Key + Name */}
        <div className="grid grid-cols-2 gap-2">
          <input
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="المفتاح (bubble.vip4)"
            className="bg-black/30 border border-white/15 rounded-lg px-2.5 py-2 text-white text-xs"
            dir="ltr"
          />
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="الاسم"
            className="bg-black/30 border border-white/15 rounded-lg px-2.5 py-2 text-white text-xs"
          />
        </div>

        {/* 4 Sliders */}
        {(["sliceTop", "sliceRight", "sliceBottom", "sliceLeft"] as const).map((k) => (
          <div key={k}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/60 text-[10px] font-bold">
                {k === "sliceTop" ? "العلوي" : k === "sliceRight" ? "الأيمن" : k === "sliceBottom" ? "السفلي" : "الأيسر"}
              </span>
              <span className="text-cyan-300 text-[10px] font-black tabular-nums" dir="ltr">
                {form[k]}px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: parseInt(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>
        ))}

        {/* Live preview */}
        {form.imageUrl && (
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <p className="text-white/50 text-[10px] mb-2">معاينة حية</p>
            <div style={previewStyle}>
              مرحباً! هذه فقاعة اختبار لمعاينة التمدد التلقائي.
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={busy || uploading || !form.imageUrl}
          className="w-full py-2.5 rounded-xl bg-emerald-500/25 border border-emerald-400/40 text-white text-sm font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {editing ? "تحديث الفقاعة" : "حفظ الفقاعة"}
        </button>
      </div>

      {/* ── List ── */}
      <div className="space-y-2">
        <p className="text-white/50 text-[11px]">
          الفقاعات ({bubbles?.length ?? 0})
        </p>
        {bubbles === undefined ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-white/40" />
          </div>
        ) : bubbles.length === 0 ? (
          <p className="text-white/40 text-xs text-center py-4">
            لا فقاعات بعد
          </p>
        ) : (
          bubbles.map((b) => (
            <div
              key={b._id}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                <img src={b.imageUrl} alt="" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-black truncate">{b.name}</p>
                <p className="text-white/40 text-[10px] font-mono" dir="ltr">{b.key}</p>
                <p className="text-white/40 text-[9px] font-mono" dir="ltr">
                  {b.sliceTop} {b.sliceRight} {b.sliceBottom} {b.sliceLeft}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditing(b as any)}
                  className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/80"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  onClick={() => handleDelete(b as any)}
                  className="p-2 rounded-lg bg-red-500/25 border border-red-400/40 text-red-200"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
