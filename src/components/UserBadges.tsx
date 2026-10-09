// [moorawi] Unified user badges + name — Single Source of Truth for display
// Used in: RoomView (chat), Leaderboard, Members, MiniProfile, ProfilePage, MeTab
// Rule: only render what the user actually owns (DB-driven)

import { Home, Shield, User as UserIcon, Crown, Award } from "lucide-react";
import LevelBadge from "./LevelBadge";
import { levelFromValue } from "../lib/levels";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, {
  role: number;
  name: string;
  vipW: number;
  admin: number;
  pvip: number;
  gap: string;
  medal: number;
}> = {
  sm: { role: 11, name: "text-[10px]", vipW: 44, admin: 18, pvip: 18, gap: "gap-1",   medal: 12 },
  md: { role: 14, name: "text-xs",     vipW: 54, admin: 22, pvip: 22, gap: "gap-1.5", medal: 14 },
  lg: { role: 16, name: "text-sm",     vipW: 62, admin: 26, pvip: 26, gap: "gap-2",   medal: 16 },
};

// ============================================================
// Individual badges
// ============================================================

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

// ============================================================
// Inline badges (compact row)
// ============================================================

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

export default function UserBadges({
  vip,
  adminRole,
  variant = "inline",
  size = "sm",
}: {
  vip?: number | null;
  adminRole?: "super" | "moderator" | null;
  variant?: "inline" | "stacked";
  size?: Size;
}) {
  const px = size === "sm" ? 16 : size === "md" ? 20 : 24;

  if (variant === "inline") {
    return <UserBadgesInline vip={vip} adminRole={adminRole} size={px} />;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {adminRole && <AdminBadge role={adminRole} size={px} />}
      {vip && vip > 0 && <PvipBadge level={vip} size={px} />}
    </div>
  );
}

// ============================================================
// Unified UserName — shows everything conditionally
// Order (RTL): [role] [medal] [name] [title] [charm] [wealth] [vip-banner] [admin] [pvip]
// ============================================================

interface UserNameProps {
  name: string;
  // Identity
  vip?: number | null;                       // 0-7 (real VIP)
  charmValue?: number | null;                // raw charms (0+)
  wealthValue?: number | null;               // raw totalSent (0+)
  adminRole?: "super" | "moderator" | null;
  roomRole?: "owner" | "moderator" | "speaker" | "listener" | null;
  medal?: { imageUrl?: string; name: string; tier: string } | null;
  titleText?: string | null;
  // Layout
  size?: Size;
  nameClassName?: string;
  wrap?: boolean;
  showRole?: boolean;
  showCapsules?: boolean;
  showMedal?: boolean;
  showTitle?: boolean;
}

export function UserName({
  name,
  vip,
  charmValue,
  wealthValue,
  adminRole,
  roomRole,
  medal,
  titleText,
  size = "sm",
  nameClassName = "text-purple-300",
  wrap = false,
  showRole = true,
  showCapsules = true,
  showMedal = true,
  showTitle = true,
}: UserNameProps) {
  const s = SIZES[size];

  // Role priority: super > owner(room) > moderator > member
  let role: "super" | "owner" | "moderator" | "member" = "member";
  if (adminRole === "super") role = "super";
  else if (roomRole === "owner") role = "owner";
  else if (roomRole === "moderator" || adminRole === "moderator") role = "moderator";

  const v = typeof vip === "number" && vip > 0 ? vip : 0;
  const ch = typeof charmValue === "number" && charmValue > 0 ? charmValue : 0;
  const we = typeof wealthValue === "number" && wealthValue > 0 ? wealthValue : 0;

  return (
    <div className={`flex items-center ${s.gap} ${wrap ? "flex-wrap" : ""} min-w-0`}>
      {/* 1. Role icon — Poppo style */}
      {showRole && role === "super" && (
        <Crown size={s.role} className="text-amber-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
      )}
      {showRole && role === "owner" && (
        <Home size={s.role} className="text-amber-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
      )}
      {showRole && role === "moderator" && (
        <Shield size={s.role} className="text-sky-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
      )}
      {showRole && role === "member" && (
        <UserIcon size={Math.max(9, s.role - 1)} className="text-emerald-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
      )}

      {/* 2. Equipped medal (only if user owns it) */}
      {showMedal && medal && (
        medal.imageUrl ? (
          <img
            src={medal.imageUrl}
            alt={medal.name}
            title={medal.name}
            className="object-contain drop-shadow flex-shrink-0"
            style={{ width: s.medal, height: s.medal }}
            draggable={false}
          />
        ) : (
          <span title={medal.name} className="flex-shrink-0">
            <Award size={s.medal} className="text-amber-300" strokeWidth={1.8} />
          </span>
        )
      )}

      {/* 3. Name */}
      <span className={`${s.name} font-bold ${nameClassName} truncate`}>{name}</span>

      {/* 4. Title (only if user has one) */}
      {showTitle && titleText && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[9px] font-black text-amber-200 flex-shrink-0">
          {titleText}
        </span>
      )}

      {/* 5. Charm badge (only if charms > 0) */}
      {showCapsules && ch > 0 && (
        <LevelBadge kind="charm" level={levelFromValue(ch)} size="sm" />
      )}

      {/* 6. Wealth badge (only if totalSent > 0) */}
      {showCapsules && we > 0 && (
        <LevelBadge kind="wealth" level={levelFromValue(we)} size="sm" />
      )}

      {/* 7. VIP banner (only if VIP active) */}
      {v > 0 && (
        <div className="badge-glow flex-shrink-0">
          <VipBanner level={v} width={s.vipW} />
        </div>
      )}

      {/* 8. Admin badge (only if admin) */}
      {adminRole && (
        <div className="badge-glow flex-shrink-0">
          <AdminBadge role={adminRole} size={s.admin} />
        </div>
      )}

      {/* 9. pvip mini badge */}
      {v > 0 && (
        <div className="badge-glow flex-shrink-0">
          <PvipBadge level={v} size={s.pvip} />
        </div>
      )}
    </div>
  );
}
