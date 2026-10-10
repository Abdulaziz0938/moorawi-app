// [moorawi] Member row — uses unified UserName + LevelBadge (Single Source of Truth)
import { Mic } from "lucide-react";
import { UserName } from "./UserBadges";

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
  userNumber: number | null;
  vip?: number | null;
  charmValue?: number | null;
  wealthValue?: number | null;
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
  charmValue,
  wealthValue,
  adminRole,
  roomRole,
  seatIndex,
  rank,
  compact = false,
  onClick,
}: Props) {
  const onMic = seatIndex !== null && seatIndex !== undefined;
  const avatarSize = compact ? 36 : 42;
  const avatarFontSize = compact ? 13 : 16;
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
      {/* Avatar */}
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
        {onMic && (
          <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
            <Mic size={8} className="text-white" />
          </div>
        )}
      </div>

      {/* Info stack */}
      <div className="flex flex-col items-start min-w-0 flex-1 gap-0.5">
        <UserName
          name={name}
          vip={vip}
          charmValue={charmValue}
          wealthValue={wealthValue}
          adminRole={adminRole}
          roomRole={roomRole}
          size={compact ? "sm" : "md"}
          nameClassName="text-white"
        />
        <div className={`flex items-center gap-1.5 ${subSize} text-white/50 font-bold`} dir="ltr">
          {rank !== undefined && <span className="text-amber-300">#{rank}</span>}
          {userNumber !== null && <span>ID:{userNumber}</span>}
          {onMic && <span>Mic {(seatIndex ?? 0) + 1}</span>}
        </div>
      </div>
    </button>
  );
}
