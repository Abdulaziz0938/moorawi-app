// [moorawi-poppo] Poppo-style levels: 0-100 for Wealth & Charm
// Formula: min(N) = 500 × N³  (clean cubic growth)
// Tier colors change every 10 levels.

export interface LevelTier {
  level: number;
  min: number;
  max: number;
  label: string;
  color: string;   // main hex
  bg: string;      // tailwind bg
  border: string;  // tailwind border
  text: string;    // number text
  icon: string;    // icon color
}

export const MAX_LEVEL = 100;

// ============ Thresholds ============
export function minForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.round(500 * Math.pow(level, 3));
}

export function maxForLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return minForLevel(level + 1) - 1;
}

export function levelFromValue(value: number): number {
  const v = Math.max(0, value ?? 0);
  if (v < 500) return 0;
  // Use +0.0001 to handle floating-point boundary (e.g. 125^(1/3) = 4.9999...)
  const n = Math.floor(Math.pow(v / 500, 1 / 3) + 0.0001);
  return Math.min(n, MAX_LEVEL);
}

// ============ Tiers (color per 10 levels) ============
export const TIERS: LevelTier[] = [
  { level: 0,   min: 0,           max: 499,      label: "جديد",     color: "#9ca3af", bg: "bg-gray-500/25",    border: "border-gray-400/50",    text: "text-gray-200",    icon: "text-gray-300" },
  { level: 10,  min: 500,         max: 4999,     label: "برونزي",   color: "#cd7f32", bg: "bg-amber-700/25",   border: "border-amber-600/50",   text: "text-amber-200",   icon: "text-amber-400" },
  { level: 20,  min: 5000,        max: 39999,    label: "فضي",      color: "#c0c0c0", bg: "bg-slate-400/25",   border: "border-slate-300/50",   text: "text-slate-100",   icon: "text-slate-200" },
  { level: 30,  min: 40000,       max: 134999,   label: "ذهبي",     color: "#ffd700", bg: "bg-yellow-500/25",  border: "border-yellow-400/50",  text: "text-yellow-100",  icon: "text-yellow-300" },
  { level: 40,  min: 135000,      max: 319999,   label: "زمردي",    color: "#10b981", bg: "bg-emerald-500/25", border: "border-emerald-400/50", text: "text-emerald-100", icon: "text-emerald-300" },
  { level: 50,  min: 320000,      max: 624999,   label: "ياقوتي",   color: "#3b82f6", bg: "bg-blue-500/25",    border: "border-blue-400/50",    text: "text-blue-100",    icon: "text-blue-300" },
  { level: 60,  min: 625000,      max: 1_079_999, label: "أرجواني", color: "#a855f7", bg: "bg-purple-500/25",  border: "border-purple-400/50",  text: "text-purple-100",  icon: "text-purple-300" },
  { level: 70,  min: 1_080_000,   max: 1_714_999, label: "وردي",    color: "#ec4899", bg: "bg-pink-500/25",    border: "border-pink-400/50",    text: "text-pink-100",    icon: "text-pink-300" },
  { level: 80,  min: 1_715_000,   max: 2_591_999, label: "ناري",    color: "#ef4444", bg: "bg-red-500/25",     border: "border-red-400/50",     text: "text-red-100",     icon: "text-red-300" },
  { level: 90,  min: 2_592_000,   max: 3_749_999, label: "ماسي",    color: "#67e8f9", bg: "bg-cyan-500/25",    border: "border-cyan-400/50",    text: "text-cyan-100",    icon: "text-cyan-300" },
  { level: 100, min: 3_750_000,   max: Infinity,  label: "أسطوري",   color: "#fbbf24", bg: "bg-gradient-to-r from-amber-500/30 via-pink-500/30 to-purple-500/30", border: "border-amber-300/60", text: "text-white", icon: "text-amber-300" },
];

export function tierForLevel(level: number): LevelTier {
  let found = TIERS[0];
  for (const t of TIERS) {
    if (level >= t.level) found = t;
    else break;
  }
  return found;
}

export function levelInfo(value: number) {
  const level = levelFromValue(value);
  const tier = tierForLevel(level);
  const nextMin = minForLevel(level + 1);
  const currentMin = minForLevel(level);
  const progress = nextMin === Infinity
    ? 100
    : Math.min(100, Math.round(((value - currentMin) / (nextMin - currentMin)) * 100));
  return { level, tier, nextMin, currentMin, progress };
}

// ============ Short formatter ============
export function formatNumberShort(n: number): string {
  if (!n || n < 0) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}
