// [moorawi-bubbles] Chat bubble — 9-patch with proper border-image-width
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { ReactNode } from "react";

interface Props {
  vip: number;
  children: ReactNode;
  isOwn?: boolean;
}

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
    const { imageUrl, sliceTop, sliceRight, sliceBottom, sliceLeft } = bubble;

    // Display borders at ~half the source slice (preserves decorations)
    const scale = 0.5;
    const bTop = Math.max(28, Math.min(64, Math.round(sliceTop * scale)));
    const bRight = Math.max(28, Math.min(64, Math.round(sliceRight * scale)));
    const bBottom = Math.max(28, Math.min(64, Math.round(sliceBottom * scale)));
    const bLeft = Math.max(28, Math.min(64, Math.round(sliceLeft * scale)));

    return (
      <div
        className="mt-1"
        style={{
          display: "inline-block",
          borderStyle: "solid",
          borderWidth: `${bTop}px ${bRight}px ${bBottom}px ${bLeft}px`,
          borderImageSource: `url("${imageUrl}")`,
          borderImageSlice: `${sliceTop} ${sliceRight} ${sliceBottom} ${sliceLeft} fill`,
          borderImageWidth: `${bTop}px ${bRight}px ${bBottom}px ${bLeft}px`,
          borderImageRepeat: "stretch",
          boxSizing: "border-box",
          maxWidth: "300px",
          verticalAlign: "top",
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "4px 8px",
            color: "white",
            fontSize: "12px",
            lineHeight: 1.5,
            direction: "rtl",
            textAlign: "right",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
            textShadow: "0 1px 2px rgba(0,0,0,0.7)",
            fontWeight: 500,
          }}
        >
          {children}
        </span>
      </div>
    );
  }

  return (
    <div className={`w-fit max-w-[85%] mt-1 px-2.5 py-1.5 rounded-2xl rounded-tr-sm ${fallbackClass(vip)}`}>
      {children}
    </div>
  );
}
