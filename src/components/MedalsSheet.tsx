import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import { X, Loader2, Award, Check, ChevronLeft, Lock } from "lucide-react";
import MedalBadge from "./ui/MedalBadge";
import { tierDesign, MEDAL_TIERS } from "../lib/medalDesign";

interface Props {
  onClose: () => void;
  userId?: Id<"users">;
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

// يستخدم MEDAL_TIERS من medalDesign.ts (موحد في كل التطبيق)

type View = "list" | "mine";

export default function MedalsSheet({ onClose, userId }: Props) {
  const token = getActiveToken();
  const [view, setView] = useState<View>("list");
  const [category, setCategory] = useState<Category>("all");

  const allMedals = useQuery(api.medals.listAll, {
    category: category === "all" ? undefined : category,
  });
  const myMedals = useQuery(
    userId ? api.medals.userMedals : api.medals.myMedals,
    userId ? { userId } : { tokenOverride: token }
  );

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
                <div className="grid grid-cols-2 gap-3">
                  {allMedals.map((m: any) => {
                    const t = tierDesign(m.tier);
                    const owned = myMedalIds.has(m._id);
                    return (
                      <div
                        key={m._id}
                        className={`relative rounded-2xl border-2 ${t.border} bg-gradient-to-br ${t.bg} p-3 flex flex-col items-center gap-2 aspect-[4/5] justify-center overflow-hidden ${t.glow}`}
                      >
                        {/* Subtle inner glow */}
                        <div className={`absolute inset-0 pointer-events-none ${t.bg} opacity-40`} />

                        {/* Tier badge */}
                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-black/60 backdrop-blur ${t.text} border ${t.border}`}>
                          {m.tier}
                        </span>

                        {/* Lock if not owned */}
                        {!owned && (
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                            <Lock size={12} className="text-white/60" />
                          </div>
                        )}

                        {/* Owned checkmark */}
                        {owned && (
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                            <Check size={12} className="text-white" strokeWidth={3} />
                          </div>
                        )}

                        {/* Medal badge */}
                        <MedalBadge
                          name={m.name}
                          tier={m.tier}
                          imageUrl={m.imageUrl}
                          size="lg"
                          showTooltip={false}
                        />

                        {/* Name */}
                        <p className="text-white text-[11px] font-black text-center leading-tight line-clamp-2 relative z-10 mt-1">
                          {m.name}
                        </p>

                        {/* Tier label */}
                        <span className={`text-[9px] font-bold ${t.text} opacity-80 relative z-10`}>
                          {t.name}
                        </span>
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
                    const t = tierDesign(m.tier);
                    const isBusy = busy === um._id;
                    return (
                      <button
                        key={um._id}
                        disabled={isBusy}
                        onClick={() => handleEquipToggle(um)}
                        className={`relative rounded-2xl border-2 p-3 flex flex-col items-center gap-2 aspect-[4/5] justify-center transition overflow-hidden ${
                          um.equipped
                            ? "border-emerald-400/80 bg-gradient-to-br from-emerald-500/30 to-emerald-700/20 shadow-lg shadow-emerald-500/40"
                            : `${t.border} bg-gradient-to-br ${t.bg} ${t.glow}`
                        }`}
                      >
                        {/* Tier badge */}
                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-black/60 backdrop-blur ${t.text} border ${t.border}`}>
                          {m.tier}
                        </span>

                        {/* Equipped check */}
                        {um.equipped && (
                          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40 z-10">
                            {isBusy ? (
                              <Loader2 size={12} className="text-white animate-spin" />
                            ) : (
                              <Check size={12} className="text-white" strokeWidth={3} />
                            )}
                          </span>
                        )}

                        {/* Medal */}
                        <MedalBadge
                          name={m.name}
                          tier={m.tier}
                          imageUrl={m.imageUrl}
                          size="lg"
                          showTooltip={false}
                        />

                        {/* Name */}
                        <p className="text-white text-[11px] font-black text-center leading-tight line-clamp-2 relative z-10 mt-1">
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
