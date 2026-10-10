// [moorawi-bubbles] Chat bubble — Poppo-style 9-patch (fixed display values)
// Key: border-image-WIDTH is CONSTANT (34px), only SLICE scales with source.
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { ReactNode } from "react";

interface Props {
  vip: number;
  children: ReactNode;
  isOwn?: boolean;
}

// Fixed display values — decorations always render at this thickness
const BORDER = { top: 34, right: 36, bottom: 36, left: 32 };
const PADDING = { top: 6, right: 12, bottom: 6, left: 12 };
const MAX_WIDTH = 340;
const MIN_CONTENT_WIDTH = 80;

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
          // border-image-slice cuts the SOURCE at these positions
          borderImageSource: `url("${imageUrl}")`,
          borderImageSlice: `${sliceTop} ${sliceRight} ${sliceBottom} ${sliceLeft} fill`,
          borderImageRepeat: "stretch",
          // borderImageWidth shows it at FIXED display size (independent of source)
          borderImageWidth: `${BORDER.top}px ${BORDER.right}px ${BORDER.bottom}px ${BORDER.left}px`,
          // borderWidth reserves this space in layout
          borderStyle: "solid",
          borderWidth: `${BORDER.top}px ${BORDER.right}px ${BORDER.bottom}px ${BORDER.left}px`,
          boxSizing: "border-box",
          maxWidth: `${MAX_WIDTH}px`,
          minWidth: `${
            BORDER.left + BORDER.right + MIN_CONTENT_WIDTH
          }px`,
        }}
        className="w-fit mt-1"
      >
        <div
          style={{
            padding: `${PADDING.top}px ${PADDING.right}px ${PADDING.bottom}px ${PADDING.left}px`,
            direction: "rtl",
            textAlign: "right",
            wordBreak: "normal",
            overflowWrap: "break-word",
            whiteSpace: "pre-wrap",
            lineHeight: 1.45,
            unicodeBidi: "embed",
          }}
          className="text-white text-xs font-medium"
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
