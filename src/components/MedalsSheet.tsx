import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import { X, Loader2, Award, Check, ChevronLeft, Lock } from "lucide-react";

interface Props {
  onClose: () => void;
}

type Category = "all" | "activity" | "wealth" | "charm" | "monthly" | "weekly" | "special";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all",      label: "الكل" },
  { key: "special",  label: "خاص" },
  { key: "activity", label: "نشاط" },
  { key: "wealth",   label: "ثراء" },
  { key: "charm",    label: "جاذبية" },
  { key: "monthly",  label: "شهري" },
  { key: "weekly",   label: "أسبوعي" },
];

const TIER_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  C:   { bg: "bg-slate-700/40",     border: "border-slate-500/50",   text: "text-slate-300",   label: "C" },
  B:   { bg: "bg-emerald-700/40",   border: "border-emerald-500/50", text: "text-emerald-300", label: "B" },
  A:   { bg: "bg-blue-700/40",      border: "border-blue-500/50",    text: "text-blue-300",    label: "A" },
  S:   { bg: "bg-red-700/40",       border: "border-red-500/50",     text: "text-red-300",     label: "S" },
  SS:  { bg: "bg-amber-700/40",     border: "border-amber-500/50",   text: "text-amber-300",   label: "SS" },
  SSS: { bg: "bg-purple-700/40",    border: "border-purple-500/50",  text: "text-purple-300",  label: "SSS" },
};

type View = "list" | "mine";

export default function MedalsSheet({ onClose }: Props) {
  const token = getActiveToken();
  const [view, setView] = useState<View>("list");
  const [category, setCategory] = useState<Category>("all");

  const allMedals = useQuery(api.medals.listAll, {
    category: category === "all" ? undefined : category,
  });
  const myMedals = useQuery(api.medals.myMedals, { tokenOverride: token });

  const equipMedal = useMutation(api.medals.equipMedal);
  const unequipMedal = useMutation(api.medals.unequipMedal);

  const [busy, setBusy] = useState<string | null>(null);

  const myMedalIds = new Set((myMedals ?? []).map((um: any) => um.medalId));
  const equippedId = (myMedals ?? []).find((um: any) => um.equipped)?._id;

  const handleEquipToggle = async (um: any) => {
    setBusy(um._id);
    try {
      if (um.equipped) {
        await unequipMedal({ userMedalId: um._id, tokenOverride: token });
      } else {
        await equipMedal({ userMedalId: um._id, tokenOverride: token });
      }
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-amber-950/40 via-slate-900 to-black rounded-t-3xl h-[92dvh] flex flex-col overflow-hidden border-t border-amber-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
              <Award size={18} className="text-white" />
            </div>
            <h2 className="text-white text-lg font-black">الأوسمة</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X size={20} />
          </button>
        </div>

        {/* ===== View toggle ===== */}
        <div className="flex gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setView("list")}
            className={`flex-1 py-2 rounded-xl text-sm font-black transition ${
              view === "list" ? "bg-white/15 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            جميع الأوسمة
          </button>
          <button
            onClick={() => setView("mine")}
            className={`flex-1 py-2 rounded-xl text-sm font-black transition ${
              view === "mine" ? "bg-white/15 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            أوسمتي ({myMedals?.length ?? 0})
          </button>
        </div>

        {/* ===== Category tabs (only in list view) ===== */}
        {view === "list" && (
          <div className="flex gap-1.5 px-3 py-3 border-b border-white/10 overflow-x-auto flex-shrink-0 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex-shrink-0 px-3 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition ${
                  category === cat.key
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* ===== Content ===== */}
        <div className="flex-1 overflow-y-auto p-3">
          {view === "list" ? (
            <>
              {allMedals === undefined ? (
                <Loading />
              ) : allMedals.length === 0 ? (
                <Empty text="لا أوسمة في هذا التصنيف" />
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {allMedals.map((m: any) => {
                    const t = TIER_STYLE[m.tier] ?? TIER_STYLE.C;
                    const owned = myMedalIds.has(m._id);
                    return (
                      <div
                        key={m._id}
                        className={`relative rounded-2xl border ${t.border} ${t.bg} p-2.5 flex flex-col items-center gap-1.5 aspect-square justify-center`}
                      >
                        {/* Tier badge */}
                        <span className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-black/40 ${t.text}`}>
                          {t.label}
                        </span>
                        {/* Lock if not owned */}
                        {!owned && (
                          <Lock size={14} className="absolute top-2 left-2 text-white/30" />
                        )}
                        {/* Icon */}
                        <Award size={32} className={`${t.text} opacity-90`} strokeWidth={1.8} />
                        {/* Name */}
                        <p className="text-white text-[10px] font-bold text-center leading-tight line-clamp-2">
                          {m.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {myMedals === undefined ? (
                <Loading />
              ) : myMedals.length === 0 ? (
                <Empty text="لم تحصل على أي وسام بعد" sub="شارك في الغرف والفعاليات للحصول على الأوسمة" />
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {myMedals.map((um: any) => {
                    const m = um.medal;
                    const t = TIER_STYLE[m.tier] ?? TIER_STYLE.C;
                    const isBusy = busy === um._id;
                    return (
                      <button
                        key={um._id}
                        disabled={isBusy}
                        onClick={() => handleEquipToggle(um)}
                        className={`relative rounded-2xl border p-2.5 flex flex-col items-center gap-1.5 aspect-square justify-center transition ${
                          um.equipped
                            ? "border-emerald-400/70 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                            : `${t.border} ${t.bg} hover:opacity-90`
                        }`}
                      >
                        {/* Tier badge */}
                        <span className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-black/40 ${t.text}`}>
                          {t.label}
                        </span>
                        {/* Equipped check */}
                        {um.equipped && (
                          <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check size={11} className="text-white" strokeWidth={3} />
                          </span>
                        )}
                        {/* Icon */}
                        <Award size={32} className={um.equipped ? "text-emerald-300" : t.text} strokeWidth={1.8} />
                        {/* Name */}
                        <p className="text-white text-[10px] font-bold text-center leading-tight line-clamp-2">
                          {m.name}
                        </p>
                        {/* Busy */}
                        {isBusy && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                            <Loader2 size={18} className="animate-spin text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        {view === "mine" && (myMedals?.length ?? 0) > 0 && (
          <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
            <p className="text-white/40 text-[10px] text-center">
              اضغط على الوسام لتفعيله في الملف الشخصي
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 size={28} className="animate-spin text-white/40" />
    </div>
  );
}

function Empty({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-white/40">
      <Award size={48} className="mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
      {sub && <p className="text-[10px] mt-1 opacity-70">{sub}</p>}
    </div>
  );
}
