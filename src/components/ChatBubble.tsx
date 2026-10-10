// [moorawi-bubbles] Chat bubble — reads admin bubbles from DB, smart-scales slices
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { ReactNode } from "react";

interface Props {
  vip: number;
  children: ReactNode;
  isOwn?: boolean;
}

// Target max bubble width on screen (px). Borders scale relative to this.
const TARGET_MAX_WIDTH = 260;
// Absolute cap on border thickness to avoid huge decorations on tiny images.
const MAX_BORDER = 48;

function fallbackClass(vip: number): string {
  if (vip <= 0) return "bg-white/5 border border-white/10";
  const g = [
    "bg-gradient-to-br from-sky-500/25 to-sky-700/25 border border-sky-400/40",
    "bg-gradient-to-br from-emerald-500/25 to-emerald-700/25 border border-emerald-400/40",
    "bg-gradient-to-br from-purple-500/25 to-purple-700/25 border border-purple-400/40",
    "bg-gradient-to-br from-pink-500/25 to-pink-700/25 border border-pink-400/40",
    "bg-gradient-to-br from-red-500/25 to-red-700/25 border border-red-400/40",
    "bg-gradient-to-br from-orange-500/25 to-orange-700/25 border border-orange-400/40",
    "bg-gradient-to-br from-yellow-500/30 to-yellow-700/30 border border-yellow-400/50",
  ];
  return g[Math.min(vip - 1, g.length - 1)];
}

export default function ChatBubble({ vip, children, isOwn }: Props) {
  const allBubbles = useQuery(api.bubbles.list, { onlyActive: true });

  const bubble =
    allBubbles?.find((b) => b.key === `bubble.vip${vip}`) ||
    (vip > 0 ? undefined : allBubbles?.find((b) => b.key === "bubble.default"));

  if (bubble) {
    const {
      imageUrl,
      sliceTop, sliceRight, sliceBottom, sliceLeft,
      imageWidth, imageHeight,
    } = bubble as any;

    // Determine image intrinsic size (fallback to reasonable default)
    const imgW = imageWidth ?? 669;
    const imgH = imageHeight ?? 373;

    // Scale factor: how much smaller the display is vs the source image
    const scale = Math.min(1, TARGET_MAX_WIDTH / imgW);

    // Scaled border widths (clamped to MAX_BORDER)
    const bTop = Math.min(MAX_BORDER, Math.round(sliceTop * scale));
    const bRight = Math.min(MAX_BORDER, Math.round(sliceRight * scale));
    const bBottom = Math.min(MAX_BORDER, Math.round(sliceBottom * scale));
    const bLeft = Math.min(MAX_BORDER, Math.round(sliceLeft * scale));

    // Minimum width so short messages still show decoration properly
    const minW = bLeft + bRight + 32;

    return (
      <div
        style={{
          borderStyle: "solid",
          borderWidth: `${bTop}px ${bRight}px ${bBottom}px ${bLeft}px`,
          borderImageSource: `url("${imageUrl}")`,
          borderImageSlice: `${sliceTop} ${sliceRight} ${sliceBottom} ${sliceLeft} fill`,
          borderImageRepeat: "stretch",
          boxSizing: "border-box",
          maxWidth: `${TARGET_MAX_WIDTH}px`,
          minWidth: `${minW}px`,
        }}
        className="w-fit mt-1"
      >
        <div
          style={{
            direction: "rtl",
            textAlign: "right",
            wordBreak: "normal",
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
            lineHeight: 1.35,
            padding: "2px 4px",
          }}
          className="text-white text-xs"
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-fit max-w-[85%] mt-1 px-2.5 py-1.5 rounded-2xl rounded-tr-sm ${fallbackClass(vip)}`}>
      {children}
    </div>
  );
}
