// [moorawi] Unified user badges component
// Displays: pvip (mini VIP), admin badge, and wide VIP banner

interface Props {
  vip?: number | null;          // 0-7
  adminRole?: "super" | "moderator" | null;
  variant?: "inline" | "stacked";
  size?: "sm" | "md" | "lg";
}

export function PvipBadge({ level, size = 20 }: { level: number; size?: number }) {
  if (!level || level < 1 || level > 7) return null;
  return (
    <img
      src={`/vip/pvip${level}.png`}
      alt={`VIP ${level}`}
      title={`VIP ${level}`}
      className="object-contain drop-shadow"
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function VipBanner({ level, width = 60 }: { level: number; width?: number }) {
  if (!level || level < 1 || level > 7) return null;
  return (
    <img
      src={`/vip/vip${level}.png`}
      alt={`VIP ${level}`}
      title={`VIP ${level}`}
      className="object-contain drop-shadow"
      style={{ width, height: "auto" }}
      draggable={false}
    />
  );
}

export function AdminBadge({ role, size = 18 }: { role: "super" | "moderator" | null; size?: number }) {
  if (!role) return null;
  const src = role === "super" ? "/badges/badge-super.png" : "/badges/badge-admin.png";
  const alt = role === "super" ? "Super Admin" : "Admin";
  return (
    <img
      src={src}
      alt={alt}
      title={alt}
      className="object-contain drop-shadow"
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

// Inline row: [pvip] [admin] — compact
export function UserBadgesInline({
  vip,
  adminRole,
  size = 18,
}: {
  vip?: number | null;
  adminRole?: "super" | "moderator" | null;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {adminRole && <AdminBadge role={adminRole} size={size} />}
      {vip && vip > 0 && <PvipBadge level={vip} size={size} />}
    </div>
  );
}

// Default export — flexible usage
export default function UserBadges({ vip, adminRole, variant = "inline", size = "sm" }: Props) {
  const px = size === "sm" ? 16 : size === "md" ? 20 : 24;

  if (variant === "inline") {
    return <UserBadgesInline vip={vip} adminRole={adminRole} size={px} />;
  }

  // stacked — vertical
  return (
    <div className="flex flex-col items-center gap-1">
      {adminRole && <AdminBadge role={adminRole} size={px} />}
      {vip && vip > 0 && <PvipBadge level={vip} size={px} />}
    </div>
  );
}

// [moorawi] Unified UserName — role icon + name + vip banner + admin badge + pvip
// Order (RTL): [role] [name] [vip-banner] [admin] [pvip]
import { Home, Shield, User as UserIcon } from "lucide-react";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { role: number; name: string; vipW: number; admin: number; pvip: number; gap: string }> = {
  sm: { role: 11, name: "text-[10px]", vipW: 44, admin: 18, pvip: 18, gap: "gap-1" },
  md: { role: 14, name: "text-xs", vipW: 54, admin: 22, pvip: 22, gap: "gap-1.5" },
  lg: { role: 16, name: "text-sm", vipW: 62, admin: 26, pvip: 26, gap: "gap-2" },
};

export function UserName({
  name,
  vip,
  charmLevel,
  adminRole,
  roomRole,
  size = "sm",
  nameClassName = "text-purple-300",
  wrap = false,
  showRole = true,
  showCapsules = true,
}: {
  name: string;
  vip?: number | null;
  charmLevel?: number | null;
  adminRole?: "super" | "moderator" | null;
  roomRole?: "owner" | "moderator" | "speaker" | "listener" | null;
  size?: Size;
  nameClassName?: string;
  wrap?: boolean;
  showRole?: boolean;
  showCapsules?: boolean;
}) {
  const s = SIZES[size];

  // Role: owner / moderator / member
  let role: "owner" | "moderator" | "member" = "member";
  if (roomRole === "owner") role = "owner";
  else if (roomRole === "moderator") role = "moderator";
  else if (adminRole === "super") role = "owner";
  else if (adminRole === "moderator") role = "moderator";

  const v = typeof vip === "number" ? vip : 0;
  const ch = typeof charmLevel === "number" ? charmLevel : 0;

  return (
    <div className={`flex items-center ${s.gap} ${wrap ? "flex-wrap" : ""} min-w-0`}>
      {/* 1. Role icon */}
      {showRole && role === "owner" && (
        <Home size={s.role} className="text-amber-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
      )}
      {showRole && role === "moderator" && (
        <Shield size={s.role} className="text-sky-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
      )}
      {showRole && role === "member" && (
        <UserIcon size={Math.max(9, s.role - 1)} className="text-emerald-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
      )}

      {/* 2. Name */}
      <span className={`${s.name} font-bold ${nameClassName} truncate`}>{name}</span>

      {/* 3. Charm capsule */}
      {showCapsules && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-pink-500/25 border border-pink-400/40 text-[9px] font-black text-pink-200 flex-shrink-0">
          <span>✨</span>
          <span>{ch}</span>
        </span>
      )}

      {/* 4. Wealth capsule */}
      {showCapsules && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-yellow-500/25 border border-yellow-400/40 text-[9px] font-black text-yellow-200 flex-shrink-0">
          <span>💎</span>
          <span>{v}</span>
        </span>
      )}

      {/* 5. VIP banner (if >0) */}
      {v > 0 && (
        <div className="badge-glow flex-shrink-0">
          <VipBanner level={v} width={s.vipW} />
        </div>
      )}

      {/* 6. Admin badge */}
      {adminRole && (
        <div className="badge-glow flex-shrink-0">
          <AdminBadge role={adminRole} size={s.admin} />
        </div>
      )}

      {/* 7. pvip */}
      {v > 0 && (
        <div className="badge-glow flex-shrink-0">
          <PvipBadge level={v} size={s.pvip} />
        </div>
      )}
    </div>
  );
}
