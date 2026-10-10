import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAssets, resolveAsset } from "../lib/assets";
import type { Id } from "../../convex/_generated/dataModel";
import { X, HelpCircle, Loader2, Home } from "lucide-react";
import { UserName } from "./UserBadges";
import LevelBadge from "./LevelBadge";
import { levelFromValue } from "../lib/levels";
import MemberRow from "./MemberRow";
import PodiumSVG from "./PodiumSVG";

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
  charmValue?: number | null;
  wealthValue?: number | null;
  adminRole?: "super" | "moderator" | null;
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

// ============ Podium (crown on corner + circle) ============
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
    <div className="flex justify-center items-start gap-4 py-8 px-4">
      {second && <PodiumSlot rank={2} user={second} onClick={() => onUserClick?.(second.userId)} />}
      {first && <PodiumSlot rank={1} user={first} onClick={() => onUserClick?.(first.userId)} />}
      {third && <PodiumSlot rank={3} user={third} onClick={() => onUserClick?.(third.userId)} />}
    </div>
  );
}

function PodiumSlot({
  rank,
  user,
  onClick,
}: {
  rank: 1 | 2 | 3;
  user: Leader;
  onClick?: () => void;
}) {
  const assets = useAssets();
  const isGold = rank === 1;
  const avatarSize = isGold ? 78 : 66;

  const ringColor = {
    1: "#FFD700",
    2: "#C0C0C0",
    3: "#CD7F32",
  }[rank];

  const v = typeof user.vip === "number" ? user.vip : 0;
  const ch = typeof user.charmValue === "number" ? user.charmValue : 0;
  const we = typeof user.wealthValue === "number" ? user.wealthValue : 0;
  const hasCharm = ch > 0;
  const hasWealth = we > 0;
  const hasVip = v > 0;
  const hasAdmin = !!user.adminRole;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center"
      style={{ width: `${avatarSize + 16}px` }}
    >
      {/* Crown + Avatar + Rank badge */}
      <div className="relative" style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}>
        {/* Crown (only rank 1) */}
        {isGold && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl z-10">👑</div>
        )}

        {/* Avatar circle */}
        <div
          className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-white font-black bg-gradient-to-br from-purple-400 to-pink-500"
          style={{ border: `3px solid ${ringColor}` }}
        >
          {true ? (
            <img src={user.avatarUrl || "/avatar.png"} alt="" className="w-full h-full object-cover" />
          ) : (
            <span style={{ fontSize: `${avatarSize * 0.35}px` }}>
              {user.name[0] || "?"}
            </span>
          )}
        </div>

        {/* Rank badge (bottom of circle) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white"
          style={{
            bottom: "-8px",
            width: "22px",
            height: "22px",
            background: ringColor,
          }}
        >
          {rank}
        </div>
      </div>

      {/* Name + role icon */}
      <div className="mt-4 flex items-center gap-1 max-w-full">
        <span className="text-[12px] font-black text-amber-900 truncate">
          {user.name}
        </span>
        {rank === 1 && <Home size={11} className="text-amber-600 inline-block" />}
      </div>

      {/* ID (thin) */}
      {user.userNumber !== null && (
        <p className="text-[9px] font-normal text-amber-900/60 leading-tight">
          ID:{user.userNumber}
        </p>
      )}
      {/* Badges row: charm + wealth + vip */}
      {(hasCharm || hasWealth || hasVip || hasAdmin) && (
        <div className="flex items-center gap-1 mt-1.5 justify-center flex-wrap">
          {hasCharm && (
            <LevelBadge kind="charm" level={levelFromValue(ch)} size="xs" />
          )}
          {hasWealth && (
            <LevelBadge kind="wealth" level={levelFromValue(we)} size="xs" />
          )}
          {user.vip > 0 && (
            <img
              src={assets[`vip.logo.${user.vip}`] ?? ""}
              alt=""
              className="h-4 w-auto object-contain badge-glow"
              draggable={false}
            />
          )}
          {user.adminRole === "super" && (
            <img
              src={resolveAsset(assets, "admin.super", "/badges/badge-super.png")}
              alt=""
              className="h-5 w-5 object-contain badge-glow"
            />
          )}
          {user.adminRole === "moderator" && (
            <img
              src={resolveAsset(assets, "admin.moderator", "/badges/badge-admin.png")}
              alt=""
              className="h-5 w-5 object-contain badge-glow"
            />
          )}
        </div>
      )}

      {/* Total value */}
      <p className="text-[11px] font-black text-amber-900 mt-1">
        {formatNumber(user.total)}
      </p>
    </button>
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
  const assets = useAssets();
  return (
    <MemberRow
      userId={user.userId}
      name={user.name}
      avatarUrl={user.avatarUrl}
      userNumber={user.userNumber}
      vip={user.vip}
      charmValue={user.charmValue}
        wealthValue={user.wealthValue}
      adminRole={user.adminRole}
      roomRole="speaker"
      rank={rank}
      compact={true}
      onClick={onClick}
    />
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
              <Home size={14} className="inline-block ml-1" /> هذه الغرفة
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
