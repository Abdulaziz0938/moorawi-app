import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import {
  X, Sparkles, Palette, LayoutGrid, Settings, Lock,
  Briefcase, Activity, Music, Coins, MessageCircle,
  Wand2, Gift, Volume2, Mic2, ImageIcon, Monitor, VolumeX, Check, Loader2,
} from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  currentLayout: "4" | "5" | "6";
  isOwnerOrMod: boolean;
  currentName: string;
  currentWelcome: string;
  currentCoverUrl: string | null;
  onClose: () => void;
}

type Tab = "main" | "layout" | "editRoom" | "background";

export default function SettingsSheet({ roomId, currentLayout, isOwnerOrMod, currentName, currentWelcome, currentCoverUrl, onClose }: Props) {
  const deviceId = getDeviceId();
  const updateLayout = useMutation(api.rooms.updateLayout);
  const updateRoomInfo = useMutation(api.rooms.updateRoomInfo);
  const updateBackground = useMutation(api.rooms.updateRoomBackground);
  const genUpload = useMutation(api.rooms.generateRoomUploadUrl);

  const [tab, setTab] = useState<Tab>("main");
  const [name, setName] = useState(currentName);
  const [welcome, setWelcome] = useState(currentWelcome);
  const [coverUrl, setCoverUrl] = useState(currentCoverUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const handleLayoutChange = async (layout: "4" | "5" | "6") => {
    try { await updateLayout({ roomId, micLayout: layout, tokenOverride: deviceId }); }
    catch (e: any) { alert(e?.message || "خطأ"); }
  };

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await genUpload({ tokenOverride: deviceId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await updateRoomInfo({ roomId, coverImageId: storageId, tokenOverride: deviceId });
      const newUrl = URL.createObjectURL(file);
      setCoverUrl(newUrl);
    } catch (e: any) { alert(e?.message || "فشل"); }
    finally { setUploading(false); }
  };

  const handleBackgroundUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await genUpload({ tokenOverride: deviceId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await updateBackground({ roomId, backgroundImageId: storageId, tokenOverride: deviceId });
      alert("تم تغيير الخلفية");
    } catch (e: any) { alert(e?.message || "فشل"); }
    finally { setUploading(false); }
  };

  const handleSaveRoomInfo = async () => {
    setSaving(true);
    try {
      await updateRoomInfo({ roomId, name, welcomeMessage: welcome, tokenOverride: deviceId });
      alert("تم الحفظ");
    } catch (e: any) { alert(e?.message || "خطأ"); }
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

  const handleItemClick = (key: string) => {
    if (key === "layout") setTab("layout");
    else if (key === "editRoom") setTab("editRoom");
    else if (key === "background") setTab("background");
    else alert(`"${key}" - قيد التطوير`);
  };

  const titles: Record<Tab, string> = {
    main: "إعدادات الغرفة",
    layout: "تخطيط المايكات",
    editRoom: "تعديل الغرفة",
    background: "الخلفية",
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
            <div className="grid grid-cols-3 gap-3 mb-6">
              {items.map((it) => (
                <button key={it.key} onClick={() => handleItemClick(it.key)} className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition">
                  <it.icon size={26} className="text-white" />
                  <span className="text-white text-[11px]">{it.label}</span>
                </button>
              ))}
            </div>
            <h3 className="text-white/60 text-xs mb-3 text-center">أدوات سريعة</h3>
            <div className="grid grid-cols-4 gap-3">
              {quickTools.map((it) => (
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
            <p className="text-white/70 text-sm mb-4 text-center">اختر عدد الأعمدة</p>
            {!isOwnerOrMod && <p className="text-yellow-300 text-xs text-center mb-4 bg-yellow-500/10 p-2 rounded-lg">للمالك/المشرف فقط</p>}
            <div className="space-y-3">
              {(["4", "5", "6"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => isOwnerOrMod && handleLayoutChange(l)}
                  disabled={!isOwnerOrMod}
                  className={`w-full p-4 rounded-2xl border-2 transition flex items-center justify-between ${currentLayout === l ? "border-purple-400 bg-purple-500/20" : "border-white/10 bg-white/5 hover:bg-white/10"} disabled:opacity-50`}
                >
                  <div>
                    <p className="text-white font-bold text-sm">{l} أعمدة</p>
                    <p className="text-white/50 text-[10px] mt-0.5">{l === "4" ? "20 مايك (5 صفوف)" : l === "5" ? "20 مايك (4 صفوف)" : "18 مايك (3 صفوف)"}</p>
                  </div>
                  {currentLayout === l && <Check size={20} className="text-purple-300" />}
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
