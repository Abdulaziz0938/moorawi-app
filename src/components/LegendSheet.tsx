// [moorawi-services] الأسطورة — أعلى 3 في 3 فئات
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import { Header, Spinner, Empty } from "./VisitsSheet";
import { Star, Heart, TrendingUp, Gem, Award, Crown } from "lucide-react";

interface Props { onClose: () => void; onUserClick?: (id: any) => void; }

type Category = "wealth" | "charm" | "gifters";

const CATEGORIES: { key: Category; label: string; icon: any; color: string; desc: string }[] = [
  { key: "wealth",   label: "ثراء",    icon: Gem,        color: "text-amber-300",  desc: "أعلى المنفقين" },
  { key: "charm",    label: "جاذبية",  icon: Heart,      color: "text-pink-300",   desc: "أعلى المستقبلين" },
  { key: "gifters",  label: "هدايا",   icon: TrendingUp, color: "text-emerald-300", desc: "أكثر المُهدين" },
];

export default function LegendSheet({ onClose, onUserClick }: Props) {
  useBackButton(true, onClose);
  const [cat, setCat] = useState<Category>("wealth");

  const top = useQuery(api.rooms.legendTop, { category: cat } as any);

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="الأسطورة" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Hero */}
        <div className="text-center mb-2">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-600 mx-auto flex items-center justify-center mb-3">
            <Star size={48} className="text-white" fill="currentColor" />
          </div>
          <p className="text-white text-lg font-black">أساطير Ezo</p>
          <p className="text-white/50 text-xs mt-1">أعلى 3 مستخدمين في كل فئة</p>
        </div>

        {/* Category tabs */}
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = c.key === cat;
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`rounded-2xl border p-3 flex flex-col items-center gap-1 transition ${
                  active
                    ? "bg-fuchsia-500/20 border-fuchsia-400/60"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <Icon size={18} className={active ? c.color : "text-white/40"} />
                <p className={`text-[11px] font-black ${active ? "text-white" : "text-white/50"}`}>{c.label}</p>
              </button>
            );
          })}
        </div>

        {/* Description */}
        <p className="text-white/50 text-xs text-center">
          {CATEGORIES.find((c) => c.key === cat)?.desc}
        </p>

        {/* Top 3 */}
        {top === undefined ? (
          <Spinner />
        ) : top.length === 0 ? (
          <Empty icon={Star} text="لا يوجد بيانات بعد" />
        ) : (
          <div className="space-y-3">
            {/* Podium top 3 */}
            <div className="flex items-end justify-center gap-3 h-40">
              {[1, 0, 2].map((posIdx) => {
                const u = top[posIdx];
                if (!u) return <div key={posIdx} className="w-20" />;
                const isGold = posIdx === 0;
                const isSilver = posIdx === 1;
                const size = isGold ? "w-20 h-20" : "w-16 h-16";
                const border = isGold ? "border-amber-400" : isSilver ? "border-slate-300" : "border-orange-500";
                const rank = posIdx + 1;
                return (
                  <button
                    key={u.userId}
                    onClick={() => onUserClick?.(u.userId)}
                    className={`flex flex-col items-center gap-1 ${isGold ? "mb-2" : ""} active:scale-95`}
                  >
                    <Crown size={isGold ? 20 : 16} className={isGold ? "text-amber-400" : isSilver ? "text-slate-300" : "text-orange-500"} fill="currentColor" />
                    <div className={`${size} rounded-full overflow-hidden border-2 ${border} bg-purple-700 flex items-center justify-center`}>
                      <UserAvatar avatarUrl={u.avatarUrl} name={u.name} className="w-full h-full" />
                    </div>
                    <p className="text-white text-[11px] font-black truncate max-w-[80px]">{u.name}</p>
                    <p className={`text-[10px] font-black ${isGold ? "text-amber-300" : isSilver ? "text-slate-200" : "text-orange-400"}`}>
                      #{rank}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Details list */}
            <div className="space-y-2 mt-4">
              {top.map((u: any, i: number) => (
                <button
                  key={u.userId}
                  onClick={() => onUserClick?.(u.userId)}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 active:bg-white/10"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-600 to-pink-700 flex items-center justify-center text-white text-xs font-black">
                    #{i + 1}
                  </div>
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-purple-700 flex-shrink-0">
                    <UserAvatar avatarUrl={u.avatarUrl} name={u.name} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-white text-xs font-black truncate">{u.name}</p>
                    <p className="text-white/40 text-[10px]" dir="ltr">ID:{u.userNumber ?? "—"}</p>
                  </div>
                  <span className="text-fuchsia-300 text-xs font-black" dir="ltr">
                    {formatNum(u.value)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="rounded-2xl bg-fuchsia-500/10 border border-fuchsia-400/30 p-4 flex gap-2">
          <Award size={16} className="text-fuchsia-300 flex-shrink-0 mt-0.5" />
          <p className="text-fuchsia-100/80 text-[11px] leading-relaxed">
            قائمة الأساطير تُحدَّث يومياً. احصل على مكان بالاستمرار في الدعم والتفاعل.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
