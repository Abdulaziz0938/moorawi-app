// [moorawi] Member row card — dynamic, no placeholders
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

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-2xl transition hover:bg-white/5 active:scale-[0.98] text-right"
      style={{
        background: "linear-gradient(135deg, rgba(30,27,75,0.5) 0%, rgba(15,12,40,0.7) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Avatar + status badge */}
      <div className="relative flex-shrink-0" style={{ width: "54px", height: "54px", marginBottom: "8px" }}>
        <div className="member-avatar-ring">
          <div className="member-avatar-inner">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{name[0] || "?"}</span>
            )}
          </div>
        </div>
        <div className={`member-status-badge ${onMic ? "mic" : "room"}`}>
          {onMic ? <Mic size={9} /> : <Home size={9} />}
          <span>{onMic ? `المايك ${(seatIndex ?? 0) + 1}` : "الغرفة"}</span>
        </div>
      </div>

      {/* Info stack */}
      <div className="flex-1 min-w-0 flex flex-col items-end gap-1">
        {/* Row 1: name + role icon */}
        <div className="flex items-center gap-1.5 max-w-full">
          <span className="text-sm font-black text-white truncate">{name}</span>
          {isOwner && <Home size={13} className="text-amber-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />}
          {isMod && <Shield size={13} className="text-sky-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />}
          {!isOwner && !isMod && <UserIcon size={12} className="text-emerald-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />}
        </div>

        {/* Row 2: capsules + admin badges (dynamic) */}
        {(hasCharm || hasVip || hasAdmin) && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
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
              <img src="/badges/badge-super.png" alt="" className="h-5 w-5 object-contain flex-shrink-0" />
            )}
            {adminRole === "moderator" && (
              <img src="/badges/badge-admin.png" alt="" className="h-5 w-5 object-contain flex-shrink-0" />
            )}
          </div>
        )}

        {/* Row 3: ID */}
        {userNumber !== null && (
          <span className="text-[10px] text-white/40 font-bold" dir="ltr">ID:{userNumber}</span>
        )}
      </div>
    </button>
  );
}
