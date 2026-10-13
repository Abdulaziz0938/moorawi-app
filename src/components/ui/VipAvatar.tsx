// [ezo-vip] VipAvatar — صورة المستخدم مع هالة وإطار حسب مستوى VIP
// مطابق للمعيار: Bigo (halos 1-7), Yalla (frames متحركة), SUGO (sparkle)

import { cx } from "../../lib/design";

interface Props {
  src: string | null | undefined;
  name: string;
  size?: number;
  vip?: number;        // 0-7
  ring?: boolean;      // إطار عادي إذا VIP = 0
  className?: string;
  onClick?: () => void;
}

// الحجم النسبي لطبقة الإطار (نسبة إلى الأفاتار)
const FRAME_PADDING: Record<number, number> = {
  0: 2,
  1: 2, 2: 3, 3: 3, 4: 4, 5: 4, 6: 5, 7: 6,
};

export default function VipAvatar({
  src,
  name,
  size = 48,
  vip = 0,
  ring = true,
  className = "",
  onClick,
}: Props) {
  const pad = FRAME_PADDING[vip] ?? 2;
  const innerSize = size - pad * 2;
  const isLegendary = vip >= 5;

  const content = (
    <div
      className={cx("vip-avatar-wrap", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer frame (rotating for 5-7) */}
      {vip >= 1 && (
        <div
          className={cx(
            "absolute inset-0 rounded-full",
            `vip-frame-${vip}`,
            "transition-all duration-300"
          )}
        />
      )}

      {/* Halo (glow) */}
      {vip >= 1 && (
        <div
          className={cx(
            "absolute inset-0 rounded-full",
            `vip-halo-${vip}`,
            isLegendary && "vip-sparkle"
          )}
        />
      )}

      {/* Non-VIP ring */}
      {vip === 0 && ring && (
        <div className="absolute inset-0 rounded-full ring-1 ring-white/20" />
      )}

      {/* Inner avatar */}
      <div
        className="relative rounded-full overflow-hidden bg-purple-700 flex items-center justify-center z-10"
        style={{ width: innerSize, height: innerSize }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <span
            className="text-white font-black"
            style={{ fontSize: innerSize * 0.42 }}
          >
            {(name?.[0] ?? "?").toUpperCase()}
          </span>
        )}
      </div>
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
