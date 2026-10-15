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
