import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import {
  X, Sparkles, Palette, LayoutGrid, Settings, Lock,
  Briefcase, Activity, Music, Coins, MessageCircle,
  Wand2, Gift, Volume2, Mic2, ImageIcon, Monitor, VolumeX,
  Check,
} from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  currentLayout: "4" | "5" | "6";
  isOwnerOrMod: boolean;
  onClose: () => void;
}

export default function SettingsSheet({ roomId, currentLayout, isOwnerOrMod, onClose }: Props) {
  const deviceId = getDeviceId();
  const updateLayout = useMutation(api.rooms.updateLayout);
  const [tab, setTab] = useState<"main" | "layout">("main");

  const handleLayoutChange = async (layout: "4" | "5" | "6") => {
    try {
      await updateLayout({ roomId, micLayout: layout, tokenOverride: deviceId });
    } catch (e: any) {
      alert(e?.message || "خطأ");
    }
  };

  const items = [
    { icon: Sparkles, label: "الديكور", key: "deco" },
    { icon: Palette, label: "الخلفية", key: "bg" },
    { icon: LayoutGrid, label: "التخطيط", key: "layout" },
    { icon: Settings, label: "تعديل الغرفة", key: "edit" },
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
    if (key === "layout") {
      setTab("layout");
    } else {
      alert(`"${key}" - قيد التطوير`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gray-950 rounded-t-2xl h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          {tab === "layout" ? (
            <>
              <h2 className="text-white font-bold">تخطيط المايكات</h2>
              <button onClick={() => setTab("main")} className="text-white/70 text-sm">رجوع</button>
            </>
          ) : (
            <>
              <h2 className="text-white font-bold">إعدادات الغرفة</h2>
              <button onClick={onClose} className="text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </>
          )}
        </div>

        {/* Main tab */}
        {tab === "main" && (
          <div className="flex-1 overflow-y-auto p-4">
            {/* Main grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {items.map((it) => (
                <button
                  key={it.key}
                  onClick={() => handleItemClick(it.key)}
                  className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition"
                >
                  <it.icon size={26} className="text-white" />
                  <span className="text-white text-[11px]">{it.label}</span>
                </button>
              ))}
            </div>

            <h3 className="text-white/60 text-xs mb-3 text-center">أدوات سريعة</h3>
            <div className="grid grid-cols-4 gap-3">
              {quickTools.map((it) => (
                <button
                  key={it.key}
                  onClick={() => handleItemClick(it.key)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                    <it.icon size={20} className="text-white" />
                  </div>
                  <span className="text-white/80 text-[9px] text-center leading-tight">{it.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layout tab */}
        {tab === "layout" && (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-white/70 text-sm mb-4 text-center">
              اختر عدد الأعمدة في شبكة المايكات
            </p>
            {!isOwnerOrMod && (
              <p className="text-yellow-300 text-xs text-center mb-4 bg-yellow-500/10 p-2 rounded-lg">
                فقط مالك الغرفة أو المشرف يمكنه تغيير التخطيط
              </p>
            )}
            <div className="space-y-3">
              {(["4", "5", "6"] as const).map((layout) => (
                <button
                  key={layout}
                  onClick={() => isOwnerOrMod && handleLayoutChange(layout)}
                  disabled={!isOwnerOrMod}
                  className={`w-full p-4 rounded-2xl border-2 transition flex items-center justify-between ${
                    currentLayout === layout
                      ? "border-purple-400 bg-purple-500/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  } disabled:opacity-50`}
                >
                  <div>
                    <p className="text-white font-bold text-sm">{layout} أعمدة</p>
                    <p className="text-white/50 text-[10px] mt-0.5">
                      {layout === "4" ? "20 مايك (5 صفوف)" : layout === "5" ? "20 مايك (4 صفوف)" : "18 مايك (3 صفوف)"}
                    </p>
                  </div>
                  <div
                    className="grid gap-0.5"
                    style={{ gridTemplateColumns: `repeat(${layout}, 1fr)`, width: "60px" }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-white/40" />
                    ))}
                  </div>
                  {currentLayout === layout && <Check size={20} className="text-purple-300" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
