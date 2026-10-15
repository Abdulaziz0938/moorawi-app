// [ezo-vip] VipAvatar — Professional frame rendering (Yalla/SUGO/Bigo Standard)
//
// Canvas Standard Formula:
//   scale     = canvasSize / holeSize   (مثلاً 500/300 = 1.667)
//   frameSize = avatarSize × scale
//   frameLeft = (avatarSize - frameSize)/2 + offsetX × scale
//   frameTop  = (avatarSize - frameSize)/2 + offsetY × scale
//
// Supports: PNG/WebP (img) + SVGA (SvgaPlayer)
import { cx } from "../../lib/design";
import SvgaPlayer from "./SvgaPlayer";
import { buildAnimProps } from "../../lib/assetAnimations";

interface Props {
  src: string | null | undefined;
  name: string;
  size?: number;
  vip?: number;                    // 0-7
  ring?: boolean;                  // ring for non-VIP
  className?: string;
  onClick?: () => void;

  // Custom frame
  customFrameUrl?: string | null;
  // Legacy scale/offset (fallback when canvasSize/holeSize not set)
  frameScale?: number;
  frameOffsetX?: number;
  frameOffsetY?: number;
  // Canvas Standard (preferred)
  canvasSize?: number | null;
  holeSize?: number | null;
  offsetX?: number | null;
  offsetY?: number | null;
  assetType?: "png" | "svga" | "lottie" | null;
}

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
  customFrameUrl,
  frameScale,
  frameOffsetX = 0,
  frameOffsetY = 0,
  canvasSize,
  holeSize,
  offsetX = 0,
  offsetY = 0,
  assetType,
}: Props) {
  const pad = FRAME_PADDING[vip] ?? 2;
  const innerSize = size - pad * 2;
  const isLegendary = vip >= 5;
  const hasCustom = !!customFrameUrl;

  // ─── Compute scale (Canvas Standard preferred) ───
  let scale: number;
  let ox: number;
  let oy: number;
  if (canvasSize && holeSize && holeSize > 0) {
    // Professional formula
    scale = canvasSize / holeSize;
    ox = (offsetX ?? 0) * scale;
    oy = (offsetY ?? 0) * scale;
  } else {
    // Legacy fallback
    scale = frameScale ?? 1.4;
    ox = frameOffsetX ?? 0;
    oy = frameOffsetY ?? 0;
  }

  const frameSize = size * scale;

  // [ezo-anim] Smart animations for halo + frame
  const haloAnim = vip >= 1 ? buildAnimProps(`vip.halo.${vip}`) : { className: "", style: {} };
  // [ezo-glow] لون VIP لحساب أشعة النور
  const VIP_GLOW_COLORS: Record<number, string> = {
    1: "rgba(16, 185, 129, 0.85)",
    2: "rgba(59, 130, 246, 0.85)",
    3: "rgba(168, 85, 247, 0.9)",
    4: "rgba(220, 38, 38, 0.9)",
    5: "rgba(234, 179, 8, 0.95)",
    6: "rgba(249, 115, 22, 0.95)",
    7: "rgba(251, 191, 36, 1.0)",
  };
  const glowColor = VIP_GLOW_COLORS[vip] ?? "transparent";
  const frameAnim = hasCustom ? buildAnimProps(`vip.frame.${vip}`) : { className: "", style: {} };
  const frameLeft = (size - frameSize) / 2 + ox;
  const frameTop = (size - frameSize) / 2 + oy;

  const isSvga = assetType === "svga" || (customFrameUrl ?? "").toLowerCase().endsWith(".svga");

  const content = (
    <div
      className={cx("vip-avatar-wrap", className)}
      style={{ width: size, height: size, position: "relative" }}
    >
      {/* Default VIP CSS frame (used if no custom) */}
      {!hasCustom && vip >= 1 && (
        <div
          className={cx(
            "absolute inset-0 rounded-full",
            `vip-frame-${vip}`,
            "transition-all duration-300"
          )}
        />
      )}

      {/* Halo (glow) with animation */}
      {vip >= 1 && (
        <div
          className={cx(
            "absolute inset-0 rounded-full",
            `vip-halo-${vip}`,
            isLegendary && "vip-sparkle",
            haloAnim.className
          )}
          style={haloAnim.style}
        />
      )}

      {/* Non-VIP ring */}
      {!hasCustom && vip === 0 && ring && (
        <div className="absolute inset-0 rounded-full ring-1 ring-white/20" />
      )}

      {/* Inner avatar */}
      <div
        className="relative rounded-full overflow-hidden bg-purple-700 flex items-center justify-center z-10"
        style={{
          width: innerSize,
          height: innerSize,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
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

      {/* [ezo-glow] أشعة النور حول الإطار — تظهر فقط للـ VIP */}
      {hasCustom && vip >= 1 && (
        <>
          {/* حلقة ضوء خارجية (توهج ثابت) */}
          <div
            className="absolute rounded-full pointer-events-none z-0"
            style={{
              width: size * 1.35,
              height: size * 1.35,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, ${glowColor} 0%, ${glowColor.replace("0.85", "0.4").replace("0.9", "0.4").replace("0.95", "0.45").replace("1.0", "0.5")} 35%, transparent 70%)`,
              filter: "blur(8px)",
              animation: "ezoGlowPulse 3s ease-in-out infinite",
              willChange: "opacity, transform",
            }}
          />
          {/* [ezo-shimmer] لمعان متحرك يمر عبر الإطار */}
          <div
            className="absolute rounded-full pointer-events-none z-[21] overflow-hidden"
            style={{
              width: size * 1.15,
              height: size * 1.15,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              maskImage: "radial-gradient(circle, transparent 42%, black 50%, black 70%, transparent 78%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 42%, black 50%, black 70%, transparent 78%)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(
                  115deg,
                  transparent 0%,
                  transparent 35%,
                  rgba(255, 255, 255, 0.85) 45%,
                  rgba(255, 255, 255, 1) 50%,
                  rgba(255, 255, 255, 0.85) 55%,
                  transparent 65%,
                  transparent 100%
                )`,
                backgroundSize: "250% 100%",
                animation: "ezoFrameShimmer 4s ease-in-out infinite",
                willChange: "background-position",
              }}
            />
          </div>

          {/* أشعة دوارة (light rays) */}
          <div
            className="absolute rounded-full pointer-events-none z-0"
            style={{
              width: size * 1.5,
              height: size * 1.5,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: `conic-gradient(
                from 0deg,
                transparent 0deg,
                ${glowColor.replace("0.85", "0.6").replace("0.9", "0.6").replace("0.95", "0.65").replace("1.0", "0.7")} 20deg,
                transparent 45deg,
                transparent 90deg,
                ${glowColor.replace("0.85", "0.6").replace("0.9", "0.6").replace("0.95", "0.65").replace("1.0", "0.7")} 110deg,
                transparent 135deg,
                transparent 180deg,
                ${glowColor.replace("0.85", "0.6").replace("0.9", "0.6").replace("0.95", "0.65").replace("1.0", "0.7")} 200deg,
                transparent 225deg,
                transparent 270deg,
                ${glowColor.replace("0.85", "0.6").replace("0.9", "0.6").replace("0.95", "0.65").replace("1.0", "0.7")} 290deg,
                transparent 315deg
              )`,
              opacity: 0.45,
              maskImage: "radial-gradient(circle, transparent 45%, black 58%, black 72%, transparent 90%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 45%, black 58%, black 72%, transparent 90%)",
              animation: "ezo-rays-rotate 18s linear infinite",
              willChange: "transform",
            }}
          />
        </>
      )}

      {/* Custom frame (PNG or SVGA) */}
      {hasCustom && (
        <div
          className={`absolute pointer-events-none z-20 ${frameAnim.className}`}
          style={{
            width: frameSize,
            height: frameSize,
            left: frameLeft,
            top: frameTop,
            ...frameAnim.style,
          }}
        >
          {isSvga ? (
            <SvgaPlayer
              src={customFrameUrl as string}
              loops={0}
              autoPlay
              className="w-full h-full"
            />
          ) : (
            <img
              src={customFrameUrl as string}
              alt=""
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                maxWidth: "none",
                maxHeight: "none",
                objectFit: "contain",
                objectPosition: "center",
              }}
            />
          )}
        </div>
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
