// [moorawi-levels] Badge rules for Charm & Wealth (11 tiers each)
// Rendered as SVG by default; replaced by DB imageUrl when available.

import type { LucideIcon } from "lucide-react";
import {
  Sparkles, Flower2, Flower, Star, Award, Crown,
  Gem, Flame, Trophy, Medal, CircleDot,
} from "lucide-react";

export interface BadgeTier {
  minLevel: number;
  maxLevel: number;
  name: string;
  subtitle: string;
  // Colors for SVG gradient
  colorFrom: string;
  colorTo: string;
  glowColor: string;
  icon: LucideIcon;
}

// ============================================================
// CHARM (الجاذبية) — 11 tiers
// ============================================================
export const CHARM_TIERS: BadgeTier[] = [
  { minLevel: 0,   maxLevel: 9,   name: "زهرة الصحراء",   subtitle: "0-9",    colorFrom: "#4b5563", colorTo: "#9ca3af", glowColor: "#9ca3af", icon: CircleDot },
  { minLevel: 10,  maxLevel: 19,  name: "برعم صغير",       subtitle: "10-19",  colorFrom: "#10b981", colorTo: "#34d399", glowColor: "#10b981", icon: Flower2 },
  { minLevel: 20,  maxLevel: 29,  name: "برعم مزهر",       subtitle: "20-29",  colorFrom: "#059669", colorTo: "#10b981", glowColor: "#10b981", icon: Flower2 },
  { minLevel: 30,  maxLevel: 39,  name: "وردة صغيرة",     subtitle: "30-39",  colorFrom: "#0ea5e9", colorTo: "#38bdf8", glowColor: "#0ea5e9", icon: Flower },
  { minLevel: 40,  maxLevel: 49,  name: "وردة جميلة",     subtitle: "40-49",  colorFrom: "#6366f1", colorTo: "#818cf8", glowColor: "#6366f1", icon: Flower },
  { minLevel: 50,  maxLevel: 59,  name: "زهرة نادرة",     subtitle: "50-59",  colorFrom: "#a855f7", colorTo: "#c084fc", glowColor: "#a855f7", icon: Flower },
  { minLevel: 60,  maxLevel: 69,  name: "تاج الورد",       subtitle: "60-69",  colorFrom: "#ec4899", colorTo: "#f472b6", glowColor: "#ec4899", icon: Crown },
  { minLevel: 70,  maxLevel: 79,  name: "تاج ذهبي",        subtitle: "70-79",  colorFrom: "#ef4444", colorTo: "#f87171", glowColor: "#ef4444", icon: Crown },
  { minLevel: 80,  maxLevel: 89,  name: "تاج فاخر",        subtitle: "80-89",  colorFrom: "#f59e0b", colorTo: "#fbbf24", glowColor: "#f59e0b", icon: Crown },
  { minLevel: 90,  maxLevel: 99,  name: "تاج ملكي",        subtitle: "90-99",  colorFrom: "#eab308", colorTo: "#facc15", glowColor: "#facc15", icon: Award },
  { minLevel: 100, maxLevel: Infinity, name: "Charm Star", subtitle: "Lv.100", colorFrom: "#fbbf24", colorTo: "#fde68a", glowColor: "#fde68a", icon: Sparkles },
];

// ============================================================
// WEALTH (الثروة) — 11 tiers
// ============================================================
export const WEALTH_TIERS: BadgeTier[] = [
  { minLevel: 0,   maxLevel: 9,   name: "حبة رمل",       subtitle: "0-9",    colorFrom: "#4b5563", colorTo: "#9ca3af", glowColor: "#9ca3af", icon: CircleDot },
  { minLevel: 10,  maxLevel: 19,  name: "قطعة نحاس",     subtitle: "10-19",  colorFrom: "#a16207", colorTo: "#ca8a04", glowColor: "#a16207", icon: Medal },
  { minLevel: 20,  maxLevel: 29,  name: "قطعة فضة",      subtitle: "20-29",  colorFrom: "#94a3b8", colorTo: "#cbd5e1", glowColor: "#94a3b8", icon: Medal },
  { minLevel: 30,  maxLevel: 39,  name: "عملة ذهبية",    subtitle: "30-39",  colorFrom: "#eab308", colorTo: "#facc15", glowColor: "#facc15", icon: Gem },
  { minLevel: 40,  maxLevel: 49,  name: "حزمة عملات",    subtitle: "40-49",  colorFrom: "#f59e0b", colorTo: "#fbbf24", glowColor: "#f59e0b", icon: Gem },
  { minLevel: 50,  maxLevel: 59,  name: "كنز صغير",       subtitle: "50-59",  colorFrom: "#ea580c", colorTo: "#fb923c", glowColor: "#ea580c", icon: Trophy },
  { minLevel: 60,  maxLevel: 69,  name: "كنز كبير",       subtitle: "60-69",  colorFrom: "#dc2626", colorTo: "#ef4444", glowColor: "#dc2626", icon: Trophy },
  { minLevel: 70,  maxLevel: 79,  name: "تاج الثراء",     subtitle: "70-79",  colorFrom: "#b91c1c", colorTo: "#dc2626", glowColor: "#b91c1c", icon: Crown },
  { minLevel: 80,  maxLevel: 89,  name: "امبراطور",      subtitle: "80-89",  colorFrom: "#7c2d12", colorTo: "#a16207", glowColor: "#a16207", icon: Crown },
  { minLevel: 90,  maxLevel: 99,  name: "أسطورة",         subtitle: "90-99",  colorFrom: "#facc15", colorTo: "#fde68a", glowColor: "#fde68a", icon: Award },
  { minLevel: 100, maxLevel: Infinity, name: "Wealth Star", subtitle: "Lv.100", colorFrom: "#fbbf24", colorTo: "#fde68a", glowColor: "#fde68a", icon: Sparkles },
];

// ============================================================
// Helpers
// ============================================================
export function tierIndexFor(kind: "charm" | "wealth", level: number): number {
  const tiers = kind === "charm" ? CHARM_TIERS : WEALTH_TIERS;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (level >= tiers[i].minLevel) return i;
  }
  return 0;
}

export function tierFor(kind: "charm" | "wealth", level: number): BadgeTier {
  const tiers = kind === "charm" ? CHARM_TIERS : WEALTH_TIERS;
  return tiers[tierIndexFor(kind, level)];
}

export function maxTierIndex(): number {
  return CHARM_TIERS.length - 1;
}
