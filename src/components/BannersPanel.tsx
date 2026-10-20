// [moorawi-banners] Admin panel for promotional banners
import { useState } from "react";
import AssetVideo from "./ui/AssetVideo";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { uploadToCloudinary } from "../lib/cloudinary";
import { smartUpload } from "../lib/uploadAssets";
import { dialog } from "../lib/dialog";
import { Plus, Loader2, Save, Trash2, Upload, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";

interface Props { token: string | null; }

type Banner = {
  _id: string;
  imageUrl: string;
  title?: string;
  actionType?: "none" | "open_room" | "open_live" | "open_url" | "open_shop" | "open_vip";
  actionPayload?: string;
  order: number;
  active: boolean;
};

export default function BannersPanel({ token }: Props) {
  const banners = useQuery(api.banners.listAll);
  const setBanner = useMutation(api.banners.set);
  const removeBanner = useMutation(api.banners.remove);

  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState({ imageUrl: "", title: "", order: 0, actionType: "none" as "none" | "open_room" | "open_live" | "open_url" | "open_shop" | "open_vip", actionPayload: "" });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setEditing(null);
    setForm({ imageUrl: "", title: "", order: (banners?.length ?? 0), actionType: "none", actionPayload: "" });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await smartUpload(file, { allowVideo: true });
      setForm((f) => ({ ...f, imageUrl: res.url }));
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.imageUrl) return dialog.alert("ارفع صورة أولاً");
    setBusy(true);
    try {
      await setBanner({
        id: editing?._id as any,
        imageUrl: form.imageUrl,
        title: form.title.trim() || undefined,
        actionType: form.actionType,
        actionPayload: form.actionPayload.trim() || undefined,
        order: form.order,
        active: true,
        tokenOverride: token ?? undefined,
      });
      dialog.alert(editing ? "تم التحديث" : "تمت الإضافة");
      reset();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (b: Banner) => {
    dialog.confirm(`حذف البانر؟`, async () => {
      try {
        await removeBanner({ id: b._id as any, tokenOverride: token ?? undefined });
      } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    }, "حذف", "حذف");
  };

  const handleToggleActive = async (b: Banner) => {
    try {
      await setBanner({
        id: b._id as any,
        imageUrl: b.imageUrl,
        title: b.title,
        order: b.order,
        active: !b.active,
        tokenOverride: token ?? undefined,
      });
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
  };

  const handleMove = async (b: Banner, dir: -1 | 1) => {
    const newOrder = Math.max(0, b.order + dir);
    try {
      await setBanner({
        id: b._id as any,
        imageUrl: b.imageUrl,
        title: b.title,
        order: newOrder,
        active: b.active,
        tokenOverride: token ?? undefined,
      });
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Add new banner */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-sm font-black">
            {editing ? `تعديل: ${editing.title || "بانر"}` : "إضافة بانر جديد"}
          </h3>
          {editing && (
            <button onClick={reset} className="text-white/60 text-xs">
              إلغاء
            </button>
          )}
        </div>

        {/* Image */}
        <label className={`block cursor-pointer rounded-xl border-2 border-dashed ${form.imageUrl ? "border-emerald-400/40" : "border-white/20"} bg-black/30 overflow-hidden transition`}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <div className="aspect-video flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-white/60" />
            </div>
          ) : form.imageUrl ? (
            <img src={form.imageUrl} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center gap-2 text-white/60">
              <Upload size={28} />
              <span className="text-xs">ارفع صورة (16:9)</span>
            </div>
          )}
        </label>

        {/* Title */}
        <input
          type="text"
          placeholder="عنوان البانر (اختياري)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        />

        {/* Order */}
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs">الترتيب</span>
          <input
            type="number"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm tabular-nums"
          />
        </div>
          {/* Action Type */}
          <div className="mt-3">
            <label className="block text-white/70 text-xs font-black mb-1.5">الإجراء عند الضغط</label>
            <select
              value={form.actionType}
              onChange={(e) => setForm({ ...form, actionType: e.target.value as any })}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
            >
              <option value="none">بدون إجراء</option>
              <option value="open_room">فتح غرفة</option>
              <option value="open_live">فتح بث مباشر</option>
              <option value="open_url">فتح رابط</option>
              <option value="open_shop">فتح المتجر</option>
              <option value="open_vip">فتح VIP</option>
            </select>
          </div>
          {form.actionType !== "none" && (
            <div className="mt-2">
              <label className="block text-white/70 text-xs font-black mb-1.5">
                {form.actionType === "open_url" ? "الرابط" : form.actionType === "open_room" || form.actionType === "open_live" ? "معرّف الغرفة/البث" : "القيمة (اختياري)"}
              </label>
              <input
                value={form.actionPayload}
                onChange={(e) => setForm({ ...form, actionPayload: e.target.value })}
                placeholder={form.actionType === "open_url" ? "https://..." : "room id"}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
                dir="ltr"
              />
            </div>
          )}


        <button
          onClick={handleSave}
          disabled={busy || uploading || !form.imageUrl}
          className="w-full rounded-xl bg-purple-600 py-2.5 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {editing ? "حفظ التعديلات" : "إضافة"}
        </button>
      </div>

      {/* Existing banners */}
      <div className="space-y-2">
        <h3 className="text-white/70 text-xs font-black">
          البانرات الحالية ({banners?.length ?? 0})
        </h3>
        {banners === undefined ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-white/40" />
          </div>
        ) : banners.length === 0 ? (
          <p className="text-white/40 text-xs text-center py-4">لا توجد بانرات</p>
        ) : (
          banners.map((b: Banner) => (
            <div key={b._id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
              <div className="w-20 h-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                <AssetVideo url={b.imageUrl} type="auto" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-black truncate">{b.title || "(بدون عنوان)"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white/40 text-[10px]">ترتيب {b.order}</span>
                  {b.active ? (
                    <span className="text-emerald-400 text-[10px] font-bold">● نشط</span>
                  ) : (
                    <span className="text-red-400 text-[10px] font-bold">● معطّل</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleMove(b, -1)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70">
                  <ChevronUp size={12} />
                </button>
                <button onClick={() => handleMove(b, 1)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70">
                  <ChevronDown size={12} />
                </button>
                <button onClick={() => handleToggleActive(b)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70">
                  {b.active ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button onClick={() => { setEditing(b); setForm({ imageUrl: b.imageUrl, title: b.title || "", order: b.order, actionType: ((b as any).actionType ?? "none") as any, actionPayload: ((b as any).actionPayload ?? "") }); }} className="p-1.5 rounded-lg bg-blue-500/25 border border-blue-400/40 text-blue-200">
                  <Upload size={12} />
                </button>
                <button onClick={() => handleDelete(b)} className="p-1.5 rounded-lg bg-red-500/25 border border-red-400/40 text-red-200">
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
