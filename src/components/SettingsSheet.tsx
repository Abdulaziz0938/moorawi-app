import { useRef, useState } from "react";
import { useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import {
  X, Sparkles, Palette, LayoutGrid, Settings, Lock,
  Briefcase, Activity, Music, Coins, MessageCircle,
  Wand2, Gift, Volume2, Mic2, ImageIcon, Monitor, VolumeX, Check, Loader2, Globe, Heart, Hand,
} from "lucide-react";

export const LAYOUT_ROWS: Record<string, number[]> = { "m1": [1], "m2": [2], "m3": [3], "m5": [2,3], "m7": [1,6], "m18": [6,6,6], "m24": [6,6,6,6], "m12b": [6,6] };

const LAYOUT_OPTIONS: { key: string; label: string }[] = [
  { key: "m1",   label: "1 مايك" },
  { key: "m2",   label: "2 مايك" },
  { key: "m3",   label: "3 مايك" },
  { key: "m5",   label: "5 مايك" },
  { key: "m7",   label: "7 مايك" },
  { key: "m18",  label: "18 مايك (6×3)" },
  { key: "m24",  label: "24 مايك (6×4)" },
  { key: "m12b", label: "12 مايك (6×2)" },
];

interface Props {
  roomId: Id<"rooms">;
  currentLayout: string;
  isOwnerOrMod: boolean;
  currentName: string;
  currentWelcome: string;
  currentCoverUrl: string | null;
  micRequestsEnabled: boolean;
  onClose: () => void;
  onOpenActivity?: () => void;
}

type Tab = "main" | "layout" | "editRoom" | "background" | "gifts";

function LayoutPreview({ layoutKey }: { layoutKey: string }) {
  const rows = LAYOUT_ROWS[layoutKey] ?? [6, 6, 6];
  return (
    <div className="flex flex-col items-center gap-0.5">
      {rows.map((count, i) => (
        <div key={i} className="flex gap-0.5">
          {Array.from({ length: count }).map((_, j) => (
            <div key={j} className="w-1.5 h-1.5 rounded-full bg-white/50" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function SettingsSheet({
  roomId, currentLayout, isOwnerOrMod, currentName, currentWelcome, currentCoverUrl, micRequestsEnabled, onClose, onOpenActivity,
}: Props) {
  const deviceId = getDeviceId();
  const updateLayout = useMutation(api.rooms.updateLayout);
  const updateRoomInfo = useMutation(api.rooms.updateRoomInfo);
  const updateBackground = useMutation(api.rooms.updateRoomBackground);
  const setMicRequestsEnabledMutation = useMutation(api.mics.setMicRequestsEnabled);
  const [localMicReqEnabled, setLocalMicReqEnabled] = useState<boolean>(micRequestsEnabled);
  const [micReqSaving, setMicReqSaving] = useState(false);

  const handleToggleMicRequests = async () => {
    if (!isOwnerOrMod || micReqSaving) return;
    const next = !localMicReqEnabled;
    setMicReqSaving(true);
    try {
      await setMicRequestsEnabledMutation({ roomId, enabled: next, tokenOverride: deviceId });
      setLocalMicReqEnabled(next);
    } catch (e: any) {
      dialog.alert(e?.message || "خطأ");
    } finally {
      setMicReqSaving(false);
    }
  };
  
  const [tab, setTab] = useState<Tab>("main");
  const [name, setName] = useState(currentName);
  const [welcome, setWelcome] = useState(currentWelcome);
  const [coverUrl, setCoverUrl] = useState(currentCoverUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const handleLayoutChange = async (layout: string) => {
    try { await updateLayout({ roomId, micLayout: layout, tokenOverride: deviceId }); }
    catch (e: any) { dialog.alert(e?.message || "خطأ"); }
  };

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, "image");
      await updateRoomInfo({ roomId, coverUrl: result.url, tokenOverride: deviceId });
      setCoverUrl(result.url);
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setUploading(false); }
  };

  const handleBackgroundUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, "image");
      await updateBackground({ roomId, backgroundUrl: result.url, tokenOverride: deviceId });
      dialog.alert("تم تغيير الخلفية");
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setUploading(false); }
  };

  const handleSaveRoomInfo = async () => {
    setSaving(true);
    try { await updateRoomInfo({ roomId, name, welcomeMessage: welcome, tokenOverride: deviceId }); dialog.alert("تم الحفظ"); }
    catch (e: any) { dialog.alert(e?.message || "خطأ"); }
    finally { setSaving(false); }
  };

  const items = [
    { icon: Sparkles, label: "الديكور", key: "deco" },
    { icon: Palette, label: "الخلفية", key: "background" },
    { icon: LayoutGrid, label: "التخطيط", key: "layout" },
    { icon: Settings, label: "تعديل الغرفة", key: "editRoom" },
    { icon: Lock, label: "قفل", key: "lock" },
    { icon: Briefcase, label: "وظيفة", key: "role" },
    { icon: Activity, label: "نشاط الغرفة", key: "activity" },
    { icon: Music, label: "موسيقى", key: "music" },
    { icon: Coins, label: "صرف", key: "spend" },
    { icon: Gift, label: "إدارة الهدايا", key: "gifts" },
  ];

  const quickTools = [
    { icon: MessageCircle, label: "الدردشة الموجزة", key: "mini-chat" },
    { icon: Wand2, label: "تأثيرات المركبة", key: "car-effects" },
    { icon: Gift, label: "تأثيرات الهدية", key: "gift-effects" },
    { icon: Volume2, label: "كتم الصوت", key: "mute" },
    { icon: Mic2, label: "مغير الصوت", key: "voice-changer" },
    { icon: ImageIcon, label: "عملية الخلفية", key: "bg-process" },
    { icon: Monitor, label: "تشغيل الشاشة دوماً", key: "always-on" },
    { icon: VolumeX, label: "عازل صوت", key: "noise-cancel" },
  ];

  // [moorawi-security] الأزرار المتاحة لجميع المستخدمين (شخصية فقط)
  const personalKeys = ["mini-chat", "mute", "voice-changer", "always-on", "noise-cancel"];

  const handleItemClick = (key: string) => {
    // حماية: أي زر غير شخصي = owner/mod فقط
    if (!isOwnerOrMod && !personalKeys.includes(key)) {
      dialog.alert("للمالك/المشرف فقط");
      return;
    }

    if (key === "layout") setTab("layout");
    else if (key === "editRoom") setTab("editRoom");
    else if (key === "background") setTab("background");
    else if (key === "gifts") setTab("gifts");
    else if (key === "activity") {
      if (onOpenActivity) onOpenActivity();
      else dialog.alert("ميزة غير مفعّلة");
    }
    else dialog.alert(`"${key}" - قيد التطوير`);
  };

  const titles: Record<Tab, string> = {
    main: "إعدادات الغرفة",
    layout: "تخطيط المايكات",
    editRoom: "تعديل الغرفة",
    background: "الخلفية",
    gifts: "إدارة الهدايا",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div className="w-full max-w-md mx-auto bg-gray-950 rounded-t-2xl h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-bold">{titles[tab]}</h2>
          {tab === "main" ? (
            <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
          ) : (
            <button onClick={() => setTab("main")} className="text-white/70 text-sm">رجوع</button>
          )}
        </div>

        {tab === "main" && (
          <div className="flex-1 overflow-y-auto p-4">
            {/* [moorawi] طلب المايك Toggle */}
            <div className="mb-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                  <Hand size={20} className="text-white" />
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-black">طلب المايك</p>
                  <p className="text-white/60 text-[10px]">
                    {localMicReqEnabled ? "المستمعون يطلبون الصعود" : "المستمعون يصعدون مباشرة"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleMicRequests}
                disabled={!isOwnerOrMod || micReqSaving}
                className={`relative w-14 h-7 rounded-full transition-all flex-shrink-0 border ${
                  localMicReqEnabled ? "bg-emerald-500 border-emerald-400" : "bg-white/20 border-white/30"
                } ${!isOwnerOrMod ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
                    localMicReqEnabled ? "left-0.5" : "left-[calc(100%-22px)]"
                  }`}
                />
              </button>
            </div>

            {/* [moorawi-security] Items grid — Owner/Mod فقط */}
            {isOwnerOrMod && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {items.map((it) => (
                  <button key={it.key} onClick={() => handleItemClick(it.key)} className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition">
                    <it.icon size={26} className="text-white" />
                    <span className="text-white text-[11px]">{it.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* [moorawi-security] Quick Tools — مصفّاة حسب الدور */}
            <h3 className="text-white/60 text-xs mb-3 text-center">أدوات سريعة</h3>
            <div className="grid grid-cols-4 gap-3">
              {quickTools
                .filter((it) => isOwnerOrMod || personalKeys.includes(it.key))
                .map((it) => (
                  <button key={it.key} onClick={() => handleItemClick(it.key)} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                      <it.icon size={20} className="text-white" />
                    </div>
                    <span className="text-white/80 text-[9px] text-center leading-tight">{it.label}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {tab === "layout" && (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-white/70 text-sm mb-4 text-center">اختر تخطيط المايكات</p>
            {!isOwnerOrMod && <p className="text-yellow-300 text-xs text-center mb-4 bg-yellow-500/10 p-2 rounded-lg">للمالك/المشرف فقط</p>}
            <div className="grid grid-cols-2 gap-3">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => isOwnerOrMod && handleLayoutChange(opt.key)}
                  disabled={!isOwnerOrMod}
                  className={`p-4 rounded-2xl border-2 transition flex flex-col items-center gap-3 ${
                    currentLayout === opt.key
                      ? "border-purple-400 bg-purple-500/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  } disabled:opacity-50`}
                >
                  <div className="h-10 flex items-center justify-center">
                    <LayoutPreview layoutKey={opt.key} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-bold">{opt.label}</span>
                    {currentLayout === opt.key && <Check size={14} className="text-purple-300" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "editRoom" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!isOwnerOrMod && <p className="text-yellow-300 text-xs text-center bg-yellow-500/10 p-2 rounded-lg">للمالك/المشرف فقط</p>}
            <div className="flex flex-col items-center gap-2">
              <label className={`relative cursor-pointer ${!isOwnerOrMod ? "opacity-50 pointer-events-none" : ""}`}>
                <input ref={coverFileRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} className="hidden" />
                <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border-2 border-white/20">
                  {uploading ? <Loader2 className="animate-spin text-white" size={20} /> : coverUrl ? <img src={coverUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-white/60" />}
                </div>
                <div className="absolute bottom-1 left-1 bg-purple-600 rounded-full p-1.5 border-2 border-gray-950">
                  <ImageIcon size={12} className="text-white" />
                </div>
              </label>
              <p className="text-white/50 text-[10px]">صورة الغرفة</p>
            </div>
            <div>
              <label className="text-white/70 text-xs mb-1 block">اسم الغرفة</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 outline-none focus:border-white text-white text-sm" />
            </div>
            <div>
              <label className="text-white/70 text-xs mb-1 block">رسالة الترحيب</label>
              <textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} maxLength={200} rows={3} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 outline-none focus:border-white text-white text-sm resize-none" />
              <p className="text-white/40 text-[10px] text-left">{welcome.length}/200</p>
            </div>
            <button onClick={handleSaveRoomInfo} disabled={saving || !isOwnerOrMod} className="w-full bg-purple-600 py-3 rounded-xl text-white font-bold disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        )}

        {tab === "gifts" && <GiftsAdmin />}

        {tab === "background" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!isOwnerOrMod && <p className="text-yellow-300 text-xs text-center bg-yellow-500/10 p-2 rounded-lg">للمالك/المشرف فقط</p>}
            <label className={`block cursor-pointer ${!isOwnerOrMod ? "opacity-50 pointer-events-none" : ""}`}>
              <input ref={bgFileRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleBackgroundUpload(e.target.files[0])} className="hidden" />
              <div className="w-full h-40 rounded-2xl bg-white/10 border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-2 hover:bg-white/15 transition">
                {uploading ? <Loader2 className="animate-spin text-white" size={28} /> : <ImageIcon size={32} className="text-white/60" />}
                <p className="text-white text-sm">اختر صورة الخلفية</p>
                <p className="text-white/50 text-[10px]">PNG / JPG</p>
              </div>
            </label>
            <button onClick={() => updateBackground({ roomId, tokenOverride: deviceId })} disabled={!isOwnerOrMod} className="w-full bg-red-500/70 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50">
              حذف الخلفية
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Gifts Admin Panel ============
function GiftsAdmin() {
  const deviceId = getDeviceId();
  const gifts = useQuery(api.gifts.listAllAdmin, { tokenOverride: deviceId });
  const createGift = useMutation(api.gifts.createGift);
  const removeGift = useMutation(api.gifts.removeGift);

  const [name, setName] = useState("");
  const [price, setPrice] = useState(100);
  const [category, setCategory] = useState("classic");
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
      const mediaType: "image" | "video" = mediaFile.type.startsWith("video") ? "video" : "image";
      const result = await uploadToCloudinary(mediaFile, mediaType);
      await createGift({
        name: name.trim(),
        price,
        category,
        mediaUrl: result.url,
        mediaType,
        forceGlobal,
        tokenOverride: deviceId,
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
        </select>

        <label className="block cursor-pointer">
          <input ref={mediaRef} type="file" accept="image/*,video/webm,video/mp4"
            onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)} className="hidden" />
          <div className="w-full p-2.5 bg-white/10 border-2 border-dashed border-white/30 rounded-xl text-center text-white text-xs hover:bg-white/15">
            {mediaFile ? `🎬 ${mediaFile.name}` : "اختر صورة / فيديو الهدية"}
          </div>
        </label>

        <label className="flex items-center gap-2 cursor-pointer bg-white/5 p-2 rounded-xl">
          <input
            type="checkbox"
            checked={forceGlobal}
            onChange={(e) => setForceGlobal(e.target.checked)}
            className="w-4 h-4 accent-purple-600"
          />
          <span className="text-white text-[11px]">🌍 فرض البانر العالمي (كل الغرف)</span>
        </label>

        <div className="text-white/50 text-[10px] bg-black/30 p-2 rounded-lg space-y-0.5">
          <p>تُضاف الرموز تلقائياً:</p>
          <p>🎵 تلقائياً للفيديو</p>
          <p>🌍 إذا السعر ≥ 30000 (أو بالخيار أعلاه)</p>
          <p>💕 تلقائياً إذا التصنيف "العلاقة"</p>
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
                  <span>🎁</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{g.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-yellow-400 text-[10px]">{g.price} 💰</p>
                  {g.isGlobal && <Globe size={10} className="text-blue-400" />}
                  {g.hasSound && <Music size={10} className="text-purple-400" />}
                  {g.isRelationship && <Heart size={10} className="text-pink-400 fill-pink-400" />}
                </div>
              </div>
              <button onClick={() => { dialog.confirm("حذف هذه الهدية؟", () => { removeGift({ giftId: g._id, tokenOverride: deviceId }).catch((e) => dialog.alert(e?.message)); }); }}
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
