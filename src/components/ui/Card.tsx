// [ezo-ui] Card — البطاقة الموحدة للتطبيق
import type { ReactNode } from "react";
import { cx, radius, gradients, anim } from "../../lib/design";

interface Props {
  children: ReactNode;
  tone?: "default" | "purple" | "gold" | "emerald" | "danger" | "pink";
  padding?: "sm" | "md" | "lg";
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

const TONE_BG: Record<string, string> = {
  default: "bg-white/5 border-white/10",
  purple: `${gradients.purpleSoft} border-purple-400/30`,
  gold: `${gradients.goldSoft} border-amber-400/30`,
  emerald: `${gradients.emeraldSoft} border-emerald-400/30`,
  pink: "bg-gradient-to-br from-pink-500/20 via-pink-600/10 to-transparent border-pink-400/30",
  danger: "bg-red-500/10 border-red-400/30",
};

const PADDING: Record<string, string> = {
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
};

export default function Card({
  children,
  tone = "default",
  padding = "md",
  interactive = false,
  onClick,
  className = "",
}: Props) {
  const base = cx(
    radius.md,
    "border backdrop-blur-xl",
    PADDING[padding],
    TONE_BG[tone],
    interactive && cx(anim.normal, anim.active, "hover:bg-white/10 cursor-pointer"),
    className
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={cx(base, "text-right w-full")}>
        {children}
      </button>
    );
  }

  return <div className={base}>{children}</div>;
}
