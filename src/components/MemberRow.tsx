// [moorawi] Member row — unified capsule with 2-line info stack
import { Home, Shield, User as UserIcon, Mic } from "lucide-react";

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
  userNumber: number | null;
  vip?: number | null;
  charmLevel?: number | null;
  adminRole?: "super" | "moderator" | null;
  roomRole: "owner" | "moderator" | "speaker" | "listener";
  seatIndex?: number | null;
  rank?: number;
  compact?: boolean;
  onClick?: () => void;
}

export default function MemberRow({
  name,
  avatarUrl,
  userNumber,
  vip,
  charmLevel,
  adminRole,
  roomRole,
  seatIndex,
  rank,
  compact = false,
  onClick,
}: Props) {
  const isOwner = roomRole === "owner";
  const isMod = roomRole === "moderator";
  const onMic = seatIndex !== null && seatIndex !== undefined;

  const v = typeof vip === "number" ? vip : 0;
  const ch = typeof charmLevel === "number" ? charmLevel : 0;
  const hasCharm = ch > 0;
  const hasVip = v > 0;
  const hasAdmin = adminRole === "super" || adminRole === "moderator";
  const hasAnyCapsule = hasCharm || hasVip || hasAdmin;

  const avatarSize = compact ? 36 : 42;
  const avatarFontSize = compact ? 13 : 16;
  const nameSize = compact ? "text-[11px]" : "text-xs";
  const subSize = compact ? "text-[9px]" : "text-[10px]";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 ${compact ? "p-1 pl-3" : "p-1.5 pl-4"} rounded-full transition hover:bg-white/5 active:scale-[0.98]`}
      style={{
        background: "linear-gradient(135deg, rgba(30,27,75,0.5) 0%, rgba(15,12,40,0.7) 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Rank (optional, right-most after avatar) */}

      {/* Avatar (right in RTL) */}
      <div className="relative flex-shrink-0" style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}>
        <div className="member-avatar-ring" style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}>
          <div className="member-avatar-inner" style={{ fontSize: `${avatarFontSize}px` }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{name[0] || "?"}</span>
            )}
          </div>
        </div>
      </div>

      {/* Info stack: 2 lines */}
      <div className="flex flex-col items-start min-w-0 flex-1">
        {/* Row 1: Name + role icon */}
        <div className="flex items-center gap-1 max-w-full">
          <span className={`${nameSize} font-black text-white truncate`}>{name}</span>
          {isOwner && <Home size={10} className="text-amber-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />}
          {isMod && <Shield size={10} className="text-sky-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />}
          {!isOwner && !isMod && <UserIcon size={9} className="text-emerald-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />}
          {onMic && !compact && (
            <span className={`${subSize} text-emerald-300 flex items-center gap-0.5 flex-shrink-0`}>
              <Mic size={8} />
              <span>{(seatIndex ?? 0) + 1}</span>
            </span>
          )}
        </div>

        {/* Row 2: ID • Lv */}
        <div className={`flex items-center gap-1.5 ${subSize} text-white/50 font-bold`} dir="ltr">
          {rank !== undefined && <span className="text-amber-300">#{rank}</span>}
          {userNumber !== null && <span>ID:{userNumber}</span>}
          <span>Lv.0</span>
        </div>
      </div>

      {/* Capsules (left in RTL) */}
      {hasAnyCapsule && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasCharm && (
            <span className="badge-capsule charm">
              <span>{ch}</span>
              <span>✨</span>
            </span>
          )}
          {hasVip && (
            <span className="badge-capsule wealth">
              <span>{v}</span>
              <span>💎</span>
            </span>
          )}
          {adminRole === "super" && (
            <img src="/badges/badge-super.png" alt="" className="h-4 w-4 object-contain flex-shrink-0" />
          )}
          {adminRole === "moderator" && (
            <img src="/badges/badge-admin.png" alt="" className="h-4 w-4 object-contain flex-shrink-0" />
          )}
        </div>
      )}
    </button>
  );
}
