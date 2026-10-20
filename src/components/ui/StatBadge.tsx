// [ezo-ui] StatBadge — عرض رقم + تسمية + أيقونة
import type { LucideIcon } from "lucide-react";
import { cx, radius, anim } from "../../lib/design";

interface Props {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  tone?: "default" | "gold" | "purple" | "emerald" | "pink" | "blue";
  subValue?: string;
  size?: "sm" | "md";
}

const TONES: Record<string, { text: string; icon: string; bg: string }> = {
  default: { text: "text-white", icon: "text-white/60", bg: "bg-white/5" },
  gold:    { text: "text-amber-200", icon: "text-amber-300", bg: "bg-amber-500/10" },
  purple:  { text: "text-purple-200", icon: "text-purple-300", bg: "bg-purple-500/10" },
  emerald: { text: "text-emerald-200", icon: "text-emerald-300", bg: "bg-emerald-500/10" },
  pink:    { text: "text-pink-200", icon: "text-pink-300", bg: "bg-pink-500/10" },
  blue:    { text: "text-blue-200", icon: "text-blue-300", bg: "bg-blue-500/10" },


};

export default function StatBadge({
  icon: Icon,
  label,
  value,
  tone = "default",
  subValue,
  size = "md",
}: Props) {
  const t = TONES[tone];
  return (
    <div
      className={cx(
        radius.md,
        t.bg,
        "border border-white/10 backdrop-blur-xl p-3 text-right",
        anim.normal
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-white/60 text-[10px] font-bold">{label}</span>
        {Icon && <Icon size={size === "sm" ? 12 : 14} className={t.icon} />}
      </div>
      <p
        className={cx(
          t.text,
          size === "sm" ? "text-base font-black" : "text-lg font-black",
          "tabular-nums leading-tight"
        )}
        dir="ltr"
      >
        {value}
      </p>
      {subValue && (
        <p className="text-white/40 text-[10px] font-bold tabular-nums mt-0.5" dir="ltr">
          {subValue}
        </p>
      )}
    </div>
  );
}
