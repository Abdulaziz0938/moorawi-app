// [ezo-design] Design Tokens — المرجع الموحد للتصميم
// كل المكونات تستخدم هذه القيم فقط — لا قيم عشوائية

// ============================================================
// SPACING — 4pt grid (كل القيم مضاعفات 4)
// ============================================================
export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem",  // 8px
  md: "0.75rem", // 12px
  lg: "1rem",    // 16px
  xl: "1.5rem",  // 24px
  "2xl": "2rem", // 32px
} as const;

// ============================================================
// RADIUS — 3 أحجام فقط
// ============================================================
export const radius = {
  sm: "rounded-xl",   // 12px — صغير (chips, badges)
  md: "rounded-2xl",  // 16px — متوسط (cards)
  lg: "rounded-3xl",  // 24px — كبير (sheets)
  full: "rounded-full", // دائري
} as const;

// ============================================================
// COLORS — Palette موحدة
// ============================================================
export const colors = {
  // الخلفيات الأساسية
  bg: {
    base: "bg-[#0a0612]",        // الخلفية الرئيسية
    surface: "bg-white/5",        // طبقة 1
    raised: "bg-white/10",        // طبقة 2
    overlay: "bg-black/70",       // overlay
  },
  // الحدود
  border: {
    subtle: "border-white/10",
    normal: "border-white/20",
    strong: "border-white/30",
  },
  // النصوص
  text: {
    primary: "text-white",
    secondary: "text-white/70",
    muted: "text-white/50",
    dim: "text-white/40",
  },
  // الألوان المميزة (3 فقط)
  accent: {
    gold: "text-amber-300",
    purple: "text-purple-300",
    emerald: "text-emerald-300",
  },
} as const;

// ============================================================
// GRADIENTS — 3 أساسية فقط
// ============================================================
export const gradients = {
  // ذهبي — للأرقام المهمة، Top 1
  gold: "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600",
  goldSoft: "bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent",
  
  // بنفسجي — الأساسي، الهوية
  purple: "bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-900",
  purpleSoft: "bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-transparent",
  
  // زمردي — النجاح، الإيرادات
  emerald: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
  emeraldSoft: "bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent",
  
  // الخلفية العامة للتطبيق
  appBg: "bg-gradient-to-b from-[#0a0612] via-[#14081f] to-black",
} as const;

// ============================================================
// TYPOGRAPHY — 5 أحجام فقط
// ============================================================
export const text = {
  // النصوص الرئيسية
  "4xl": "text-3xl font-black",   // 30px — أرقام Podium
  "3xl": "text-2xl font-black",   // 24px — Titles كبيرة
  "2xl": "text-lg font-black",    // 18px — Section titles
  "lg":  "text-base font-black",  // 16px — Row titles
  "base": "text-sm font-bold",    // 14px — نص عادي
  "sm":  "text-xs font-bold",     // 12px — ثانوي
  "xs":  "text-[10px] font-bold", // 10px — تلميحات
} as const;

// ============================================================
// SHADOWS — soft فقط
// ============================================================
export const shadows = {
  sm: "shadow-sm",
  md: "shadow-lg shadow-black/20",
  lg: "shadow-2xl shadow-black/40",
  glow: {
    gold: "shadow-lg shadow-amber-500/30",
    purple: "shadow-lg shadow-purple-500/30",
    emerald: "shadow-lg shadow-emerald-500/30",
  },
} as const;

// ============================================================
// ANIMATIONS — transitions موحدة
// ============================================================
export const anim = {
  fast: "transition-all duration-150",
  normal: "transition-all duration-200",
  slow: "transition-all duration-300",
  active: "active:scale-95",
  hover: "hover:scale-[1.02]",
} as const;

// ============================================================
// UTIL — دمج classes بأمان
// ============================================================
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
