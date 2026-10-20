// [moorawi-levels] Charm/Wealth badge — pill-style
// Renders as horizontal pill: [level] [icon/image]
// Supports DB image override (when user uploads custom icons)

import { Heart, Gem } from "lucide-react";
import { tierFor } from "../lib/levelBadges";

type Kind = "charm" | "wealth";
type Size = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, {
  height: number;
  padX: number;
  gap: number;
  levelFont: string;
  iconSize: number;
  borderW: number;
}> = {
  xs: { height: 14, padX: 5,  gap: 1, levelFont: "text-[8px]",  iconSize: 9,  borderW: 1 },
  sm: { height: 18, padX: 6,  gap: 2, levelFont: "text-[10px]", iconSize: 12, borderW: 1 },
  md: { height: 22, padX: 8,  gap: 2, levelFont: "text-xs",     iconSize: 15, borderW: 1.5 },
  lg: { height: 30, padX: 10, gap: 3, levelFont: "text-sm",     iconSize: 20, borderW: 2 },
};

interface Props {
  kind: Kind;
  level: number;
  size?: Size;
  imageUrl?: string | null;
  showIcon?: boolean;
  className?: string;
}

export default function LevelBadge({
  kind,
  level,
  size = "sm",
  imageUrl,
  showIcon = true,
  className = "",
}: Props) {
  const s = SIZE_MAP[size];
  const tier = tierFor(kind, level);
  const Icon = kind === "charm" ? Heart : Gem;

  return (
    <span
      className={`inline-flex items-center flex-shrink-0 rounded-full ${className}`}
      style={{
        height: s.height,
        paddingLeft: s.padX,
        paddingRight: s.padX,
        gap: s.gap,
        background: `linear-gradient(135deg, ${tier.colorFrom} 0%, ${tier.colorTo} 100%)`,
        border: `${s.borderW}px solid rgba(255,255,255,0.25)`,
        boxShadow: `0 0 8px ${tier.glowColor}66, inset 0 1px 2px rgba(255,255,255,0.3)`,
      }}
      title={`${tier.name} — Lv.${level}`}
    >
      {/* Level number */}
      <span
        className={`${s.levelFont} font-black text-white leading-none tabular-nums`}
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
      >
        {level}
      </span>

      {/* Icon / Image */}
      {showIcon && (
        imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{ width: s.iconSize, height: s.iconSize }}
            className="object-contain flex-shrink-0"
            draggable={false}
          />
        ) : (
          <Icon
            size={s.iconSize}
            className="text-white flex-shrink-0 drop-shadow"
            strokeWidth={2.4}
            fill="rgba(255,255,255,0.2)"
          />
        )
      )}
    </span>
  );
}
