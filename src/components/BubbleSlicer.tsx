// [moorawi-bubbles] 9-Patch Visual Slicer v2 — with auto-detect from image pixels
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import {
  Upload, Loader2, Save, Trash2, Plus, Edit3, Wand2, Percent,
} from "lucide-react";

interface Props { token: string | null; }

type Bubble = {
  _id: string; key: string; name: string; imageUrl: string;
  sliceTop: number; sliceRight: number; sliceBottom: number; sliceLeft: number;
  active: boolean;
};

const DEFAULT_FORM = {
  key: "", name: "", imageUrl: "",
  sliceTop: 30, sliceRight: 30, sliceBottom: 30, sliceLeft: 30,
};

// ── Auto-detect slices by scanning pixel variance ──
async function autoDetectSlices(url: string): Promise<{
  sliceTop: number; sliceRight: number; sliceBottom: number; sliceLeft: number;
}> {
  return new Promise((resolve) => {
    const fallback = { sliceTop: 30, sliceRight: 30, sliceBottom: 30, sliceLeft: 30 };
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const W = img.naturalWidth, H = img.naturalHeight;
        const c = document.createElement("canvas");
        c.width = W; c.height = H;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(fallback);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, W, H).data;

        const detect = (axis: "top" | "right" | "bottom" | "left") => {
          const isRow = axis === "top" || axis === "bottom";
          const len = isRow ? H : W;
          const maxScan = Math.floor(len * 0.45);
          const varArr: number[] = [];

          for (let i = 0; i < maxScan; i++) {
            const idx = axis === "top" ? i
              : axis === "bottom" ? H - 1 - i
              : axis === "left" ? i
              : W - 1 - i;

            const sStart = isRow ? Math.floor(W * 0.3) : Math.floor(H * 0.3);
            const sEnd = isRow ? Math.floor(W * 0.7) : Math.floor(H * 0.7);

            let sumR = 0, sumG = 0, sumB = 0, n = 0;
            for (let s = sStart; s < sEnd; s++) {
              const px = isRow ? s : idx;
              const py = isRow ? idx : s;
              const pi = (py * W + px) * 4;
              sumR += data[pi]; sumG += data[pi + 1]; sumB += data[pi + 2]; n++;
            }
            const avgR = sumR / n, avgG = sumG / n, avgB = sumB / n;
            let variance = 0;
            for (let s = sStart; s < sEnd; s++) {
              const px = isRow ? s : idx;
              const py = isRow ? idx : s;
              const pi = (py * W + px) * 4;
              variance += Math.abs(data[pi] - avgR) + Math.abs(data[pi + 1] - avgG) + Math.abs(data[pi + 2] - avgB);
            }
            varArr.push(variance / n);
          }

          const peak = Math.max(...varArr);
          const threshold = Math.max(15, peak * 0.35);

          for (let i = 3; i < varArr.length; i++) {
            if (varArr[i] < threshold) {
              // Cap at 20% of dimension — decorations are rarely bigger
              return Math.min(i, Math.floor(len * 0.2));
            }
          }
          return Math.floor(len * 0.15);
        };

        resolve({
          sliceTop: detect("top"),
          sliceRight: detect("right"),
          sliceBottom: detect("bottom"),
          sliceLeft: detect("left"),
        });
      } catch (e) {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = url;
  });
}

export default function BubbleSlicer({ token }: Props) {
  const bubbles = useQuery(api.bubbles.list, {});
  const setBubble = useMutation(api.bubbles.set);
  const removeBubble = useMutation(api.bubbles.remove);

  const [editing, setEditing] = useState<Bubble | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        key: editing.key, name: editing.name, imageUrl: editing.imageUrl,
        sliceTop: editing.sliceTop, sliceRight: editing.sliceRight,
        sliceBottom: editing.sliceBottom, sliceLeft: editing.sliceLeft,
      });
    }
  }, [editing]);

  // Load image dims whenever URL changes
  useEffect(() => {
    if (!form.imageUrl) { setImgDims(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setImgDims(null);
    img.src = form.imageUrl;
  }, [form.imageUrl]);

  const reset = () => {
    setEditing(null);
    setForm({ ...DEFAULT_FORM });
    setImgDims(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const runAutoDetect = async (url?: string) => {
    const target = url ?? form.imageUrl;
    if (!target) return;
    setDetecting(true);
    try {
      const slices = await autoDetectSlices(target);
      setForm((f) => ({ ...f, ...slices }));
    } finally {
      setDetecting(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadToCloudinary(file, "image");
      setForm((f) => ({ ...f, imageUrl: res.url }));
      // Auto-detect immediately after upload
      await runAutoDetect(res.url);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const applyPreset = (pct: number) => {
    if (!imgDims) return;
    setForm((f) => ({
      ...f,
      sliceTop: Math.round(imgDims.h * pct),
      sliceRight: Math.round(imgDims.w * pct),
      sliceBottom: Math.round(imgDims.h * pct),
      sliceLeft: Math.round(imgDims.w * pct),
    }));
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
        sliceTop: form.sliceTop, sliceRight: form.sliceRight,
        sliceBottom: form.sliceBottom, sliceLeft: form.sliceLeft,
        imageWidth: imgDims?.w,
        imageHeight: imgDims?.h,
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
      } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    }, "حذف", "حذف");
  };

  const previewStyle: React.CSSProperties = form.imageUrl ? {
    borderStyle: "solid",
    borderWidth: `${form.sliceTop}px ${form.sliceRight}px ${form.sliceBottom}px ${form.sliceLeft}px`,
    borderImageSource: `url("${form.imageUrl}")`,
    borderImageSlice: `${form.sliceTop} ${form.sliceRight} ${form.sliceBottom} ${form.sliceLeft} fill`,
    borderImageRepeat: "stretch",
    color: "#fff",
    display: "inline-block",
    maxWidth: 260,
    minWidth: 60,
    wordBreak: "break-word",
    fontSize: 12,
    lineHeight: 1.4,
    direction: "rtl",
  } : {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-white text-sm font-black">فقاعات الشات (9-Patch)</p>
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg bg-purple-500/25 border border-purple-400/40 text-white text-[11px] font-black flex items-center gap-1"
        >
          <Plus size={12} />{editing ? "جديد" : "تفريغ"}
        </button>
      </div>

      {/* Upload + Form */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-3">
        {/* Image + upload */}
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
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* Image dims + auto-detect */}
        {imgDims && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-white/50 text-[10px] font-mono" dir="ltr">
              {imgDims.w}×{imgDims.h}px
            </span>
            <button
              onClick={() => runAutoDetect()}
              disabled={detecting}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/40 to-pink-500/40 border border-purple-400/50 text-white text-[11px] font-black flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {detecting ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
              كشف تلقائي
            </button>
          </div>
        )}

        {/* Presets */}
        {imgDims && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white/40 text-[10px] flex items-center gap-1">
              <Percent size={10} /> نسب:
            </span>
            {[0.05, 0.08, 0.1, 0.12, 0.15].map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className="px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-white text-[10px] font-bold active:scale-95"
              >
                {p * 100}%
              </button>
            ))}
          </div>
        )}

        {/* Key + Name */}
        <div className="grid grid-cols-2 gap-2">
          <input
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="bubble.vip1"
            className="bg-black/30 border border-white/15 rounded-lg px-2.5 py-2 text-white text-xs font-mono"
            dir="ltr"
          />
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="اسم الفقاعة"
            className="bg-black/30 border border-white/15 rounded-lg px-2.5 py-2 text-white text-xs"
          />
        </div>

        {/* Sliders */}
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
              type="range" min={0} max={100} value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: parseInt(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>
        ))}

        {/* Live preview */}
        {form.imageUrl && (
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <p className="text-white/50 text-[10px] mb-2">معاينة حية</p>
            <div className="flex flex-col gap-3 items-start w-full">
              <div style={previewStyle} dir="rtl">مرحباً</div>
              <div style={previewStyle} dir="rtl">كيف حالك اليوم؟</div>
              <div style={previewStyle} dir="rtl">هذه رسالة طويلة نوعاً ما لاختبار التمدد التلقائي للنص داخل الفقاعة.</div>
              <div style={previewStyle} dir="rtl">وهذه رسالة أطول بكثير لنتأكد أن الفقاعة تتمدد بشكل جميل مع النصوص الطويلة جداً بدون تشويه للأركان الذهبية أو الزخارف الجانبية المهمة.</div>
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

      {/* List */}
      <div className="space-y-2">
        <p className="text-white/50 text-[11px]">الفقاعات ({bubbles?.length ?? 0})</p>
        {bubbles === undefined ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-white/40" />
          </div>
        ) : bubbles.length === 0 ? (
          <p className="text-white/40 text-xs text-center py-4">لا فقاعات بعد</p>
        ) : (
          bubbles.map((b) => (
            <div key={b._id} className="rounded-xl border border-white/10 bg-white/5 p-2.5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                <img src={b.imageUrl} alt="" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-black truncate">{b.name}</p>
                <p className="text-white/40 text-[10px] font-mono" dir="ltr">{b.key}</p>
                <p className="text-white/40 text-[9px] font-mono" dir="ltr">
                  {b.sliceTop}/{b.sliceRight}/{b.sliceBottom}/{b.sliceLeft}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setEditing(b as any)} className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/80">
                  <Edit3 size={12} />
                </button>
                <button onClick={() => handleDelete(b as any)} className="p-2 rounded-lg bg-red-500/25 border border-red-400/40 text-red-200">
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
