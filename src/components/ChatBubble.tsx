// [moorawi-bubbles] Chat bubble — reads admin bubbles from DB, falls back to VIP gradient
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { ReactNode } from "react";

interface Props {
  vip: number;           // sender VIP level (0-7)
  children: ReactNode;   // message content (text + optional image)
  isOwn?: boolean;       // (reserved for future own/other alignment)
}

// Fallback gradient when no custom bubble exists (matches original bubbleClass)
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

  // Lookup priority: bubble.vip{N} → bubble.default → none
  const bubble =
    allBubbles?.find((b) => b.key === `bubble.vip${vip}`) ||
    (vip > 0 ? undefined : allBubbles?.find((b) => b.key === "bubble.default"));

  // ── Custom 9-patch bubble ──
  if (bubble) {
    const { imageUrl, sliceTop, sliceRight, sliceBottom, sliceLeft } = bubble;
    return (
      <div
        style={{
          borderStyle: "solid",
          borderWidth: `${sliceTop}px ${sliceRight}px ${sliceBottom}px ${sliceLeft}px`,
          borderImageSource: `url("${imageUrl}")`,
          borderImageSlice: `${sliceTop} ${sliceRight} ${sliceBottom} ${sliceLeft} fill`,
          borderImageRepeat: "stretch",
          color: "#fff",
          wordBreak: "break-word",
        }}
        className="w-fit max-w-[85%] mt-1"
      >
        <div className="px-2 py-1">{children}</div>
      </div>
    );
  }

  // ── Fallback gradient (as before) ──
  return (
    <div
      className={`w-fit max-w-[85%] mt-1 px-2.5 py-1.5 rounded-2xl rounded-tr-sm ${fallbackClass(vip)}`}
    >
      {children}
    </div>
  );
}
