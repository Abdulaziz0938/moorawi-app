// [ezo-ui] RankBadge — شارة ترتيب موحدة (1-100)
import { cx } from "../../lib/design";

interface Props {
  rank: number;
  size?: "sm" | "md" | "lg";
  isTop3?: boolean;
}

const SIZES: Record<string, string> = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

export default function RankBadge({ rank, size = "md", isTop3 }: Props) {
  const isGold = isTop3 ?? rank <= 3;

  const bg = rank === 1
    ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-lg shadow-amber-500/40"
    : rank === 2
    ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-lg shadow-slate-400/40"
    : rank === 3
    ? "bg-gradient-to-br from-orange-500 to-amber-700 text-white shadow-lg shadow-orange-500/40"
    : isGold
    ? "bg-amber-500/20 text-amber-200 border border-amber-400/40"
    : "bg-white/10 text-white/70 border border-white/20";

  return (
    <div
      className={cx(
        SIZES[size],
        bg,
        "rounded-full flex items-center justify-center font-black tabular-nums flex-shrink-0"
      )}
    >
      {rank}
    </div>
  );
}
