// [ezo-admin] GiftsAdmin — EXTRACTED VERBATIM from SettingsSheet
// Moved here to be reused from AdminPanelSheet without modifying logic.
// Zero changes to createGift/removeGift/listAllAdmin or DB schema.

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { smartUpload } from "../lib/uploadAssets";
import { processImage } from "../lib/imageProcessor";
import { dialog } from "../lib/dialog";
import { X, Loader2, Globe, Music, Heart, Video, Gift, Coins } from "lucide-react";
import { getActiveToken } from "../lib/session";

export default function GiftsAdmin() {
  const deviceId = getDeviceId();
  const gifts = useQuery(api.gifts.listAllAdmin, { tokenOverride: getActiveToken() ?? deviceId });
  const createGift = useMutation(api.gifts.createGift);
  const removeGift = useMutation(api.gifts.removeGift);

  const [name, setName] = useState("");
  const [price, setPrice] = useState(100);
  const [category, setCategory] = useState("classic");
  const [multipliersInput, setMultipliersInput] = useState("1,5,10,20");
  const [probabilitiesInput, setProbabilitiesInput] = useState("85,10,4,1");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [forceGlobal, setForceGlobal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!name.trim() || !mediaFile || price < 1) {
      dialog.alert("أكمل البيانات (اسم + سعر + ملف)");
      return;
    }
    setUploading(true);
    try {
      const uploadResult = await smartUpload(mediaFile, {
        category: "gift",
        allowVideo: true,
      });
      const mediaType = uploadResult.mediaType;
      const result = {
        url: uploadResult.url,
        originalUrl: uploadResult.originalUrl,
        publicId: "",
        resourceType: mediaType,
        format: uploadResult.format,
        bytes: uploadResult.size,
      };
      await createGift({
        name: name.trim(),
        price,
        category,
        mediaUrl: result.url,
        mediaType,
        forceGlobal,
        isLucky: category === "lucky",
        luckyMultipliers: category === "lucky" ? (() => {
          const mults = multipliersInput.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
          const probs = probabilitiesInput.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
          return mults.map((m, i) => ({ multiplier: m, probability: probs[i] || 0 }));
        })() : undefined,
        tokenOverride: getActiveToken() ?? deviceId,
      });
      setName(""); setPrice(100); setCategory("classic");
      setForceGlobal(false);
      setMediaFile(null);
      if (mediaRef.current) mediaRef.current.value = "";
      dialog.alert("✅ تم إضافة الهدية");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" dir="rtl">
      <div className="bg-white/5 rounded-2xl p-4 space-y-3">
        <h3 className="text-white text-sm font-bold">إضافة هدية جديدة</h3>
        <input type="text" placeholder="اسم الهدية" value={name} onChange={(e) => setName(e.target.value)} maxLength={30}
          className="w-full bg-white/10 border border-white/20 rounded-xl p-2.5 outline-none focus:border-white text-white text-sm" />
        <input type="number" placeholder="السعر" value={price} onChange={(e) => setPrice(Number(e.target.value))} min={1}
          className="w-full bg-white/10 border border-white/20 rounded-xl p-2.5 outline-none focus:border-white text-white text-sm" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-xl p-2.5 outline-none focus:border-white text-white text-sm">
          <option value="classic" className="text-black">كلاسيكي</option>
          <option value="vip" className="text-black">VIP</option>
          <option value="relation" className="text-black">العلاقة</option>
          <option value="fun" className="text-black">مرح</option>
          <option value="country" className="text-black">الدولة</option>
          <option value="lucky" className="text-black">محظوظ</option>
        </select>
        {category === "lucky" && (
          <div className="space-y-2 bg-yellow-500/5 p-2 rounded-xl border border-yellow-500/20">
            <p className="text-yellow-300 text-[10px]">المضاعفات والاحتمالات (مفصولة بفواصل)</p>
            <input type="text" placeholder="المضاعفات (مثال: 1,5,10,20)" value={multipliersInput} onChange={(e) => setMultipliersInput(e.target.value)}
              className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 outline-none focus:border-yellow-400 text-yellow-300 text-xs" />
            <input type="text" placeholder="الاحتمالات % (مثال: 85,10,4,1)" value={probabilitiesInput} onChange={(e) => setProbabilitiesInput(e.target.value)}
              className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 outline-none focus:border-yellow-400 text-yellow-300 text-xs" />
          </div>
        )}

        <label className="block cursor-pointer">
          <input ref={mediaRef} type="file" accept="image/*,video/webm,video/mp4,video/quicktime,video/x-matroska"
            onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)} className="hidden" />
          <div className="w-full p-2.5 bg-white/10 border-2 border-dashed border-white/30 rounded-xl text-center text-white text-xs hover:bg-white/15">
            {mediaFile ? <span className="inline-flex items-center gap-1"><Video size={14} /> {mediaFile.name}</span> : "اختر صورة / فيديو الهدية"}
          </div>
        </label>

        <label className="flex items-center gap-2 cursor-pointer bg-white/5 p-2 rounded-xl">
          <input
            type="checkbox"
            checked={forceGlobal}
            onChange={(e) => setForceGlobal(e.target.checked)}
            className="w-4 h-4 accent-purple-600"
          />
          <span className="text-white text-[11px] inline-flex items-center gap-1"><Globe size={12} /> فرض البانر العالمي (كل الغرف)</span>
        </label>

        <div className="text-white/50 text-[10px] bg-black/30 p-2 rounded-lg space-y-0.5">
          <p>تُضاف الرموز تلقائياً:</p>
          <p className="inline-flex items-center gap-1"><Music size={11} /> تلقائياً للفيديو</p>
          <p className="inline-flex items-center gap-1"><Globe size={11} /> إذا السعر ≥ 30000 (أو بالخيار أعلاه)</p>
          <p className="inline-flex items-center gap-1"><Heart size={11} /> تلقائياً إذا التصنيف "العلاقة"</p>
        </div>

        <button onClick={handleUpload} disabled={uploading}
          className="w-full bg-purple-600 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : null}
          {uploading ? "جاري الرفع..." : "إضافة"}
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-white/70 text-xs">الهدايا الحالية ({gifts?.length ?? 0})</h3>
        {gifts === undefined ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white/40" size={20} /></div>
        ) : gifts.length === 0 ? (
          <p className="text-white/40 text-xs text-center py-4">لا توجد هدايا بعد</p>
        ) : (
          gifts.map((g: any) => (
            <div key={g._id} className="flex items-center gap-3 bg-white/5 rounded-xl p-2">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center flex-shrink-0">
                {g.mediaType === "video" ? (
                  <video src={g.mediaUrl ?? undefined} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                ) : g.mediaUrl ? (
                  <img src={g.mediaUrl ?? undefined} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Gift size={22} className="text-pink-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{g.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-yellow-400 text-[10px]">{g.price} <Coins size={10} className="inline text-amber-400" /></p>
                  {g.isGlobal && <Globe size={10} className="text-blue-400" />}
                  {g.hasSound && <Music size={10} className="text-purple-400" />}
                  {g.isRelationship && <Heart size={10} className="text-pink-400 fill-pink-400" />}
                </div>
              </div>
              <button onClick={() => { dialog.confirm("حذف هذه الهدية؟", () => { removeGift({ giftId: g._id, tokenOverride: getActiveToken() ?? deviceId }).catch((e) => dialog.alert(e?.message)); }); }}
                className="p-2 text-red-400 hover:bg-red-500/20 rounded-full">
                <X size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
