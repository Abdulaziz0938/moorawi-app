// [moorawi-levels] Poppo-style 0-100 levels for Charm & Wealth
// Lookup table with consistent ×3.5 growth per segment (10 segments)
//
// Segment milestones:
//   Lv.1-10:    500      → 50,000          (+5,500/level)
//   Lv.10-20:   50,000   → 175,000         (+12,500/level)
//   Lv.20-30:   175,000  → 600,000         (+42,500/level)
//   Lv.30-40:   600,000  → 2,100,000       (+150,000/level)
//   Lv.40-50:   2.1M     → 7,500,000       (+540,000/level)
//   Lv.50-60:   7.5M     → 26,000,000      (+1,850,000/level)
//   Lv.60-70:   26M      → 90,000,000      (+6,400,000/level)
//   Lv.70-80:   90M      → 320,000,000     (+23,000,000/level)
//   Lv.80-90:   320M     → 1,100,000,000   (+78,000,000/level)
//   Lv.90-100:  1.1B     → 4,000,000,000   (+290,000,000/level)

export interface LevelTier {
  level: number;
  min: number;
  max: number;
  label: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  icon: string;
}

export const MAX_LEVEL = 100;

// ============================================================
// Lookup Table (precomputed at module load)
// ============================================================
const THRESHOLDS: number[] = (() => {
  const t: number[] = new Array(MAX_LEVEL + 1).fill(0);
  t[0] = 0;
  t[1] = 500;

  let cur = 500;
  const steps = [
    { from: 2,  to: 10,  inc: 5_500 },
    { from: 11, to: 20,  inc: 12_500 },
    { from: 21, to: 30,  inc: 42_500 },
    { from: 31, to: 40,  inc: 150_000 },
    { from: 41, to: 50,  inc: 540_000 },
    { from: 51, to: 60,  inc: 1_850_000 },
    { from: 61, to: 70,  inc: 6_400_000 },
    { from: 71, to: 80,  inc: 23_000_000 },
    { from: 81, to: 90,  inc: 78_000_000 },
    { from: 91, to: 100, inc: 290_000_000 },
  ];
  for (const s of steps) {
    for (let l = s.from; l <= s.to; l++) {
      cur += s.inc;
      t[l] = cur;
    }
  }
  return t;
})();

// ============ Thresholds ============
export function minForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level >= MAX_LEVEL) return THRESHOLDS[MAX_LEVEL];
  return THRESHOLDS[level];
}

export function maxForLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return THRESHOLDS[level + 1] - 1;
}

export function levelFromValue(value: number): number {
  const v = Math.max(0, value ?? 0);
  if (v < THRESHOLDS[1]) return 0;
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (v >= THRESHOLDS[l]) return l;
  }
  return 0;
}

// ============ Tiers (color per 10 levels) ============
export const TIERS: LevelTier[] = [
  { level: 0,   min: 0,   max: 9,   label: "جديد",     color: "#9ca3af", bg: "bg-gray-500/25",    border: "border-gray-400/50",    text: "text-gray-200",    icon: "text-gray-300" },
  { level: 10,  min: 10,  max: 19,  label: "برونزي",   color: "#cd7f32", bg: "bg-amber-700/25",   border: "border-amber-600/50",   text: "text-amber-200",   icon: "text-amber-400" },
  { level: 20,  min: 20,  max: 29,  label: "فضي",      color: "#c0c0c0", bg: "bg-slate-400/25",   border: "border-slate-300/50",   text: "text-slate-100",   icon: "text-slate-200" },
  { level: 30,  min: 30,  max: 39,  label: "ذهبي",     color: "#ffd700", bg: "bg-yellow-500/25",  border: "border-yellow-400/50",  text: "text-yellow-100",  icon: "text-yellow-300" },
  { level: 40,  min: 40,  max: 49,  label: "زمردي",    color: "#10b981", bg: "bg-emerald-500/25", border: "border-emerald-400/50", text: "text-emerald-100", icon: "text-emerald-300" },
  { level: 50,  min: 50,  max: 59,  label: "ياقوتي",   color: "#3b82f6", bg: "bg-blue-500/25",    border: "border-blue-400/50",    text: "text-blue-100",    icon: "text-blue-300" },
  { level: 60,  min: 60,  max: 69,  label: "أرجواني", color: "#a855f7", bg: "bg-purple-500/25",  border: "border-purple-400/50",  text: "text-purple-100",  icon: "text-purple-300" },
  { level: 70,  min: 70,  max: 79,  label: "وردي",    color: "#ec4899", bg: "bg-pink-500/25",    border: "border-pink-400/50",    text: "text-pink-100",    icon: "text-pink-300" },
  { level: 80,  min: 80,  max: 89,  label: "ناري",    color: "#ef4444", bg: "bg-red-500/25",     border: "border-red-400/50",     text: "text-red-100",     icon: "text-red-300" },
  { level: 90,  min: 90,  max: 99,  label: "ماسي",    color: "#67e8f9", bg: "bg-cyan-500/25",    border: "border-cyan-400/50",    text: "text-cyan-100",    icon: "text-cyan-300" },
  { level: 100, min: 100, max: 100, label: "أسطوري",  color: "#fbbf24", bg: "bg-gradient-to-r from-amber-500/30 via-pink-500/30 to-purple-500/30", border: "border-amber-300/60", text: "text-white", icon: "text-amber-300" },
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
  const nextMin = level >= MAX_LEVEL ? Infinity : minForLevel(level + 1);
  const currentMin = minForLevel(level);
  const progress = nextMin === Infinity || nextMin === currentMin
    ? 100
    : Math.min(100, Math.round(((value - currentMin) / (nextMin - currentMin)) * 100));
  return { level, tier, nextMin, currentMin, progress };
}

// ============ Short number formatter ============
export function formatNumberShort(n: number): string {
  if (!n || n < 0) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}
