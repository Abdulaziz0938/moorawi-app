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
