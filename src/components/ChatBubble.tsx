// [moorawi-bubbles] Chat bubble — corner-based rendering (handles large decorations)
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
    const { imageUrl, imageWidth, imageHeight, sliceTop, sliceRight, sliceBottom, sliceLeft } = bubble as any;

    // Source image intrinsic size
    const imgW = imageWidth ?? 669;
    const imgH = imageHeight ?? 373;

    // Corner box = slice dimensions (in source pixels)
    const TL_W = sliceLeft,  TL_H = sliceTop;
    const TR_W = sliceRight, TR_H = sliceTop;
    const BL_W = sliceLeft,  BL_H = sliceBottom;
    const BR_W = sliceRight, BR_H = sliceBottom;

    // Display scale (source px → screen px)
    const SCALE = 0.5;
    const dispTL_W = Math.round(TL_W * SCALE);
    const dispTL_H = Math.round(TL_H * SCALE);
    const dispTR_W = Math.round(TR_W * SCALE);
    const dispTR_H = Math.round(TR_H * SCALE);
    const dispBL_W = Math.round(BL_W * SCALE);
    const dispBL_H = Math.round(BL_H * SCALE);
    const dispBR_W = Math.round(BR_W * SCALE);
    const dispBR_H = Math.round(BR_H * SCALE);

    // Common corner style builder
    const cornerStyle = (side: "tl" | "tr" | "bl" | "br"): React.CSSProperties => {
      const base: React.CSSProperties = {
        position: "absolute",
        backgroundImage: `url("${imageUrl}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${imgW * SCALE}px ${imgH * SCALE}px`,
        pointerEvents: "none",
      };
      if (side === "tl") {
        return { ...base, top: 0, left: 0, width: dispTL_W, height: dispTL_H, backgroundPosition: "left top" };
      }
      if (side === "tr") {
        return { ...base, top: 0, right: 0, width: dispTR_W, height: dispTR_H, backgroundPosition: "right top" };
      }
      if (side === "bl") {
        return { ...base, bottom: 0, left: 0, width: dispBL_W, height: dispBL_H, backgroundPosition: "left bottom" };
      }
      return { ...base, bottom: 0, right: 0, width: dispBR_W, height: dispBR_H, backgroundPosition: "right bottom" };
    };

    return (
      <div
        className="mt-1"
        style={{
          position: "relative",
          display: "inline-block",
          // Reserve space for corners + a bit for content
          paddingTop: dispTL_H + 2,
          paddingBottom: dispBL_H + 2,
          paddingLeft: dispTL_W + 8,
          paddingRight: dispTR_W + 8,
          minWidth: dispTL_W + dispTR_W + 40,
          maxWidth: "320px",
          // Center background — radial blue glass matches the source bubble
          background:
            "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(30,64,175,0.55) 0%, rgba(12,30,92,0.85) 100%)",
          borderRadius: "10px",
          verticalAlign: "top",
        }}
      >
        <div style={cornerStyle("tl")} />
        <div style={cornerStyle("tr")} />
        <div style={cornerStyle("bl")} />
        <div style={cornerStyle("br")} />
        <span
          style={{
            position: "relative",
            display: "block",
            color: "white",
            fontSize: "12px",
            lineHeight: 1.5,
            direction: "rtl",
            textAlign: "right",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            fontWeight: 500,
            zIndex: 1,
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
