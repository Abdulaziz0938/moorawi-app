// [ezo-medals] MedalBadge — عرض موحد للأوسمة
import { Award } from "lucide-react";
import { cx, anim } from "../../lib/design";
import { tierDesign, MEDAL_SIZES, type MedalSize } from "../../lib/medalDesign";

interface Props {
  name?: string;
  tier: string;
  imageUrl?: string | null;
  size?: MedalSize;
  onClick?: () => void;
  className?: string;
  showTooltip?: boolean;
}

export default function MedalBadge({
  name,
  tier,
  imageUrl,
  size = "sm",
  onClick,
  className = "",
  showTooltip = true,
}: Props) {
  const t = tierDesign(tier);
  const s = MEDAL_SIZES[size];

  const content = (
    <div
      className={cx(
        "relative flex-shrink-0 rounded-full border-2 flex items-center justify-center",
        t.border,
        t.bg,
        t.glow,
        s.ring > 0 && `ring-${s.ring}`,
        t.animate && "medal-sss-pulse",
        onClick && cx("cursor-pointer", anim.active),
        className
      )}
      style={{ width: s.box, height: s.box }}
      title={showTooltip && name ? `${name} (${tier})` : undefined}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name ?? tier}
          className="w-full h-full object-contain rounded-full"
          draggable={false}
        />
      ) : (
        <Award
          size={s.icon}
          className="text-white drop-shadow"
          strokeWidth={2}
          fill="rgba(255,255,255,0.25)"
        />
      )}
      {/* SSS sparkle */}
      {t.animate && (
        <div className="absolute inset-0 rounded-full pointer-events-none medal-sparkle" />
      )}
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="active:scale-95 transition-transform">
        {content}
      </button>
    );
  }

  return content;
}
