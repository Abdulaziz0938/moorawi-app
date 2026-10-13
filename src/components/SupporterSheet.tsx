// [ezo-rankings] الداعم المحترم — ترتيب حقيقي (week/month/all)
//
// - Podium لأعلى 3 (منصة)
// - قائمة كاملة (4-100)
// - شريط "ترتيبي" ثابت أسفل
// - 3 فترات زمنية
// - مستوى حقيقي 0-100 (levelFromValue)

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { useBackButton } from "../lib/hooks/useBackButton";
import UserAvatar from "./UserAvatar";
import { Header, Spinner, Empty } from "./VisitsSheet";
import { levelFromValue } from "../lib/levels";
import {
  Crown, TrendingUp, Coins, Flame, Star, Trophy, User as UserIcon,
} from "lucide-react";

interface Props {
  onClose: () => void;
  onUserClick?: (id: string) => void;
}

type Period = "week" | "month" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "هذا الأسبوع" },
  { key: "month", label: "هذا الشهر" },
  { key: "all", label: "كل الأوقات" },
];

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

// ألوان المنصة — ذهبي/فضي/برونزي
const PODIUM_STYLES = [
  { ring: "ring-amber-300", bg: "from-amber-400 to-yellow-600", height: "h-28", size: 72, badge: "from-amber-400 to-yellow-500" },
  { ring: "ring-slate-200", bg: "from-slate-300 to-slate-500", height: "h-20", size: 60, badge: "from-slate-300 to-slate-500" },
  { ring: "ring-orange-400", bg: "from-orange-500 to-amber-700", height: "h-16", size: 54, badge: "from-orange-500 to-amber-700" },
];

export default function SupporterSheet({ onClose, onUserClick }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const [period, setPeriod] = useState<Period>("month");

  const top = useQuery(api.rooms.wealthRanking, { period, limit: 100 });
  const myRank = useQuery(api.rooms.mySupporterRank, { tokenOverride: deviceId, period });

  const top3 = (top ?? []).slice(0, 3);
  const rest = (top ?? []).slice(3);

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="الداعم المحترم" icon={Crown} assetKey="ui.sheet.supporter" />

      {/* ===== Period Tabs ===== */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-white/5 border border-white/10 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`py-2 rounded-xl text-[11px] font-black transition ${
                period === p.key
                  ? "bg-amber-500/25 text-amber-100 border border-amber-400/50"
                  : "text-white/60 hover:text-white/90"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {top === undefined ? (
          <Spinner />
        ) : top.length === 0 ? (
          <Empty icon={TrendingUp} text="لا يوجد داعمون في هذه الفترة" />
        ) : (
          <>
            {/* ===== Podium (Top 3) ===== */}
            {top3.length >= 1 && (
              <div className="mb-6">
                <div className="flex items-end justify-center gap-2 mb-4" style={{ minHeight: 170 }}>
                  {/* 2nd */}
                  {top3[1] && (
                    <PodiumCard
                      rank={2}
                      user={top3[1]}
                      style={PODIUM_STYLES[1]}
                      onClick={() => onUserClick?.(top3[1].userId)}
                    />
                  )}
                  {/* 1st */}
                  <PodiumCard
                    rank={1}
                    user={top3[0]}
                    style={PODIUM_STYLES[0]}
                    onClick={() => onUserClick?.(top3[0].userId)}
                  />
                  {/* 3rd */}
                  {top3[2] && (
                    <PodiumCard
                      rank={3}
                      user={top3[2]}
                      style={PODIUM_STYLES[2]}
                      onClick={() => onUserClick?.(top3[2].userId)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ===== List (4-100) ===== */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((u: any) => (
                  <RankRow
                    key={u.userId}
                    user={u}
                    onClick={() => onUserClick?.(u.userId)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== Sticky "My Rank" Bar ===== */}
      {myRank && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="rounded-2xl bg-amber-500/15 border border-amber-400/40 backdrop-blur-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center flex-shrink-0">
              <UserIcon size={18} className="text-amber-200" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-amber-100 text-xs font-black">ترتيبك</p>
              <p className="text-white/50 text-[10px]">
                {myRank.isTop100 ? "ضمن أفضل 100" : "استمر بالإنفاق لتحسين ترتيبك"}
              </p>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-amber-200 text-lg font-black tabular-nums" dir="ltr">
                  #{myRank.rank}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <Coins size={9} className="text-amber-300" />
                <span className="text-amber-300 font-black tabular-nums" dir="ltr">
                  {fmtNum(myRank.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PodiumCard — بطاقة على المنصة
// ============================================================
function PodiumCard({
  rank,
  user,
  style,
  onClick,
}: {
  rank: number;
  user: any;
  style: typeof PODIUM_STYLES[number];
  onClick: () => void;
}) {
  const level = user.level ?? levelFromValue(user.total ?? 0);
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center active:scale-95 transition"
    >
      {/* Crown for #1 */}
      {rank === 1 && (
        <Crown size={20} className="text-amber-300 mb-1" fill="currentColor" />
      )}
      {/* Avatar with ring */}
      <div
        className={`rounded-full overflow-hidden bg-purple-700 ring-2 ${style.ring} mb-1 relative flex-shrink-0`}
        style={{ width: style.size, height: style.size }}
      >
        <UserAvatar avatarUrl={user.avatarUrl} name={user.name} className="w-full h-full" />
      </div>
      {/* Rank badge */}
      <div
        className={`absolute -mt-8 w-6 h-6 rounded-full bg-gradient-to-br ${style.badge} flex items-center justify-center text-white text-[10px] font-black ring-2 ring-black/40`}
      >
        {rank}
      </div>
      {/* Name */}
      <p className="text-white text-[10px] font-black truncate max-w-[80px] mt-0.5">
        {user.name}
      </p>
      {/* Level */}
      <span className="text-amber-300 text-[9px] font-black tabular-nums">
        Lv.{level}
      </span>
      {/* Total */}
      <div className="flex items-center gap-0.5 mt-0.5">
        <Coins size={8} className="text-amber-400" />
        <span className="text-amber-200 text-[9px] font-black tabular-nums" dir="ltr">
          {fmtNum(user.total)}
        </span>
      </div>
      {/* Podium base */}
      <div className={`w-16 ${style.height} mt-1.5 rounded-t-xl bg-gradient-to-b ${style.bg} opacity-80`} />
    </button>
  );
}

// ============================================================
// RankRow — صف عادي (4-100)
// ============================================================
function RankRow({ user, onClick }: { user: any; onClick: () => void }) {
  const level = user.level ?? levelFromValue(user.total ?? 0);
  const isTop100 = user.isTop100;
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 flex items-center gap-3 active:bg-white/10 transition ${
        isTop100
          ? "bg-gradient-to-l from-amber-500/10 to-transparent border-amber-400/20"
          : "bg-white/5 border-white/10"
      }`}
    >
      {/* Rank number */}
      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-[11px] font-black tabular-nums">
          {user.rank}
        </span>
      </div>
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
        <UserAvatar avatarUrl={user.avatarUrl} name={user.name} className="w-full h-full" />
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0 text-right">
        <p className="text-white text-sm font-black truncate">{user.name}</p>
        <div className="flex items-center gap-2 justify-end">
          <span className="text-amber-300 text-[10px] font-black tabular-nums">
            Lv.{level}
          </span>
          {user.userNumber != null && (
            <span className="text-white/40 text-[10px] tabular-nums" dir="ltr">
              ID:{user.userNumber}
            </span>
          )}
        </div>
      </div>
      {/* Total */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Coins size={11} className="text-amber-400" />
        <span className="text-amber-200 text-xs font-black tabular-nums" dir="ltr">
          {fmtNum(user.total)}
        </span>
      </div>
    </button>
  );
}
