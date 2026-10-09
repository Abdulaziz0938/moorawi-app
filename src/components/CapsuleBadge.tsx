// [moorawi-poppo] Compact capsule badge — Level number + icon only
// Style: [ N ❤️ ]  (رقم اللفل + أيقونة ملونة)
import { Heart, Gem } from "lucide-react";
import { levelInfo } from "../lib/levels";

type Kind = "charm" | "wealth";

interface Props {
  kind: Kind;
  value: number;
  size?: "xs" | "sm" | "md";
}

const SIZE_MAP = {
  xs: { h: "h-4",   px: "px-1",   badge: "h-3 w-3",   badgeText: "text-[7px]",  icon: 9  },
  sm: { h: "h-5",   px: "px-1.5", badge: "h-4 w-4",   badgeText: "text-[9px]",  icon: 11 },
  md: { h: "h-6",   px: "px-2",   badge: "h-5 w-5",   badgeText: "text-[10px]", icon: 13 },
};

export default function CapsuleBadge({ kind, value, size = "sm" }: Props) {
  const info = levelInfo(value);
  const s = SIZE_MAP[size];
  const Icon = kind === "charm" ? Heart : Gem;

  return (
    <span
      className={`inline-flex items-center gap-1 ${s.px} ${s.h} rounded-full border ${info.tier.border} ${info.tier.bg} flex-shrink-0`}
      style={{
        boxShadow: info.level >= 40 ? `0 0 6px ${info.tier.color}66` : undefined,
      }}
      title={`${kind === "charm" ? "الجاذبية" : "الثروة"} - Lv.${info.level}`}
    >
      {/* Level number */}
      <span
        className={`${s.badge} rounded-full flex items-center justify-center font-black ${s.badgeText}`}
        style={{
          background: info.tier.color,
          color: "#0a0a0a",
          textShadow: "0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        {info.level}
      </span>

      {/* Icon */}
      <Icon
        size={s.icon}
        className={info.tier.icon}
        fill="currentColor"
        strokeWidth={1.5}
      />
    </span>
  );
}
