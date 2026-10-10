// [moorawi-bubbles] Chat bubble — reads admin bubbles from DB, falls back to VIP gradient
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
          // Inner padding compensation — with border-image, content sits inside the border box
          // We add a small safety inset so text doesn't touch decoration edges
          direction: "rtl",
        }}
        className="w-fit max-w-[85%] mt-1"
      >
        <div
          className="text-white text-xs whitespace-pre-wrap"
          style={{
            // Negative-margin trick: extend content box slightly into the border
            // so long text fills the middle comfortably without hugging decoration
            margin: "-2px 0",
            padding: "0 2px",
            lineHeight: 1.35,
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-fit max-w-[85%] mt-1 px-2.5 py-1.5 rounded-2xl rounded-tr-sm ${fallbackClass(vip)}`}
    >
      {children}
    </div>
  );
}
