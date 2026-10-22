// [ezo-micstyle] Mic & Icon Style Sheet — Binmo style (shell, all locked except default)
import { useState } from "react";
import { useAssets } from "../lib/assets";
import { X, Lock, Check, ArrowRight, Mic, Crown } from "lucide-react";

interface Props {
  onClose: () => void;
}

const STYLES = [
  { id: "default",   label: "الافتراضي" },
  { id: "cars",      label: "قطب السيارات الخارقة" },
  { id: "blackrose", label: "أميرة الوردة السوداء" },
  { id: "falcon",    label: "فارس الصقر الذهبي" },
  { id: "crown",     label: "التاج الملكي" },
  { id: "dragon",    label: "التنين الأسطوري" },
];

export default function MicStyleSheet({ onClose }: Props) {
  const assets = useAssets();
  const [tab, setTab] = useState<"official" | "mine">("official");
  const activeStyle = "default"; // hardcoded until backend ready

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-[#0f1419] to-black rounded-t-3xl h-[80dvh] flex flex-col overflow-hidden border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <button onClick={onClose} className="p-1 text-white/70"><ArrowRight size={20} /></button>
          <h2 className="text-white font-black text-base">مايك وستايل الأيقونة</h2>
          <div className="w-6" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setTab("official")}
            className={`flex-1 py-3 text-sm font-bold relative ${tab === "official" ? "text-white" : "text-white/50"}`}
          >
            رسمي
            {tab === "official" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-emerald-400 rounded-full" />}
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`flex-1 py-3 text-sm font-bold relative ${tab === "mine" ? "text-white" : "text-white/50"}`}
          >
            أنا
            {tab === "mine" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-emerald-400 rounded-full" />}
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {tab === "mine" ? (
            <div className="text-center py-16 text-white/40">
              <Crown size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold">لا توجد ستايلات خاصة بك</p>
              <p className="text-xs mt-1">افتح الستايلات بفتح الأوسمة أو الترقية VIP</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {STYLES.map((s) => {
                const isActive = s.id === activeStyle;
                const isLocked = s.id !== "default";
                const micImg = assets[`ui.micstyle.${s.id}.mic`];
                const iconImg = assets[`ui.micstyle.${s.id}.icon`];
                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl bg-white/5 border ${isActive ? "border-emerald-400/60" : "border-white/10"} p-3 flex flex-col items-center gap-2 relative`}
                  >
                    {isLocked && (
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                        <Lock size={12} className="text-white/70" />
                      </div>
                    )}
                    {isActive && (
                      <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-bold">
                        جاري الاستخدام
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-black/30 ring-2 ring-amber-500/60 flex items-center justify-center">
                        {micImg ? (
                          <img src={micImg} alt={s.label} className="w-full h-full object-cover" />
                        ) : (
                          <Mic size={16} className="text-white/30" />
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-black/30 ring-2 ring-amber-500/60 flex items-center justify-center">
                        {iconImg ? (
                          <img src={iconImg} alt={s.label} className="w-full h-full object-cover" />
                        ) : (
                          <Crown size={16} className="text-white/30" />
                        )}
                      </div>
                    </div>
                    <p className="text-white/90 text-[11px] font-bold text-center leading-tight min-h-[2.2em]">{s.label}</p>
                    <span className={`text-[9px] font-black ${isActive ? "text-emerald-300" : isLocked ? "text-amber-300" : "text-white/60"}`}>
                      {isActive ? "نشاط" : isLocked ? "مقفل" : "متاح"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <button
            disabled
            className="w-full py-3 rounded-2xl bg-white/10 text-white/40 font-black text-sm flex items-center justify-center gap-2"
          >
            <Check size={14} /> جاري الاستخدام
          </button>
        </div>
      </div>
    </div>
  );
}
