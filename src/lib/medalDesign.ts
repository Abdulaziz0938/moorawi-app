// [ezo-medals] نظام تصميم الأوسمة الموحد
// 6 مستويات: C, B, A, S, SS, SSS
// كل مستوى: خلفية، حدود، لون، glow — متسق في كل مكان

export type MedalTier = "C" | "B" | "A" | "S" | "SS" | "SSS";

export interface MedalTierDesign {
  name: string;          // الاسم العربي
  bg: string;            // تدرج الخلفية
  border: string;        // لون الحدود
  text: string;          // لون النص
  glow: string;          // الظل المتوهج
  ring: string;          // ring للـ image
  animate: boolean;      // حركة (للـ SSS فقط)
}

export const MEDAL_TIERS: Record<MedalTier, MedalTierDesign> = {
  C: {
    name: "عادي",
    bg: "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900",
    border: "border-slate-500/60",
    text: "text-slate-200",
    glow: "shadow-md shadow-slate-500/30",
    ring: "ring-1 ring-slate-400/40",
    animate: false,
  },
  B: {
    name: "جيد",
    bg: "bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900",
    border: "border-emerald-400/70",
    text: "text-emerald-100",
    glow: "shadow-md shadow-emerald-500/40",
    ring: "ring-1 ring-emerald-300/50",
    animate: false,
  },
  A: {
    name: "ممتاز",
    bg: "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900",
    border: "border-blue-400/70",
    text: "text-blue-100",
    glow: "shadow-md shadow-blue-500/40",
    ring: "ring-1 ring-blue-300/50",
    animate: false,
  },
  S: {
    name: "نادر",
    bg: "bg-gradient-to-br from-red-600 via-red-700 to-red-900",
    border: "border-red-400/70",
    text: "text-red-100",
    glow: "shadow-md shadow-red-500/50",
    ring: "ring-1 ring-red-300/60",
    animate: false,
  },
  SS: {
    name: "أسطوري",
    bg: "bg-gradient-to-br from-amber-500 via-orange-600 to-red-700",
    border: "border-amber-300/80",
    text: "text-amber-50",
    glow: "shadow-lg shadow-amber-500/60",
    ring: "ring-2 ring-amber-300/70",
    animate: false,
  },
  SSS: {
    name: "أسطوري+",
    bg: "bg-gradient-to-br from-fuchsia-500 via-purple-600 to-pink-600",
    border: "border-fuchsia-300/90",
    text: "text-white",
    glow: "shadow-lg shadow-fuchsia-500/60",
    ring: "ring-2 ring-fuchsia-300/80",
    animate: true,
  },
};

// حجم موحد — 4 أحجام
export const MEDAL_SIZES = {
  xs: { box: 20, icon: 10, ring: 0 },
  sm: { box: 28, icon: 14, ring: 0 },
  md: { box: 40, icon: 20, ring: 1 },
  lg: { box: 56, icon: 28, ring: 2 },
  xl: { box: 80, icon: 40, ring: 3 },
} as const;

export type MedalSize = keyof typeof MEDAL_SIZES;

export function tierDesign(tier: string): MedalTierDesign {
  return MEDAL_TIERS[(tier as MedalTier)] ?? MEDAL_TIERS.C;
}

export function tierLabel(tier: string): string {
  return `${tier} — ${tierDesign(tier).name}`;
}
