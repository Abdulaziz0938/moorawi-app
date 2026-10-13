// [ezo-ui] SectionTitle — عنوان قسم موحد
import type { LucideIcon } from "lucide-react";
import { cx, anim } from "../../lib/design";

interface Props {
  icon?: LucideIcon;
  title: string;
  action?: { label: string; onClick: () => void };
  tone?: "default" | "gold" | "purple";
  className?: string;
}

const TONES: Record<string, string> = {
  default: "text-white",
  gold: "text-amber-200",
  purple: "text-purple-200",
};

export default function SectionTitle({
  icon: Icon,
  title,
  action,
  tone = "default",
  className = "",
}: Props) {
  return (
    <div className={cx("flex items-center justify-between mb-2", className)}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={14} className={TONES[tone]} />}
        <h3 className={cx("text-sm font-black", TONES[tone])}>{title}</h3>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={cx(
            "text-[10px] font-black text-white/50 hover:text-white/80",
            anim.fast
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
