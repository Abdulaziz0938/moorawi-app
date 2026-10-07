import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { X, HelpCircle, Loader2 } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
}

type MainTab = "hours" | "new" | "room";
type TypeTab = "wealth" | "charm";
type PeriodTab = "daily" | "weekly" | "monthly";

type Leader = {
  userId: string;
  userNumber: number | null;
  name: string;
  avatarUrl: string | null;
  vip: number;
  total: number;
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toString();
}

// ============ Avatar inside podium circle ============
function PodiumAvatar({ url, name, size }: { url: string | null; name: string; size: string }) {
  return (
    <div className={`${size} rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-black shadow-xl`}>
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xl">{name[0] || "?"}</span>
      )}
    </div>
  );
}

// ============ Podium Slot (with PNG podium image) ============
function PodiumSlot({
  rank,
  user,
  onClick,
}: {
  rank: number;
  user: Leader;
  onClick?: () => void;
}) {
  // [moorawi-fix] نفس العرض للثلاثة، الارتفاع تلقائي حسب النسبة
  // rank-1: 512x708 → aspect 0.72 → أوسع
  // rank-2/3: 512x1233 → aspect 0.42 → أطول
  const imgWidth = rank === 1 ? "w-28" : "w-20";
  const avatarSize = rank === 1 ? "w-14 h-14" : "w-12 h-12";

  // مركز الدائرة البيضاء من أعلى الصورة (النسبة مقاسة يدوياً):
  // rank-1: الدائرة في ~38% من الأعلى
  // rank-2/3: الدائرة في ~28% من الأعلى (بسبب المسافة الطويلة أسفل)
  const avatarTopPercent = rank === 1 ? 38 : 28;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center flex-1 max-w-[130px]"
    >
      <div className="relative inline-block">
        {/* Podium image */}
        <img
          src={`/leaderboard/rank-${rank}.png`}
          alt=""
          className={`${imgWidth} h-auto object-contain podium-${rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze"}`}
          draggable={false}
        />

        {/* Avatar inside the white circle — نسبة من ارتفاع الصورة */}
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            top: `${avatarTopPercent}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <PodiumAvatar url={user.avatarUrl} name={user.name} size={avatarSize} />
        </div>
      </div>

      {/* Name / ID / Value below podium */}
      <p className="mt-2 text-[11px] font-black text-amber-900 truncate w-full text-center">
        {user.name}
      </p>
      {user.userNumber !== null && (
        <p className="text-[9px] text-amber-900/60">ID:{user.userNumber}</p>
      )}
      <p className="text-[11px] font-black text-amber-900 mt-0.5">
        {formatNumber(user.total)}
      </p>
    </button>
  );
}

// ============ Podium (Top 3) — order: 3 | 1 | 2 ============
function Podium({
  top3,
  onUserClick,
}: {
  top3: Leader[];
  onUserClick?: (id: string) => void;
}) {
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <div className="relative flex items-end justify-center gap-1 px-3 pt-4 pb-4">
      {third && (
        <PodiumSlot
          rank={3}
          user={third}
          onClick={() => onUserClick?.(third.userId)}
        />
      )}
      {first && (
        <PodiumSlot
          rank={1}
          user={first}
          onClick={() => onUserClick?.(first.userId)}
        />
      )}
      {second && (
        <PodiumSlot
          rank={2}
          user={second}
          onClick={() => onUserClick?.(second.userId)}
        />
      )}
    </div>
  );
}

// ============ User Row (ranks 4+) ============
function UserRow({
  rank,
  user,
  onClick,
}: {
  rank: number;
  user: Leader;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/40 transition-colors"
    >
      <span className="w-7 text-center text-sm font-black text-amber-900/70">
        {rank}
      </span>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-black flex-shrink-0 border-2 border-white/70 shadow">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm">{user.name[0] || "?"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className="text-sm font-black text-amber-900 truncate">{user.name}</p>
        {user.userNumber !== null && (
          <p className="text-[10px] text-amber-900/60">ID:{user.userNumber}</p>
        )}
      </div>
      {user.vip > 0 && (
        <span className="text-[10px] font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full px-2 py-0.5 shadow">
          VIP{user.vip}
        </span>
      )}
      <span className="text-xs font-black text-amber-900 min-w-[55px] text-left">
        {formatNumber(user.total)}
      </span>
    </button>
  );
}

// ============ Empty ============
function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-6xl mb-4">🏆</div>
      <p className="text-amber-900 font-black">لا يوجد متصدرون بعد</p>
      <p className="text-amber-900/60 text-sm mt-1">كن أول من يرسل هدية!</p>
    </div>
  );
}

// ============ Main ============
export default function LeaderboardSheet({ roomId, onClose, onUserClick }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>("room");
  const [typeTab, setTypeTab] = useState<TypeTab>("wealth");
  const [period, setPeriod] = useState<PeriodTab>("daily");

  const data = useQuery(
    api.gifts.roomLeaderboard,
    mainTab === "room" ? { roomId, type: typeTab, period } : "skip"
  );

  const isLoading = mainTab === "room" && data === undefined;
  const leaders: Leader[] = (data as Leader[]) || [];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" dir="rtl">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative mt-auto bg-gradient-to-b from-[#f7ecd1] via-[#f1e0b8] to-[#e8d3a0] rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-amber-900/30" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/50 flex items-center justify-center text-amber-900 hover:bg-white/70"
            >
              <X size={18} />
            </button>
            <h2 className="text-base font-black text-amber-900">التصنيفات</h2>
            <button className="w-9 h-9 rounded-full bg-white/50 flex items-center justify-center text-amber-900 hover:bg-white/70">
              <HelpCircle size={18} />
            </button>
          </div>

          {/* Main Tabs */}
          <div className="flex items-center justify-center gap-5 mt-4 text-sm font-black">
            <button
              onClick={() => setMainTab("hours")}
              className={`pb-2 transition-colors ${
                mainTab === "hours"
                  ? "text-amber-900 border-b-2 border-amber-900"
                  : "text-amber-900/50"
              }`}
            >
              🔥 تصنيف الساعات
            </button>
            <button
              onClick={() => setMainTab("new")}
              className={`pb-2 transition-colors ${
                mainTab === "new"
                  ? "text-amber-900 border-b-2 border-amber-900"
                  : "text-amber-900/50"
              }`}
            >
              🆕 جديد
            </button>
            <button
              onClick={() => setMainTab("room")}
              className={`pb-2 transition-colors ${
                mainTab === "room"
                  ? "text-amber-900 border-b-2 border-amber-900"
                  : "text-amber-900/50"
              }`}
            >
              🏠 هذه الغرفة
            </button>
          </div>
        </div>

        {/* Room Tab Content */}
        {mainTab === "room" && (
          <div className="flex-1 overflow-y-auto">
            {/* Type Tabs */}
            <div className="flex justify-center gap-8 pt-2 pb-2">
              <button
                onClick={() => setTypeTab("wealth")}
                className={`text-base font-black pb-1 transition-all ${
                  typeTab === "wealth"
                    ? "text-amber-900 border-b-2 border-amber-900 scale-105"
                    : "text-amber-900/40"
                }`}
              >
                أثرياء
              </button>
              <button
                onClick={() => setTypeTab("charm")}
                className={`text-base font-black pb-1 transition-all ${
                  typeTab === "charm"
                    ? "text-amber-900 border-b-2 border-amber-900 scale-105"
                    : "text-amber-900/40"
                }`}
              >
                جاذبية
              </button>
            </div>

            {/* Period Filter */}
            <div className="mx-4 bg-amber-900/10 rounded-full p-1 flex mb-2">
              {(["daily", "weekly", "monthly"] as PeriodTab[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-1.5 text-xs font-black rounded-full transition-all ${
                    period === p
                      ? "bg-white text-amber-900 shadow"
                      : "text-amber-900/60"
                  }`}
                >
                  {p === "daily" ? "يومي" : p === "weekly" ? "أسبوعي" : "شهري"}
                </button>
              ))}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-amber-900" size={32} />
              </div>
            )}

            {!isLoading && leaders.length === 0 && <Empty />}

            {!isLoading && leaders.length > 0 && (
              <>
                <Podium top3={leaders.slice(0, 3)} onUserClick={onUserClick} />
                <div className="px-2 pb-6">
                  {leaders.slice(3).map((u, i) => (
                    <UserRow
                      key={u.userId}
                      rank={i + 4}
                      user={u}
                      onClick={() => onUserClick?.(u.userId)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Placeholder tabs */}
        {(mainTab === "hours" || mainTab === "new") && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-7xl mb-4">🚧</div>
            <p className="text-amber-900 font-black text-lg">قريباً</p>
            <p className="text-amber-900/60 text-sm mt-2 text-center">
              {mainTab === "hours"
                ? "تصنيف ساعات الغرف"
                : "المتصدرون الجدد"}{" "}
              — قيد التطوير
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
