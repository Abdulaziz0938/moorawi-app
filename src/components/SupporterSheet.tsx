// [moorawi-services] الداعم المحترم — ترتيب أعلى المنفقين
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import { Header, Spinner, Empty } from "./VisitsSheet";
import { Crown, Gem, TrendingUp, Award } from "lucide-react";

interface Props { onClose: () => void; onUserClick?: (id: any) => void; }

const TIER_NAMES: Record<number, { name: string; color: string; from: number; to: number }> = {
  5:  { name: "S5 - S10",   color: "text-amber-300",  from: 5,  to: 10 },
  11: { name: "S11 - S20",  color: "text-yellow-300", from: 11, to: 20 },
  21: { name: "S21 - S50",  color: "text-orange-300", from: 21, to: 50 },
  51: { name: "S51 - S100", color: "text-pink-300",   from: 51, to: 100 },
};

export default function SupporterSheet({ onClose, onUserClick }: Props) {
  useBackButton(true, onClose);
  const top = useQuery(api.rooms.wealthRanking);

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="الداعم المحترم" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Hero */}
        <div className="text-center mb-2">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 mx-auto flex items-center justify-center mb-3">
            <Crown size={48} className="text-white" fill="currentColor" />
          </div>
          <p className="text-white text-lg font-black">الداعمون المحترمون</p>
          <p className="text-white/50 text-xs mt-1">أعلى المنفقين على التطبيق</p>
        </div>

        {/* Tiers legend */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TIER_NAMES).map(([k, t]) => (
            <div key={k} className="rounded-xl bg-white/5 border border-white/10 p-2 text-center">
              <p className={`text-xs font-black ${t.color}`}>🏆 {t.name}</p>
              <p className="text-white/40 text-[9px] mt-0.5">مستوى الثراء {t.from}-{t.to}</p>
            </div>
          ))}
        </div>

        {/* Top 3 */}
        {top === undefined ? (
          <Spinner />
        ) : top.length === 0 ? (
          <Empty icon={Gem} text="لا يوجد داعمون بعد" />
        ) : (
          <div className="space-y-2">
            <p className="text-white/50 text-xs font-black">أعلى 3 هذا الشهر</p>
            {top.map((u: any, i: number) => {
              const rankColor =
                i === 0 ? "from-amber-500 to-yellow-600" :
                i === 1 ? "from-slate-300 to-slate-500" :
                "from-orange-600 to-amber-800";
              return (
                <button
                  key={u.userId}
                  onClick={() => onUserClick?.(u.userId)}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 active:bg-white/10"
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${rankColor} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>
                    #{i + 1}
                  </div>
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
                    <UserAvatar avatarUrl={u.avatarUrl} name={u.name} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-white text-sm font-black truncate">{u.name}</p>
                    <p className="text-white/40 text-[10px]" dir="ltr">ID:{u.userNumber ?? "—"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1">
                      <TrendingUp size={12} className="text-emerald-400" />
                      <span className="text-emerald-300 text-xs font-black" dir="ltr">
                        {formatNum(u.total)}
                      </span>
                    </div>
                    <span className="text-white/40 text-[9px]">آخر 30 يوم</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 flex gap-2">
          <Award size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
          <p className="text-amber-100/80 text-[11px] leading-relaxed">
            احصل على مكان في القائمة من خلال إنفاق العملات على الهدايا. يتم التحديث شهرياً.
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
